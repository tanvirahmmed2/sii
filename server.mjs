import http from 'node:http';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.argv.includes('--dev') || (!process.argv.includes('--prod') && process.env.NODE_ENV !== 'production');
const hostname = process.env.HOST || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname: 'localhost', port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = http.createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    destroyUpgrade: false,
    cors: {
      origin: true,
      credentials: true,
    },
  });

  globalThis.__socketIoServer = io;

  const upgradeHandler = typeof app.getUpgradeHandler === 'function' ? app.getUpgradeHandler() : null;
  if (upgradeHandler) {
    server.on('upgrade', (req, socket, head) => {
      if (req.url && req.url.startsWith('/api/socketio')) return;
      upgradeHandler(req, socket, head);
    });
  }

  io.on('connection', (socket) => {
    socket.on('join_rooms', (rooms) => {
      if (!Array.isArray(rooms)) return;
      for (const room of rooms) {
        if (typeof room === 'string' && room.trim()) {
          socket.join(room.trim());
        }
      }
    });

    socket.on('leave_rooms', (rooms) => {
      if (!Array.isArray(rooms)) return;
      for (const room of rooms) {
        if (typeof room === 'string' && room.trim()) {
          socket.leave(room.trim());
        }
      }
    });

    socket.on('typing', (payload) => {
      if (!payload || typeof payload.room !== 'string' || !payload.room.trim()) return;
      socket.to(payload.room.trim()).emit('typing', {
        room: payload.room.trim(),
        senderName: payload.senderName || 'User',
        senderType: payload.senderType || 'user',
        isTyping: Boolean(payload.isTyping),
      });
    });
  });

  server.listen(port, hostname, () => {
    console.log(`Ready on http://localhost:${port} (${dev ? 'dev' : 'production'}) with Socket.IO`);
    const runLifecycleTick = () => {
      fetch(`http://127.0.0.1:${port}/api/marketing/lifecycle`).catch(() => {});
    };
    setTimeout(runLifecycleTick, 15000);
    setInterval(runLifecycleTick, 15 * 60 * 1000);
  });
});
