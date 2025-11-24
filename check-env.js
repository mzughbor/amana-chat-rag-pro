// Script to check environment variables
require('dotenv').config({ path: '.env' });
console.log('🔍 Checking environment variables...\n');

const requiredVars = {
  'DATABASE_URL': process.env.DATABASE_URL,
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

let hasErrors = false;

for (const [key, value] of Object.entries(requiredVars)) {
  if (!value) {
    console.log(`❌ ${key}: NOT SET`);
    hasErrors = true;
  } else {
    // Mask sensitive values
    const masked = key.includes('PASSWORD') || key.includes('KEY') || key.includes('SECRET')
      ? value.substring(0, 10) + '...' + value.substring(value.length - 5)
      : value;
    console.log(`✅ ${key}: ${masked}`);
    
    // Validate DATABASE_URL format
    if (key === 'DATABASE_URL') {
      if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
        console.log(`   ⚠️  Warning: DATABASE_URL should start with postgresql:// or postgres://`);
      }
      if (value.includes('pooler.supabase.com') && value.includes(':6543')) {
        console.log(`   ℹ️  Using Connection Pooler (port 6543)`);
        console.log(`   💡 Tip: If connection fails, try Direct Connection (port 5432)`);
      }
    }
  }
}

if (hasErrors) {
  console.log('\n❌ Some required environment variables are missing!');
  console.log('\n📝 Steps to fix:');
  console.log('1. Open Supabase Dashboard: https://app.supabase.com');
  console.log('2. Go to Settings → Database');
  console.log('3. Copy the Connection string (URI format)');
  console.log('4. Update DATABASE_URL in your .env file');
  console.log('\n💡 For Direct Connection (if Pooler fails):');
  console.log('   Use: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres');
  process.exit(1);
} else {
  console.log('\n✅ All required environment variables are set!');
}

