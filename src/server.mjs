import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';

const root = resolve(process.env.SWARF_PUBLIC_ROOT || process.cwd());
const dist = resolve(root, 'dist');
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 3102);
const types = { '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const send = (response, status, type, body) => { response.writeHead(status, { 'content-type': type, 'x-content-type-options': 'nosniff' }); response.end(body); };

const app = createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method || '')) return send(response, 405, 'application/json; charset=utf-8', '{"error":"method_not_allowed"}\n');
  const rawPath = new URL(request.url || '/', 'http://localhost').pathname;
  if (rawPath === '/healthz') return send(response, 200, 'application/json; charset=utf-8', '{"status":"ok","service":"swarf-public"}\n');
  let path;
  try { path = decodeURIComponent(rawPath); } catch { return send(response, 400, 'application/json; charset=utf-8', '{"error":"invalid_path"}\n'); }
  let target = resolve(dist, `.${path}`);
  if (target !== dist && !target.startsWith(`${dist}${sep}`)) return send(response, 403, 'application/json; charset=utf-8', '{"error":"forbidden"}\n');
  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
  if (!existsSync(target) || !statSync(target).isFile()) return send(response, 404, 'application/json; charset=utf-8', '{"error":"not_found"}\n');
  return send(response, 200, types[extname(target).toLowerCase()] || 'application/octet-stream', readFileSync(target));
});

app.listen(port, host, () => console.log(`SWARF Public listening on http://${host}:${port}`));
