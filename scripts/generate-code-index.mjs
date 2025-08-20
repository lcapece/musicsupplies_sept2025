#!/usr/bin/env node
/**
 * Code Index Generator
 * Scans project directories and builds a structured index of code artifacts.
 * - Frontend (src): TS/TSX/JS/JSX exports (default, named, types, interfaces, re-exports)
 * - Supabase Edge Functions: function directories with index.ts
 * - Supabase Migrations: SQL object creations (CREATE TABLE/FUNCTION/VIEW/etc.)
 * - Mobile (musicsupplies_mobile): TS/TSX/JS/JSX exports
 * - Launch (musicsupplies_launch): TS/TSX/JS/JSX exports
 *
 * Outputs:
 *  - code-index.json (structured JSON)
 *  - code-index.md (human-readable summary)
 *
 * No external deps. Node 16+ (fs/promises).
 */

import { promises as fs } from 'fs';
import path from 'path';

const ROOT = process.cwd();
const SEP = path.sep;

const ROOTS = [
  { dir: 'src', category: 'frontend', exts: ['.ts', '.tsx', '.js', '.jsx'] },
  { dir: path.join('supabase', 'functions'), category: 'edge_function', exts: ['.ts', '.tsx', '.js', '.jsx'] },
  { dir: path.join('supabase', 'migrations'), category: 'migration', exts: ['.sql'] },
  { dir: 'musicsupplies_mobile', category: 'mobile', exts: ['.ts', '.tsx', '.js', '.jsx'] },
  { dir: 'musicsupplies_launch', category: 'launch', exts: ['.ts', '.tsx', '.js', '.jsx'] },
];

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  '.vscode',
  '.github',
  'netlify',
  'server',
  'public',
  'Documentation_Deprecated',
  'cline-community',
  'supabase-mcp',
  'scripts', // avoid indexing this script
]);

function toPosix(p) {
  return p.split(path.sep).join('/');
}

async function walk(dir, includeExts) {
  const files = [];
  async function recurse(current) {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(entry.name)) continue;
        await recurse(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (includeExts.includes(ext)) {
          files.push(full);
        }
      }
    }
  }
  await recurse(path.join(ROOT, dir));
  return files;
}

function uniq(arr) {
  return [...new Set(arr)].filter(Boolean);
}

