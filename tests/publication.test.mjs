import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import test from 'node:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSite, canonical, sha256, validatePublication, writeData } from '../src/public.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'swarf-public-test-')); const generated = join(root, 'generated'); const projectRoot = join(generated, 'projects', 'sample-project');
  mkdirSync(projectRoot, { recursive: true }); const source = '# Sample approved project\n\nSafe public content.\n'; writeFileSync(join(projectRoot, 'index.mdx'), source);
  const project = { id: 'sample-project', slug: 'sample-project', digest: 'a'.repeat(64), metadata: { id: 'sample-project', title: 'Sample approved project', slug: 'sample-project', project_status: 'complete', resource_types: ['project'], domains: ['software'], summary: 'A safe approved sample.' }, source_files: [{ path: 'index.mdx', sha256: sha256(source) }] };
  const manifest = { format: 'swarf-publication-package/v1', preview: false, policy_version: '1.0.0', schema_version: '1.0.0', projects: [project] }; manifest.batch_digest = sha256(canonical(manifest));
  writeData(join(generated, 'publication-manifest.json'), manifest); writeData(join(generated, 'catalog.json'), { format: 'swarf-public-catalog/v1', schema_version: '1.0.0', batch_digest: manifest.batch_digest, projects: [{ ...project.metadata, digest: project.digest }] });
  return { root, generated, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('accepts an approved package and renders its sample project', () => {
  const item = fixture();
  try {
    assert.equal(validatePublication(item.root).ok, true);
    const result = buildSite(item.root); assert.equal(result.projects, 1);
    assert.match(readFileSync(join(item.root, 'dist', 'projects', 'sample-project', 'index.html'), 'utf8'), /Sample approved project/);
    assert.match(readFileSync(join(item.root, 'dist', 'catalog.json'), 'utf8'), /swarf-public-catalog/);
  } finally { item.cleanup(); }
});

test('detects a manual generated-content change', () => {
  const item = fixture();
  try { writeFileSync(join(item.generated, 'projects', 'sample-project', 'index.mdx'), '# Altered\n'); assert.match(validatePublication(item.root).findings.join('\n'), /drifted/); }
  finally { item.cleanup(); }
});

test('rejects previews and unexpected generated files', () => {
  const item = fixture();
  try {
    const manifestPath = join(item.generated, 'publication-manifest.json'); const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); manifest.preview = true; delete manifest.batch_digest; manifest.batch_digest = sha256(canonical(manifest)); writeData(manifestPath, manifest);
    writeFileSync(join(item.generated, 'manual-note.md'), 'This must come through the publisher.');
    const findings = validatePublication(item.root).findings.join('\n'); assert.match(findings, /Preview packages/); assert.match(findings, /Unexpected manual file/);
  } finally { item.cleanup(); }
});
