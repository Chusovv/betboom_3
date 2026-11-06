import { config } from './config.js';
import { createTwitchClient } from './twitch.js';
import { startTelegram, stopTelegram, broadcast } from './telegram.js';

// --- Валидация конфигурации ---
const errors = [];
if (!config.botToken) errors.push('BOT_TOKEN не задан в .env');
if (!config.adminId) errors.push('ADMIN_ID не задан в .env');
if (!config.streamers.length) errors.push('STREAMERS не задан (хотя бы один стример)');
if (!config.keywords.length) errors.push('TWITCH_KEYWORDS не задан (хотя бы одно ключевое слово)');
if (errors.length) {
  console.error('❌ Ошибки конфигурации:');
  errors.forEach(e => console.error('  -', e));
  console.error('\nСоздайте .env на основе .env.example');
  process.exit(1);
}

console.log('🔧 Конфигурация:');
console.log(`  Стримеры: ${config.streamers.join(', ')}`);
console.log(`  Ключевые слова: ${config.keywords.join(', ')}`);
console.log(`  Twitch Nick: ${config.twitchNick}`);
if (!config.twitchOauthToken) {
  console.warn('⚠️ TWITCH_OAUTH_TOKEN пуст — анонимное подключение (работает не для всех чатов)');
}

// --- Обработка сообщений из Twitch ---
function onTwitchMessage({ channel, username, displayName, message }) {
  const lower = message.toLowerCase();
  const matchedKeyword = config.keywords.find(kw => lower.includes(kw));
  if (!matchedKeyword) return; // нет ключевого слова — игнорируем

  const text =
    `💬 Найдено ключевое слово\n\n` +
    `📺 Стример: ${channel}\n` +
    `👤 ${displayName}\n` +
    `🗣️ Ключевое слово: "${matchedKeyword}"\n\n` +
    `💬 ${message}`;

  console.log(`🎯 [#${channel}] "${matchedKeyword}" от ${displayName}: ${message.slice(0, 80)}...`);
  broadcast(text);
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
});