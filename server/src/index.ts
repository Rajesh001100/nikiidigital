import express from "express";
import cors from "cors";
import { z } from "zod";
import nodemailer from "nodemailer";
import path from "path";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Load .env explicitly for Windows
const currentFile = new URL(import.meta.url).pathname;
const currentDir = path.dirname(currentFile).replace(/^\/([A-Z]:)/, '$1');
const envPath = path.join(currentDir, '../.env');
dotenv.config({ path: envPath });

import { supabase, withRetry } from "./db.js";

const PORT = process.env.PORT || "5188";
console.log(`Server: Loading env from ${envPath}. Using port ${PORT}`);

const ADMIN_KEY = (process.env.ADMIN_KEY ?? "NikiiSecure@2026_Admin").trim();
const STAFF_KEY = (process.env.STAFF_KEY ?? "NikiiStaff@2026").trim();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

console.log("-----------------------------------------");
console.log("🔑 Authentication Keys Loaded:");
console.log(`   Admin Key: [${ADMIN_KEY.length > 0 ? ADMIN_KEY[0] + '...' + ADMIN_KEY.slice(-1) : 'MISSING'}] (Length: ${ADMIN_KEY.length})`);
console.log(`   Staff Key: [${STAFF_KEY.length > 0 ? STAFF_KEY[0] + '...' + STAFF_KEY.slice(-1) : 'MISSING'}] (Length: ${STAFF_KEY.length})`);
console.log("-----------------------------------------");

// --- Admin Key Dynamic Storage ---
let cachedAdminKey: string | null = null;
async function getDynamicAdminKey() {
  if (cachedAdminKey) return cachedAdminKey;
  
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'admin_key')
      .maybeSingle();
      
    if (data?.value) {
      cachedAdminKey = String(data.value).trim();
      console.log("🔐 Using Dynamic Admin Key from Database");
    } else {
      cachedAdminKey = ADMIN_KEY;
      console.log("📁 Using Environment Admin Key");
    }
  } catch (err) {
    console.error("Error fetching dynamic admin key:", err);
    cachedAdminKey = ADMIN_KEY;
  }
  return cachedAdminKey;
}

function invalidateAdminKeyCache() {
  cachedAdminKey = null;
}

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

    const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;

    // Normalizing number to +91XXXXXXXXXX format
    let cleanNumber = toMobile.replace(/\D/g, '');
    if (cleanNumber.length === 10) {
      cleanNumber = "91" + cleanNumber;
    }
    const finalNumber = "+" + cleanNumber;

    console.log(`[WhatsApp] Dispatching message to ${finalNumber}...`);

    const params = new URLSearchParams();
    params.append("token", token);
    params.append("to", finalNumber);
    params.append("body", message);

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const result = await resp.json() as any;
    console.log(`[WhatsApp] UltraMsg API Response for ${finalNumber}:`, JSON.stringify(result, null, 2));

    if (result.sent === "true" || result.id) {
      console.log(`✅ WhatsApp notification sent successfully to ${finalNumber}!`);
    } else {
      console.error(`❌ UltraMsg API Error for ${finalNumber}:`, result);
    }
  } catch (err) {
    console.error("WhatsApp notification error:", err);
  }
}

app.use(helmet());
app.use(express.json({ limit: "250kb" }));

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? ['https://nikiidigital.in', 'https://nikiicomputeracademynca.onrender.com'] : true,
    credentials: false
  })
);

// --- Rate Limiting ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests, please try again later." }
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 registrations per hour per IP
  message: { error: "Registration limit reached for this hour. Please try again later." }
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: "Too many admin attempts. Access restricted." }
});

app.use("/api/", globalLimiter);
// registrationLimiter removed from global use to allow Admin GET requests

// --- AUTH MIDDLEWARE ---
const verifyAdmin = async (req: any, res: any, next: any) => {
  const adminKeyHeader = req.headers['x-admin-key'];
  const providedKey = typeof adminKeyHeader === 'string' ? adminKeyHeader.trim() : '';
  
  if (!providedKey) return res.status(401).json({ error: "No Access Key Provided" });

  const currentAdminKey = await getDynamicAdminKey();
  if (providedKey === currentAdminKey) {
    req.isAdmin = true;
    next();
  } else {
    console.warn(`Auth: Admin login attempt failed. Check header presence: ${!!providedKey}`);
    res.status(401).json({ error: "Unauthorized access detected." });
  }
};

// Accepts admin OR staff key
const verifyStaff = async (req: any, res: any, next: any) => {
  const authKeyHeader = req.headers['x-admin-key'];
  const providedKey = typeof authKeyHeader === 'string' ? authKeyHeader.trim() : '';

  if (!providedKey) return res.status(401).json({ error: "No Access Key Provided" });

  const currentAdminKey = await getDynamicAdminKey();
  if (providedKey === currentAdminKey) {
    req.isAdmin = true;
    return next();
  } 
  
  if (providedKey === STAFF_KEY) {
    req.isAdmin = false;
    return next();
  }

  // Check if it's an individual staff username (token)
  try {
    const { data: staff } = await supabase
      .from('staff_accounts')
      .select('username')
      .eq('username', providedKey)
      .maybeSingle();

    if (staff) {
      req.isAdmin = false;
      return next();
    }
  } catch (e) {}

  res.status(401).json({ error: "Unauthorized access detected." });
};

