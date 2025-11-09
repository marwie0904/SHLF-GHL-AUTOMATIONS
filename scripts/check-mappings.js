const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

(async () => {
  try {
    const { data, error } = await supabase
      .from('stage_completion_mappings')
      .select('*')
      .order('source_stage_name', { ascending: true });

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('\n=== Stage Completion Mappings ===\n');

    if (!data || data.length === 0) {
      console.log('No mappings found in database');
      return;
    }

    data.forEach((mapping, index) => {
      console.log(`Mapping ${index + 1}:`);
      console.log(`  Source Stage: ${mapping.source_stage_name || 'N/A'}`);
      console.log(`  Source Stage ID: ${mapping.source_stage_id || 'N/A'}`);
      console.log(`  Target Pipeline: ${mapping.target_pipeline_name || 'N/A'}`);
      console.log(`  Target Pipeline ID: ${mapping.target_pipeline_id || 'N/A'}`);
      console.log(`  Target Stage: ${mapping.target_stage_name || 'N/A'}`);
      console.log(`  Target Stage ID: ${mapping.target_stage_id || 'N/A'}`);
      console.log(`  Active: ${mapping.active}`);
      console.log('');
    });

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
