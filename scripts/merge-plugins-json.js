#!/usr/bin/env node
/**
 * Incrementally update plugins.json by merging new/updated plugin entries.
 *
 * Usage:
 *   node scripts/merge-plugins-json.js <new-entries.jsonl>
 *
 * Reads the existing plugins.json, merges entries from <new-entries.jsonl>
 * (one JSON object per line), and writes the updated plugins.json.
 *
 * Merge rules:
 * - Match by `name` field (fallback to `id`)
 * - Existing entry with same name → replace with new entry
 * - No existing entry with same name → append
 * - Entries not in the new JSONL → keep unchanged
 */

const fs = require('fs');
const path = require('path');

function main() {
  const jsonlPath = process.argv[2];
  if (!jsonlPath) {
    process.stderr.write('Usage: node scripts/merge-plugins-json.js <new-entries.jsonl>\n');
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const pluginsJsonPath = path.join(repoRoot, 'plugins.json');

  let existing = { version: '1.0.0', plugins: [] };
  if (fs.existsSync(pluginsJsonPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(pluginsJsonPath, 'utf8'));
    } catch {
      process.stderr.write('Warning: Failed to parse existing plugins.json, starting fresh\n');
    }
  }

  if (!fs.existsSync(jsonlPath)) {
    process.stderr.write(`JSONL file not found: ${jsonlPath}\n`);
    process.exit(1);
  }

  const lines = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n').filter(Boolean);
  const newEntries = lines.map((line) => JSON.parse(line));

  const pluginMap = new Map();
  for (const p of existing.plugins) {
    const key = p.name || p.id;
    if (key) pluginMap.set(key, p);
  }

  for (const entry of newEntries) {
    const key = entry.name || entry.id;
    if (key) {
      const prev = pluginMap.get(key);
      if (prev) {
        process.stderr.write(`  Updated: ${entry.displayName || key} (${prev.version} → ${entry.version})\n`);
      } else {
        process.stderr.write(`  Added: ${entry.displayName || key} (${entry.version})\n`);
      }
      pluginMap.set(key, entry);
    }
  }

  const merged = {
    version: existing.version || '1.0.0',
    plugins: [...pluginMap.values()],
  };

  fs.writeFileSync(pluginsJsonPath, JSON.stringify(merged, null, 2) + '\n');
  process.stderr.write(`plugins.json updated: ${merged.plugins.length} total plugins\n`);
}

main();
