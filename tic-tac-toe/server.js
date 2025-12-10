import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/notify', async (req, res) => {
  const { result, code } = req.body || {};
  if (result !== 'win' && result !== 'lose') {
    return res.status(200).json({ ok: true, skipped: true });
  }
  if (!BOT_TOKEN) {
    return res.status(500).json({ ok: false, error: 'Missing BOT_TOKEN' });
  }
  if (result === 'win' && (!code || typeof code !== 'string')) {
    return res.status(400).json({ ok: false, error: 'Missing promo code' });
  }

  if (!CHAT_ID) {
    return res.status(500).json({ ok: false, error: 'Missing CHAT_ID' });
  }

  const text = result === 'win'
    ? `Победа! Промокод выдан: ${code}`
    : 'Проигрыш';
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const tgRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text })
    });

    if (!tgRes.ok) {
      const body = await tgRes.text();
      throw new Error(`Telegram error: ${tgRes.status} ${body}`);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Failed to send Telegram notification:', error.message);
    res.status(500).json({ ok: false, error: 'Failed to send Telegram notification' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Tic-tac-toe app running at http://localhost:${PORT}`);
});
