// Check current database schema via Supabase REST API
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

async function checkCurrentSchema() {
  console.log('🔍 Checking current database schema via Supabase REST API...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    // Get list of tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.error('❌ Failed to fetch tables:', tablesError.message);
      process.exit(1);
    }

    console.log('📝 Current tables in database:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

    console.log('\n🔍 Checking structure of key tables...\n');

    // Check structure of sites table
    const { data: sitesColumns, error: sitesError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'sites')
      .order('ordinal_position');

    if (!sitesError) {
      console.log('📄 Sites table columns:');
      sitesColumns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }

    // Check structure of bots table
    const { data: botsColumns, error: botsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'bots')
      .order('ordinal_position');

    if (!botsError) {
      console.log('\n📄 Bots table columns:');
      botsColumns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }

    // Check structure of documents table
    const { data: documentsColumns, error: documentsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'documents')
      .order('ordinal_position');

    if (!documentsError) {
      console.log('\n📄 Documents table columns:');
      documentsColumns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }

    // Check structure of qa_pairs table
    const { data: qaPairsColumns, error: qaPairsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_schema', 'public')
      .eq('table_name', 'qa_pairs')
      .order('ordinal_position');

    if (!qaPairsError) {
      console.log('\n📄 Qa_pairs table columns:');
      qaPairsColumns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }

  process.exit(0);
}

checkCurrentSchema();