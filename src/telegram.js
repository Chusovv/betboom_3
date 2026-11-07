import { Telegraf } from 'telegraf';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

// --- Локальное хранилище подписчиков ---
fs.mkdirSync(config.dataDir, { recursive: true });
const subsFile = path.join(config.dataDir, 'subscribers.json');

function loadSubscribers() {
  try {
    return new Set(JSON.parse(fs.readFileSync(subsFile, 'utf8')));
  } catch {
    return new Set();
  }
}
function saveSubscribers(subs) {
  fs.writeFileSync(subsFile, JSON.stringify([...subs], null, 2));
}

const subscribers = loadSubscribers();

// --- Telegram бот ---
const bot = new Telegraf(config.botToken);

bot.command('start', (ctx) => {
  subscribers.add(String(ctx.chat.id));
  saveSubscribers(subscribers);
  ctx.reply('✅ Подписка оформлена. Буду присылать ссылки на колеса фрибетов BetBoom.');
});

bot.command('stop', (ctx) => {
  subscribers.delete(String(ctx.chat.id));
  saveSubscribers(subscribers);
  ctx.reply('🔔 Подписка отменена.');
});

bot.command('status', (ctx) => {
  ctx.reply(
    `📊 Статус бота:\n` +
    `• Подписка: ${subscribers.has(String(ctx.chat.id)) ? '✅' : '❌'}\n` +
    `• Подписчиков: ${subscribers.size}\n` +
    `• Стримеров: ${config.streamers.join(', ') || '—'}\n` +
    `• TTL кэша ссылок: ${config.linkCacheTtlMin} мин`
  );
});

// --- Рассылка ---
export async function broadcast(text, extra = {}) {
  let sent = 0, failed = 0;
  for (const chatId of subscribers) {
    try {
      await bot.telegram.sendMessage(chatId, text, { disable_web_page_preview: true, ...extra });
      sent++;
    } catch (e) {
      failed++;
      if (e.message?.includes('blocked')) {
        subscribers.delete(chatId);
      }
    }
  }
  saveSubscribers(subscribers);
  console.log(`📨 Разослано: ${sent}, ошибок: ${failed}`);
}

export async function notifyAdmin(text, extra = {}) {
  try {
    await bot.telegram.sendMessage(config.adminId, text, { disable_web_page_preview: true, ...extra });
  } catch (e) {
    console.error('❌ Не удалось уведомить админа:', e.message);
  }
}

export function startTelegram() {
  return bot.launch().then(() => console.log('🤖 Telegram бот запущен'));
}

export function stopTelegram() {
  bot.stop('SIGINT');
}