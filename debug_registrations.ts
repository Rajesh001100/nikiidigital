import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking Registrations...");
  const { data, error } = await supabase.from('registrations').select('*');
  if (error) {
    console.error("❌ Database Error:", error.message);
  } else {
    console.log("✅ Found", data.length, "registrations.");
    if (data.length > 0) {
      console.log("Sample:", data[0].fullName);
    }
  }
}

check();
