#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateVersion() {
  const now = new Date();
  const month = now.getMonth() + 1; // getMonth() returns 0-11, we want 1-12
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  
  // For months 1-9, use single digit. For 10-12, use double digit
  const monthStr = month < 10 ? month.toString() : month.toString();
  
  return `RC${monthStr}${day}.${hours}${minutes}`;
}

function updatePackageJson(filePath) {
  try {
    const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const newVersion = generateVersion();
    packageJson.version = newVersion;
    
    fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`Updated ${filePath} to version: ${newVersion}`);
    return newVersion;
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    return null;
  }
}

// Update main package.json
const mainPackage = path.join(process.cwd(), 'package.json');
const version = updatePackageJson(mainPackage);

// Update mobile package.json if it exists
const mobilePackage = path.join(process.cwd(), 'musicsupplies_mobile', 'package.json');
if (fs.existsSync(mobilePackage)) {
  updatePackageJson(mobilePackage);
}

// Write version to a .env file for Vite to use
if (version) {
  const envContent = `VITE_APP_VERSION=${version}\n`;
  const envPath = path.join(process.cwd(), '.env');
  
  // Read existing .env if it exists
  let existingEnv = '';
  if (fs.existsSync(envPath)) {
    existingEnv = fs.readFileSync(envPath, 'utf8');
    // Remove existing VITE_APP_VERSION line if present
    existingEnv = existingEnv.split('\n')
      .filter(line => !line.startsWith('VITE_APP_VERSION='))
      .join('\n');
    if (existingEnv && !existingEnv.endsWith('\n')) {
      existingEnv += '\n';
    }
  }
  
  // Write updated .env
  fs.writeFileSync(envPath, existingEnv + envContent);
  console.log(`Updated .env with version: ${version}`);
  
  // Also write version.json to public directory for runtime checks
  const versionJson = {
    version: version,
    timestamp: new Date().toISOString(),
    build: Date.now()
  };
  
  // Create public directory if it doesn't exist
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const versionJsonPath = path.join(publicDir, 'version.json');
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionJson, null, 2));
  console.log(`Created public/version.json with version: ${version}`);
}

console.log(`Version update complete: ${version}`);
