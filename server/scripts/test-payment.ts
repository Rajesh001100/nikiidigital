import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPayment() {
  // Get any valid registration ID
  const { data: regs } = await supabase.from('registrations').select('id').limit(1);
  if (!regs || regs.length === 0) {
    console.error("No registrations found to test with.");
    return;
  }
  const regId = regs[0].id;

  console.log(`Testing payment for reg_id: ${regId}...`);
  const { data, error } = await supabase.from('payments').insert({
    registration_id: regId,
    amount_paid: 10,
    payment_type: 'Payment', // This is what we want to test
    payment_method: 'Cash',
    date: new Date().toISOString()
  }).select();

  if (error) {
    console.error("❌ Database Error:", error);
  } else {
    console.log("✅ Success! Database accepted 'Payment' type.");
    console.log(data);
  }
}

testPayment();
