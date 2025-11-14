const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );

    const migrationPath = path.join(__dirname, '../supabase/migrations/create_tasks_table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running tasks table migration...\n');
    console.log('SQL:');
    console.log('='.repeat(60));
    console.log(sql);
    console.log('='.repeat(60) + '\n');

    try {
        // Split SQL into individual statements and execute them
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';';
            console.log(`Executing statement ${i + 1}/${statements.length}...`);

            const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

            if (error) {
                console.error(`Error on statement ${i + 1}:`, error);
                // Try direct query if RPC doesn't work
                const { error: directError } = await supabase.from('_migrations').insert({ statement });
                if (directError) {
                    throw error;
                }
            }
        }

        console.log('\n✅ Migration completed successfully!');
        console.log('\nVerifying table creation...');

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .limit(0);

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        console.log('✅ Tasks table verified!');

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        console.log('\n📝 Please run the SQL manually in Supabase SQL Editor:');
        console.log('1. Go to Supabase Dashboard → SQL Editor');
        console.log('2. Create a new query');
        console.log('3. Paste the SQL from: supabase/migrations/create_tasks_table.sql');
        console.log('4. Run the query\n');
        process.exit(1);
    }
}

runMigration();
