const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function getSampleWorkshopId() {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );

    const { data, error } = await supabase
        .from('workshops')
        .select('ghl_workshop_id, title')
        .not('ghl_workshop_id', 'is', null)
        .limit(1)
        .single();

    if (error) {
        console.error('No workshop found:', error.message);
        process.exit(1);
    }

    console.log('Sample Workshop:', data.title);
    console.log('GHL Workshop ID:', data.ghl_workshop_id);
    return data.ghl_workshop_id;
}

getSampleWorkshopId();
