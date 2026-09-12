const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;

const BLUE_TARGET = { host: 'localhost', port: 8081, name: 'BLUE (v1.0.0)' };
const GREEN_TARGET = { host: 'localhost', port: 8082, name: 'GREEN (v2.0.0)' };

let routerState = {
  mode: 'BLUE', // BLUE, GREEN, or CANARY
  blueWeight: 100,
  greenWeight: 0,
  autoRollbackEnabled: true,
  consecutiveFailuresThreshold: 3
};

let metrics = {
  totalRequests: 0,
  blueRequests: 0,
  greenRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  recentLatencies: [],
  recentStatuses: [],
  blueHealth: 'UNKNOWN',
  greenHealth: 'UNKNOWN',
  lastRollbackEvent: null,
  logs: []
};

function addLog(message, type = 'info') {
  const entry = {
    timestamp: new Date().toLocaleTimeString(),
    message,
    type
  };
  metrics.logs.unshift(entry);
  if (metrics.logs.length > 50) metrics.logs.pop();
  console.log(`[ROUTER ${type.toUpperCase()}] ${message}`);
}

let greenFailureCount = 0;

function checkHealth() {
  // Check Blue Health
  const reqBlue = http.get(`http://localhost:8081/health`, (res) => {
    metrics.blueHealth = res.statusCode === 200 ? 'UP' : 'DOWN';
  });
  reqBlue.on('error', () => { metrics.blueHealth = 'DOWN'; });
  reqBlue.setTimeout(2000, () => reqBlue.destroy());

  // Check Green Health
  const reqGreen = http.get(`http://localhost:8082/health`, (res) => {
    if (res.statusCode === 200) {
      metrics.greenHealth = 'UP';
      greenFailureCount = 0;
    } else {
      metrics.greenHealth = 'DOWN';
      handleGreenHealthDegradation(`Health check returned HTTP status ${res.statusCode}`);
    }
  });
  reqGreen.on('error', () => {
    metrics.greenHealth = 'DOWN';
    handleGreenHealthDegradation('Green service connection offline / refused');
  });
  reqGreen.setTimeout(2000, () => reqGreen.destroy());
}

function handleGreenHealthDegradation(reason) {
  greenFailureCount++;
  if (routerState.autoRollbackEnabled && (routerState.mode === 'GREEN' || routerState.greenWeight > 0)) {
    if (greenFailureCount >= routerState.consecutiveFailuresThreshold) {
      triggerAutomaticRollback(reason);
    }
  }
}

function triggerAutomaticRollback(reason) {
  addLog(`🚨 AUTOMATED ROLLBACK TRIGGERED: ${reason}. Instantly routing 100% traffic to BLUE!`, 'danger');
  routerState.mode = 'BLUE';
  routerState.blueWeight = 100;
  routerState.greenWeight = 0;
  metrics.lastRollbackEvent = {
    timestamp: new Date().toISOString(),
    reason: reason
  };
  forwardControlRequest(GREEN_TARGET.port, '/chaos/reset', 'POST', () => {});
}

function forwardControlRequest(port, reqPath, method, callback) {
  const req = http.request({ host: 'localhost', port, path: reqPath, method, headers: { 'Content-Type': 'application/json' } }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try { callback(null, JSON.parse(body)); } catch(e) { callback(null, { body }); }
    });
  });
  req.on('error', (err) => callback(err));
  req.end();
}

setInterval(checkHealth, 3000);
checkHealth();

