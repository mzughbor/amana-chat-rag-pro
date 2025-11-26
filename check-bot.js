const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkBot() {
    const botId = 'cmiep1poe000411rwv79m5lf0';

    // Check if bot exists
    const { data: bot, error: botError } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .limit(1);

    if (botError) {
        console.log('Bot error:', botError.message);
    } else if (bot && bot.length > 0) {
        console.log('Bot found:', bot[0]);
    } else {
        console.log('Bot not found');

        // Check if site exists
        const { data: site, error: siteError } = await supabase
            .from('sites')
            .select('*')
            .eq('id', botId)
            .limit(1);

        if (siteError) {
            console.log('Site error:', siteError.message);
        } else if (site && site.length > 0) {
            console.log('Site found:', site[0]);
        } else {
            console.log('Site not found either');
        }
    }
}

checkBot();