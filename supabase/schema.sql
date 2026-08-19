-- Juby Club Modern - Supabase Database Schema DDL
-- Execute this SQL script in your Supabase SQL Editor to set up tables, RLS, and indexes.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Staff Table
CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'cashier',
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 2. Players Table
CREATE TABLE IF NOT EXISTS public.players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    balance NUMERIC NOT NULL DEFAULT 0,
    total_spent NUMERIC NOT NULL DEFAULT 0,
    visits INT NOT NULL DEFAULT 0,
    level TEXT DEFAULT 'A3',
    birth_date TEXT,
    notes TEXT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 3. Tables Status Table
CREATE TABLE IF NOT EXISTS public.tables (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    type TEXT NOT NULL, -- '8ball' or 'snooker'
    queue JSONB DEFAULT '[]'::jsonb,
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 4. Games / Play Sessions Table
CREATE TABLE IF NOT EXISTS public.games (
    id TEXT PRIMARY KEY,
    table_id TEXT REFERENCES public.tables(id) ON DELETE SET NULL,
    player_id TEXT REFERENCES public.players(id) ON DELETE SET NULL,
    player_ids JSONB DEFAULT '[]'::jsonb,
    start_time BIGINT NOT NULL,
    end_time BIGINT,
    duration_minutes INT,
    type TEXT NOT NULL, -- 'time', 'frames', 'jetons'
    cost NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'finished', 'cancelled'
    jetons_used INT DEFAULT 0,
    staff_id TEXT REFERENCES public.staff(id) ON DELETE SET NULL,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 5. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    player_id TEXT REFERENCES public.players(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL, -- 'payment', 'charge', 'bonus'
    date BIGINT NOT NULL,
    notes TEXT,
    shift_id TEXT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 6. Shifts Table
CREATE TABLE IF NOT EXISTS public.shifts (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES public.staff(id) ON DELETE SET NULL,
    staff_name TEXT NOT NULL,
    start_time BIGINT NOT NULL,
    end_time BIGINT,
    initial_cash NUMERIC NOT NULL DEFAULT 0,
    final_cash NUMERIC,
    system_cash NUMERIC,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed'
    jeton_sales JSONB DEFAULT '[]'::jsonb,
    faux_mises JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 7. SMS Templates Table
CREATE TABLE IF NOT EXISTS public.sms_templates (
    id TEXT PRIMARY KEY,
    lang TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL
);

-- 8. Application Settings & State Store Table
CREATE TABLE IF NOT EXISTS public.app_state (
    key TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- 9. TV Scoreboard: Live Snooker Frame State (durability/recovery snapshot only)
-- The instant, sub-100ms live updates travel over a Supabase Realtime Broadcast
-- channel ("tv:<tableId>") and never touch this table on the hot path. This row
-- is written on a debounce (~1s) purely so a TV page or admin panel that opens
-- mid-frame (or reconnects after a drop) can rehydrate the current score instead
-- of starting from zero.
CREATE TABLE IF NOT EXISTS public.live_frames (
    table_id TEXT PRIMARY KEY REFERENCES public.tables(id) ON DELETE CASCADE,
    game_id TEXT,
    state JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
);

-- Indexes for Query Performance
CREATE INDEX IF NOT EXISTS idx_players_phone ON public.players(phone);
CREATE INDEX IF NOT EXISTS idx_games_table ON public.games(table_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);
CREATE INDEX IF NOT EXISTS idx_payments_player ON public.payments(player_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_frames ENABLE ROW LEVEL SECURITY;

-- Allow Public Access Policies (for single-tenant management client with anon key)
CREATE POLICY "Allow public read staff" ON public.staff FOR SELECT USING (true);
CREATE POLICY "Allow public all staff" ON public.staff FOR ALL USING (true);

CREATE POLICY "Allow public all players" ON public.players FOR ALL USING (true);
CREATE POLICY "Allow public all tables" ON public.tables FOR ALL USING (true);
CREATE POLICY "Allow public all games" ON public.games FOR ALL USING (true);
CREATE POLICY "Allow public all payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Allow public all shifts" ON public.shifts FOR ALL USING (true);
CREATE POLICY "Allow public all sms_templates" ON public.sms_templates FOR ALL USING (true);
CREATE POLICY "Allow public all app_state" ON public.app_state FOR ALL USING (true);
CREATE POLICY "Allow public all live_frames" ON public.live_frames FOR ALL USING (true);

-- Realtime Replication enablement
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_state, public.tables, public.games, public.shifts;

-- Add the new TV scoreboard table to the same publication. Wrapped so re-running
-- this migration on a project that already has it added does not error out.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.live_frames;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- already added, ignore
END $$;
