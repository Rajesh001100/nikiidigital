import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking Supabase Connection...");
  console.log("URL:", supabaseUrl);
  
  const { data, error } = await supabase.from('courses').select('*');
  if (error) {
    console.error("❌ Database Error:", error.message, error.details);
  } else {
    console.log("✅ Success! Found", data.length, "courses.");
  }
}

check();
