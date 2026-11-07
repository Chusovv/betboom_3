import { config } from './config.js';
import { startTelegram, stopTelegram } from './telegram.js';
import { startWheelMonitor, stopWheelMonitor } from './wheel-monitor.js';
import fs from 'node:fs';
import path from 'node:path';

const errors = [];
if (!config.botToken) errors.push('BOT_TOKEN не задан в .env');
if (!config.adminId) errors.push('ADMIN_ID не задан в .env');
if (errors.length) {
  console.error('❌ Ошибки:', errors);
  process.exit(1);
}

const dataDir = path.resolve(path.dirname(new URL('./wheel-monitor.js', import.meta.url).pathname), '..', config.dataDir);
fs.mkdirSync(dataDir, { recursive: true });

console.log('🔧 Конфигурация:');
console.log(`  BOT Token: ${config.botToken ? '✅ Включён' : '❌ Нет'}`);
console.log(`  Admin ID: ${config.adminId ? '✅' : '❌'}`);
console.log(`  Ссылки на колёса: ${config.betboomWheelLinks.length}`);
console.log(`  Интервал проверки: ${config.betboomWheelPollMin} мин`);
console.log(`  Папка данных: ${dataDir}`);
if (!config.betboomWheelLinks.length) {
  console.log('⚠️ BETBOOM_WHEEL_LINKS пуст — мониторинг не запущен');
} else {
  console.log('✅ Монитор колёс запущен.');
}

// --- Запуск Telegram ---
startTelegram().catch(e => {
  console.error('❌ Ошибка запуска Telegram:', e.message);
  process.exit(1);
});

// --- Запуск монитора колёс Betboom ---
startWheelMonitor().catch(e => {
  console.error('❌ Ошибка запуска монитора колёс Betboom:', e.message);
});

// --- Graceful shutdown ---
process.once('SIGINT', () => {
  console.log('\n🛑 Остановка...');
  stopTelegram();
  stopWheelMonitor();
  process.exit(0);
});