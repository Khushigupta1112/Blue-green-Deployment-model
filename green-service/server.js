const http = require('http');
const os = require('os');

const PORT = process.env.PORT || 8082;
const ENV_NAME = 'Green';
const VERSION = 'v2.0.0';
const COLOR = '#22c55e';

let requestCount = 0;

let chaosConfig = {
  injectError: false,
  injectLatency: false,
  errorRate: 100,
  latencyMs: 1500
};

const server = http.createServer(async (req, res) => {
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

  // Chaos Delay Simulation
  if (chaosConfig.injectLatency && url.pathname !== '/chaos/reset') {
    await new Promise(resolve => setTimeout(resolve, chaosConfig.latencyMs));
  }

  // Chaos Error Simulation
  if (chaosConfig.injectError && url.pathname !== '/chaos/reset' && !url.pathname.startsWith('/chaos')) {
    if (Math.random() * 100 <= chaosConfig.errorRate) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'SIMULATED_CHAOS_FAILURE',
        message: 'Simulated 500 Internal Error on GREEN v2.0.0 for testing automated rollback',
        environment: ENV_NAME,
        version: VERSION
      }));
    }
  }

  // Health check endpoint
  if (url.pathname === '/health') {
    if (chaosConfig.injectError) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'DOWN',
        environment: ENV_NAME,
        version: VERSION,
        reason: 'Chaos Fault Injected'
      }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'UP',
      environment: ENV_NAME,
      version: VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }));
  }

  // Chaos control API routes
  if (url.pathname === '/chaos/inject-error' && req.method === 'POST') {
    chaosConfig.injectError = true;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ message: 'Chaos Error Injection ENABLED on Green Service', chaosConfig }));
  }

  if (url.pathname === '/chaos/inject-latency' && req.method === 'POST') {
    chaosConfig.injectLatency = true;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ message: 'Chaos Latency Injection ENABLED on Green Service', chaosConfig }));
  }

  if (url.pathname === '/chaos/reset' && req.method === 'POST') {
    chaosConfig.injectError = false;
    chaosConfig.injectLatency = false;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ message: 'Chaos Fault Injection CLEARED on Green Service', chaosConfig }));
  }

  if (url.pathname === '/chaos/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(chaosConfig));
  }

  if (url.pathname === '/api/info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      environment: ENV_NAME,
      version: VERSION,
      color: COLOR,
      description: 'Green Environment - Next Gen Release v2.0',
      totalRequestsHandled: requestCount,
      chaosStatus: chaosConfig,
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
      message: 'Data successfully fetched from GREEN (v2.0.0) Upgraded Backend!',
      features: [
        'Core Banking Services v2',
        'Account Management v2',
        'Transaction History v2',
        'NEW: Real-time AI Fraud Shield',
        'NEW: Instant Multi-currency Conversion',
        'NEW: Biometric Security API'
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
    message: 'Welcome to Blue-Green Microservice (GREEN - v2.0.0 Next-Gen)'
  }));
});

server.listen(PORT, () => {
  console.log(`[GREEN SERVICE] Running on http://localhost:${PORT} (Version: ${VERSION})`);
});
