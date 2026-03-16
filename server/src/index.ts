import express from "express";
import cors from "cors";
import { z } from "zod";
import { Resend } from "resend";
import { supabase } from "./db.js";

const PORT = process.env.PORT || "10000";
const ADMIN_KEY = process.env.ADMIN_KEY ?? "nikiidigital-admin";
const resend = new Resend(process.env.RESEND_API_KEY);

const app = express();

// --- WhatsApp Notification Helper (Example using CallMeBot or similar) ---
async function sendWhatsAppNotification(toMobile: string, message: string) {
  try {
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;
    
    if (!instanceId || !token || token === "your_token") {
       console.log("WhatsApp skip: No UltraMsg credentials found in .env");
       return;
    }
    
    // Clean mobile number
    const cleanNumber = toMobile.replace(/\D/g, '');
    const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
    
    console.log(`Attempting to send WhatsApp via UltraMsg to ${cleanNumber}...`);
    
    const params = new URLSearchParams();
    params.append("token", token);
    params.append("to", cleanNumber);
    params.append("body", message);

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const result = await resp.json() as any;
    if (result.sent === "true" || result.id) {
       console.log("✅ WhatsApp notification sent successfully!");
    } else {
       console.error("❌ UltraMsg API Error:", result);
    }
  } catch (err) {
    console.error("WhatsApp notification error:", err);
  }
}

app.use(
  cors({
    origin: true,
    credentials: false
  })
);
app.use(express.json({ limit: "250kb" }));

app.get("/", (_req, res) => {
  res.send("<h1>NiKii Digital API is Running</h1><p>This is the backend server. Please visit our website URL to view the home page.</p>");
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

const RegistrationInput = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email().max(200),
  gender: z.string().min(1),
  dateOfBirth: z.string().min(1),
  address: z.string().min(1).max(500),
  highestQualification: z.string().min(1),
  schoolCollegeName: z.string().min(1).max(200),
  yearOfStudy: z.string().min(1).max(100),
  mobileNumber: z.string().min(1).max(50),
  preferredBatchTime: z.string().min(1),
  courseSelected: z.string().min(1),
  howDidYouHear: z.string().min(1),
  paymentMode: z.string().min(1),
  promoCode: z.string().optional(),
});

const CourseInput = z.object({
  title: z.string().min(2),
  duration: z.string().min(1),
  description: z.string().min(5),
  icon: z.string().min(1),
  color: z.string().min(1),
  features: z.array(z.string()),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  isPromoted: z.boolean().default(false),
  badgeText: z.string().optional().nullable(),
});

const SettingsInput = z.object({
  batchTimes: z.array(z.string()),
  promoCodes: z.array(z.object({
    code: z.string(),
    discount: z.string(),
    description: z.string()
  })),
  contactNumber: z.string(),
  address: z.string(),
});

