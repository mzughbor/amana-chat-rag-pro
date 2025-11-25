#!/usr/bin/env node

// Script to help fix database connection issues by suggesting direct connection URL
const fs = require('fs');
const path = require('path');

console.log('🔧 Database Connection Fix Helper');
console.log('================================');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envLocalPath = path.join(__dirname, '.env.local');

let envFilePath = null;
if (fs.existsSync(envLocalPath)) {
  envFilePath = envLocalPath;
  console.log('📁 Found .env.local file');
} else if (fs.existsSync(envPath)) {
  envFilePath = envPath;
  console.log('📁 Found .env file');
} else {
  console.log('❌ No .env or .env.local file found');
  process.exit(1);
}

// Read the file
const envContent = fs.readFileSync(envFilePath, 'utf8');
console.log(`\n📄 Reading from: ${envFilePath}`);

// Find DATABASE_URL (handle case where there might be multiple lines)
const lines = envContent.split('\n');
let databaseUrlLine = lines.find(line => line.startsWith('DATABASE_URL='));
if (!databaseUrlLine) {
  console.log('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

// Extract the URL value (remove DATABASE_URL= prefix)
const currentUrl = databaseUrlLine.replace('DATABASE_URL=', '').trim().replace(/"/g, '');
console.log(`\n🔗 Current DATABASE_URL: ${currentUrl}`);

// Check if it's using pooler
if (currentUrl.includes('pooler.supabase.com') && currentUrl.includes(':6543')) {
  console.log('\n⚠️  Detected Supabase Pooler connection (port 6543)');
  console.log('💡 Suggested fix: Switch to Direct Connection (port 5432)');

  // Extract components using a more flexible pattern
  const urlPattern = /postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)$/;
  const match = currentUrl.match(urlPattern);

  if (match) {
    const [, user, password, hostAndPort, databaseAndParams] = match;

    // Split host and port
    const [host] = hostAndPort.split(':');

    // Extract database name (before any query parameters)
    const database = databaseAndParams.split('?')[0];

    // Replace pooler host with direct host
    const projectId = host.split('.')[0]; // Extract project ID from pooler host
    const directHost = `${projectId}.db.supabase.co`;
    const directUrl = `postgresql://${user}:${password}@${directHost}:5432/${database}`;

    console.log(`\n🔧 Suggested DATABASE_URL (Direct Connection):`);
    console.log(directUrl);
    console.log('\n📝 To fix:');
    console.log('1. Update your .env or .env.local file');
    console.log('2. Replace the DATABASE_URL line with:');
    console.log(`   DATABASE_URL="${directUrl}"`);
    console.log('3. Restart your development server');
  } else {
    console.log('\n❌ Could not parse DATABASE_URL format');
    console.log('📝 Manual fix needed:');
    console.log('- Change port from 6543 to 5432');
    console.log('- Change host from "pooler.supabase.com" to ".db.supabase.co"');
    console.log('- Make sure to keep your project ID in the host name');
  }
} else {
  console.log('\n✅ Not using Supabase Pooler');
  console.log('💡 If you\'re still having connection issues, check:');
  console.log('- Database credentials (username/password)');
  console.log('- Network connectivity to the database server');
  console.log('- Supabase project status at https://app.supabase.com');
}