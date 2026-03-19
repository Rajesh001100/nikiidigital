import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking Supabase Connection...");
  console.log("URL:", supabaseUrl);
  
  const [coursesRes, settingsRes, registrationsRes] = await Promise.all([
    supabase.from('courses').select('*').order('createdAt', { ascending: false }),
    supabase.from('settings').select('*'),
    supabase.from('registrations').select('*').limit(1)
  ]);

  if (coursesRes.error) console.error("❌ Courses Table Error:", coursesRes.error.message);
  else console.log("✅ Courses table ok (Found", coursesRes.data.length, "rows)");

  if (settingsRes.error) console.error("❌ Settings Table Error:", settingsRes.error.message);
  else {
    const logoSetting = settingsRes.data.find((s: any) => s.key === 'logo_url' || s.key === 'logo');
    if (logoSetting) console.log("✅ Found Logo URL:", logoSetting.value);
    else console.log("❌ No Logo URL found in settings.");
  }

  if (registrationsRes.error) console.error("❌ Registrations Table Error:", registrationsRes.error.message);
  else console.log("✅ Registrations table ok");
}

check();
