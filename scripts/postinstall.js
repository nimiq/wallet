#!/usr/bin/env node

/**
 * Idempotent postinstall script that safely applies patches.
 *
 * This script checks if patches have already been applied before running patch-package.
 * This is necessary because postinstall-postinstall can cause the postinstall script
 * to run multiple times, and patch-package is not idempotent by default.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define the files we need to check for patches
const PATCH_CHECKS = [
  {
    name: '@vue/composition-api module.js',
    file: 'node_modules/@vue/composition-api/dist/vue-composition-api.module.js',
    marker: 'export { nonReactive };',
    // The marker should appear exactly once when properly patched
    expectedCount: 1,
  },
  {
    name: '@vue/composition-api index.d.ts',
    file: 'node_modules/@vue/composition-api/dist/index.d.ts',
    marker: "export { nonReactive } from './reactivity/reactive';",
    expectedCount: 1,
  },
];

/**
 * Check if a specific file has been patched correctly
 */
function checkPatchStatus(check) {
  const filePath = path.join(process.cwd(), check.file);

  if (!fs.existsSync(filePath)) {
    return { status: 'missing', count: 0 };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const count = (content.match(new RegExp(escapeRegExp(check.marker), 'g')) || []).length;

  if (count === 0) {
    return { status: 'not-patched', count: 0 };
  } else if (count === check.expectedCount) {
    return { status: 'patched', count };
  } else {
    return { status: 'corrupted', count };
  }
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check the status of all patches
 */
function checkAllPatches() {
  const results = PATCH_CHECKS.map(check => ({
    ...check,
    ...checkPatchStatus(check),
  }));

  const allPatched = results.every(r => r.status === 'patched');
  const anyCorrupted = results.some(r => r.status === 'corrupted');
  const anyMissing = results.some(r => r.status === 'missing');

  return { results, allPatched, anyCorrupted, anyMissing };
}

/**
 * Clean corrupted patches by removing and reinstalling the affected package
 */
function cleanCorruptedPatches() {
  console.log('🔧 Cleaning corrupted patches...');

  try {
    // Remove the corrupted package
    const packagePath = 'node_modules/@vue/composition-api';
    if (fs.existsSync(packagePath)) {
      fs.rmSync(packagePath, { recursive: true, force: true });
      console.log('   Removed corrupted package');
    }

    // Reinstall the package (yarn will restore it from cache)
    console.log('   Reinstalling package...');
    execSync('yarn install --check-files --force', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    console.log('✅ Package cleaned and reinstalled');
  } catch (error) {
    console.error('❌ Failed to clean corrupted patches:', error.message);
    throw error;
  }
}

/**
 * Apply patches using patch-package
 */
function applyPatches() {
  console.log('📦 Applying patches...');

  try {
    execSync('npx patch-package', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('✅ Patches applied successfully');
  } catch (error) {
    console.error('❌ Failed to apply patches:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Checking patch status...');

  const { results, allPatched, anyCorrupted, anyMissing } = checkAllPatches();

  // Display status of each patch
  results.forEach(result => {
    const statusIcon = {
      'patched': '✅',
      'not-patched': '⏳',
      'corrupted': '❌',
      'missing': '❓',
    }[result.status];

    console.log(`   ${statusIcon} ${result.name}: ${result.status} (marker found ${result.count}x)`);
  });

  // Determine action needed
  if (allPatched) {
    console.log('✅ All patches already applied correctly. Skipping patch-package.');
    return;
  }

  if (anyCorrupted) {
    console.log('⚠️  Corrupted patches detected (applied multiple times).');
    cleanCorruptedPatches();

    // After cleaning, check again
    const { allPatched: nowPatched } = checkAllPatches();
    if (!nowPatched) {
      applyPatches();
    } else {
      console.log('✅ Patches were restored from clean install.');
    }
    return;
  }

  if (anyMissing) {
    console.log('⚠️  Package files missing. This usually means a fresh install is in progress.');
    // Patches will be applied after the package is installed
    // We'll let this script run again via postinstall-postinstall
    return;
  }

  // Not patched yet - apply patches
  applyPatches();

  // Verify patches were applied correctly
  const { allPatched: verifyPatched, anyCorrupted: verifyCorrupted } = checkAllPatches();
  if (verifyPatched) {
    console.log('✅ Patches verified successfully');
  } else if (verifyCorrupted) {
    console.error('❌ Patches were applied but appear corrupted. This is unexpected.');
    console.error('   Please run: rm -rf node_modules && yarn install');
    process.exit(1);
  } else {
    console.error('❌ Patches were not applied correctly. Please check patch files.');
    process.exit(1);
  }
}

// Run the script
try {
  main();
} catch (error) {
  console.error('❌ Postinstall script failed:', error.message);
  process.exit(1);
}
