// Test database connection
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  
  // Use DATABASE_URL directly
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not found in .env file');
    process.exit(1);
  }
  
  console.log('📝 Testing Database Connection...');
  console.log(`URL: ${dbUrl.substring(0, 60)}...\n`);
  
  const db = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });
  
  try {
    await db.$connect();
    console.log('✅ Connection successful!');
    await db.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('\n💡 Suggestions:');
    console.error('1. Check if Supabase project is active');
    console.error('2. Verify password is correct');
    console.error('3. Try updating DATABASE_URL to use Direct Connection');
    process.exit(1);
  }
}

testConnection();

