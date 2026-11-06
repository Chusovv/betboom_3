import tmi from 'tmi.js';
import { config } from './config.js';

/**
 * Создаёт tmi-клиента для одного стримера.
 * При каждом сообщении в чате вызывает onMessage({ channel, username, displayName, message }).
 */
export function createTwitchClient(streamer, onMessage) {
  const identity = config.twitchOauthToken
    ? { username: config.twitchNick, password: config.twitchOauthToken }
    : { username: config.twitchNick, password: '' };

  const client = new tmi.Client({
    identity,
    connection: {
      secure: !!config.twitchOauthToken,
      port: config.twitchOauthToken ? 6697 : 6667,
      reconnect: true,
    },
    channels: [streamer],
  });

  client.on('message', (channel, tags, message, self) => {
    if (self) return;
    onMessage({
      channel: channel.slice(1), // убираем #
      username: tags.username || 'unknown',
      displayName: tags['display-name'] || tags.username || 'unknown',
      message,
    });
  });

  client.on('connected', (address, port) => {
    console.log(`✅ [${streamer}] Подключён (${address}:${port})`);
  });

  client.on('disconnected', (reason) => {
    console.log(`⚠️ [${streamer}] Отключён: ${reason}`);
  });

  client.on('error', (err) => {
    console.error(`❌ [${streamer}] Ошибка:`, err.message);
  });

  return client;
}