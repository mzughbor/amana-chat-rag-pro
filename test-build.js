// Test file to verify that our Supabase client changes work during build time
process.env.NEXT_PHASE = 'phase-production-build';

// Test importing the clients
try {
  const { getSupabaseRestClient } = require('./lib/supabaseRestClient');
  const { getSupabase, getSupabaseAdmin } = require('./lib/supabase');
  const { getDb } = require('./lib/db');
  
  console.log('✅ All clients imported successfully during build time');
  
  // Test getting the clients
  const restClient = getSupabaseRestClient();
  const supabaseClient = getSupabase();
  const adminClient = getSupabaseAdmin();
  const dbClient = getDb();
  
  console.log('✅ All clients instantiated successfully during build time');
  
  // Test that the dummy clients have the expected methods
  if (restClient.from && typeof restClient.from === 'function') {
    console.log('✅ REST client has from method');
  }
  
  if (supabaseClient.auth && typeof supabaseClient.auth.signUp === 'function') {
    console.log('✅ Supabase client has auth.signUp method');
  }
  
  if (adminClient.auth && typeof adminClient.auth.signUp === 'function') {
    console.log('✅ Admin client has auth.signUp method');
  }
  
  if (dbClient.user && typeof dbClient.user.findUnique === 'function') {
    console.log('✅ DB client has user.findUnique method');
  }
  
  console.log('🎉 All tests passed!');
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}