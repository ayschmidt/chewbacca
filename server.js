// JobCrush: a small zero-dependency Node server.
// Serves the swipe UI from /public and exposes a JSON API.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { normalizeProfile, buildPersona } = require('./lib/persona');
const { displaySkill } = require('./lib/skills');
const { searchJobs } = require('./lib/search');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC = path.join(__dirname, 'public');
const FORCE_DEMO = process.env.DEMO === '1';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req, max = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > max) { reject(new Error('Body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://x');
  let file = path.normalize(path.join(PUBLIC, decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUBLIC)) return send(res, 403, 'Forbidden', 'text/plain');
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) file = path.join(PUBLIC, 'index.html'); // SPA fallback
  send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/persona') {
      const profile = normalizeProfile(await readBody(req));
      const persona = buildPersona(profile);
      return send(res, 200, { profile, persona: { ...persona, superpowers: persona.superpowers.map(displaySkill) } });
    }
    if (req.method === 'POST' && req.url.startsWith('/api/jobs')) {
      const body = await readBody(req);
      const demo = FORCE_DEMO || new URL(req.url, 'http://x').searchParams.get('demo') === '1';
      return send(res, 200, await searchJobs(body, { demo }));
    }
    if (req.method === 'GET' && req.url === '/api/health') return send(res, 200, { ok: true });
    if (req.method === 'GET') return serveStatic(req, res);
    send(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    send(res, 400, { error: err.message });
  }
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`💘 JobCrush is live on http://localhost:${PORT}${FORCE_DEMO ? ' (demo mode)' : ''}`));
}

module.exports = server;
