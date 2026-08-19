import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from client/.env
dotenv.config({ path: path.join(__dirname, '../client/.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-supabase-project')) {
  console.error('❌ Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set in client/.env');
  console.log('Please populate your Supabase credentials in client/.env first, then run:');
  console.log('  node server/seed-supabase.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedSupabase() {
  console.log('📡 Seeding initial data into Supabase...');

  const initialStaff = [
    { id: 'admin', username: 'admin', password: 'admin', name: 'Administrator', role: 'admin', created_at: Date.now() }
  ];

  const initialTables = [
    { id: 'P1', label: 'Pool 1', type: '8ball', queue: [] },
    { id: 'P2', label: 'Pool 2', type: '8ball', queue: [] },
    { id: 'P3', label: 'Pool 3', type: '8ball', queue: [] },
    { id: 'P4', label: 'Pool 4', type: '8ball', queue: [] },
    { id: 'SN', label: 'Snooker', type: 'snooker', queue: [] }
  ];

  try {
    const { error: staffError } = await supabase.from('staff').upsert(initialStaff);
    if (staffError) console.warn('Staff upsert warning:', staffError.message);

    const { error: tableError } = await supabase.from('tables').upsert(initialTables);
    if (tableError) console.warn('Table upsert warning:', tableError.message);

    console.log('✅ Supabase seeding finished successfully!');
  } catch (err) {
    console.error('❌ Seed error:', err);
  }
}

seedSupabase();
