import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';

export const PUBLICATION_FORMAT = 'swarf-publication-package/v1';
const textExtensions = new Set(['.md', '.mdx', '.json', '.txt', '.svg']);
const sensitive = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i, /(?:ghp|github_pat)_[A-Za-z0-9_]{12,}/, /(?:api[_-]?key|token|password)\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{8,}/i, /\b(?:10\.|127\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.)\d{1,3}\.\d{1,3}\b/];
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export const canonical = (value) => JSON.stringify(sortValue(value));
const sortValue = (value) => Array.isArray(value) ? value.map(sortValue) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])])) : value;
export const writeData = (path, data) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`); };
const readData = (path) => JSON.parse(readFileSync(path, 'utf8'));
function filesUnder(root) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(root, entry.name); const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Generated publication contains a symlink: ${path}`);
    if (stat.isDirectory()) out.push(...filesUnder(path)); else if (stat.isFile()) out.push(path);
  }
  return out;
}
const inside = (root, path) => { const rel = relative(resolve(root), resolve(path)); return Boolean(rel) && !rel.startsWith(`..${sep}`) && rel !== '..'; };
export function validatePublication(root) {
  const generated = join(root, 'generated'); const manifestPath = join(generated, 'publication-manifest.json'); const findings = [];
  if (!existsSync(manifestPath)) return { ok: true, findings: [], projects: [], message: 'No generated publication package is present; the public site will render an empty state.' };
  let manifest;
  try { manifest = readData(manifestPath); } catch (error) { return { ok: false, findings: [`Invalid publication manifest: ${error.message}`], projects: [] }; }
  if (manifest.format !== PUBLICATION_FORMAT) findings.push(`Unexpected package format '${manifest.format}'.`);
  if (manifest.preview === true) findings.push('Preview packages cannot be accepted by the public repository.');
  const withDigest = { ...manifest }; delete withDigest.batch_digest;
  if (manifest.batch_digest !== sha256(canonical(withDigest))) findings.push('Publication manifest batch digest does not match its contents.');
  const expected = new Set(['publication-manifest.json', 'catalog.json']);
  const slugs = new Set();
  for (const project of manifest.projects ?? []) {
    if (!project?.id || !project?.slug || !project?.digest) { findings.push('Project manifest entry is missing id, slug, or digest.'); continue; }
    if (slugs.has(project.slug)) findings.push(`Duplicate public slug '${project.slug}'.`); slugs.add(project.slug);
    const sourceRoot = join(generated, 'projects', project.slug);
    for (const source of project.source_files ?? []) {
      if (!source.path || source.path.includes('..') || source.path.startsWith('/') || source.path.startsWith('\\')) { findings.push(`${project.slug}: invalid source path '${source.path}'.`); continue; }
      const path = join(sourceRoot, source.path);
      if (!inside(sourceRoot, path)) { findings.push(`${project.slug}: source escapes project root.`); continue; }
      expected.add(relative(generated, path).replaceAll('\\', '/'));
      if (!existsSync(path)) { findings.push(`${project.slug}: missing generated source '${source.path}'.`); continue; }
      const bytes = readFileSync(path); if (sha256(bytes) !== source.sha256) findings.push(`${project.slug}: generated source '${source.path}' has drifted.`);
      if (textExtensions.has(extname(path).toLowerCase())) for (const expression of sensitive) if (expression.test(bytes.toString('utf8'))) findings.push(`${project.slug}: generated source '${source.path}' contains a privacy or secret finding.`);
    }
  }
  try {
    for (const path of filesUnder(generated)) {
      const rel = relative(generated, path).replaceAll('\\', '/');
      if (!expected.has(rel)) findings.push(`Unexpected manual file in generated content: ${rel}.`);
    }
  } catch (error) { findings.push(error.message); }
  const catalogPath = join(generated, 'catalog.json');
  if (existsSync(catalogPath)) {
    try { const catalog = readData(catalogPath); if (catalog.batch_digest !== manifest.batch_digest) findings.push('Catalog does not match publication batch.'); }
    catch { findings.push('Catalog is not valid JSON.'); }
  } else findings.push('Publication package is missing generated/catalog.json.');
  return { ok: findings.length === 0, findings, projects: manifest.projects ?? [], manifest };
}
const html = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${html(title)} | SWARF</title><link rel="stylesheet" href="/styles.css"></head><body><header><a href="/">SWARF</a><nav><a href="/#projects">Projects</a><a href="/catalog.json">Catalog</a></nav></header><main>${body}</main><footer>Curated engineering and fabrication work.</footer></body></html>`;
export function buildSite(root, output = join(root, 'dist')) {
  const validation = validatePublication(root); if (!validation.ok) throw new Error(validation.findings.join('\n'));
  mkdirSync(output, { recursive: true }); const projects = validation.projects.map((project) => ({ ...project.metadata, digest: project.digest }));
  const catalog = { format: 'swarf-public-catalog/v1', schema_version: validation.manifest?.schema_version ?? '1.0.0', batch_digest: validation.manifest?.batch_digest ?? null, projects };
  writeData(join(output, 'catalog.json'), catalog);
  const cards = projects.length ? projects.map((project) => `<article><h2><a href="/projects/${html(project.slug)}/">${html(project.title)}</a></h2><p>${html(project.summary || '')}</p><p>${html((project.domains || []).join(', '))}</p></article>`).join('') : '<p>No public projects have been published yet.</p>';
  writeFileSync(join(output, 'index.html'), page('Home', `<h1>Simmons Workshop for Automation, Research &amp; Fabrication</h1><p>A curated public projection of approved SWARF work.</p><section id="projects"><h2>Projects</h2>${cards}</section>`));
  writeFileSync(join(output, 'styles.css'), 'body{font-family:system-ui,sans-serif;max-width:70ch;margin:auto;padding:1rem;line-height:1.5}header{display:flex;justify-content:space-between;border-bottom:1px solid #ccc;padding-bottom:1rem}nav a{margin-left:1rem}article{border:1px solid #ddd;padding:1rem;margin:1rem 0}footer{margin-top:3rem;color:#555}');
  for (const project of validation.projects) {
    const source = join(root, 'generated', 'projects', project.slug, 'index.mdx'); const sourceText = existsSync(source) ? readFileSync(source, 'utf8') : '';
    const body = `<a href="/">← All projects</a><article><h1>${html(project.metadata.title)}</h1><p>${html(project.metadata.summary || '')}</p><pre>${html(sourceText)}</pre></article>`;
    const target = join(output, 'projects', project.slug, 'index.html'); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, page(project.metadata.title, body));
  }
  return { output, catalog, projects: projects.length };
}
export function checkLinks(root) {
  const findings = [];
  for (const path of filesUnder(root).filter((item) => ['.md', '.mdx'].includes(extname(item)))) {
    const body = readFileSync(path, 'utf8'); for (const match of body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) if (match[1].startsWith('http')) continue; else if (match[1].startsWith('/')) continue; else if (!existsSync(resolve(dirname(path), match[1]))) findings.push(`${relative(root, path)} has missing local link ${match[1]}`);
  }
  return { ok: findings.length === 0, findings };
}
