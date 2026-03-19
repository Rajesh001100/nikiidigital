import type { Course } from '../types';

export const fallbackCourses: Course[] = [
  {
    id: 2,
    title: "Summer Computer Course (SCC)",
    duration: "2 Months",
    description: "Perfect holiday program focusing on MS Office, Internet, and Digital Literacy.",
    icon: "bi-sun-fill",
    color: "from-orange-400 to-red-500",
    features: ["MS Office", "Internet Basics", "Typing Master"],
    isActive: true,
    isPromoted: true,
    badgeText: "50% OFF",
    createdAt: "2026-03-16T13:08:00Z"
  },
  {
    id: 3,
    title: "Kids Computer Application (KCA)",
    duration: "3 Months",
    description: "Engaging curriculum for youngsters to master basic operations and creative tools.",
    icon: "bi-controller",
    color: "from-pink-500 to-rose-600",
    features: ["MS Paint", "Logic Games", "Basic Typing"],
    isActive: true,
    isPromoted: false,
    createdAt: "2026-03-16T13:08:00Z"
  },
  {
    id: 4,
    title: "Junior Computer Application (JCA)",
    duration: "6 Months",
    description: "Foundational course for school students covering essential academic computing.",
    icon: "bi-mortarboard-fill",
    color: "from-indigo-500 to-purple-600",
    features: ["Adv. MS Office", "Intro to Web", "Digital Ethics"],
    isActive: true,
    isPromoted: false,
    createdAt: "2026-03-16T13:08:00Z"
  },
  {
    id: 5,
    title: "Diploma in Computer Application (DCA)",
    duration: "6 Months",
    description: "Most popular professional diploma for office management and data operations.",
    icon: "bi-file-earmark-spreadsheet-fill",
    color: "from-blue-500 to-cyan-600",
    features: ["DTP Basics", "Accounting Intro", "Database Mgmt"],
    isActive: true,
    isPromoted: false,
    createdAt: "2026-03-16T13:08:00Z"
  },
  {
    id: 6,
    title: "Diploma in Computer Programming (DCP)",
    duration: "6 Months",
    description: "Start your coding journey with fundamental logic and multiple programming languages.",
    icon: "bi-code-slash",
    color: "from-emerald-500 to-teal-600",
    features: ["C / C++", "Data Structures", "Logic Building"],
    isActive: true,
    isPromoted: false,
    createdAt: "2026-03-16T13:08:00Z"
  },
  {
    id: 7,
    title: "Diploma in Web Designing (DWD)",
    duration: "6 Months",
    description: "Transform into a web developer by learning modern design and front-end tech.",
    icon: "bi-layout-text-window-reverse",
    color: "from-orange-500 to-amber-600",
    features: ["HTML5 / CSS3", "Bootstrap/UI", "JavaScript"],
    isActive: true,
    isPromoted: false,
    createdAt: "2026-03-16T13:08:00Z"
  },
  {
    id: 8,
    title: "Diploma in DeskTop Publishing (DDTP)",
    duration: "6 Months",
    description: "Master professional graphic designing and document publishing tools.",
    icon: "bi-palette-fill",
    color: "from-violet-500 to-purple-600",
    features: ["Photoshop", "CorelDraw", "PageMaker"],
    isActive: true,
    isPromoted: false,
    createdAt: "2026-03-16T13:08:00Z"
  },
  {
    id: 9,
    title: "Diploma in Financial Accounting (DFA)",
    duration: "6 Months",
    description: "Professional accounting course with GST and computerized inventory management.",
    icon: "bi-calculator-fill",
    color: "from-emerald-600 to-green-700",
    features: ["Tally Prime", "GST Filing", "Inventory"],
    isActive: true,
    isPromoted: false,
    createdAt: "2026-03-16T13:08:00Z"
  },
  {
    id: 10,
    title: "Diploma in Hardware & Networking (DHN)",
    duration: "6 Months",
    description: "Learn PC assembly, troubleshooting, and professional network management.",
    icon: "bi-cpu-fill",
    color: "from-slate-600 to-gray-700",
    features: ["PC Assembly", "Networking", "Troubleshooting"],
    isActive: true,
    isPromoted: false,
    createdAt: "2026-03-16T13:08:00Z"
  },
  {
    id: 11,
    title: "Tally Prime Professional",
    duration: "4 Months",
    description: "Specialized course for modern business accounting and financial reports.",
    icon: "bi-currency-rupee",
    color: "from-sky-500 to-blue-600",
    features: ["Voucher Entry", "E-Way Bill", "Balance Sheet"],
    isActive: true,
    isPromoted: false,
    createdAt: "2026-03-16T13:08:00Z"
  }
];

export const fallbackSettings = {
  batchTimes: [
    'Batch - I (9.30am - 11.30am)',
    'Batch - II (11.30am - 1.30pm)',
    'Batch - III (1.30pm - 3.30pm)',
    'Batch - IV (3.30pm - 5.30pm)',
    'Batch - V (5.30pm - 7.30pm)'
  ],
  promoCodes: [
    { code: 'SUMMER50', discount: '50%', description: 'Summer Special Discount' }
  ],
  contactNumber: '+91 80155 99681',
  address: 'Near Anthiyur Bus Stand, Anthiyur'
};
