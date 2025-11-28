// Simple test to check if DATABASE_URL is properly loaded
const fs = require('fs');
const path = require('path');

// Read .env file directly
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

console.log('Environment file content:');
console.log(envContent);

// Check if DATABASE_URL is present
if (envContent.includes('DATABASE_URL')) {
  console.log('✅ DATABASE_URL found in .env file');
} else {
  console.log('❌ DATABASE_URL not found in .env file');
}

// Extract DATABASE_URL
const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
if (dbUrlMatch && dbUrlMatch[1]) {
  console.log('✅ DATABASE_URL value:', dbUrlMatch[1].substring(0, 50) + '...');
} else {
  console.log('❌ Could not extract DATABASE_URL value');
}