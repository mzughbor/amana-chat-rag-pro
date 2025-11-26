// Check table structure via Supabase REST API
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

async function checkTableStructure() {
  console.log('🔍 Checking table structure via Supabase REST API...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Check structure of all tables
  const tablesToCheck = [
    'sites',
    'bots',
    'documents',
    'qa_pairs',
    'vectors',
    'conversations',
    'messages',
    'users',
    'accounts',
    'sessions'
  ];

  for (const tableName of tablesToCheck) {
    try {
      const { data: sample, error: sampleError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error(`❌ Failed to fetch ${tableName} sample:`, sampleError.message);
      } else {
        console.log(`📄 ${tableName.charAt(0).toUpperCase() + tableName.slice(1)} table structure:`);
        if (sample && sample.length > 0) {
          const columns = Object.keys(sample[0]);
          columns.forEach(col => console.log(`  - ${col}`));
        } else {
          console.log('  (empty table)');
        }
        console.log('');
      }
    } catch (error) {
      console.error(`❌ Error checking ${tableName}:`, error.message);
    }
  }
}

checkTableStructure();