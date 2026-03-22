
const { createClient } = require('@supabase/supabase-client');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkCols() {
  const { data, error } = await supabase.from('registrations').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log("Columns:", Object.keys(data[0] || {}));
  }
}

checkCols();
