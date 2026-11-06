import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  // Telegram
  botToken: process.env.BOT_TOKEN || '',
  adminId: process.env.ADMIN_ID || '',

  // Twitch
  twitchNick: (process.env.TWITCH_NICK || 'justinfan').trim().toLowerCase(),
  twitchOauthToken: (process.env.TWITCH_OAUTH_TOKEN || '').trim(),

  // Стримеры для отслеживания (через запятую)
  streamers: [...new Set(
    (process.env.STREAMERS || '')
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  )],

  // Ключевые слова для фильтрации (через запятую, регистронезависимо)
  keywords: [...new Set(
    (process.env.TWITCH_KEYWORDS || '')
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(Boolean)
  )],

  // Папка для данных (подписчики)
  dataDir: path.join(__dirname, '..', 'data'),
};