// Check if database tables exist via Supabase REST API
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

async function checkTables() {
  console.log('🔍 Checking database tables via Supabase REST API...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Check if required tables exist
  const tablesToCheck = [
    'users',
    'accounts',
    'sessions',
    'sites',
    'bots',
    'documents',
    'qa_pairs',
    'vectors',
    'conversations',
    'messages'
  ];

  console.log('📝 Checking if required tables exist...\n');

  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (error) {
        console.error(`❌ Table '${table}' check failed:`, error.message);
        if (error.code === '42P01') {
          console.log(`   💡 Table '${table}' does not exist in the database`);
        }
      } else {
        console.log(`✅ Table '${table}' exists (${data.length} records found)`);
      }
    } catch (error) {
      console.error(`❌ Unexpected error checking table '${table}':`, error.message);
    }
  }

  process.exit(0);
}

checkTables();