import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = process.env.DATABASE_FILE || 'database.json';
const DB_PATH = path.isAbsolute(DB_FILE) ? DB_FILE : path.join(__dirname, DB_FILE);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support large JSON payloads

// Health check routes
app.get(['/api', '/api/healthz', '/api/status'], (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Juby Club API Server is running',
    timestamp: new Date().toISOString()
  });
});

// Pull State Endpoint
app.get('/api/sync/pull', (req, res) => {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      const state = JSON.parse(data);
      return res.json({ success: true, state });
    }
    return res.json({ success: true, state: null });
  } catch (error) {
    console.error('Error pulling state:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---- Realtime fallback stream (used only when the client has no Supabase
// project configured yet) ----
// The push endpoint below already persists every change to database.json;
// this just also fans that same change out, live, to every connected client
// via Server-Sent Events. Unlike the client's same-browser BroadcastChannel
// fallback, this reaches genuinely separate devices on the same network
// (e.g. an admin laptop and a real TV), as long as they can both reach this
// server's address (VITE_API_BASE_URL on the client side).
const sseClients = new Set();

app.get('/api/sync/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 2000\n\n');
  sseClients.add(res);

  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { /* client likely gone, close() below will clean up */ }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

function broadcastStateUpdate(state) {
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const client of sseClients) {
    try { client.write(payload); } catch { sseClients.delete(client); }
  }
}

// Push Sync Endpoint
app.post('/api/sync', (req, res) => {
  try {
    const { state } = req.body;
    if (!state) {
      return res.status(400).json({ success: false, error: 'Missing state body' });
    }

    // Write state to database.json file
    fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf8');
    broadcastStateUpdate(state);
    res.json({ success: true });
  } catch (error) {
    console.error('Error syncing state:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// SMS Proxy Forwarder
app.post('/api/sms/send', async (req, res) => {
  try {
    const { to, body, apiKey, baseUrl, sender } = req.body;
    if (!to || !body) {
      return res.status(400).json({ success: false, error: 'Missing recipient phone or message body' });
    }

    const infobipApiKey = apiKey || process.env.SMS_API_KEY;
    const infobipBaseUrl = baseUrl || process.env.SMS_API_BASE_URL || 'api.infobip.com';
    const infobipSender = sender || process.env.SMS_API_SENDER || 'JubyClub';

    const url = `https://${infobipBaseUrl}/sms/2/text/advanced`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `App ${infobipApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            destinations: [{ to }],
            from: infobipSender,
            text: body
          }
        ]
      })
    });

    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.requestError?.serviceException?.text || 'Infobip API error');
    }

    res.json({ success: true, data: resData });
  } catch (error) {
    console.error('Error sending SMS via proxy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Telegram Bot Dispatch Proxy
app.post('/api/telegram/report', async (req, res) => {
  try {
    const { message, botToken, chats } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Missing message body' });
    }

    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatList = chats || (process.env.TELEGRAM_CHATS ? process.env.TELEGRAM_CHATS.split(',') : []);

    if (!token || chatList.length === 0) {
      return res.status(400).json({ success: false, error: 'Telegram Bot token or chats not configured' });
    }

    const results = [];
    for (const chat of chatList) {
      const trimmedChat = chat.trim();
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: trimmedChat,
          text: message,
          parse_mode: 'HTML'
        })
      });

      const data = await response.json();
      results.push({ chat: trimmedChat, success: data.ok, data });
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Error sending Telegram report via proxy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
