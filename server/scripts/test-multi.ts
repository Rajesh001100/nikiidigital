import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMulti() {
  const { data: regs } = await supabase.from('registrations').select('id').limit(1);
  if (!regs || regs.length === 0) return;
  const regId = regs[0].id;

  console.log("Testing multiple 'Full' payments...");
  const p1 = await supabase.from('payments').insert({
    registration_id: regId,
    amount_paid: 10,
    payment_type: 'Full',
    payment_method: 'Cash',
    date: new Date().toISOString()
  });
  console.log("P1 result:", p1.error ? p1.error.message : "Success");

  const p2 = await supabase.from('payments').insert({
    registration_id: regId,
    amount_paid: 20,
    payment_type: 'Full',
    payment_method: 'Cash',
    date: new Date().toISOString()
  });
  console.log("P2 result:", p2.error ? p2.error.message : "Success");
}

testMulti();
