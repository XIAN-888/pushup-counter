const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8899;
const HOST = process.env.HOST || '0.0.0.0';
const PID_FILE = path.join(__dirname, 'server.pid');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, `http://${HOST}:${PORT}`).pathname);
  let filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statErr, stat) => {
    if (!statErr && stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`PushPulse 网页版已启动`);
  console.log(`电脑访问：http://localhost:${PORT}`);
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((name) => {
    (nets[name] || []).forEach((net) => {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`手机访问（需与电脑同一 Wi-Fi）：http://${net.address}:${PORT}`);
      }
    });
  });
  console.log('关闭此窗口即可停止服务。');
  try {
    fs.writeFileSync(PID_FILE, String(process.pid));
  } catch (_) {
    /* 写入失败不影响服务 */
  }
});

process.on('exit', () => {
  try {
    fs.unlinkSync(PID_FILE);
  } catch (_) {
    /* ignore */
  }
});
