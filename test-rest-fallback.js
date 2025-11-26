// Test REST API fallback mechanism
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

async function testRestFallback() {
  console.log('🔍 Testing Supabase REST API connection...\n');

  // Check if required environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing required environment variables:');
    if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseServiceRoleKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('📝 Initializing Supabase client...');
  console.log(`URL: ${supabaseUrl}\n`);

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    // Test connection by querying a simple table
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ REST API connection failed:', error.message);
      process.exit(1);
    }

    console.log('✅ REST API connection successful!');
    console.log(`✅ Found ${data.length} user records (limited to 1 for testing)`);
    console.log('✅ Fallback mechanism should work properly');
    process.exit(0);
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

testRestFallback();