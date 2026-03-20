import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: "./server/.env" });

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase credentials missing prefix.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const courses = [
  {
    id: 2,
    title: "Summer Computer Course (SCC)",
    duration: "2 Months",
    description: "Perfect holiday program focusing on MS Office, Internet, and Digital Literacy.",
    icon: "bi-sun-fill",
    color: "from-orange-400 to-red-500",
    features: ["MS Office", "Internet Basics", "Typing Master"],
    imageUrl: null,
    isActive: true,
    isPromoted: true,
    badgeText: "50% OFF",
    createdAt: "2026-03-16T13:08:00.143914+00:00"
  },
  {
    id: 3,
    title: "Kids Computer Application (KCA)",
    duration: "3 Months",
    description: "Engaging curriculum for youngsters to master basic operations and creative tools.",
    icon: "bi-controller",
    color: "from-pink-500 to-rose-600",
    features: ["MS Paint", "Logic Games", "Basic Typing"],
    imageUrl: null,
    isActive: true,
    isPromoted: false,
    badgeText: null,
    createdAt: "2026-03-16T13:08:00.143914+00:00"
  },
  {
    id: 4,
    title: "Junior Computer Application (JCA)",
    duration: "6 Months",
    description: "Foundational course for school students covering essential academic computing.",
    icon: "bi-mortarboard-fill",
    color: "from-indigo-500 to-purple-600",
    features: ["Adv. MS Office", "Intro to Web", "Digital Ethics"],
    imageUrl: null,
    isActive: true,
    isPromoted: false,
    badgeText: null,
    createdAt: "2026-03-16T13:08:00.143914+00:00"
  },
  {
    id: 5,
    title: "Diploma in Computer Application (DCA)",
    duration: "6 Months",
    description: "Most popular professional diploma for office management and data operations.",
    icon: "bi-file-earmark-spreadsheet-fill",
    color: "from-blue-500 to-cyan-600",
    features: ["DTP Basics", "Accounting Intro", "Database Mgmt"],
    imageUrl: null,
    isActive: true,
    isPromoted: false,
    badgeText: null,
    createdAt: "2026-03-16T13:08:00.143914+00:00"
  },
  {
    id: 6,
    title: "Diploma in Computer Programming (DCP)",
    duration: "6 Months",
    description: "Start your coding journey with fundamental logic and multiple programming languages.",
    icon: "bi-code-slash",
    color: "from-emerald-500 to-teal-600",
    features: ["C / C++", "Data Structures", "Logic Building"],
    imageUrl: null,
    isActive: true,
    isPromoted: false,
    badgeText: null,
    createdAt: "2026-03-16T13:08:00.143914+00:00"
  },
  {
    id: 7,
    title: "Diploma in Web Designing (DWD)",
    duration: "6 Months",
    description: "Transform into a web developer by learning modern design and front-end tech.",
    icon: "bi-layout-text-window-reverse",
    color: "from-orange-500 to-amber-600",
    features: ["HTML5 / CSS3", "Bootstrap/UI", "JavaScript"],
    imageUrl: null,
    isActive: true,
    isPromoted: false,
    badgeText: null,
    createdAt: "2026-03-16T13:08:00.143914+00:00"
  },
  {
    id: 8,
    title: "Diploma in DeskTop Publishing (DDTP)",
    duration: "6 Months",
    description: "Master professional graphic designing and document publishing tools.",
    icon: "bi-palette-fill",
    color: "from-violet-500 to-purple-600",
    features: ["Photoshop", "CorelDraw", "PageMaker"],
    imageUrl: null,
    isActive: true,
    isPromoted: false,
    badgeText: null,
    createdAt: "2026-03-16T13:08:00.143914+00:00"
  },
  {
    id: 9,
    title: "Diploma in Financial Accounting (DFA)",
    duration: "6 Months",
    description: "Professional accounting course with GST and computerized inventory management.",
    icon: "bi-calculator-fill",
    color: "from-emerald-600 to-green-700",
    features: ["Tally Prime", "GST Filing", "Inventory"],
    imageUrl: null,
    isActive: true,
    isPromoted: false,
    badgeText: null,
    createdAt: "2026-03-16T13:08:00.143914+00:00"
  },
  {
    id: 10,
    title: "Diploma in Hardware & Networking (DHN)",
    duration: "6 Months",
    description: "Learn PC assembly, troubleshooting, and professional network management.",
    icon: "bi-cpu-fill",
    color: "from-slate-600 to-gray-700",
    features: ["PC Assembly", "Networking", "Troubleshooting"],
    imageUrl: null,
    isActive: true,
    isPromoted: false,
    badgeText: null,
    createdAt: "2026-03-16T13:08:00.143914+00:00"
  },
  {
    id: 11,
    title: "Tally Prime Professional",
    duration: "4 Months",
    description: "Specialized course for modern business accounting and financial reports.",
    icon: "bi-currency-rupee",
    color: "from-sky-500 to-blue-600",
    features: ["Voucher Entry", "E-Way Bill", "Balance Sheet"],
    imageUrl: null,
    isActive: true,
    isPromoted: false,
    badgeText: null,
    createdAt: "2026-03-16T13:08:00.143914+00:00"
  }
];

