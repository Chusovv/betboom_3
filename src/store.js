import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

/**
 * Простое JSON-хранилище:
 * - subscribers.json — список Telegram chat_id
 * - linkCache.json — кэш отправленных ссылок { link: { ts: timestamp } }
 */
export class Store {
  constructor(dataDir) {
    this.dataDir = dataDir;
    fs.mkdirSync(dataDir, { recursive: true });
  }

  _file(name) {
    return path.join(this.dataDir, name);
  }

  _read(name, def) {
    try {
      if (!fs.existsSync(this._file(name))) return def;
      return JSON.parse(fs.readFileSync(this._file(name), 'utf8'));
    } catch {
      return def;
    }
  }

  _write(name, data) {
    fs.writeFileSync(this._file(name), JSON.stringify(data, null, 2), 'utf8');
  }

  // --- Подписчики ---
  getSubscribers() {
    return new Set(this._read('subscribers.json', []));
  }

  addSubscriber(chatId) {
    const subs = this.getSubscribers();
    subs.add(String(chatId));
    this._write('subscribers.json', [...subs]);
    return subs.size;
  }

  removeSubscriber(chatId) {
    const subs = this.getSubscribers();
    subs.delete(String(chatId));
    this._write('subscribers.json', [...subs]);
    return subs.size;
  }

  isSubscribed(chatId) {
    return this.getSubscribers().has(String(chatId));
  }

  // --- Кэш ссылок ---
  getLinkCache() {
    return this._read('linkCache.json', {});
  }

  saveLinkCache(cache) {
    this._write('linkCache.json', cache);
  }

  /**
   * Проверяет, новая ли ссылка (не в кэше или устарела).
   * Возвращает true — если ссылку можно отправлять.
   */
  isNewLink(link, ttlMin) {
    const cache = this.getLinkCache();
    const entry = cache[link];
    if (!entry) return true;
    const ageMin = (Date.now() - entry.ts) / 1000 / 60;
    return ageMin > ttlMin;
  }

  markLinkSent(link) {
    const cache = this.getLinkCache();
    cache[link] = { ts: Date.now() };
    this.saveLinkCache(cache);
  }

  // Очистка старых записей
  pruneLinkCache(ttlMin) {
    const cache = this.getLinkCache();
    const ttlMs = ttlMin * 60 * 1000;
    let changed = false;
    for (const [link, entry] of Object.entries(cache)) {
      if (Date.now() - entry.ts > ttlMs) {
        delete cache[link];
        changed = true;
      }
    }
    if (changed) this.saveLinkCache(cache);
  }
}