function extractTSExports(content) {
  const named = [];
  const types = [];
  const interfaces = [];
  const reexports = [];
  let defaultExport = false;
  let defaultName = null;

  // export default function [Name] ...
  for (const m of content.matchAll(/export\s+default\s+async?\s*function\s+([A-Za-z_][A-Za-z0-9_]*)?/g)) {
    defaultExport = true;
    if (m[1]) defaultName = m[1];
  }
  // export default class [Name] ...
  for (const m of content.matchAll(/export\s+default\s+class\s+([A-Za-z_][A-Za-z0-9_]*)?/g)) {
    defaultExport = true;
    if (m[1]) defaultName = m[1];
  }
  // export default SomeIdentifier;
  for (const m of content.matchAll(/export\s+default\s+([A-Za-z_][A-Za-z0-9_\.]*)\s*;?/g)) {
    defaultExport = true;
    if (!defaultName && m[1]) defaultName = m[1];
  }
  // export function name
  for (const m of content.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
    named.push(m[1]);
  }
  // export class name
  for (const m of content.matchAll(/export\s+(?:abstract\s+)?class\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
    named.push(m[1]);
  }
  // export const name = ...
  for (const m of content.matchAll(/export\s+(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/g)) {
    named.push(m[1]);
  }
  // export type Name
  for (const m of content.matchAll(/export\s+type\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
    types.push(m[1]);
  }
  // export interface Name
  for (const m of content.matchAll(/export\s+interface\s+([A-Za-z_][A-Za-z0-9_]*)/g)) {
    interfaces.push(m[1]);
  }
  // export { a as b, c, d as e }
  for (const m of content.matchAll(/export\s*{\s*([^}]+)\s*}/g)) {
    const inner = m[1]
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    for (const token of inner) {
      const asMatch = token.match(/^([A-Za-z_][A-Za-z0-9_]*)(\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/);
      if (asMatch) {
        const original = asMatch[1];
        const alias = asMatch[3] || null;
        reexports.push(alias || original);
      } else {
        // Fallback: push the raw token
        reexports.push(token);
      }
    }
  }

  return {
    defaultExport,
    defaultName: defaultName || null,
    namedExports: uniq(named),
    types: uniq(types),
    interfaces: uniq(interfaces),
    reexports: uniq(reexports)
  };
}

function extractSQLObjects(content) {
  const objects = [];
  const re = /create\s+(table|function|view|policy|trigger|index|schema|type|extension)\s+("?[\w\.]+"?)/gi;
  let m;
  while ((m = re.exec(content)) !== null) {
    const type = m[1].toLowerCase();
    let name = m[2];
    // strip quotes
    if (name.startsWith('"') && name.endsWith('"')) {
      name = name.slice(1, -1);
    }
    objects.push({ type, name });
  }
  return objects;
}

function guessComponentNameFromFile(fileBase) {
  // For React components, just return the PascalCase filename without extension
  return fileBase.replace(/\.[^.]+$/, '');
}

function detectEdgeFunctionName(posixPath) {
  // supabase/functions/<edgeName>/index.ts
  const m = posixPath.match(/^supabase\/functions\/([^\/]+)\/index\.(ts|tsx|js|jsx)$/);
  return m ? m[1] : null;
}

async function indexFile(filePathAbs, category) {
  const rel = path.relative(ROOT, filePathAbs);
  const posix = toPosix(rel);
  const ext = path.extname(rel).toLowerCase();
  const stat = await fs.stat(filePathAbs);
  const size = stat.size;

  let content = '';
  try {
    content = await fs.readFile(filePathAbs, 'utf8');
  } catch (e) {
    // Ignore unreadable files
    return null;
  }
  const lines = content.split(/\r?\n/).length;

  const item = {
    path: posix,
    ext,
    category,
    size,
    lines
  };

  if (category === 'migration' && ext === '.sql') {
    item.sqlObjects = extractSQLObjects(content);
  } else {
    // TS/JS analysis
    const exp = extractTSExports(content);
    item.defaultExport = exp.defaultExport;
    item.defaultName = exp.defaultName;
    item.namedExports = exp.namedExports;
    item.types = exp.types;
    item.interfaces = exp.interfaces;
    item.reexports = exp.reexports;

    // Attach inferred component name if default export present without name
    if (exp.defaultExport && !exp.defaultName) {
      const base = path.basename(rel);
      item.inferredDefaultName = guessComponentNameFromFile(base);
    }
    // Edge function detection
    if (category === 'edge_function') {
      const edgeName = detectEdgeFunctionName(posix);
      if (edgeName) {
        item.edgeFunctionName = edgeName;
      }
    }
  }

  return item;
}

function summarize(items) {
  const summary = {
    totalFiles: items.length,
    byCategory: {},
    byExt: {},
    edgeFunctions: new Set(),
    migrations: 0
  };
  for (const it of items) {
    summary.byCategory[it.category] = (summary.byCategory[it.category] || 0) + 1;
    summary.byExt[it.ext] = (summary.byExt[it.ext] || 0) + 1;
    if (it.category === 'edge_function' && it.edgeFunctionName) {
      summary.edgeFunctions.add(it.edgeFunctionName);
    }
    if (it.category === 'migration' && it.ext === '.sql') {
      summary.migrations += 1;
    }
  }
  summary.edgeFunctions = Array.from(summary.edgeFunctions).sort();
  return summary;
}

function renderMarkdown(index) {
  const { summary, items } = index;
  const lines = [];
  lines.push('# Code Index');
  lines.push('');
  lines.push(`Generated: ${index.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total files indexed: ${summary.totalFiles}`);
  lines.push('- By category:');
  for (const [k, v] of Object.entries(summary.byCategory)) {
    lines.push(`  - ${k}: ${v}`);
  }
  lines.push('- By extension:');
  for (const [k, v] of Object.entries(summary.byExt)) {
    lines.push(`  - ${k}: ${v}`);
  }
  if (summary.edgeFunctions.length) {
    lines.push(`- Edge functions (${summary.edgeFunctions.length}): ${summary.edgeFunctions.join(', ')}`);
  }
  lines.push('');
  lines.push('## Files');
  lines.push('');
  const sorted = [...items].sort((a, b) => a.path.localeCompare(b.path));
  for (const it of sorted) {
    const exportsBits = [];
    if (it.defaultExport) {
      exportsBits.push(`default${it.defaultName ? `:${it.defaultName}` : it.inferredDefaultName ? `:${it.inferredDefaultName}*` : ''}`);
    }
    if (it.namedExports?.length) exportsBits.push(`named:[${it.namedExports.join(', ')}]`);
    if (it.types?.length) exportsBits.push(`types:[${it.types.join(', ')}]`);
    if (it.interfaces?.length) exportsBits.push(`interfaces:[${it.interfaces.join(', ')}]`);
    if (it.reexports?.length) exportsBits.push(`reexports:[${it.reexports.join(', ')}]`);
    if (it.sqlObjects?.length) {
      const objs = it.sqlObjects.map(o => `${o.type}:${o.name}`).join(', ');
      exportsBits.push(`sql:[${objs}]`);
    }
    const meta = exportsBits.length ? ` — ${exportsBits.join(' ')}` : '';
    const suffix = it.edgeFunctionName ? ` (edge: ${it.edgeFunctionName})` : '';
    lines.push(`- ${it.path}${suffix}${meta}`);
  }
  lines.push('');
  lines.push('_* inferred from filename_');
  return lines.join('\n');
}

async function main() {
  const allItems = [];

  for (const root of ROOTS) {
    const absDir = path.join(ROOT, root.dir);
    try {
      const stat = await fs.stat(absDir);
      if (!stat.isDirectory()) continue;
    } catch {
      continue; // directory doesn't exist
    }

    const files = await walk(root.dir, root.exts);
    for (const fp of files) {
      const item = await indexFile(fp, root.category);
      if (item) allItems.push(item);
    }
  }

  const index = {
    generatedAt: new Date().toISOString(),
    root: toPosix(ROOT),
    summary: summarize(allItems),
    items: allItems
  };

  const jsonPath = path.join(ROOT, 'code-index.json');
  const mdPath = path.join(ROOT, 'code-index.md');

  await fs.writeFile(jsonPath, JSON.stringify(index, null, 2), 'utf8');
  await fs.writeFile(mdPath, renderMarkdown(index), 'utf8');

  console.log(`Wrote ${toPosix(path.relative(ROOT, jsonPath))} and ${toPosix(path.relative(ROOT, mdPath))}`);
}

main().catch(err => {
  console.error('Failed to generate code index:', err);
  process.exit(1);
});