const dashboardPath = path.join(__dirname, '../dashboard/public/index.html');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Serve Dashboard HTML
  if (pathname === '/' || pathname === '/index.html') {
    fs.readFile(dashboardPath, (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Dashboard file not found');
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // Proxy Configuration & Stats API
  if (pathname === '/proxy/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      routerState,
      metrics: {
        totalRequests: metrics.totalRequests,
        blueRequests: metrics.blueRequests,
        greenRequests: metrics.greenRequests,
        successfulRequests: metrics.successfulRequests,
        failedRequests: metrics.failedRequests,
        blueHealth: metrics.blueHealth,
        greenHealth: metrics.greenHealth,
        lastRollbackEvent: metrics.lastRollbackEvent
      },
      logs: metrics.logs.slice(0, 20)
    }));
  }

  // Traffic Switch API
  if (pathname === '/proxy/switch' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { mode, blueWeight, greenWeight } = payload;
        if (mode === 'BLUE') {
          routerState.mode = 'BLUE';
          routerState.blueWeight = 100;
          routerState.greenWeight = 0;
        } else if (mode === 'GREEN') {
          routerState.mode = 'GREEN';
          routerState.blueWeight = 0;
          routerState.greenWeight = 100;
        } else if (mode === 'CANARY') {
          routerState.mode = 'CANARY';
          routerState.blueWeight = typeof blueWeight === 'number' ? blueWeight : 80;
          routerState.greenWeight = typeof greenWeight === 'number' ? greenWeight : 20;
        }
        addLog(`Traffic switched to ${routerState.mode} (Blue: ${routerState.blueWeight}%, Green: ${routerState.greenWeight}%)`, 'success');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, routerState }));
      } catch(e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Toggle Auto Rollback API
  if (pathname === '/proxy/auto-rollback/toggle' && req.method === 'POST') {
    routerState.autoRollbackEnabled = !routerState.autoRollbackEnabled;
    addLog(`Automated Rollback setting changed to: ${routerState.autoRollbackEnabled}`, 'warning');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ autoRollbackEnabled: routerState.autoRollbackEnabled }));
  }

  // Chaos Proxies
  if (pathname === '/proxy/chaos/green-error' && req.method === 'POST') {
    forwardControlRequest(GREEN_TARGET.port, '/chaos/inject-error', 'POST', (err, data) => {
      if (err) { res.writeHead(500); return res.end(JSON.stringify({ error: 'Failed to contact Green' })); }
      addLog('CHAOS INJECTED: Green Service error rate set to 100%', 'danger');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    });
    return;
  }

  if (pathname === '/proxy/chaos/green-latency' && req.method === 'POST') {
    forwardControlRequest(GREEN_TARGET.port, '/chaos/inject-latency', 'POST', (err, data) => {
      if (err) { res.writeHead(500); return res.end(JSON.stringify({ error: 'Failed to contact Green' })); }
      addLog('CHAOS INJECTED: Green Service high latency set to 1500ms', 'warning');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    });
    return;
  }

  if (pathname === '/proxy/chaos/reset' && req.method === 'POST') {
    forwardControlRequest(GREEN_TARGET.port, '/chaos/reset', 'POST', (err, data) => {
      if (err) { res.writeHead(500); return res.end(JSON.stringify({ error: 'Failed to contact Green' })); }
      addLog('CHAOS CLEARED: Green Service running normally', 'info');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    });
    return;
  }

  // Proxy Dynamic Routing Engine for /api/* and all other paths
  metrics.totalRequests++;

  let selectedTarget;
  if (routerState.mode === 'BLUE') {
    selectedTarget = BLUE_TARGET;
  } else if (routerState.mode === 'GREEN') {
    selectedTarget = GREEN_TARGET;
  } else {
    const random = Math.random() * 100;
    selectedTarget = random < routerState.greenWeight ? GREEN_TARGET : BLUE_TARGET;
  }

  if (selectedTarget === BLUE_TARGET) metrics.blueRequests++;
  else metrics.greenRequests++;

  const startTime = Date.now();

  const options = {
    hostname: selectedTarget.host,
    port: selectedTarget.port,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${selectedTarget.port}` }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const duration = Date.now() - startTime;

    metrics.recentLatencies.push(duration);
    if (metrics.recentLatencies.length > 50) metrics.recentLatencies.shift();

    metrics.recentStatuses.push(proxyRes.statusCode);
    if (metrics.recentStatuses.length > 50) metrics.recentStatuses.shift();

    if (proxyRes.statusCode >= 200 && proxyRes.statusCode < 400) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
      if (selectedTarget === GREEN_TARGET) {
        handleGreenHealthDegradation(`Service returned HTTP error ${proxyRes.statusCode}`);
      }
    }

    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      'X-Proxy-Routed-To': selectedTarget.name,
      'X-Proxy-Latency-Ms': duration
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    metrics.failedRequests++;
    if (selectedTarget === GREEN_TARGET) {
      handleGreenHealthDegradation(`Proxy request failed: ${err.message}`);
    }
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'BAD_GATEWAY',
      message: `Failed to proxy request to target ${selectedTarget.name}`,
      details: err.message
    }));
  });

  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
});

addLog('Smart Router initialized with Blue (100%) and Green (0%)', 'info');

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`[SMART ROUTER & CONTROL DASHBOARD] Active on http://localhost:${PORT}`);
  console.log(`-> Blue Target: http://localhost:8081`);
  console.log(`-> Green Target: http://localhost:8082`);
  console.log(`=======================================================`);
});
