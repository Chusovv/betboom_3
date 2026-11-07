import { chromium } from 'playwright';
import { config } from './config.js';
import { broadcast } from './telegram.js';
import fs from 'node:fs';
import path from 'node:path';

const STATE_FILE = path.join(config.dataDir, 'wheel-state.json');

let state = {};
try {
  state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
} catch {
  state = {};
}

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// Кандидаты на «колёсо активно» — подбираются через DevTools на betboom.ru
const ACTIVE_SELECTORS = [
  'button:has-text("Принять участие")',
  'button:has-text("Участвовать")',
  'button:has-text("Играть")',
  '[data-testid="wheel-participate"]',
  '[data-testid="wheel-active"]',
];

async function isWheelActive(page) {
  for (const sel of ACTIVE_SELECTORS) {
    try {
      const el = page.locator(sel).first();
      if ((await el.count()) > 0 && (await el.isVisible().catch(() => false))) {
        return true;
      }
    } catch {
      // игнорируем ошибки селектора
    }
  }
  return false;
}

async function checkLink(link, page) {
  try {
    await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  } catch {
    await page.goto(link, { waitUntil: 'load', timeout: 45_000 });
  }

  await page.waitForTimeout(3_000);

  const active = await isWheelActive(page);
  const prev = state[link];

  if (active && prev !== 'active') {
    state[link] = 'active';
    saveState();

    const msg =
      `🎰 <b>Колёсо фрибета активировано!</b>\n\n` +
      `🔗 <a href="${link}">${link}</a>\n\n` +
      `Перейдите по ссылке, чтобы принять участие.`;

    await broadcast(msg, { parse_mode: 'HTML' });
    console.log(`[wheel-monitor] 🔔 Уведомление: ${link}`);
  } else if (!active) {
    state[link] = 'inactive';
  }
}

let browser = null;
let page = null;

export async function startWheelMonitor() {
  if (!config.betboomWheelLinks.length) {
    console.log('[wheel-monitor] Список ссылок пуст (BETBOOM_WHEEL_LINKS) — мониторинг не запущен');
    return () => {};
  }

  console.log(`[wheel-monitor] Запуск мониторинга ${config.betboomWheelLinks.length} ссылок...`);

  // Флаги для Linux-сервера (в т.ч. запуск от root)
  const launchArgs = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-setuid-sandbox',
    ],
  };

  browser = await chromium.launch(launchArgs);
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
  });
  page = await context.newPage();

  const pollMs = config.betboomWheelPollMin * 60 * 1000;

  async function tick() {
    console.log(`[wheel-monitor] 🔄 Проверка ${config.betboomWheelLinks.length} ссылок...`);
    for (const link of config.betboomWheelLinks) {
      await checkLink(link, page).catch(err => {
        console.error(`[wheel-monitor] ❌ Ошибка проверки ${link}:`, err.message);
      });
    }
    console.log(`[wheel-monitor] ✅ Проверка завершена. Следующая через ${config.betboomWheelPollMin} мин`);
  }

  await tick();

  const timer = setInterval(tick, pollMs);

  return () => clearInterval(timer);
}

export async function stopWheelMonitor() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}