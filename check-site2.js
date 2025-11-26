const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkSite() {
    const siteId = 'cmieozmb7000211rw914f1ei3';

    // Check if site exists
    const { data: sites, error: siteError } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .limit(1);

    if (siteError) {
        console.log('Site error:', siteError.message);
    } else if (sites && sites.length > 0) {
        console.log('Site found:', sites[0]);

        // Check if site has a bot
        const { data: bots, error: botsError } = await supabase
            .from('bots')
            .select('*')
            .eq('siteId', siteId);

        if (botsError) {
            console.log('Bots error:', botsError.message);
        } else if (bots && bots.length > 0) {
            console.log('Bots found for site:', bots);
        } else {
            console.log('No bots found for this site');
        }
    } else {
        console.log('Site not found');
    }
}

checkSite();