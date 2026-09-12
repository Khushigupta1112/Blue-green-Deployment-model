const http = require('http');
const os = require('os');

const PORT = process.env.PORT || 8081;
const ENV_NAME = 'Blue';
const VERSION = 'v1.0.0';
const COLOR = '#3b82f6';

let requestCount = 0;

const server = http.createServer((req, res) => {
  requestCount++;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Served-By', `${ENV_NAME}-${VERSION}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'UP',
      environment: ENV_NAME,
      version: VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
  }

  if (url.pathname === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      environment: ENV_NAME,
      version: VERSION,
      color: COLOR,
      description: 'Blue Environment - Primary Stable Release',
      totalRequestsHandled: requestCount,
      hostname: os.hostname(),
      timestamp: new Date().toISOString()
    }));
  }

  if (url.pathname === '/api/data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      environment: ENV_NAME,
      version: VERSION,
      color: COLOR,
      message: 'Data successfully fetched from BLUE (v1.0.0) Stable Backend',
      features: [
        'Core Banking Services',
        'Account Management v1',
        'Transaction History v1'
      ],
      timestamp: new Date().toISOString()
    }));
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'Active',
    environment: ENV_NAME,
    version: VERSION,
    color: COLOR,
    message: 'Welcome to Blue-Green Microservice (BLUE - v1.0.0)'
  }));
});

server.listen(PORT, () => {
  console.log(`[BLUE SERVICE] Running on http://localhost:${PORT} (Version: ${VERSION})`);
});
