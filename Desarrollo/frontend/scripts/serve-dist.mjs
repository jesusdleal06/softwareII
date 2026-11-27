#!/usr/bin/env node
/*
 * Serves the production build the way Vercel does for this project, so the CSP and the
 * other security headers can be verified before deploying (CP-RNF03-04):
 *
 *   - every response (static, SPA fallback, proxy and 404) receives the `headers` declared
 *     in vercel.json;
 *   - the SPA rewrite `/(.*)` -> `/index.html` is applied for unknown GET/HEAD paths;
 *   - `/api/*` is proxied to API_TARGET (default http://localhost:8091) so the SPA talks to
 *     the isolated e2e backend through the same origin, exactly like production.
 *
 * Usage: node scripts/serve-dist.mjs [--port 4391] [--dist dist/villadent-frontend/browser]
 * Env:   PORT, DIST_DIR, API_TARGET, HOST
 */
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(here, '..');

function argValue(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const port = Number(argValue('port', process.env.PORT ?? 4391));
const host = argValue('host', process.env.HOST ?? '127.0.0.1');
const distDir = resolve(argValue('dist', process.env.DIST_DIR ?? resolve(root, 'dist/villadent-frontend/browser')));
const apiTarget = new URL(process.env.API_TARGET ?? 'http://localhost:8091');
const vercel = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

// Vercel source -> RegExp. Covers the forms used in this repository: `/(.*)`, `:path*`
// and plain paths. Anything unsupported simply does not match, which fails closed.
function sourcePattern(source) {
  if (source === '/(.*)') return /^\/(?:.*)?$/;
  if (source.endsWith('/:path*')) {
    const base = source.slice(0, -'/:path*'.length);
    return new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\/.*)?$`);
  }
  return new RegExp(`^${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}

const headerRules = (vercel.headers ?? []).map((rule) => ({
  pattern: sourcePattern(rule.source),
  headers: rule.headers ?? [],
}));

function securityHeaders(pathname) {
  const result = new Map();
  for (const rule of headerRules) {
    if (!rule.pattern.test(pathname)) continue;
    for (const { key, value } of rule.headers) {
      result.set(key.toLowerCase(), value);
    }
  }
  return result;
}

function applyHeaders(res, pathname) {
  for (const [key, value] of securityHeaders(pathname)) {
    // Vercel owns these on the proxy hop; forwarding them verbatim would break framing.
    if (key === 'content-length' || key === 'transfer-encoding' || key === 'connection') continue;
    res.setHeader(key, value);
  }
}

function resolveStatic(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const candidate = resolve(distDir, `.${decoded}`);
  if (candidate !== distDir && !candidate.startsWith(distDir + sep)) return null;
  if (!existsSync(candidate)) return null;
  const stats = statSync(candidate);
  if (stats.isDirectory()) {
    const index = resolve(candidate, 'index.html');
    return existsSync(index) ? index : null;
  }
  return candidate;
}

function sendFile(req, res, pathname, file) {
  applyHeaders(res, pathname);
  res.setHeader('content-type', MIME[extname(file).toLowerCase()] ?? 'application/octet-stream');
  res.setHeader('content-length', statSync(file).size);
  res.statusCode = 200;
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
}

function sendBody(req, res, pathname, status, body, contentType) {
  applyHeaders(res, pathname);
  res.statusCode = status;
  res.setHeader('content-type', contentType);
  res.setHeader('content-length', Buffer.byteLength(body));
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  res.end(body);
}

function proxyApi(req, res) {
  const upstream = new URL(apiTarget.href);
  const transport = upstream.protocol === 'https:' ? httpsRequest : httpRequest;
  // Keep the browser's Host so the API sees a same-origin request, like a reverse proxy
  // that forwards Host. Spring's CORS filter rejects a foreign Origin otherwise.
  const headers = { ...req.headers };
  delete headers.connection;
  headers.host = req.headers.host;
  const proxyReq = transport(
    {
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || (upstream.protocol === 'https:' ? 443 : 80),
      method: req.method,
      path: req.url,
      headers,
    },
    (proxyRes) => {
      // The Vercel headers rule also matches `/api/*` (source `/(.*)`), so the proxy
      // response gets the same headers as everything else.
      applyHeaders(res, req.url);
      res.statusCode = proxyRes.statusCode ?? 502;
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        const lower = key.toLowerCase();
        if (lower === 'transfer-encoding' || lower === 'connection' || lower === 'content-length') continue;
        if (securityHeaders(req.url).has(lower)) continue;
        if (Array.isArray(value)) {
          for (const item of value) res.appendHeader(key, item);
        } else if (value !== undefined) {
          res.setHeader(key, value);
        }
      }
      proxyRes.pipe(res);
    },
  );
  proxyReq.on('error', (error) => {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    sendBody(req, res, req.url, 502, `Bad gateway: ${error.message}\n`, 'text/plain; charset=utf-8');
  });
  req.pipe(proxyReq);
}

const server = createServer((req, res) => {
  const pathname = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname;

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    proxyApi(req, res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendBody(req, res, pathname, 405, 'Method not allowed\n', 'text/plain; charset=utf-8');
    return;
  }

  const file = resolveStatic(pathname);
  if (file) {
    sendFile(req, res, pathname, file);
    return;
  }

  // SPA rewrite from vercel.json: everything unknown renders the shell.
  const fallback = resolve(distDir, 'index.html');
  if (existsSync(fallback)) {
    sendFile(req, res, pathname, fallback);
    return;
  }

  sendBody(req, res, pathname, 404, 'Not found\n', 'text/plain; charset=utf-8');
});

server.listen(port, host, () => {
  console.log(`serve-dist: http://${host}:${port} (dist: ${distDir}, api: ${apiTarget.href})`);
  const rules = vercel.headers ?? [];
  console.log(`serve-dist: applying ${headerRules.length} header rule(s): ${rules.map((r) => r.source).join(', ') || 'none'}`);
});
