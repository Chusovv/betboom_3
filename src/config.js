import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  // Telegram
  botToken: process.env.BOT_TOKEN || '',
  adminId: process.env.ADMIN_ID || '',

  // Ссылки на колёса фрибета BetBoom для мониторинга (через запятую или перенос строки)
  betboomWheelLinks: (process.env.BETBOOM_WHEEL_LINKS || '')
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(Boolean),

  // Интервал проверки состояния колёс (минуты)
  betboomWheelPollMin: Number(process.env.BETBOOM_WHEEL_POLL_MIN || 60),

  // TTL кэша ссылок (минуты) — чтобы не слать дубли
  linkCacheTtlMin: Number(process.env.LINK_CACHE_TTL_MIN || 60),

  // Папка для данных (подписчики, кэш ссылок, состояние колёс)
  dataDir: path.join(__dirname, '..', 'data'),
};