// server.js - Ultra-lightweight zero-dependency local server & Kaggle API proxy

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

// Read .env if present for server-side fallbacks
function getEnvCredentials() {
  try {
    const text = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const creds = {};
    text.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1).trim();
        }
        creds[key] = val;
      }
    });
    return creds;
  } catch {
    return {};
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.mjs': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=UTF-8',
  '.env': 'text/plain; charset=UTF-8'
};

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  // CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Direct Kaggle Proxy Endpoint
  if (reqUrl.pathname === '/api/kaggle' || reqUrl.pathname === '/api/kaggle/view') {
    const ref = reqUrl.searchParams.get('ref') || reqUrl.searchParams.get('dataset');
    const search = reqUrl.searchParams.get('search') || reqUrl.searchParams.get('query') || 'sales';
    const sortBy = reqUrl.searchParams.get('sortBy') || 'votes';
    const filetype = reqUrl.searchParams.get('filetype') || 'csv';
    const pageSize = reqUrl.searchParams.get('pageSize') || '20';

    // Get auth from request header or .env file
    const envCreds = getEnvCredentials();
    let authHeader = req.headers['authorization'];

    if (!authHeader && envCreds.KAGGLE_USERNAME && envCreds.KAGGLE_KEY) {
      authHeader = 'Basic ' + Buffer.from(`${envCreds.KAGGLE_USERNAME}:${envCreds.KAGGLE_KEY}`).toString('base64');
    }

    if (!authHeader) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Kaggle credentials required. Add them in Settings or .env.' }));
      return;
    }

    const kagglePath = ref 
      ? `/api/v1/datasets/view/${encodeURI(ref)}`
      : `/api/v1/datasets/list?search=${encodeURIComponent(search)}&sortBy=${encodeURIComponent(sortBy)}&filetype=${encodeURIComponent(filetype)}&pageSize=${encodeURIComponent(pageSize)}`;

    const kaggleReq = https.request({
      hostname: 'www.kaggle.com',
      path: kagglePath,
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'User-Agent': 'ExcelCoach/1.0'
      }
    }, (kaggleRes) => {
      let body = '';
      kaggleRes.on('data', chunk => body += chunk);
      kaggleRes.on('end', () => {
        res.writeHead(kaggleRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(body);
      });
    });

    kaggleReq.on('error', (err) => {
      console.error('Kaggle proxy error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Failed to reach Kaggle: ${err.message}` }));
    });

    kaggleReq.end();
    return;
  }

  // 2. Static File Serving
  let filePath = path.join(__dirname, reqUrl.pathname === '/' ? 'index.html' : reqUrl.pathname);

  // Security check: stay within workspace
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`ExcelCoach AI Server running with native Kaggle Proxy on http://localhost:${PORT}`);
});
