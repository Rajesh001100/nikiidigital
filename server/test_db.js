
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, './.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

import fs from 'fs';

async function test() {
  console.log("Testing Supabase connection...");
  const results = {};
  
  const { data: settings, error: settingsError } = await supabase.from('settings').select('*');
  results.settings = { data: settings, error: settingsError };
  
  const { data: courses, error: courseError } = await supabase.from('courses').select('*').limit(5);
  results.courses = { data: courses, error: courseError };
  
  fs.writeFileSync('db_test_results.json', JSON.stringify(results, null, 2));
  console.log("Results written to db_test_results.json");
}

test();
