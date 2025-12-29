import 'dotenv/config';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { setupTerminalHandler, destroyAllSessions } from './src/terminal-server/handler';

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
// --host <hostname> でバインドアドレスを指定（デフォルトは localhost）
const hostIndex = process.argv.indexOf('--host');
const hostname = hostIndex !== -1 && process.argv[hostIndex + 1]
  ? process.argv[hostIndex + 1]
  : 'localhost';

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // WebSocket server on /api/terminal path
  const wss = new WebSocketServer({ server, path: '/api/terminal' });
  setupTerminalHandler(wss);

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down server...');
    destroyAllSessions();
    wss.clients.forEach((client) => {
      client.close();
    });
    wss.close(() => {
      server.close(() => {
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  server.listen(port, hostname, () => {
    console.log(`> Server running on http://${hostname}:${port}`);
    console.log(`> WebSocket terminal available at ws://${hostname}:${port}/api/terminal`);
  });
});
