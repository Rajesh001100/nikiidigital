import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function exportData() {
  console.log("-- NiKii Digital Data Export --");
  
  // 1. Export Courses
  const { data: courses } = await supabase.from('courses').select('*');
  if (courses && courses.length > 0) {
    console.log("\n-- Courses Data");
    courses.forEach(c => {
      console.log(`INSERT INTO courses (id, title, duration, description, icon, color, features, "imageUrl", "isActive", "isPromoted", "badgeText", "createdAt") VALUES (${c.id}, '${c.title.replace(/'/g, "''")}', '${c.duration}', '${c.description.replace(/'/g, "''")}', '${c.icon}', '${c.color}', '${JSON.stringify(c.features)}'::jsonb, ${c.imageUrl ? `'${c.imageUrl}'` : 'NULL'}, ${c.isActive}, ${c.isPromoted}, ${c.badgeText ? `'${c.badgeText}'` : 'NULL'}, '${c.createdAt}');`);
    });
  }

  // 2. Export Settings
  const { data: settings } = await supabase.from('settings').select('*');
  if (settings && settings.length > 0) {
    console.log("\n-- Settings Data");
    settings.forEach(s => {
      console.log(`INSERT INTO settings (key, value) VALUES ('${s.key}', '${JSON.stringify(s.value)}'::jsonb);`);
    });
  }

  // 3. Export Registrations
  const { data: regs } = await supabase.from('registrations').select('*');
  if (regs && regs.length > 0) {
    console.log("\n-- Registrations Data");
    regs.forEach(r => {
      const vals = [
        r.id,
        `'${r.fullName?.replace(/'/g, "''")}'`,
        `'${r.email}'`,
        `'${r.gender}'`,
        `'${r.dateOfBirth}'`,
        `'${r.address?.replace(/'/g, "''")}'`,
        `'${r.highestQualification}'`,
        `'${r.schoolCollegeName?.replace(/'/g, "''")}'`,
        `'${r.yearOfStudy}'`,
        `'${r.mobileNumber}'`,
        `'${r.preferredBatchTime}'`,
        `'${r.courseSelected}'`,
        `'${r.howDidYouHear}'`,
        `'${r.paymentMode}'`,
        r.promoCode ? `'${r.promoCode}'` : 'NULL',
        `'${r.status}'`,
        `'${r.createdAt}'`
      ];
      console.log(`INSERT INTO registrations (id, "fullName", email, gender, "dateOfBirth", address, "highestQualification", "schoolCollegeName", "yearOfStudy", "mobileNumber", "preferredBatchTime", "courseSelected", "howDidYouHear", "paymentMode", "promoCode", status, "createdAt") VALUES (${vals.join(', ')});`);
    });
  }

  // 4. Export Attendance
  const { data: att } = await supabase.from('attendance').select('*');
  if (att && att.length > 0) {
    console.log("\n-- Attendance Data");
    att.forEach(a => {
      console.log(`INSERT INTO attendance (registration_id, date, status, created_at) VALUES (${a.registration_id}, '${a.date}', '${a.status}', '${a.created_at}');`);
    });
  }
  
  // Update sequences
  console.log("\n-- Resetting sequences to prevent ID conflicts");
  console.log("SELECT setval(pg_get_serial_sequence('registrations', 'id'), coalesce(max(id), 1)) FROM registrations;");
  console.log("SELECT setval(pg_get_serial_sequence('courses', 'id'), coalesce(max(id), 1)) FROM courses;");
}

exportData();
