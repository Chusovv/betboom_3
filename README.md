# BetBoom Wheel Monitor

Мониторинг состояния колёс фрибета на BetBoom.ru с отправкой уведомлений в Telegram.

## Установка на сервере (Ubuntu/Debian)

```bash
# 1. Клонировать проект
sudo apt-get install -y git
cd /opt
https://github.com/username/bot-v2.git

# 2. Сменить владельца (необязательно)
sudo chown -R youruser:yourgroup bot-v2
cd bot-v2

# 3. Установить зависимости (Node.js 18+ уже должен быть)
npm install

# 4. Установить системные зависимости для Playwright (нужно Chromium + библиотеки)
npm run install-deps

# 5. Создать .env на основе .env.example
# 6. Запустить бота
cd bot-v2
node src/index.js
```

## Конфигурация (.env)

| Переменная | Описание | Пример |
|----------|-------------|---------|
| `BOT_TOKEN` | Токен Telegram-бота от @BotFather | `123456789:ABC-...` |
| `ADMIN_ID` | Ваш Telegram ID (узнать в @userinfobot) | `987654321` |
| `BETBOOM_WHEEL_LINKS` | Ссылки на колёса через запятую | `https://betboom.ru/freestream/nix1,https://betboom.ru/freestream/nix2` |
| `BETBOOM_WHEEL_POLL_MIN` | Интервал проверки ссылок (минуты) | `60` (рекомендуется 120+ для большого количества ссылок) |
| `LINK_CACHE_TTL_MIN` | TTL кэша ссылок (минуты) | `60` |
| `TELEGRAM_PROXY` *(необязательно)* | Прокси для Telegram API | `socks5://127.0.0.1:1080` |

## Запуск как systemd-сервиса (автоматический перезапуск)

Создай файл `/etc/systemd/system/betboom-wheel.service`:

```ini
[Unit]
Description=BetBoom Wheel Monitor Bot
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/opt/bot-v2
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

Затем:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now betboom-wheel
sudo journalctl -u betboom-wheel -f
```

## Как пользоваться

1. Подпишись на бота: `/start`
2. По каждой подписке бот будет рассылать уведомления, когда колесо на любой ссылке из `BETBOOM_WHEEL_LINKS` станет активным.

## Типичные ошибки на сервере

| Ошибка | Причина | Решение |
|---------|--------|--------|
| ` playwright: Executable doesn't exist...` | Playwright не нашёл Chromium binary (часто из-за пути, установленного в .env) | Запустить `npm run install-deps` еще раз, убедиться, что Chromium найден. Также гарантирует, что `CRONY_PATH` или `PLAYWRIGHT_BROWSERS_PATH` выглядят правильно. |
| `Error: getaddrinfo ENOTFOUND api.telegram.org` | Нет доступа к Telegram API | Настроить `TELEGRAM_PROXY` или подключиться к VPN |
| `EACCES: разрешено только root` | Запущен от root, Chrome sandbox не разрешён | `args: ['--no-sandbox', ...]` уже есть в `wheel-monitor.js` |
| Бот вылетает через час | Безопастность Node или завис задачи | systemd будет перезапускать автоматически |

## Конфигурация на свое усмотрение

- **Количество ссылок:** `BETBOOM_WHEEL_LINKS` может включать в себя 300+ ссылок. Для большого количества ссылок используйте `BETBOOM_WHEEL_POLL_MIN` >= 120 минут, чтобы избежать перегрузки браузера и site.
- **Кэширование подписчиков:** Хранится локально в `data/subscribers.json`. Удаление файла → перезапуск бота → все заново.
- **Резервное копирование:** Копируй директорию `data/` и добавляй в резервное хранилище периодически.
- **Диспетчер ошибок:** Все ошибки пишутся в консоль. Переподключи `node src/index.js`, если не видишь логи.

## Безопасность

- `BOT_TOKEN` и `ADMIN_ID` храни в `.env` и установи права 600 (`chmod 600 .env`)
- На сервере рассканируй `.env` и выключи локальный firewall для 127.0.0.1:8080, если будешь использовать
- После изменения конфигурации `node src/index.js` будет наблюдать автоматические изменения и перезапуститься сразу
- Разреши пользователю/агенту доступ к `data/` только для чтения/записи
- Если нужно более, чем уведомления (авто-участ), установи пользовательский cookie BetBoom и добавь его в `playwright` context

## Благодарности

Все необходимые функции рефакторингов: (удаление Twitch, упрощение конфигурации) сделаны Солнцепёк.

Этот проект предоставлен сообществу под BSD-3 заголовком.