#!/usr/bin/env node

/**
 * Deployment script for Firebase Hosting, Functions, and Firestore
 * Usage: node deploy.js [options]
 * Options:
 *   --hosting-only    Deploy only hosting
 *   --functions-only  Deploy only functions
 *   --firestore-only  Deploy only firestore
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    return false;
  }
}

function checkFirebaseCLI() {
  try {
    execSync('firebase --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkFirebaseLogin() {
  try {
    execSync('firebase projects:list', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function buildFrontend() {
  log('📦 Building React frontend...', 'blue');
  const clientPath = path.join(__dirname, 'client');
  if (!fs.existsSync(path.join(clientPath, 'package.json'))) {
    log('❌ Client package.json not found!', 'red');
    return false;
  }
  
  process.chdir(clientPath);
  if (!exec('npm install')) {
    log('❌ Failed to install client dependencies', 'red');
    return false;
  }
  if (!exec('npm run build')) {
    log('❌ Failed to build client', 'red');
    return false;
  }
  process.chdir(__dirname);
  return true;
}

function buildFunctions() {
  log('🔨 Building Firebase Functions...', 'blue');
  const functionsPath = path.join(__dirname, 'functions');
  if (!fs.existsSync(path.join(functionsPath, 'package.json'))) {
    log('❌ Functions package.json not found!', 'red');
    return false;
  }
  
  process.chdir(functionsPath);
  if (!exec('npm install')) {
    log('❌ Failed to install functions dependencies', 'red');
    return false;
  }
  if (!exec('npm run build')) {
    log('❌ Failed to build functions', 'red');
    return false;
  }
  process.chdir(__dirname);
  return true;
}

function deployFirestore() {
  log('📤 Deploying Firestore rules and indexes...', 'blue');
  return exec('firebase deploy --only firestore');
}

function deployFunctions() {
  log('📤 Deploying Firebase Functions...', 'blue');
  return exec('firebase deploy --only functions');
}

function deployHosting() {
  log('📤 Deploying frontend to Firebase Hosting...', 'blue');
  return exec('firebase deploy --only hosting');
}

function main() {
  const args = process.argv.slice(2);
  const hostingOnly = args.includes('--hosting-only');
  const functionsOnly = args.includes('--functions-only');
  const firestoreOnly = args.includes('--firestore-only');

  log('🚀 Starting deployment to Firebase...\n', 'green');

  // Check prerequisites
  if (!checkFirebaseCLI()) {
    log('❌ Firebase CLI is not installed. Please install it with: npm install -g firebase-tools', 'red');
    process.exit(1);
  }

  if (!checkFirebaseLogin()) {
    log('❌ You are not logged in to Firebase. Please run: firebase login', 'red');
    process.exit(1);
  }

  let success = true;

  if (hostingOnly) {
    if (!buildFrontend()) {
      process.exit(1);
    }
    success = deployHosting();
  } else if (functionsOnly) {
    if (!buildFunctions()) {
      process.exit(1);
    }
    success = deployFunctions();
  } else if (firestoreOnly) {
    success = deployFirestore();
  } else {
    // Deploy everything
    if (!buildFrontend()) {
      process.exit(1);
    }
    if (!buildFunctions()) {
      process.exit(1);
    }
    
    success = deployFirestore() && deployFunctions() && deployHosting();
  }

  if (success) {
    log('\n✅ Deployment complete!', 'green');
    log('\nYour website is now live!', 'green');
    log('To view your Firebase project dashboard, visit: https://console.firebase.google.com/', 'blue');
  } else {
    log('\n❌ Deployment failed!', 'red');
    process.exit(1);
  }
}

main();