const registrations = [
  {
    id: 1,
    fullName: "Rajesh Rajesh",
    email: "mallappaganiga04@gmail.com",
    gender: "Male",
    dateOfBirth: "2007-02-26",
    address: "no1,anthiyur",
    highestQualification: "UG & PG (Any Degree)",
    schoolCollegeName: "JKKMCT",
    yearOfStudy: "B.Tech-IT and II-Year",
    mobileNumber: "+919750534434",
    preferredBatchTime: "Batch - I (9.30am - 11.30am)",
    courseSelected: "Junior Computer Application (JCA)",
    howDidYouHear: "Friends / Relatives",
    paymentMode: "Offline Mode",
    promoCode: null,
    status: "Confirmed",
    createdAt: "2026-03-16T13:50:36.260Z"
  },
  {
    id: 2,
    fullName: "Rajesh.M",
    email: "mallappaganiga04@gmail.com",
    gender: "Male",
    dateOfBirth: "2007-02-26",
    address: "NO 1,Anthiyur",
    highestQualification: "UG & PG (Any Degree)",
    schoolCollegeName: "JKKMCT",
    yearOfStudy: "II-Year - B.Tech-it",
    mobileNumber: "+919750534434",
    preferredBatchTime: "Batch - I (9.30am - 11.30am)",
    courseSelected: "Kids Computer Application (KCA)",
    howDidYouHear: "WhatsApp",
    paymentMode: "Offline Mode",
    promoCode: null,
    status: "Pending",
    createdAt: "2026-03-16T14:47:14.477Z"
  },
  {
    id: 3,
    fullName: "Aathiselva.M",
    email: "rajeshrcb1817@gmail.com",
    gender: "Male",
    dateOfBirth: "2007-10-31",
    address: "fdla;fjlfkjdflk",
    highestQualification: "Class 11 to 12",
    schoolCollegeName: "JKKMCT",
    yearOfStudy: "10 std",
    mobileNumber: "+919344012456",
    preferredBatchTime: "Batch - I (9.30am - 11.30am)",
    courseSelected: "Diploma in Hardware & Networking (DHN)",
    howDidYouHear: "Friends / Relatives",
    paymentMode: "Offline Mode",
    promoCode: null,
    status: "Pending",
    createdAt: "2026-03-16T15:08:13.041Z"
  }
];

const settings = [
  { key: 'batchTimes', value: [
    'Batch - I (9.30am - 11.30am)',
    'Batch - II (11.30am - 1.30pm)',
    'Batch - III (1.30pm - 3.30pm)',
    'Batch - IV (3.30pm - 5.30pm)',
    'Batch - V (5.30pm - 7.30pm)'
  ]},
  { key: 'promoCodes', value: [
    { code: 'SUMMER50', discount: '50%', description: 'Summer Special Discount' }
  ]},
  { key: 'contactNumber', value: '+91 97505 34434' },
  { key: 'address', value: 'Near Anthiyur Bus Stand, Anthiyur' }
];

async function seed() {
  console.log("🚀 Starting database seed...");

  // Seed Courses
  console.log("📦 Seeding courses...");
  const { error: courseError } = await supabase.from('courses').upsert(courses);
  if (courseError) console.error("❌ Course seed error:", courseError.message);
  else console.log("✅ Courses seeded.");

  // Seed Registrations
  console.log("📋 Seeding registrations...");
  const { error: regError } = await supabase.from('registrations').upsert(registrations);
  if (regError) console.error("❌ Registration seed error:", regError.message);
  else console.log("✅ Registrations seeded.");

  // Seed Settings
  console.log("⚙️ Seeding settings...");
  const { error: settingsError } = await supabase.from('settings').upsert(settings);
  if (settingsError) console.error("❌ Settings seed error:", settingsError.message);
  else console.log("✅ Settings seeded.");

  console.log("🏁 Seed complete!");
}

seed();
