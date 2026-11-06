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

  // Регулярка для ссылок на колеса фрибетов BetBoom
  betboomRegex: /https?:\/\/(?:www\.)?betboom\.ru\/freestream\/[a-zA-Z0-9_-]+(?:\?[^\s]*)?(?:#[^\s]*)?/i,

  // TTL кэша ссылок (минуты) — чтобы не слать дубли
  linkCacheTtlMin: Number(process.env.LINK_CACHE_TTL_MIN || 60),

  // Папка для данных (подписчики, кэш ссылок)
  dataDir: path.join(__dirname, '..', 'data'),
};