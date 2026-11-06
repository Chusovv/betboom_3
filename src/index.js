import { config } from './config.js';
import { createTwitchClient } from './twitch.js';
import { startTelegram, stopTelegram, broadcast } from './telegram.js';
import { Store } from './store.js';

// --- Валидация конфигурации ---
const errors = [];
if (!config.botToken) errors.push('BOT_TOKEN не задан в .env');
if (!config.adminId) errors.push('ADMIN_ID не задан в .env');
if (!config.streamers.length) errors.push('STREAMERS не задан (хотя бы один стример)');
if (errors.length) {
  console.error('❌ Ошибки конфигурации:');
  errors.forEach(e => console.error('  -', e));
  console.error('\nСоздайте .env на основе .env.example');
  process.exit(1);
}

const store = new Store(config.dataDir);

console.log('🔧 Конфигурация:');
console.log(`  Стримеры: ${config.streamers.join(', ')}`);
console.log(`  Twitch Nick: ${config.twitchNick}`);
console.log(`  TTL кэша ссылок: ${config.linkCacheTtlMin} мин`);
if (!config.twitchOauthToken) {
  console.warn('⚠️ TWITCH_OAUTH_TOKEN пуст — анонимное подключение (работает не для всех чатов)');
}

// --- Обработка сообщений из Twitch ---
function onTwitchMessage({ channel, username, displayName, message }) {
  const matches = message.match(config.betboomRegex) || [];
  if (matches.length === 0) return;

  const now = new Date().toISOString();
  for (const link of [...new Set(matches)]) {
    if (store.isNewLink(link, config.linkCacheTtlMin)) {
      console.log(`[${now}] 🎰 Новое колесо в #${channel} от ${displayName}: ${link}`);

      const text =
        `🎰 Найдено колесо фрибета!\n\n` +
        `📺 Стример: ${channel}\n` +
        `🔗 ${link}\n\n` +
        `Перейдите по ссылке, чтобы принять участие.`;

      broadcast(text);
      store.markLinkSent(link);
    } else {
      console.log(`[${now}] 🔁 Повтор ссылки, пропускаем: ${link}`);
    }
  }
}

// --- Подключение к Twitch ---
const clients = {};
for (const streamer of config.streamers) {
  const client = createTwitchClient(streamer, onTwitchMessage);
  client.connect().catch(err => {
    console.error(`❌ [${streamer}] Не удалось подключиться:`, err.message);
  });
  clients[streamer] = client;
}

// --- Периодическая очистка кэша ---
setInterval(() => {
  store.pruneLinkCache(config.linkCacheTtlMin * 2);
}, 60 * 60 * 1000); // каждый час

// --- Запуск Telegram ---
startTelegram().catch(e => {
  console.error('❌ Ошибка запуска Telegram:', e.message);
  process.exit(1);
});

// --- Graceful shutdown ---
process.once('SIGINT', () => {
  console.log('\n🛑 Остановка...');
  stopTelegram();
  for (const c of Object.values(clients)) c.disconnect();
  process.exit(0);
}