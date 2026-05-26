#!/usr/bin/env node
/**
 * Validate a Mulby plugin directory for structure, manifest, and readiness.
 * Used by PR CI and can be run locally: node scripts/validate-plugin.js <plugin-name>
 *
 * Exit code 0 = all checks passed, 1 = has errors.
 * Output: JSON report to stdout.
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_MANIFEST_FIELDS = ['name', 'displayName', 'version', 'author', 'description'];
const REQUIRED_FILES = ['manifest.json', 'package.json'];
const RECOMMENDED_FILES = ['README.md', 'icon.png'];
const SEMVER_RE = /^\d+\.\d+\.\d+(-[\w.]+)?$/;

function validate(pluginName) {
  const repoRoot = process.cwd();
  const pluginDir = path.join(repoRoot, 'plugins', pluginName);
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(pluginDir)) {
    return { plugin: pluginName, passed: false, errors: [`Plugin directory not found: plugins/${pluginName}/`], warnings: [] };
  }

  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(pluginDir, file))) {
      errors.push(`Missing required file: ${file}`);
    }
  }

  for (const file of RECOMMENDED_FILES) {
    if (!fs.existsSync(path.join(pluginDir, file))) {
      warnings.push(`Missing recommended file: ${file}`);
    }
  }

  const manifestPath = path.join(pluginDir, 'manifest.json');
  let manifest = null;
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      errors.push(`manifest.json parse error: ${e.message}`);
    }
  }

  if (manifest) {
    for (const field of REQUIRED_MANIFEST_FIELDS) {
      if (!manifest[field] || (typeof manifest[field] === 'string' && !manifest[field].trim())) {
        errors.push(`manifest.json: missing or empty required field "${field}"`);
      }
    }

    if (manifest.version && !SEMVER_RE.test(manifest.version)) {
      errors.push(`manifest.json: version "${manifest.version}" is not valid semver (expected X.Y.Z)`);
    }

    if (!manifest.main) {
      warnings.push('manifest.json: "main" field not set (backend entry point)');
    }

    if (manifest.features && Array.isArray(manifest.features)) {
      for (const f of manifest.features) {
        if (!f.code) errors.push(`manifest.json: feature missing "code" field`);
      }
    } else {
      warnings.push('manifest.json: no "features" array defined');
    }
  }

  const pkgPath = path.join(pluginDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const scripts = pkg.scripts || {};
      if (!scripts.build) {
        errors.push('package.json: missing "build" script');
      }
      if (!scripts.pack) {
        errors.push('package.json: missing "pack" script');
      }
    } catch (e) {
      errors.push(`package.json parse error: ${e.message}`);
    }
  }

  const srcMain = path.join(pluginDir, 'src', 'main.ts');
  const srcMainJs = path.join(pluginDir, 'src', 'main.js');
  if (!fs.existsSync(srcMain) && !fs.existsSync(srcMainJs)) {
    warnings.push('Missing src/main.ts (or src/main.js) backend entry');
  }

  return {
    plugin: pluginName,
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

function checkIdConflicts(pluginName) {
  const repoRoot = process.cwd();
  const manifestPath = path.join(repoRoot, 'plugins', pluginName, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return [];

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch {
    return [];
  }

  const pluginId = manifest.id || manifest.name;
  if (!pluginId) return [];

  const conflicts = [];
  const pluginsDir = path.join(repoRoot, 'plugins');
  for (const other of fs.readdirSync(pluginsDir)) {
    if (other === pluginName) continue;
    const otherManifest = path.join(pluginsDir, other, 'manifest.json');
    if (!fs.existsSync(otherManifest)) continue;
    try {
      const om = JSON.parse(fs.readFileSync(otherManifest, 'utf8'));
      const otherId = om.id || om.name;
      if (otherId === pluginId) {
        conflicts.push(`ID conflict: "${pluginId}" is already used by plugins/${other}/`);
      }
    } catch {
      /* skip unreadable manifests */
    }
  }
  return conflicts;
}

function main() {
  const plugins = process.argv.slice(2);
  if (plugins.length === 0) {
    process.stderr.write('Usage: node scripts/validate-plugin.js <plugin-name> [plugin-name...]\n');
    process.exit(1);
  }

  const results = [];
  let allPassed = true;

  for (const name of plugins) {
    const result = validate(name);
    const idConflicts = checkIdConflicts(name);
    if (idConflicts.length > 0) {
      result.errors.push(...idConflicts);
      result.passed = false;
    }
    results.push(result);
    if (!result.passed) allPassed = false;
  }

  process.stdout.write(JSON.stringify(results.length === 1 ? results[0] : results, null, 2) + '\n');
  process.exit(allPassed ? 0 : 1);
}

main();
