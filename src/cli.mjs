#!/usr/bin/env node
import { resolve } from 'node:path';
import { buildSite, checkLinks, validatePublication } from './public.mjs';

const root = resolve(process.cwd()); const [command = 'help'] = process.argv.slice(2);
try {
  if (command === 'validate') { const result = validatePublication(root); console.log(JSON.stringify(result, null, 2)); if (!result.ok) process.exitCode = 1; }
  else if (command === 'build') console.log(JSON.stringify(buildSite(root), null, 2));
  else if (command === 'link-check') { const result = checkLinks(root); console.log(JSON.stringify(result, null, 2)); if (!result.ok) process.exitCode = 1; }
  else if (command === 'dev') { console.log('Run pnpm build, then serve dist/ with any static file server. Public development never needs private access.'); }
  else console.log('Commands: validate, build, link-check, dev');
} catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