app.post("/api/registrations", async (req, res) => {
  const parsed = RegistrationInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parsed.error.flatten()
    });
  }

  const createdAt = new Date().toISOString();
  try {
    const { data, error } = await supabase
      .from('registrations')
      .insert({
        ...parsed.data,
        status: 'Pending',
        createdAt
      })
      .select('id')
      .single();

    if (error) throw error;

    // --- Auto-Email Notification (Resend) ---
    try {
      if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_your_api_key") {
        await resend.emails.send({
          from: 'NiKii Digital <onboarding@resend.dev>',
          to: parsed.data.email,
          subject: 'Registration Successful - NiKii Computer Academy',
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h1 style="color: #2563eb;">Welcome to NiKii Digital!</h1>
              <p>Hi <strong>${parsed.data.fullName}</strong>,</p>
              <p>Your registration for the <strong>${parsed.data.courseSelected}</strong> has been received successfully.</p>
              <p><strong>Registration ID:</strong> #REG-${data.id.toString().padStart(4, '0')}</p>
              <hr />
              <p>We will contact you shortly on <strong>${parsed.data.mobileNumber}</strong> regarding your batch timing and next steps.</p>
              <p>Best regards,<br />NiKii Computer Academy Team</p>
            </div>
          `
        });
      }
    } catch (emailErr) {
      console.error("Email failed to send:", emailErr);
    }

    // --- Auto-WhatsApp Notification to Student ---
    await sendWhatsAppNotification(
      parsed.data.mobileNumber, 
      `🌟 *Welcome to NiKii Computer Academy!* 🌟\n\nDear *${parsed.data.fullName}*,\n\nThank you for registering! Your application has been received successfully. 📝\n\n📌 *Registration Details:*\n--------------------------\n🆔 *Ref ID:* #REG-${data.id.toString().padStart(4, '0')}\n🎓 *Course:* ${parsed.data.courseSelected}\n⏰ *Batch:* ${parsed.data.preferredBatchTime}\n--------------------------\n\nOur team will contact you shortly regarding your next steps. 🤝\n\n📍 *Visit us:* Near Anthiyur Bus Stand, Anthiyur.\n📞 *Call:* +91 80155 99681\n\n*Education is the Power of Life!* 🚀`
    );

    // --- Admin Alerts ---
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminMobile = process.env.ADMIN_MOBILE;

    if (adminEmail) {
      try {
        await resend.emails.send({
          from: 'NiKii Alerts <onboarding@resend.dev>',
          to: adminEmail,
          subject: '🔥 New Registration Received!',
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <h2 style="color: #2563eb;">New Student Alert!</h2>
              <p>Someone just registered on your website.</p>
              <ul>
                <li><strong>Name:</strong> ${parsed.data.fullName}</li>
                <li><strong>Course:</strong> ${parsed.data.courseSelected}</li>
                <li><strong>Mobile:</strong> ${parsed.data.mobileNumber}</li>
                <li><strong>Batch:</strong> ${parsed.data.preferredBatchTime}</li>
              </ul>
              <a href="https://nikiidigital.onrender.com/admin" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; border-radius: 5px; text-decoration: none;">View in Admin Panel</a>
            </div>
          `
        });
      } catch (e) { console.error("Admin email alert failed:", e); }
    }

    if (adminMobile) {
      await sendWhatsAppNotification(
        adminMobile,
        `🔔 *New Registration Alert!* 🔥\n\n👤 *Name:* ${parsed.data.fullName}\n📚 *Course:* ${parsed.data.courseSelected}\n📱 *Mob:* ${parsed.data.mobileNumber}\n🕒 *Batch:* ${parsed.data.preferredBatchTime}\n\nCheck admin panel for details.`
      );
    }

    res.json({ ok: true, registrationId: data.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

function requireAdmin(req: express.Request, res: express.Response) {
  const provided = req.header("x-admin-key") ?? "";
  if (provided !== ADMIN_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

app.get("/api/registrations", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;

    res.json({ registrations: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/registrations/:id/status", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { status } = req.body;
  if (!['Pending', 'Confirmed', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const { data: reg, error } = await supabase
      .from('registrations')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Send Confirmation Email if Confirmed
    if (status === 'Confirmed') {
      try {
        if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_your_api_key") {
          await resend.emails.send({
            from: 'NiKii Admissions <onboarding@resend.dev>',
            to: reg.email,
            subject: 'Admission Confirmed - NiKii Computer Academy',
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h1 style="color: #10b981;">Admission Confirmed!</h1>
                <p>Hi <strong>${reg.fullName}</strong>,</p>
                <p>Congratulations! Your admission for the <strong>${reg.courseSelected}</strong> has been officially <strong>confirmed</strong>.</p>
                <p><strong>Next Steps:</strong></p>
                <ul>
                  <li>Bring 2 passport-size photos.</li>
                  <li>Copy of your Aadhar card.</li>
                  <li>First installment of the course fee (if not paid online).</li>
                </ul>
                <p>We look forward to seeing you at the academy!</p>
                <p>Best regards,<br />Administrator, NiKii Computer Academy</p>
              </div>
            `
          });
        }
      } catch (emailErr) {
        console.error("Confirmation email failed:", emailErr);
      }

      // Send WhatsApp Confirmation
      await sendWhatsAppNotification(
        reg.mobileNumber,
        `✅ *OFFICIAL ADMISSION CONFIRMED* ✅\n\nDear *${reg.fullName}*,\n\nCongratulations! We are pleased to inform you that your registration at *NiKii Computer Academy* is successful and your admission has been officially *CONFIRMED!* 🥳🎊\n\n📝 *Enrollment Details:*\n--------------------------\n🆔 *Ref ID:* #REG-${reg.id.toString().padStart(4, '0')}\n🎓 *Program:* ${reg.courseSelected}\n🕒 *Batch:* ${reg.preferredBatchTime}\n--------------------------\n\n🚀 *Important Checklist for You:*\n1️⃣ Bring *2 Passport size photographs*.\n2️⃣ Bring a *copy of your Aadhaar Card*.\n3️⃣ Be present at the academy 10 mins before your batch time.\n\nWe are excited to help you transform your skills! See you soon. 💻✨\n\n📍 *Location:* Near Anthiyur Bus Stand, Anthiyur.\n📞 *Support:* +91 80155 99681\n\n*Education is the Power of Life!* 🚀`
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Course Management (CMS) ---

app.get("/api/courses", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    res.json({ courses: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/courses", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CourseInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid Course Data" });

  try {
    const { data, error } = await supabase.from('courses').insert(parsed.data).select().single();
    if (error) throw error;
    res.json({ ok: true, course: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/courses/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = CourseInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid Course Data" });

  try {
    const { data, error } = await supabase
      .from('courses')
      .update(parsed.data)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ ok: true, course: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/courses/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const { error } = await supabase.from('courses').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Settings Management ---

app.get("/api/settings", async (_req, res) => {
  try {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    
    // Transform to object
    const settings: any = {};
    data.forEach(item => settings[item.key] = item.value);
    
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/settings", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const parsed = SettingsInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid Settings Data" });

  try {
    const updates = Object.entries(parsed.data).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from('settings').upsert(updates);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Attendance Management ---

app.get("/api/attendance", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { date, batchTime } = req.query;
  
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('registration_id, status')
      .eq('date', date);

    if (error) throw error;
    res.json({ attendance: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/attendance", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { date, records } = req.body; // records: [{ registrationId, status }]

  try {
    const data = records.map((r: any) => ({
      registration_id: r.registrationId,
      date,
      status: r.status
    }));

    const { error } = await supabase.from('attendance').upsert(data, { onConflict: 'registration_id,date' });
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/dashboard-stats", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { data: regs, error } = await supabase
      .from('registrations')
      .select('courseSelected, createdAt');

    if (error) throw error;

    // Aggregate data for charts
    const courseStats = regs.reduce((acc: any, curr: any) => {
      acc[curr.courseSelected] = (acc[curr.courseSelected] || 0) + 1;
      return acc;
    }, {});

    const trendStats = regs.reduce((acc: any, curr: any) => {
      const date = curr.createdAt.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    res.json({
      courseDistribution: Object.entries(courseStats).map(([name, value]) => ({ name, value })),
      registrationTrend: Object.entries(trendStats).map(([date, count]) => ({ date, count })).sort((a,b) => a.date.localeCompare(b.date))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/registrations.csv", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { data: rows, error } = await supabase
      .from('registrations')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;

  const headers = [
    "id", "fullName", "email", "gender", "dateOfBirth", "address",
    "highestQualification", "schoolCollegeName", "yearOfStudy",
    "mobileNumber", "preferredBatchTime", "courseSelected",
    "howDidYouHear", "paymentMode", "createdAt"
  ];

  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  const csv =
    headers.join(",") +
    "\n" +
    (rows || [])
      .map((r) => headers.map((h) => escape(r[h as keyof typeof r])).join(","))
      .join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=registrations.csv");
  res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`NikiiDigital API running on port ${PORT}`);
});

