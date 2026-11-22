// Мост: TikTok-Live-Connector -> ws://localhost:21213 в формате TikFinity ({event, data})
// Не запускай одновременно с TikFinity: оба занимают порт 21213.
const { WebcastPushConnection } = require('tiktok-live-connector');
const { WebSocketServer } = require('ws');
const username = process.argv[2];
const PORT = +(process.argv[3] || 21213);
if (!username) { console.log('Использование: node bridge.js ник_стримера [порт]'); process.exit(1); }
const wss = new WebSocketServer({ port: PORT });
wss.on('error', e => {
  if (e.code === 'EADDRINUSE') console.log(`❌ Порт ${PORT} занят (скорее всего открыт TikFinity). Закрой его или укажи другой порт: node bridge.js ${username} 21214 и ссылку игры ?ws=ws://localhost:21214/`);
  else console.log('❌ Ошибка сервера:', e.message);
  process.exit(1);
});
const send = (event, data) => { const s = JSON.stringify({ event, data }); wss.clients.forEach(c => c.readyState === 1 && c.send(s)); };
let conn = null, retry = null;
function scheduleRetry(sec) { if (retry) return; retry = setTimeout(() => { retry = null; start(); }, sec * 1000); }
function start() {
  if (conn) { try { conn.removeAllListeners(); conn.disconnect(); } catch (e) {} }
  conn = new WebcastPushConnection(username);
  ['chat', 'like', 'gift', 'follow', 'share', 'member'].forEach(ev => conn.on(ev, d => send(ev, d)));
  conn.on('disconnected', () => { console.log('Отключено, переподключаюсь…'); scheduleRetry(5); });
  conn.connect().then(s => console.log('✅ Подключено к эфиру, roomId', s.roomId))
    .catch(e => { console.log('❌ Не удалось подключиться, повтор через 10 с:', e.message || e); scheduleRetry(10); });
}
wss.on('listening', () => { console.log(`Игра должна слушать ws://localhost:${PORT}/`); start(); });
