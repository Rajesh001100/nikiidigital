import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase credentials missing!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeData() {
  console.log("🚀 Starting data wipe...");

  // 1. Delete Attendance
  const { error: attError } = await supabase.from('attendance').delete().neq('id', 0);
  if (attError) console.error("❌ Error deleting attendance:", attError.message);
  else console.log("✅ Attendance cleared.");

  // 2. Delete Payments
  const { error: payError } = await supabase.from('payments').delete().neq('id', 0);
  if (payError) console.error("❌ Error deleting payments:", payError.message);
  else console.log("✅ Payments cleared.");

  // 3. Delete Registrations
  const { error: regError } = await supabase.from('registrations').delete().neq('id', 0);
  if (regError) console.error("❌ Error deleting registrations:", regError.message);
  else console.log("✅ Registrations cleared.");

  console.log("🏁 Wipe complete!");
}

wipeData();