// --- Cache Implementation ---
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache: Record<string, CacheEntry<any>> = {};

function getFromCache<T>(key: string): T | null {
  const entry = cache[key];
  if (entry && (Date.now() - entry.timestamp) < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setToCache(key: string, data: any) {
  cache[key] = { data, timestamp: Date.now() };
}

function invalidateCache(key?: string) {
  if (key) {
    delete cache[key];
  } else {
    // Invalidate all initial data related keys
    delete cache['initial-data'];
    delete cache['courses'];
    delete cache['settings'];
  }
}

app.get("/", (_req, res) => {
  res.send("<h1>NiKii Digital API is Running</h1><p>This is the backend server. Please visit our website URL to view the home page.</p>");
});

// --- Student Portal Endpoints ---
app.post("/api/student/login", async (req, res) => {
  const parsed = StudentLoginInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid login credentials format" });

  // Normalize mobile to 10 digits
  const normalizedMobile = parsed.data.mobileNumber.replace(/\D/g, '').slice(-10);

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('id, fullName, mobileNumber, dateOfBirth, courseSelected, status, academic_year, password')
      .eq('mobileNumber', normalizedMobile);

    if (error || !data || data.length === 0) {
      return res.status(401).json({ error: "Log in failed. Check your mobile number and password." });
    }

    const confirmed = data.filter(d => d.status === 'Confirmed');

    // Check password (matches stored password OR matches dateOfBirth as a legacy/default)
    const valid = confirmed.filter(c => {
      const storedPass = (c as any).password || c.dateOfBirth;
      return storedPass === parsed.data.password;
    });

    if (valid.length === 0) {
      return res.status(401).json({ error: "Log in failed. Check your mobile number and password." });
    }

    res.json({ students: valid });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/staff/login", async (req, res) => {
  const parsed = StaffLoginInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid login format" });

  try {
    const { data: staff, error } = await supabase
      .from('staff_accounts')
      .select('*')
      .eq('username', parsed.data.username)
      .eq('password', parsed.data.password)
      .single();

    if (error || !staff) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // For simplicity, we return the username as a temporary token/key. 
    // In a production app, we would use JWT or a session table.
    res.json({ ok: true, staffKey: staff.username, fullName: staff.full_name });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/student/registrations", async (req, res) => {
  const parsed = StudentLoginInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid credentials format" });

  const normalizedMobile = parsed.data.mobileNumber.replace(/\D/g, '').slice(-10);

  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('mobileNumber', normalizedMobile);

    if (error) throw error;

    const valid = (data || []).filter(c => {
      const storedPass = (c as any).password || c.dateOfBirth;
      return storedPass === parsed.data.password;
    });

    res.json({ registrations: valid });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/student/dashboard/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [regRes, attendanceRes, paymentsRes] = await Promise.all([
      supabase.from('registrations').select('*').eq('id', id).single(),
      supabase.from('attendance').select('*').eq('registration_id', id),
      supabase.from('payments').select('*').eq('registration_id', id).order('date', { ascending: false }),
    ]);

    if (regRes.error) throw regRes.error;

    // Find the course_id matching the student's enrolled course title
    const { data: courseData } = await supabase
      .from('courses')
      .select('id, syllabusUrl, totalFee')
      .ilike('title', regRes.data.courseSelected)
      .single();

    // Fetch materials only for the student's enrolled course
    let relevantMaterials: any[] = [];
    if (courseData?.id) {
      const { data: mats } = await supabase
        .from('materials')
        .select('*')
        .eq('course_id', courseData.id)
        .order('created_at', { ascending: false });
      relevantMaterials = mats || [];
    }

    // Calculate attendance percentage
    const totalDays = attendanceRes.data?.length || 0;
    const presentDays = attendanceRes.data?.filter(a => a.status === 'Present').length || 0;
    const attendancePercent = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    res.json({
      student: regRes.data,
      attendance: attendanceRes.data || [],
      attendancePercent,
      payments: paymentsRes.data || [],
      materials: relevantMaterials,
      syllabusUrl: courseData?.syllabusUrl || null,
      courseFee: courseData?.totalFee || 0
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// --- Combined Initial Data Endpoint ---
app.get("/api/initial-data", async (req, res) => {
  const forceRefresh = req.headers['cache-control'] === 'no-cache';
  const cached = getFromCache<any>('initial-data');

  // If we have valid cache and no force refresh, return it
  if (cached && !forceRefresh) {
    console.log("Serving initial-data from cache");
    return res.json(cached);
  }

  try {
    console.log("Fetching fresh initial-data from Supabase...");
    const [coursesRes, settingsRes] = await withRetry<any>(() => Promise.all([
      supabase.from('courses').select('*').order('createdAt', { ascending: false }),
      supabase.from('settings').select('*')
    ]));

    if (coursesRes.error) throw coursesRes.error;
    if (settingsRes.error) throw settingsRes.error;

    console.log(`Found ${coursesRes.data?.length || 0} courses and ${settingsRes.data?.length || 0} settings rows.`);

    const settings: any = {};
    if (settingsRes.data) {
      settingsRes.data.forEach(item => {
        if (item && item.key) settings[item.key] = item.value;
      });
    }

    const data = {
      courses: coursesRes.data || [],
      settings,
      source: 'database',
      timestamp: Date.now()
    };

    setToCache('initial-data', data);
    res.json(data);
  } catch (err: any) {
    console.error("CRITICAL: Initial data fetch error:", err.message || err);
    
    // Stale-While-Revalidate: If we have ANY cache (even expired), return it on error
    if (cache['initial-data']) {
      console.warn("⚠️ Database fetch failed, returning stale cache as fallback.");
      return res.json({
        ...cache['initial-data'].data,
        source: 'stale-cache',
        error: "Database temporary unreachable, showing cached data."
      });
    }

    res.status(500).json({ 
      error: "Internal Server Error", 
      details: err.message || String(err),
      hint: "Check server logs for database connectivity issues."
    });
  }
});

const RegistrationInput = z.object({
  fullName: z.string().min(2).max(100),
  fatherName: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  email: z.string().email().max(200),
  gender: z.string().min(1),
  dateOfBirth: z.string().min(1),
  address: z.string().min(1).max(500),
  schoolCollegeName: z.string().min(1).max(200),
  yearOfStudy: z.string().min(1).max(100),
  mobileNumber: z.string().min(1).max(50),
  preferredBatchTime: z.string().min(1),
  courseSelected: z.string().min(1),
  howDidYouHear: z.string().min(1),
  paymentMode: z.string().min(1),
  promoCode: z.string().optional(),
  discount_amount: z.number().optional().nullable(),
  academic_year: z.string().optional(),
  highestQualification: z.string().optional().default(''),
  status: z.enum(["Pending", "Confirmed", "Rejected", "Completed"]).optional(),
});

const PaymentInput = z.object({
  registration_id: z.number(),
  amount_paid: z.number().min(1),
  payment_type: z.string().min(1),
  payment_method: z.enum(['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'DD']).default('Cash'),
  discount_amount: z.number().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

const MaterialInput = z.object({
  course_id: z.number().optional().nullable(),
  title: z.string().min(2),
  file_url: z.string().url(),
  description: z.string().optional().nullable(),
});

const StudentLoginInput = z.object({
  mobileNumber: z.string().min(10).max(10),
  password: z.string().min(1),
});

const StaffLoginInput = z.object({
  username: z.string().min(3),
  password: z.string().min(1),
});

const CourseInput = z.object({
  title: z.string().min(2),
  duration: z.string().min(1),
  description: z.string().min(5),
  icon: z.string().min(1),
  color: z.string().min(1),
  features: z.array(z.string()),
  imageUrl: z.string().optional().nullable(),
  syllabusUrl: z.string().optional().nullable(),
  totalFee: z.number().optional().nullable(),
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
  academicYears: z.array(z.string()).optional(),
  currentAcademicYear: z.string().optional()
});

app.post("/api/registrations", registrationLimiter, async (req, res) => {
  const parsed = RegistrationInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parsed.error.flatten()
    });
  }

  const createdAt = new Date().toISOString();

  // Normalize mobile to 10 digits if needed
  const normalizedMobile = parsed.data.mobileNumber.replace(/\D/g, '').slice(-10);

  try {
    const { data: settingsData } = await withRetry<any>(() => supabase.from('settings').select('*'));
    const settings: any = settingsData?.reduce((acc: any, item: any) => ({...acc, [item.key]: item.value}), {}) || {};
    console.log("DEBUG: Settings keys:", Object.keys(settings));
    let currentAcademicYear = settings.currentAcademicYear || '2026-2027';

    // Calculate discount on the server to prevent tampering
    let calculatedDiscount = 0;
    if (parsed.data.promoCode) {
      const activePromo = settings.promoCodes?.find((p: any) => p.code.toUpperCase() === parsed.data.promoCode?.toUpperCase());
      if (activePromo) {
        const { data: courseData } = await withRetry<any>(() => supabase
          .from('courses')
          .select('totalFee')
          .eq('title', parsed.data.courseSelected)
          .maybeSingle());
        
        const baseFee = courseData?.totalFee || 0;
        if (activePromo.discount.includes('%')) {
          const percent = parseFloat(activePromo.discount);
          calculatedDiscount = Math.round((baseFee * percent) / 100);
        } else {
          calculatedDiscount = parseFloat(activePromo.discount) || 0;
        }
      }
    }

    // --- Idempotency Check: Prevent Double Registration ---
    const { data: existingReg } = await withRetry<any>(() => supabase
      .from('registrations')
      .select('id')
      .eq('mobileNumber', normalizedMobile)
      .eq('courseSelected', parsed.data.courseSelected)
      .eq('academic_year', currentAcademicYear)
      .maybeSingle());

    if (existingReg) {
      console.log(`INFO: Duplicate registration detected for ${normalizedMobile} / ${parsed.data.courseSelected}. Returning existing ID: ${existingReg.id}`);
      return res.json({ ok: true, registrationId: existingReg.id, message: "Checked existing registration." });
    }

    const { data, error } = await withRetry<any>(() => supabase
      .from('registrations')
      .insert({
        ...parsed.data,
        academic_year: currentAcademicYear,
        mobileNumber: normalizedMobile,
        discount_amount: calculatedDiscount || parsed.data.discount_amount || 0,
        status: 'Pending',
        createdAt
      })
      .select('id')
      .single());

    if (error) throw error;

    // --- Auto-Email Notification (Nodemailer) ---
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: `"NiKii Digital" <${process.env.EMAIL_USER}>`,
          to: parsed.data.email,
          subject: `Registration Successful - ${parsed.data.fullName} - NiKii Computer Academy`,
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
        console.log("Student Email dispatched successfully via Nodemailer.");
      }
    } catch (emailErr) {
      console.error("Email failed to send:", emailErr);
    }

    // --- Auto-WhatsApp Notification to Student ---
    await sendWhatsAppNotification(
      normalizedMobile,
      `🌟 *Welcome to NiKii Computer Academy!* 🌟\n\nDear *${parsed.data.fullName}*,\n\nThank you for registering! Your application has been received successfully. 📝\n\n📌 *Registration Details:*\n--------------------------\n🆔 *Ref ID:* #REG-${data.id.toString().padStart(4, '0')}\n🎓 *Course:* ${parsed.data.courseSelected}\n⏰ *Batch:* ${parsed.data.preferredBatchTime}\n--------------------------\n\nOur team will contact you shortly regarding your next steps. 🤝\n\n📍 *Visit us:* Near Anthiyur Bus Stand, Anthiyur.\n📞 *Call:* +91 80155 99681\n\n*Education is the Power of Life!* 🚀`
    );

    // --- Admin Alerts ---
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminMobile = process.env.ADMIN_MOBILE;

    if (process.env.ADMIN_EMAIL && process.env.EMAIL_USER) {
      try {
        await transporter.sendMail({
          from: `"NiKii Alerts" <${process.env.EMAIL_USER}>`,
          to: process.env.ADMIN_EMAIL,
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
        console.log("Admin Email alert dispatched successfully via Nodemailer.");
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

// Admin routes restricted by verifyAdmin middleware

// DELETE ALL registrations (admin only — irreversible)
app.delete("/api/registrations", verifyAdmin, async (req: any, res: any) => {
  try {
    // Delete related records first (FK constraints)
    await supabase.from('payments').delete().neq('id', 0);
    await supabase.from('attendance').delete().neq('id', 0);
    const { error } = await supabase.from('registrations').delete().neq('id', 0);
    if (error) throw error;
    console.warn("⚠️ ALL registrations deleted by admin.");
    res.json({ ok: true, message: "All registrations deleted." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/registrations", verifyStaff, async (req: any, res: any) => {
  try {
    let query = supabase.from('registrations').select('*').order('createdAt', { ascending: false });
    if (req.query.academicYear) {
      query = query.eq('academic_year', req.query.academicYear);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ registrations: data });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Hard-delete a single registration (admin only)
app.delete("/api/registrations/:id", verifyAdmin, async (req: any, res: any) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
  try {
    await supabase.from('payments').delete().eq('registration_id', id);
    await supabase.from('attendance').delete().eq('registration_id', id);
    const { error } = await supabase.from('registrations').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/registrations/:id", verifyAdmin, async (req: any, res: any) => {
  const parsed = RegistrationInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid registration data", details: parsed.error.flatten() });

  try {
    const { data, error } = await supabase
      .from('registrations')
      .update(parsed.data)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ ok: true, registration: data });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/registrations/:id/status", verifyAdmin, async (req: any, res: any) => {
  const { status, discount_amount } = req.body;

  try {
    const updateData: any = { status };
    if (discount_amount !== undefined) {
      updateData.discount_amount = Number(discount_amount);
    }

    // Check if status is actually changing to Confirmed to avoid duplicate notifications
    const { data: existingReg } = await supabase
      .from('registrations')
      .select('status')
      .eq('id', req.params.id)
      .single();

    const { data: reg, error } = await supabase
      .from('registrations')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    if (!reg) return res.status(404).json({ error: "Registration not found" });

    // Send Confirmation Email ONLY if status is changing to Confirmed for the first time
    // The RegistrationInput schema should include 'Completed' in the status enum:
    // status: z.enum(["Pending", "Confirmed", "Rejected", "Completed"]).default("Pending"),
    if (status === 'Confirmed' && existingReg?.status !== 'Confirmed') {
      try {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          await transporter.sendMail({
            from: `"NiKii Admissions" <${process.env.EMAIL_USER}>`,
            to: reg.email,
            subject: 'Admission Confirmed - NiKii Computer Academy',
            html: `
              <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #ff7e00; color: white; padding: 30px; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px;">NiKii COMPUTER ACADEMY</h1>
                  <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">State and Central Certified Academy • Anthiyur</p>
                </div>
                <div style="padding: 40px; background-color: #ffffff;">
                  <h2 style="color: #ff7e00; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-size: 18px;">Admission Form</h2>
                  
                  <div style="margin: 20px 0; display: flex; justify-content: space-between; align-items: flex-start; font-size: 14px; color: #666;">
                    <div style="flex: 1;">
                      <p><strong>Student Id:</strong> REG-${reg.id.toString().padStart(4, '0')}</p>
                      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                    <div style="width: 100px; height: 120px; border: 2px dashed #cbd5e1; border-radius: 4px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; color: #94a3b8; background-color: #f8fafc; margin-left: 20px;">
                      Paste Student<br/>Photo Here
                    </div>
                  </div>

                  <p style="margin-top: 10px;">To, <strong>${reg.fullName}</strong>,<br/>
                  Email: ${reg.email}<br/>
                  Mobile: ${reg.mobileNumber}</p>

                  <p style="margin-top: 25px;">We are pleased to inform you that your admission to the following program has been <strong>confirmed</strong>:</p>

                  <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #bbf7d0;">
                    <h3 style="margin-top: 0; font-size: 14px; color: #15803d; text-transform: uppercase;">Course Details</h3>
                    <p style="margin: 10px 0 5px;"><strong>Course Name:</strong> ${reg.courseSelected}</p>
                    <p style="margin: 0;"><strong>Batch Time:</strong> ${reg.preferredBatchTime}</p>
                  </div>

                  <h3 style="font-size: 15px; color: #ff7e00; margin-top: 30px;">IMPORTANT INSTRUCTIONS:</h3>
                  <ol style="padding-left: 20px; color: #4b5563; line-height: 1.6; font-size: 14px;">
                    <li>Please report to the academy on your scheduled batch time.</li>
                    <li>Bring <strong>original Aadhaar Card</strong> and <strong>2 Passport size photographs</strong>.</li>
                    <li>All fees are non-refundable after the course commencement.</li>
                    <li>Minimum <strong>85% attendance</strong> is mandatory for certification.</li>
                  </ol>

                  <div style="margin-top: 40px; text-align: right; color: #ff7e00;">
                     <p style="margin-bottom: 0;"><strong>Authorized Signatory</strong></p>
                     <p style="margin-top: 5px; font-size: 13px; color: #64748b;">NiKii Computer Academy, Anthiyur.</p>
                  </div>
                </div>
                <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                  Education is the Power of Life!
                </div>
              </div>
            `
          });
          console.log(`Confirmation email sent to ${reg.email}`);
        }
      } catch (emailErr) {
        console.error("Confirmation email failed:", emailErr);
      }

      // Send WhatsApp Confirmation ONLY if first time confirming
      try {
        await sendWhatsAppNotification(
          reg.mobileNumber,
          `✅ *PROVISIONAL ADMISSION LETTER* ✅\n\nDear *${reg.fullName}*,\n\nCongratulations! We are pleased to inform you that your admission at *NiKii Computer Academy* has been officially *CONFIRMED!* 🥳🎊\n\n📝 *Enrollment Details:*\n--------------------------\n🆔 *Ref ID:* #REG-${reg.id.toString().padStart(4, '0')}\n🎓 *Program:* ${reg.courseSelected}\n🕒 *Batch:* ${reg.preferredBatchTime}\n--------------------------\n\n🚀 *Important Instructions:*\n1️⃣ Bring *Original Aadhaar Card*.\n2️⃣ Bring *2 Passport size photos*.\n3️⃣ *85% Attendance* is mandatory for certification.\n4️⃣ Fees are non-refundable after commencement.\n5️⃣ Be present 10 mins before your batch time.\n\n🌐 *Official Links:*\n- Website: https://nikiidigital.in/\n- Portal: https://nikiicomputeracademynca.onrender.com/\n\nWe are excited to help you transform your skills! See you soon. 💻✨\n\n📍 *Location:* Near Anthiyur Bus Stand, Anthiyur.\n📞 *Support:* +91 80155 99681\n\n*Education is the Power of Life!* 🚀`
        );
      } catch (waErr) {
        console.error("WhatsApp confirmation failed:", waErr);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/registration-status/:mobile", async (req, res) => {
  const { mobile } = req.params;
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('fullName, courseSelected, status, createdAt')
      .eq('mobileNumber', mobile)
      .order('createdAt', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No registration found for this mobile number" });
    }

    res.json(data[0]);
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

app.post("/api/courses", verifyAdmin, async (req: any, res: any) => {
  const parsed = CourseInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid Course Data",
      details: parsed.error.flatten()
    });
  }

  try {
    const { data, error } = await supabase.from('courses').insert(parsed.data).select().single();
    if (error) throw error;
    invalidateCache();
    res.json({ ok: true, course: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/courses/:id", verifyAdmin, async (req: any, res: any) => {
  const parsed = CourseInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid Course Data",
      details: parsed.error.flatten()
    });
  }

  try {
    const { data, error } = await supabase
      .from('courses')
      .update(parsed.data)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    invalidateCache();
    res.json({ ok: true, course: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/courses/:id", verifyAdmin, async (req: any, res: any) => {
  try {
    const { error } = await supabase.from('courses').delete().eq('id', req.params.id);
    if (error) throw error;
    invalidateCache();
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

app.post("/api/settings", verifyAdmin, async (req: any, res: any) => {
  const parsed = SettingsInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid Settings Data" });

  try {
    const updates = Object.entries(parsed.data).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from('settings').upsert(updates);
    if (error) throw error;
    invalidateCache();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Payments & Materials Management ---
app.get("/api/admin/payments", verifyStaff, async (req: any, res: any) => {
  try {
    let query = supabase
      .from('payments')
      .select('*, registrations!inner(academic_year, fullName, mobileNumber, courseSelected)')
      .order('date', { ascending: false });
      
    if (req.query.academicYear) {
      query = query.eq('registrations.academic_year', req.query.academicYear);
    }
    const { data, error } = await query;
    if (error) throw error;

    // Compute summary stats
    const payments = data || [];
    const fullPayments = payments.filter((p: any) => p.payment_type === 'Full');
    const inst1Payments = payments.filter((p: any) => p.payment_type === 'Installment 1');
    const inst2Payments = payments.filter((p: any) => p.payment_type === 'Installment 2');
    // Students who paid Installment 1 but NOT Installment 2
    const inst1RegIds = new Set(inst1Payments.map((p: any) => p.registration_id));
    const inst2RegIds = new Set(inst2Payments.map((p: any) => p.registration_id));
    const pendingInst2RegIds = [...inst1RegIds].filter(id => !inst2RegIds.has(id));

    res.json({
      payments: data,
      summary: {
        totalFullCount: fullPayments.length,
        totalInstalment1Count: inst1Payments.length,
        pendingInst2Count: pendingInst2RegIds.length,
        totalRevenue: payments.reduce((s: number, p: any) => s + Number(p.amount_paid), 0)
      },
      pendingSecondInstalment: payments.filter((p: any) => pendingInst2RegIds.includes(p.registration_id) && p.payment_type === 'Installment 1')
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/payments", verifyStaff, async (req: any, res: any) => {
  // Staff cannot apply discounts — strip discount_amount if not admin
  const body = req.isAdmin ? req.body : { ...req.body, discount_amount: undefined };
  const parsed = PaymentInput.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payment data" });
  try {
    // --- Idempotency Check: Prevent Double Payment ---
    // Check if a payment with same reg_id and amount was made in the last 15 mins
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: existingPayment } = await withRetry<any>(() => supabase
      .from('payments')
      .select('id')
      .eq('registration_id', parsed.data.registration_id)
      .eq('amount_paid', parsed.data.amount_paid)
      .eq('payment_type', parsed.data.payment_type)
      .gte('date', fifteenMinsAgo)
      .maybeSingle());

    if (existingPayment) {
      console.log(`INFO: Duplicate payment detected for RegID ${parsed.data.registration_id}. Returning existing ID: ${existingPayment.id}`);
      return res.json({ ok: true, payment: existingPayment, message: "Duplicate payment suppressed." });
    }

    const { data, error } = await supabase
      .from('payments')
      .insert({
        registration_id: parsed.data.registration_id,
        amount_paid: parsed.data.amount_paid,
        payment_type: parsed.data.payment_type,
        payment_method: parsed.data.payment_method,
        remarks: parsed.data.remarks,
        date: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;

    // Save discount if provided
    if (parsed.data.discount_amount !== undefined && parsed.data.discount_amount !== null) {
      await supabase
        .from('registrations')
        .update({ discount_amount: parsed.data.discount_amount })
        .eq('id', parsed.data.registration_id);
    }

    res.json({ ok: true, payment: data });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/admin/materials", async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('materials').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ materials: data });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/materials", verifyAdmin, async (req: any, res: any) => {
  const parsed = MaterialInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid material data" });

  try {
    const { data, error } = await supabase.from('materials').insert(parsed.data).select().single();
    if (error) throw error;
    res.json({ ok: true, material: data });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/admin/materials/:id", verifyAdmin, async (req: any, res: any) => {
  try {
    const { error } = await supabase.from('materials').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Attendance Management ---

app.get("/api/attendance", verifyStaff, async (req: any, res: any) => {
  const { date, batchTime, academicYear } = req.query;

  try {
    let query = supabase
      .from('attendance')
      .select('registration_id, status, registrations!inner(academic_year)')
      .eq('date', date);
      
    if (academicYear) {
      query = query.eq('registrations.academic_year', academicYear);
    }
    const { data, error } = await query;

    if (error) throw error;
    res.json({ attendance: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/attendance/monthly", verifyStaff, async (req: any, res: any) => {
  const { month, academicYear } = req.query; // "YYYY-MM"

  try {
    const startDate = `${month}-01`;
    // get last day of the month
    const year = parseInt(month.substring(0, 4));
    const m = parseInt(month.substring(5, 7));
    const expectedDays = new Date(year, m, 0).getDate();
    const endDate = `${month}-${expectedDays}`;

    let query = supabase
      .from('attendance')
      .select('registration_id, date, status, registrations!inner(academic_year)')
      .gte('date', startDate)
      .lte('date', endDate);
      
    if (academicYear) {
      query = query.eq('registrations.academic_year', academicYear);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json({ attendance: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/attendance", verifyStaff, async (req: any, res: any) => {
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

app.get("/api/dashboard-stats", verifyAdmin, async (req: any, res: any) => {

  try {
    let query = supabase.from('registrations').select('courseSelected, createdAt');
    if (req.query.academicYear) query = query.eq('academic_year', req.query.academicYear);
    const { data: regs, error } = await query;

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
      registrationTrend: Object.entries(trendStats).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/registrations.csv", verifyAdmin, async (req: any, res: any) => {

  try {
    let query = supabase.from('registrations').select('*').order('createdAt', { ascending: false });
    if (req.query.academicYear) query = query.eq('academic_year', req.query.academicYear);
    const { data: rows, error } = await query;

    if (error) throw error;

    const headers = [
      "id", "fullName", "email", "gender", "dateOfBirth", "address",
      "schoolCollegeName", "yearOfStudy",
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

app.get("/api/admin/payments.csv", verifyAdmin, async (req: any, res: any) => {
  try {
    let query = supabase
      .from('payments')
      .select('*, registrations!inner(academic_year, fullName, mobileNumber, preferredBatchTime, courseSelected)')
      .order('date', { ascending: false });
      
    if (req.query.academicYear) {
      query = query.eq('registrations.academic_year', req.query.academicYear);
    }
    const { data: rows, error } = await query;

    if (error) throw error;

    const headers = [
      "Student Name", "Mobile", "Batch", "Course", "Amount Paid", "Type", "Method", "Date", "Remarks"
    ];

    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
      return s;
    };

    const csvRows = (rows || []).map((r: any) => {
      const reg = r.registrations || {};
      return [
        reg.fullName,
        reg.mobileNumber,
        reg.preferredBatchTime,
        reg.courseSelected,
        r.amount_paid,
        r.payment_type,
        r.payment_method,
        r.date ? new Date(r.date).toLocaleDateString('en-IN') : "",
        r.remarks
      ].map(escape).join(",");
    });

    const csv = headers.join(",") + "\n" + csvRows.join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=payments_report.csv");
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/admin/analytics", verifyAdmin, async (req: any, res: any) => {
  try {
    let rQuery = supabase.from('registrations').select('createdAt, courseSelected, status');
    if (req.query.academicYear) rQuery = rQuery.eq('academic_year', req.query.academicYear);
    const { data: regs, error } = await rQuery;

    let pQuery = supabase.from('payments').select('amount_paid, date, registrations!inner(academic_year)');
    if (req.query.academicYear) pQuery = pQuery.eq('registrations.academic_year', req.query.academicYear);
    const { data: payments, error: pError } = await pQuery;

    if (error || pError) throw error || pError;

    // Revenue Trend (Last 6 Months)
    const revenueByMonth: Record<string, number> = {};
    payments?.forEach(p => {
      const month = new Date(p.date).toLocaleString('default', { month: 'short', year: '2-digit' });
      revenueByMonth[month] = (revenueByMonth[month] || 0) + Number(p.amount_paid);
    });

    // Registration vs Confirmed conversion
    const totalRegs = regs?.length || 0;
    const confirmedRegs = regs?.filter(r => r.status === 'Confirmed').length || 0;
    const conversionRate = totalRegs > 0 ? Math.round((confirmedRegs / totalRegs) * 100) : 0;

    res.json({
      revenueTrend: Object.entries(revenueByMonth).map(([name, value]) => ({ name, value })),
      conversionRate,
      totalRegistrations: totalRegs,
      confirmedStudents: confirmedRegs
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/check-absentees", verifyAdmin, async (req: any, res: any) => {
  try {
    const { data: att, error } = await supabase
      .from('attendance')
      .select('registration_id, date, status')
      .order('date', { ascending: false });

    if (error) throw error;

    const studentHistory: Record<number, string[]> = {};
    att.forEach(a => {
      if (!studentHistory[a.registration_id]) studentHistory[a.registration_id] = [];
      studentHistory[a.registration_id].push(a.status);
    });

    const flaggedStudents: number[] = [];
    for (const [regId, history] of Object.entries(studentHistory)) {
      if (history.length >= 2 && history[0] === 'Absent' && history[1] === 'Absent') {
        flaggedStudents.push(Number(regId));
      }
    }

    if (flaggedStudents.length > 0) {
      const { data: students } = await supabase.from('registrations').select('fullName, mobileNumber').in('id', flaggedStudents);
      for (const s of (students || [])) {
        await sendWhatsAppNotification(
          s.mobileNumber,
          `👋 *Hi ${s.fullName}, We miss you!* NiKii Academy notice: You've been away for 2 days. Hope everything is ok! See you soon. 🚀`
        );
      }
    }

    res.json({ ok: true, alertsSent: flaggedStudents.length });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Individual Staff Management (Admin Only) ---

app.get("/api/admin/staff", verifyAdmin, async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('staff_accounts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ staff: data || [] });
  } catch (err) {
    console.error("GET /api/admin/staff error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/staff", verifyAdmin, async (req: any, res: any) => {
  const { username, password, full_name } = req.body;
  if (!username || !password || !full_name) return res.status(400).json({ error: "Missing required fields" });

  try {
    const { data, error } = await supabase
      .from('staff_accounts')
      .insert({ username, password, full_name, created_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: "Username already exists" });
      throw error;
    }
    res.json({ ok: true, staff: data });
  } catch (err) {
    console.error("POST /api/admin/staff error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/admin/staff/:id", verifyAdmin, async (req: any, res: any) => {
  try {
    const { error } = await supabase.from('staff_accounts').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/admin/staff/:id/password", verifyAdmin, async (req: any, res: any) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password is required" });

  try {
    const { error } = await supabase
      .from('staff_accounts')
      .update({ password })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/admin/update-key", verifyAdmin, async (req: any, res: any) => {
  const { newAdminKey } = req.body;
  if (!newAdminKey || newAdminKey.length < 8) {
    return res.status(400).json({ error: "Access Key must be at least 8 characters long" });
  }

  try {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'admin_key', value: newAdminKey });

    if (error) throw error;
    
    invalidateAdminKeyCache();
    console.log("🔐 Admin Access Key updated and cache invalidated.");
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/update-key error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`NikiiDigital API running on port ${PORT}`);
});

app.get("/api/public/certificates/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('registrations')
      .select('fullName, courseSelected, status, createdAt')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data || data.status !== 'Confirmed') {
      return res.status(404).json({ error: "No confirmed certificate found for this ID" });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/registrations/:id/certificate-notify", verifyAdmin, async (req: any, res: any) => {
  const { id } = req.params;

  try {
    const { data: reg, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!reg || reg.status !== 'Confirmed') {
      return res.status(400).json({ error: "Student must have Confirmed status to receive a certificate" });
    }

    const certificateUrl = `https://nikiidigital.in/certificate/${reg.id}`;

    // Send Email
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: `"NiKii Academy" <${process.env.EMAIL_USER}>`,
          to: reg.email,
          subject: `Congratulations! Your Certificate is Ready - ${reg.courseSelected}`,
          html: `
            <div style="font-family: sans-serif; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #2563eb; margin: 0;">Congratulations, ${reg.fullName}!</h1>
              <p style="font-size: 16px; color: #475569; margin-top: 10px;">We are proud to inform you that you have successfully completed your course at <strong>NiKii Computer Academy</strong>.</p>
              
              <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                <p style="margin: 0; font-size: 14px; text-transform: uppercase; color: #64748b;">Course Completed</p>
                <h2 style="margin: 5px 0; color: #1e293b;">${reg.courseSelected}</h2>
                <a href="${certificateUrl}" style="display: inline-block; margin-top: 15px; padding: 12px 25px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View Your Certificate</a>
              </div>

              <p style="font-size: 14px; color: #64748b;">You can also download a PDF version of your certificate for your records by clicking the button above.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;"/>
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">NiKii Computer Academy • Education is the Power of Life!</p>
            </div>
          `
        });
        console.log("Certificate notification Email dispatched successfully via Nodemailer.");
      }
    } catch (e) {
      console.error("Certificate email failed:", e);
    }

    // Send WhatsApp
    await sendWhatsAppNotification(
      reg.mobileNumber,
      `🎓 *CERTIFICATE OF COMPLETION* 🎓\n\nDear *${reg.fullName}*,\n\nCongratulations on successfully completing the *${reg.courseSelected}* program at *NiKii Computer Academy!* 🥳🎉\n\nYour hard work and dedication have paid off. Your official digital certificate is now ready for viewing and download.\n\n🔗 *View Certificate:* ${certificateUrl}\n\nWe are proud of your achievement and wish you the very best in your future career endeavors! 💻🚀\n\n*Education is the Power of Life!*`
    );

    res.json({ ok: true, url: certificateUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
