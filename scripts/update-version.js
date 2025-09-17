#!/usr/bin/env node

/**
 * Unified Version Update Script
 * Updates both package.json and public/version.json simultaneously
 * Usage: node scripts/update-version.js [new-version]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function updateVersion(newVersion) {
  if (!newVersion) {
    console.error('Error: Version number is required');
    console.log('Usage: node scripts/update-version.js [new-version]');
    console.log('Example: node scripts/update-version.js 827.256');
    process.exit(1);
  }

  const timestamp = new Date().toISOString();
  const buildNumber = Date.now();

  try {
    // Update package.json
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated package.json version to ${newVersion}`);

    // Update public/version.json
    const versionJsonPath = path.join(projectRoot, 'public', 'version.json');
    const versionData = {
      version: newVersion,
      timestamp: timestamp,
      build: buildNumber
    };
    fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n');
    console.log(`✅ Updated public/version.json to ${newVersion}`);

    console.log('');
    console.log(`🎉 Version successfully updated to ${newVersion}`);
    console.log(`   📦 package.json: ${newVersion}`);
    console.log(`   🌐 public/version.json: ${newVersion}`);
    console.log(`   ⏰ Timestamp: ${timestamp}`);
    console.log(`   🔨 Build: ${buildNumber}`);
    console.log('');
    console.log('💡 The version will be visible in the lower-left corner after page refresh.');

  } catch (error) {
    console.error('❌ Error updating version files:', error.message);
    process.exit(1);
  }
}

// Get version from command line argument
const newVersion = process.argv[2];
updateVersion(newVersion);
