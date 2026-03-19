import { useEffect, useState } from 'react'
import { getRegistrations, registrationsCsvUrl, getCourses, createCourse, updateCourse, deleteCourse, getDashboardStats, updateRegistrationStatus, getSettings, updateSettings, getAttendance, updateAttendance, notifyCertificate, getAdminAnalytics, checkAbsentees, updateRegistration, getAdminMaterials, addAdminMaterial, deleteAdminMaterial, getAdminPayments, addAdminPayment } from '../lib/api'
import type { RegistrationRow, Course, AdminAnalytics, Material, Payment } from '../types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { LayoutDashboard, Users, BookOpen, Download, Plus, Trash2, Edit3, CheckCircle2, Settings, FileText, Send, Award } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; rows: RegistrationRow[]; courses: Course[]; stats: any; settings: any; attendance: any[]; analytics: AdminAnalytics; materials: Material[]; payments: Payment[]; paymentSummary: { totalFullCount: number; totalInstalment1Count: number; pendingInst2Count: number; totalRevenue: number }; pendingSecondInstalment: Payment[] }
  | { status: 'error'; message: string }

const STORAGE_KEY = 'nikiidigital_admin_key'

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const [activeTab, setActiveTab] = useState<'stats' | 'regs' | 'courses' | 'attendance' | 'certificates' | 'settings' | 'analytics' | 'payments'>('stats')
  const [selectedCourseForMaterials, setSelectedCourseForMaterials] = useState<Course | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    payment_type: 'Full' as 'Full' | 'Installment 1' | 'Installment 2',
    payment_method: 'Cash' as 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'DD',
    discount_amount: '',
    custom_amount: '',
    remarks: ''
  })
  const [state, setState] = useState<LoadState>({ status: 'idle' })
  const [csvBusy, setCsvBusy] = useState(false)
  const [alertBusy, setAlertBusy] = useState(false)

  // Edit & Modal State
  const [editingStudent, setEditingStudent] = useState<RegistrationRow | null>(null)
  const [studentPayment, setStudentPayment] = useState<RegistrationRow | null>(null)
  const [materialForm, setMaterialForm] = useState({ title: '', file_url: '', description: '', course_id: 0 })

  // Attendance State
  const [selectedBatch, setSelectedBatch] = useState('Batch - I (9.30am - 11.30am)')
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])

  // Course Form State
  const [isEditingCourse, setIsEditingCourse] = useState<Course | null>(null)
  const [courseForm, setCourseForm] = useState<Omit<Course, 'id' | 'createdAt'>>({
    title: '',
    duration: '',
    description: '',
    icon: 'bi-mortarboard-fill',
    color: 'from-blue-500 to-indigo-600',
    features: [],
    imageUrl: '',
    syllabusUrl: '',
    isActive: true,
    isPromoted: false,
    badgeText: ''
  })

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState<any>({
    batchTimes: [],
    promoCodes: [],
    contactNumber: '',
    address: ''
  })

  const registrations = state.status === 'loaded' ? state.rows : []
  const courses = state.status === 'loaded' ? state.courses : []
  const stats = state.status === 'loaded' ? state.stats : null

  async function load(keyOverride?: string) {
    const key = keyOverride ?? adminKey
    if (!key) return
    setState({ status: 'loading' })
    try {      console.log("Fetching fresh data...")
      const [r, c, s, sett, att, ana, mat, pay] = await Promise.all([
        getRegistrations(key),
        getCourses(),
        getDashboardStats(key),
        getSettings(),
        getAttendance(key, attendanceDate),
        getAdminAnalytics(key),
        getAdminMaterials(),
        getAdminPayments(key)
      ])
      setState({
        status: 'loaded',
        rows: r.registrations,
        courses: c.courses,
        stats: s,
        settings: sett,
        attendance: att.attendance,
        analytics: ana,
        materials: mat.materials,
        payments: pay.payments,
        paymentSummary: pay.summary || { totalFullCount: 0, totalInstalment1Count: 0, pendingInst2Count: 0, totalRevenue: 0 },
        pendingSecondInstalment: pay.pendingSecondInstalment || []
      })
      if (sett) setSettingsForm(sett)
    } catch (e: unknown) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Failed to load' })
    }
  }

  async function handleUpdateStatus(id: number, newStatus: 'Pending' | 'Confirmed' | 'Rejected', discountAmount?: number) {
    try {
      await updateRegistrationStatus(adminKey, id, newStatus, discountAmount);
      void load(adminKey); // Refresh data
    } catch (err) {
      alert("Failed to update status");
    }
  }

  useEffect(() => {
    if (adminKey) void load(adminKey)
  }, [])

  async function handleCourseSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (isEditingCourse) {
        await updateCourse(adminKey, isEditingCourse.id, courseForm)
      } else {
        await createCourse(adminKey, courseForm)
      }
      setIsEditingCourse(null)
      setCourseForm({ title: '', duration: '', description: '', icon: 'bi-mortarboard-fill', color: 'from-blue-500 to-indigo-600', features: [], imageUrl: '', isActive: true, isPromoted: false, badgeText: '', totalFee: 0 })
      void load(adminKey)
    } catch (err: any) {
      const details = err.details?.fieldErrors;
      if (details) {
        const msg = Object.entries(details)
          .map(([field, errors]: [string, any]) => `${field}: ${errors.join(', ')}`)
          .join('\n');
        alert(`Validation Failed:\n${msg}`);
      } else {
        alert(err.message || "Action failed. Check console.");
      }
    }
  }

  async function handleDeleteCourse(id: number) {
    if (!confirm("Are you sure?")) return
    try {
      await deleteCourse(adminKey, id)
      void load(adminKey)
    } catch (err) {
      alert("Delete failed")
    }
  }

  async function downloadCsv() {
    setCsvBusy(true)
    try {
      const res = await fetch(registrationsCsvUrl(), { headers: { 'x-admin-key': adminKey } })
      if (!res.ok) throw new Error('CSV download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `registrations_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setCsvBusy(false)
    }
  }

  async function handleAttendanceToggle(registrationId: number, currentStatus: string) {
    const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
    try {
      await updateAttendance(adminKey, attendanceDate, [{ registrationId, status: newStatus }]);
      void load(adminKey);
    } catch (err) {
      alert("Attendance update failed");
    }
  }

  async function handleNotify(id: number) {
    try {
      await notifyCertificate(adminKey, id);
      alert("Notification sent successfully!");
    } catch (err) {
      alert("Failed to send notification via Email/WhatsApp");
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateSettings(adminKey, settingsForm);
      alert("Settings saved successfully!");
      void load(adminKey);
    } catch (err) {
      alert("Failed to save settings");
    }
  }

  // Phase 4 New Handlers
  async function handleSaveStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await updateRegistration(adminKey, editingStudent.id, editingStudent);
      alert("Student record updated successfully!");
      setEditingStudent(null);
      void load(adminKey);
    } catch (err) {
      alert("Failed to update student record");
    }
  }

  async function handleCheckAbsentees() {
    setAlertBusy(true);
    try {
      const res = await checkAbsentees(adminKey);
      alert(`Success! Sent ${res.alertsSent} WhatsApp alerts to consecutive absentees.`);
      void load(adminKey);
    } catch (err) {
      alert("Failed to trigger absentee check");
    } finally {
      setAlertBusy(false);
    }
  }

  async function handleAddMaterial(e: React.FormEvent) {
    e.preventDefault();
    try {
      await addAdminMaterial(adminKey, materialForm);
      // Keep course_id so admin can add more materials to same course
      setMaterialForm(prev => ({ title: '', file_url: '', description: '', course_id: prev.course_id }));
      void load(adminKey);
    } catch (err) {
      alert("Failed to add material");
    }
  }

  async function handleDeleteMaterial(id: number) {
    if (!confirm("Delete this material?")) return;
    try {
      await deleteAdminMaterial(adminKey, id);
      void load(adminKey);
    } catch (err) {
      alert("Failed to delete material");
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!studentPayment) return;
    let amount = Number(paymentForm.custom_amount);
    if (!amount || isNaN(amount)) {
      alert("Please enter a valid amount.");
      return;
    }
    try {
      const disc = paymentForm.discount_amount ? Number(paymentForm.discount_amount) : 0;
      
      // If the student is still Pending, confirm them automatically during this first payment
      if (studentPayment.status === 'Pending') {
        await updateRegistrationStatus(adminKey, studentPayment.id, 'Confirmed', disc);
      }

      await addAdminPayment(adminKey, {
        registration_id: studentPayment.id,
        amount_paid: amount,
        payment_type: paymentForm.payment_type,
        payment_method: paymentForm.payment_method,
        discount_amount: paymentForm.discount_amount ? Number(paymentForm.discount_amount) : undefined,
        remarks: paymentForm.remarks || `Via ${paymentForm.payment_method}`
      });
      setStudentPayment(null);
      setPaymentForm({ payment_type: 'Full', payment_method: 'Cash', discount_amount: '', custom_amount: '', remarks: '' });
      void load(adminKey);
    } catch (err) {
      alert("Failed to record payment");
    }
  }

  function generateAdmissionLetter(reg: RegistrationRow) {
    const doc = new jsPDF() as any;

    // Header
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("NiKii Computer Academy", 105, 25, { align: "center" });

    // Sub-header
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("State and Central Certified Academy • Anthiyur", 105, 32, { align: "center" });

    // Content
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.text("PROVISIONAL ADMISSION LETTER", 105, 60, { align: "center" });

    doc.setDrawColor(226, 232, 240);
    doc.line(20, 65, 190, 65);

    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 20, 75);
    doc.text(`Ref ID: #REG-${reg.id.toString().padStart(4, '0')}`, 190, 75, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.text(`To, ${reg.fullName}`, 20, 90);
    doc.setFont("helvetica", "normal");
    doc.text(`Email: ${reg.email}`, 20, 96);
    doc.text(`Mobile: ${reg.mobileNumber}`, 20, 102);

    doc.text("We are pleased to inform you that your admission to the following program has been confirmed:", 20, 115);

    // Course Details Box
    doc.setFillColor(248, 250, 252);
    doc.rect(20, 125, 170, 40, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("PROGRAM DETAILS", 30, 135);
    doc.setFont("helvetica", "normal");
    doc.text(`Course Name: ${reg.courseSelected}`, 30, 145);
    doc.text(`Batch Time: ${reg.preferredBatchTime}`, 30, 155);

    // Important Instructions
    doc.setFont("helvetica", "bold");
    doc.text("IMPORTANT INSTRUCTIONS:", 20, 180);
    doc.setFont("helvetica", "normal");
    const instructions = [
      "1. Please report to the academy on your scheduled batch time.",
      "2. Bring original Aadhar Card and 2 Passport size photographs.",
      "3. All fees are non-refundable after the course commencement.",
      "4. Minimum 85% attendance is mandatory for certification."
    ];
    doc.text(instructions, 20, 190);

    // Signature
    doc.setFont("helvetica", "bold");
    doc.text("Authorized Signatory", 150, 240);
    doc.setFontSize(8);
    doc.text("Nikii Computer Academy, Athiyur.", 150, 245);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("This is a computer-generated document and does not require a physical signature.", 105, 285, { align: "center" });

    doc.save(`Admission_Letter_${reg.fullName.replace(/\s+/g, '_')}.pdf`);
  }

  function generateCertificate(reg: RegistrationRow) {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    }) as any;

    const width = 297;
    const height = 210;

    // --- PREMIUM FRAME ---
    // Outer Gold Border
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(3);
    doc.rect(8, 8, width - 16, height - 16);

    // Inner Blue Line
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.8);
    doc.rect(12, 12, width - 24, height - 24);

    // Corner Ornaments
    const corners = [[8, 8], [width - 8, 8], [8, height - 8], [width - 8, height - 8]];
    corners.forEach(([x, y]) => {
      doc.setFillColor(212, 175, 55);
      doc.circle(x, y, 3, 'F');
      doc.setFillColor(30, 58, 138);
      doc.circle(x, y, 1.5, 'F');
    });

    // --- BACKGROUND WATERMARK ---
    doc.setTextColor(241, 245, 249);
    doc.setFontSize(120);
    doc.setFont("helvetica", "bold");
    doc.text("NCA", width / 2, height / 2 + 15, { align: "center", angle: 0 });

    // --- LOGO PLACEHOLDER / TEXT HEADER ---
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(40);
    doc.setFont("helvetica", "bold");
    doc.text("NiKii Computer Academy", width / 2, 40, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("An ISO 9001:2015 Certified Institution", width / 2, 48, { align: "center" });
    doc.text("State and Central Certified Academy • Anthiyur", width / 2, 54, { align: "center" });

    // --- MAIN TITLE ---
    doc.setTextColor(184, 134, 11);
    doc.setFontSize(50);
    doc.setFont("times", "bolditalic");
    doc.text("Certificate of Achievement", width / 2, 85, { align: "center" });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");
    doc.text("This is to certify that", width / 2, 100, { align: "center" });

    // --- STUDENT NAME ---
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(36);
    doc.setFont("helvetica", "bold");
    doc.text(reg.fullName, width / 2, 115, { align: "center" });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(18);
    doc.setFont("helvetica", "normal");
    doc.text("has successfully completed the professional program in", width / 2, 130, { align: "center" });

    // --- COURSE NAME ---
    doc.setTextColor(30, 58, 138);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text(reg.courseSelected, width / 2, 145, { align: "center" });

    doc.setTextColor(71, 85, 105);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(`Awarded on ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, width / 2, 155, { align: "center" });

    // --- OFFICIAL SEAL ---
    doc.setFillColor(212, 175, 55);
    doc.circle(width - 45, 170, 15, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.circle(width - 45, 170, 12, 'S');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("OFFICIAL SEAL", width - 45, 170, { align: "center" });
    doc.text("NCA", width - 45, 174, { align: "center" });

    // --- FOOTER ELEMENTS ---
    // Serial Number
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    const certId = `CERT-${reg.id}-${new Date().getFullYear()}`;
    doc.text(`Certificate No: ${certId}`, 20, 195);
    doc.text(`Verification: nikiidigital.in/certificate/${reg.id}`, 20, 200);

    // Signatures
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.5);
    doc.line(40, 185, 95, 185);
    doc.line(width - 150, 185, width - 95, 185);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DIRECTOR", 67.5, 192, { align: "center" });
    doc.text("AUTHORIZED SIGNATORY", width - 122.5, 192, { align: "center" });

    // Slogan
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235);
    doc.setFont("helvetica", "italic");
    doc.text("Education is the Power of Life!", width / 2, 200, { align: "center" });

    doc.save(`Certificate_${reg.fullName.replace(/\s+/g, '_')}.pdf`);
  }

  if (state.status === 'idle' || !adminKey) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-blue-600 text-white shadow-2xl shadow-blue-200">
          <LayoutDashboard size={48} />
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Admin Gateway</h1>
        <p className="mt-4 max-w-md text-lg font-medium text-slate-500 leading-relaxed">
          Unlock the dashboard to manage courses, analyze trends, and view student registrations.
        </p>
        <div className="mt-10 flex w-full max-w-lg gap-4">
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Enter Admin Access Key"
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-lg font-medium outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition shadow-sm"
          />
          <button
            onClick={() => { localStorage.setItem(STORAGE_KEY, adminKey); void load(adminKey) }}
            className="rounded-2xl bg-slate-900 px-8 py-4 font-bold text-white hover:bg-slate-800 transition"
          >
            Authenticate
          </button>
        </div>
        {state.status === 'error' && <p className="mt-6 font-bold text-red-500">{state.message}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">NiKii Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 font-medium italic">Welcome back, Administrator</p>
            <button onClick={() => load(adminKey)} className="text-blue-600 hover:text-blue-800 p-1 transition-colors" title="Refresh Data">
              <i className={`bi bi-arrow-clockwise text-lg ${state.status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => { localStorage.removeItem(STORAGE_KEY); setAdminKey(''); setState({ status: 'idle' }); }}
              className="ml-4 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
            >
              Sign Out / Change Key
            </button>
          </div>
        </div>
        <div className="flex gap-3 rounded-2xl bg-white p-1.5 shadow-sm border border-slate-100">
          {[
            { id: 'stats', label: 'Overview', icon: LayoutDashboard },
            { id: 'analytics', label: 'BI Analytics', icon: BarChart },
            { id: 'regs', label: 'Students', icon: Users },
            { id: 'payments', label: 'Payments', icon: Send },
            { id: 'courses', label: 'CMS', icon: BookOpen },
            { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
            { id: 'certificates', label: 'Certificates', icon: Award },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>
      {state.status === 'loading' && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-12 w-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center p-8 bg-red-50 rounded-[2.5rem] border border-red-100 animate-in zoom-in-95 duration-500">
          <div className="h-20 w-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6">
            <Trash2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">Authentication Error</h2>
          <p className="text-slate-500 max-w-sm font-medium mb-8">
            The access key you've provided is incorrect or expired. Please sign out and try again with the correct key.
          </p>
          <p className="text-red-600 font-bold mb-8 italic">"{state.message}"</p>
          <button
            onClick={() => { localStorage.removeItem(STORAGE_KEY); setAdminKey(''); setState({ status: 'idle' }); }}
            className="rounded-2xl bg-slate-900 px-10 py-4 font-bold text-white hover:bg-slate-800 transition shadow-xl"
          >
            Reset Access Key
          </button>
        </div>
      )}

      {state.status === 'loaded' && (
        <div className="animate-in fade-in duration-500">
          {/* --- DASHBOARD OVERVIEW --- */}
          {activeTab === 'stats' && (
            <div className="space-y-8">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Registrations</p>
                  <p className="mt-3 text-5xl font-black text-slate-900">{registrations.length}</p>
                </div>
                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Confirmed Admissions</p>
                  <p className="mt-3 text-5xl font-black text-emerald-600">{registrations.filter(r => r.status === 'Confirmed').length}</p>
                </div>
                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Conversion Rate</p>
                  <p className="mt-3 text-5xl font-black text-slate-900">
                    {registrations.length > 0
                      ? Math.round((registrations.filter(r => r.status === 'Confirmed').length / registrations.length) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="rounded-3xl bg-blue-600 p-8 text-white shadow-xl">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-200">Revenue Potential</p>
                  <p className="mt-3 text-4xl font-black">₹{registrations.filter(r => r.status === 'Confirmed').length * 5000}+</p>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                <div className="rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                  <h3 className="mb-8 text-xl font-bold text-slate-900 px-2">Course Popularity</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.courseDistribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                  <h3 className="mb-8 text-xl font-bold text-slate-900 px-2">Registration Trends</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.registrationTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- BI ANALYTICS TAB --- */}
          {activeTab === 'analytics' && state.status === 'loaded' && (
            <div className="space-y-8">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-[2rem] bg-indigo-600 p-8 text-white shadow-xl shadow-indigo-100">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Real-time Conversion</p>
                  <p className="mt-4 text-5xl font-black">{state.analytics.conversionRate}%</p>
                  <p className="mt-2 text-sm font-bold opacity-80">{state.analytics.confirmedStudents} Confirmed / {state.analytics.totalRegistrations} Total</p>
                </div>
                <div className="rounded-[2rem] bg-white p-8 border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Monthly Growth</p>
                  <p className="mt-4 text-4xl font-black text-slate-900">+12.4%</p>
                  <p className="mt-2 text-sm font-bold text-emerald-500">Trending Upward</p>
                </div>
                <div className="rounded-[2rem] bg-white p-8 border border-slate-100 shadow-sm flex flex-col justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Attendance Health</p>
                  <button
                    onClick={handleCheckAbsentees}
                    disabled={alertBusy}
                    className="mt-4 w-full rounded-xl bg-blue-50 py-3 text-sm font-black text-blue-600 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    {alertBusy ? 'Checking...' : 'Send Absentee Alerts'}
                  </button>
                </div>
              </div>

              <div className="rounded-[2.5rem] bg-white p-10 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-10 flex items-center gap-3">
                  <i className="bi bi-graph-up-arrow text-emerald-500" />
                  Revenue Forecast & Performance
                </h3>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={state.analytics.revenueTrend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '16px' }}
                        itemStyle={{ fontWeight: '900', color: '#2563eb' }}
                      />
                      <Line type="monotone" dataKey="value" name="Revenue (₹)" stroke="#2563eb" strokeWidth={6} dot={{ r: 8, fill: '#2563eb', strokeWidth: 4, stroke: '#fff' }} activeDot={{ r: 10 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* --- PAYMENTS TAB --- */}
          {activeTab === 'payments' && state.status === 'loaded' && (() => {
            const { paymentSummary: ps, pendingSecondInstalment: pending } = state;
            return (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-xl shadow-blue-100">
                    <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-3">Total Revenue</p>
                    <p className="text-4xl font-black">₹{ps.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs mt-2 opacity-60">All payments combined</p>
                  </div>
                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Full Settlement</p>
                    <p className="text-4xl font-black text-slate-900">{ps.totalFullCount}</p>
                    <p className="text-xs mt-2 text-emerald-500 font-bold">Students fully paid</p>
                  </div>
                  <div className="rounded-3xl bg-white border border-slate-100 p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Instalment 1 Paid</p>
                    <p className="text-4xl font-black text-slate-900">{ps.totalInstalment1Count}</p>
                    <p className="text-xs mt-2 text-blue-500 font-bold">In 2-part payment plan</p>
                  </div>
                  <div className="rounded-3xl bg-amber-50 border border-amber-100 p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-widest text-amber-500 mb-3">Pending 2nd Inst.</p>
                    <p className="text-4xl font-black text-amber-600">{ps.pendingInst2Count}</p>
                    <p className="text-xs mt-2 text-amber-400 font-bold">Awaiting 2nd payment</p>
                  </div>
                </div>

                {/* Pending 2nd Instalment Section */}
                {pending.length > 0 && (
                  <div className="rounded-[2.5rem] bg-amber-50 border border-amber-100 p-8 shadow-sm">
                    <h4 className="text-lg font-black text-amber-700 mb-5 flex items-center gap-2">
                      ⏳ Pending 2nd Instalment ({pending.length})
                    </h4>
                    <div className="space-y-3">
                      {pending.map(p => (
                        <div key={p.id} className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 border border-amber-100">
                          <div>
                            <p className="font-bold text-slate-900">{p.registrations?.fullName}</p>
                            <p className="text-xs text-slate-400">{p.registrations?.mobileNumber} • 1st: ₹{p.amount_paid} paid</p>
                          </div>
                          <button
                            onClick={() => {
                              const reg = state.rows.find(r => r.id === p.registration_id);
                              if (reg) {
                                setStudentPayment(reg);
                                setPaymentForm(prev => ({ ...prev, payment_type: 'Installment 2' }));
                              }
                            }}
                            className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-black text-white hover:bg-amber-600 transition"
                          >
                            Record 2nd Instalment
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment History Table */}
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-4">All Payment Records</h3>
                  <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-5 text-xs font-black uppercase text-slate-400">Student</th>
                          <th className="px-8 py-5 text-xs font-black uppercase text-slate-400">Amount & Type</th>
                          <th className="px-8 py-5 text-xs font-black uppercase text-slate-400">Method</th>
                          <th className="px-8 py-5 text-xs font-black uppercase text-slate-400">Date</th>
                          <th className="px-8 py-5 text-xs font-black uppercase text-slate-400">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {state.payments.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="px-8 py-5">
                              <p className="font-bold text-slate-900">{p.registrations?.fullName || 'Unknown'}</p>
                              <p className="text-xs text-slate-400">{p.registrations?.mobileNumber}</p>
                            </td>
                            <td className="px-8 py-5">
                              <p className="text-sm font-black text-blue-600">₹{p.amount_paid}</p>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                                p.payment_type === 'Full' ? 'bg-emerald-100 text-emerald-700'
                                : p.payment_type === 'Installment 1' ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                              }`}>{p.payment_type}</span>
                            </td>
                            <td className="px-8 py-5">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                p.payment_method === 'Cash' ? 'bg-slate-100 text-slate-600'
                                : p.payment_method === 'UPI' ? 'bg-violet-100 text-violet-700'
                                : p.payment_method === 'Bank Transfer' ? 'bg-blue-100 text-blue-700'
                                : 'bg-orange-100 text-orange-700'
                              }`}>
                                {p.payment_method || 'Cash'}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-sm text-slate-500">{new Date(p.date).toLocaleDateString('en-IN')}</td>
                            <td className="px-8 py-5 text-sm text-slate-400 italic">{p.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* --- STUDENTS TAB --- */}
          {activeTab === 'regs' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">Registered Students</h3>
                <button
                  onClick={downloadCsv}
                  disabled={csvBusy || registrations.length === 0}
                  className="flex items-center gap-2 rounded-xl bg-emerald-50 px-6 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  <Download size={18} />
                  {csvBusy ? 'Preparing...' : 'Export CSV'}
                </button>
              </div>
              <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5 text-xs font-black uppercase text-slate-400">Student Identity</th>
                      <th className="px-8 py-5 text-xs font-black uppercase text-slate-400">Academic History</th>
                      <th className="px-8 py-5 text-xs font-black uppercase text-slate-400">Enrollment Details</th>
                      <th className="px-8 py-5 text-xs font-black uppercase text-slate-400">Status & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {registrations.map(reg => (
                      <tr key={reg.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="font-bold text-slate-900">{reg.fullName}</div>
                          <div className="text-sm text-slate-500">{reg.email}</div>
                          <div className="mt-2 text-[10px] font-black uppercase tracking-tighter text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block">ID: #REG-{reg.id.toString().padStart(4, '0')}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm font-bold text-slate-800">{reg.highestQualification}</div>
                          <div className="text-xs text-slate-500 font-medium">{reg.schoolCollegeName}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm font-bold text-blue-600 leading-tight">{reg.courseSelected}</div>
                          <a
                            href={`https://wa.me/${reg.mobileNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${reg.fullName}, this is NiKii Computer Academy. We received your registration for ${reg.courseSelected}. How can we help you today?`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition"
                          >
                            <i className="bi bi-whatsapp" />
                            {reg.mobileNumber}
                          </a>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${reg.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' :
                              reg.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                              {reg.status}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingStudent(reg)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit Student Details"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setStudentPayment(reg);
                                  const base = courses.find(c => c.title === reg.courseSelected)?.totalFee || 0;
                                  const d = reg.discount_amount || 0;
                                  setPaymentForm({
                                    payment_type: 'Full',
                                    payment_method: 'Cash',
                                    discount_amount: d ? String(d) : '',
                                    custom_amount: base ? String(Math.max(0, base - d)) : '',
                                    remarks: ''
                                  });
                                }}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Record Fee Payment"
                              >
                                <i className="bi bi-currency-rupee text-sm" />
                              </button>
                            </div>
                            {reg.status === 'Pending' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setStudentPayment(reg);
                                    const base = courses.find(c => c.title === reg.courseSelected)?.totalFee || 0;
                                    const d = reg.discount_amount || 0;
                                    setPaymentForm({
                                      payment_type: 'Full',
                                      payment_method: 'Cash',
                                      discount_amount: d ? String(d) : '',
                                      custom_amount: base ? String(Math.max(0, base - d)) : '',
                                      remarks: ''
                                    });
                                  }}
                                  className="text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition flex items-center gap-1 shadow-sm"
                                >
                                  <CheckCircle2 size={12} />
                                  Confirm
                                </button>
                                <button
                                  onClick={() => { if (confirm('Reject this registration?')) handleUpdateStatus(reg.id, 'Rejected') }}
                                  className="text-[10px] font-black uppercase tracking-widest bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition flex items-center gap-1 shadow-sm"
                                >
                                  <Trash2 size={12} />
                                  Reject
                                </button>
                              </div>
                            )}
                            {reg.status !== 'Pending' && (
                              <div className="flex gap-2">
                                {reg.status === 'Confirmed' && (
                                  <button
                                    onClick={() => generateAdmissionLetter(reg)}
                                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition"
                                    title="Generate Admission Letter"
                                  >
                                    <FileText size={12} />
                                    Letter
                                  </button>
                                )}
                                <button
                                  onClick={() => { if (confirm('Reset status to Pending?')) handleUpdateStatus(reg.id, 'Pending') }}
                                  className="text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition flex items-center gap-1"
                                  title="Reset to Pending"
                                >
                                  <i className="bi bi-arrow-counterclockwise" />
                                  Reset
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- CMS TAB --- */}
          {activeTab === 'courses' && (
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-slate-900">Live Programs</h3>
                  <button
                    onClick={() => { setIsEditingCourse(null); setCourseForm({ title: '', duration: '', description: '', icon: 'bi-mortarboard-fill', color: 'from-blue-500 to-indigo-600', features: [], imageUrl: '', isActive: true, isPromoted: false, badgeText: '', totalFee: 0 }) }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200"
                  >
                    <Plus size={24} />
                  </button>
                </div>
                <div className="grid gap-4">
                  {courses.map(course => (
                    <div key={course.id} className="rounded-3xl bg-white shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-lg">
                      {/* Course Header Row */}
                      <div className="group flex items-center gap-6 p-6">
                        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${course.color} text-white shadow-lg overflow-hidden`}>
                          {course.imageUrl ? (
                            <img src={course.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <i className={`bi ${course.icon} text-3xl`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-slate-900">{course.title}</h4>
                          <p className="text-sm font-medium text-slate-500">{course.duration} • {course.features.length} Features</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedCourseForMaterials(selectedCourseForMaterials?.id === course.id ? null : course)}
                            title="Manage Materials"
                            className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                              selectedCourseForMaterials?.id === course.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                            }`}
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            onClick={() => { setIsEditingCourse(course); setCourseForm(course) }}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course.id)}
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Per-Course Materials Panel (expands inline) */}
                      {selectedCourseForMaterials?.id === course.id && state.status === 'loaded' && (
                        <div className="border-t border-slate-100 bg-slate-50/60 p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
                          <h5 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                            <FileText size={12} /> Materials & Syllabus for {course.title}
                          </h5>
                          {/* Existing Materials */}
                          <div className="space-y-2">
                            {state.materials.filter(m => m.course_id === course.id).map(m => (
                              <div key={m.id} className="flex items-center gap-4 rounded-2xl bg-white px-5 py-3 border border-slate-100">
                                <FileText size={16} className="text-blue-600 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-900 truncate">{m.title}</p>
                                  <p className="text-xs text-slate-400 truncate">{m.description || m.file_url}</p>
                                </div>
                                <a href={m.file_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 p-1">
                                  <Download size={14} />
                                </a>
                                <button onClick={() => handleDeleteMaterial(m.id)} className="text-red-400 hover:text-red-600 p-1">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            {state.materials.filter(m => m.course_id === course.id).length === 0 && (
                              <p className="text-xs text-slate-400 italic text-center py-2">No materials uploaded yet for this course.</p>
                            )}
                          </div>
                          {/* Add New Material Form */}
                          <form onSubmit={handleAddMaterial} className="flex flex-col sm:flex-row gap-3 pt-2">
                            <input
                              required
                              placeholder="Material Title"
                              value={materialForm.title}
                              onChange={e => setMaterialForm({ ...materialForm, title: e.target.value, course_id: course.id })}
                              className="flex-1 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <input
                              required
                              placeholder="Download Link (Drive/PDF URL)"
                              value={materialForm.file_url}
                              onChange={e => setMaterialForm({ ...materialForm, file_url: e.target.value, course_id: course.id })}
                              className="flex-1 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <button type="submit" className="shrink-0 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-black text-white hover:bg-blue-700 transition flex items-center gap-2">
                              <Plus size={16} /> Add
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <aside className="lg:col-span-4">
                <div className="sticky top-28 rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                  <h3 className="mb-6 text-xl font-bold text-slate-900">{isEditingCourse ? 'Edit Program' : 'New Program'}</h3>
                  <form onSubmit={handleCourseSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Title</label>
                      <input
                        value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })}
                        className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none"
                        placeholder="Ex: Web Designing"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</label>
                        <input value={courseForm.duration} onChange={e => setCourseForm({ ...courseForm, duration: e.target.value })} className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" placeholder="6 Months" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1">Total Fees (₹)</label>
                        <input type="number" value={courseForm.totalFee || ''} onChange={e => setCourseForm({ ...courseForm, totalFee: Number(e.target.value) || 0 })} className="w-full rounded-2xl bg-blue-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" placeholder="e.g. 15000" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                      <textarea value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} rows={3} className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo URL (Optional)</label>
                        <input value={courseForm.imageUrl || ''} onChange={e => setCourseForm({ ...courseForm, imageUrl: e.target.value })} className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" placeholder="https://logo.png" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                          📄 Syllabus URL
                        </label>
                        <input value={courseForm.syllabusUrl || ''} onChange={e => setCourseForm({ ...courseForm, syllabusUrl: e.target.value })} className="w-full rounded-2xl bg-emerald-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition outline-none" placeholder="https://drive.google.com/..." />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Highlights (Comma Separated)</label>
                      <input
                        value={(courseForm.features || []).join(', ')}
                        onChange={e => setCourseForm({ ...courseForm, features: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') })}
                        className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none"
                        placeholder="Ex: Photoshop, Tally, GST"
                      />
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                      <input
                        type="checkbox"
                        id="isPromoted"
                        checked={courseForm.isPromoted}
                        onChange={e => setCourseForm({ ...courseForm, isPromoted: e.target.checked })}
                        className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="isPromoted" className="text-sm font-bold text-slate-700">Promote Course (Highlight)</label>
                    </div>

                    {courseForm.isPromoted && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Badge Text (e.g., 50% OFF)</label>
                        <input value={courseForm.badgeText || ''} onChange={e => setCourseForm({ ...courseForm, badgeText: e.target.value })} className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" placeholder="SUMMER OFFER" />
                      </div>
                    )}
                    <button type="submit" className="w-full rounded-2xl bg-blue-600 py-4 text-sm font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700 transition active:scale-[0.98]">
                      {isEditingCourse ? 'Update Program' : 'Launch Program'}
                    </button>
                    {isEditingCourse && (
                      <button type="button" onClick={() => setIsEditingCourse(null)} className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 transition">Cancel Edition</button>
                    )}
                  </form>
                </div>
              </aside>
            </div>
          )}

          {/* --- ATTENDANCE TAB --- */}
          {activeTab === 'attendance' && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-end justify-between gap-6 rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                <div className="flex flex-wrap gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Batch Time</label>
                    <select
                      value={selectedBatch}
                      onChange={e => setSelectedBatch(e.target.value)}
                      className="w-full min-w-[240px] rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                    >
                      {(settingsForm.batchTimes.length > 0 ? settingsForm.batchTimes : [
                        'Batch - I (9.30am - 11.30am)',
                        'Batch - II (11.30am - 1.30pm)',
                        'Batch - III (1.30pm - 3.30pm)',
                        'Batch - IV (3.30pm - 5.30pm)',
                        'Batch - V (5.30pm - 7.30pm)',
                      ]).map((t: string) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Record Date</label>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={e => setAttendanceDate(e.target.value)}
                      className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                  </div>
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 rounded-2xl bg-slate-900 px-8 py-3.5 text-sm font-bold text-white hover:bg-slate-800 transition"
                >
                  <Download size={18} />
                  Print Attendance Sheet
                </button>
              </div>

              <div id="attendance-sheet" className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm p-10 print:shadow-none print:border-none print:p-0">
                <div className="mb-10 text-center hidden print:block">
                  <h1 className="text-3xl font-black text-slate-900">NiKii Computer Academy</h1>
                  <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Attendance Sheet • {selectedBatch}</p>
                  <p className="text-xs font-medium text-slate-400 mt-1">Date: {new Date(attendanceDate).toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
                </div>

                <div className="mb-6 flex items-center justify-between print:mb-10">
                  <h3 className="text-xl font-bold text-slate-900">Batch Members ({registrations.filter(r => r.preferredBatchTime === selectedBatch && r.status === 'Confirmed').length})</h3>
                </div>

                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 print:bg-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 print:text-slate-700">Student Name</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 print:text-slate-700">Course</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 print:text-slate-700 w-24">Attendance</th>
                      <th className="px-6 py-4 text-xs font-black uppercase text-slate-400 print:text-slate-700 w-32">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {registrations
                      .filter(r => r.preferredBatchTime === selectedBatch && r.status === 'Confirmed')
                      .map(reg => {
                        const status = state.status === 'loaded' ? state.attendance.find(a => a.registration_id === reg.id)?.status : 'Absent';
                        return (
                          <tr key={reg.id} className="print:break-inside-avoid">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900">{reg.fullName}</div>
                              <div className="text-[10px] text-slate-400 uppercase font-black">ID: #REG-{reg.id.toString().padStart(4, '0')}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs font-bold text-slate-700">{reg.courseSelected}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 print:hidden">
                                <button
                                  onClick={() => handleAttendanceToggle(reg.id, status)}
                                  className={`h-10 w-20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${status === 'Present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-400'
                                    }`}
                                >
                                  {status === 'Present' ? 'Present' : 'Absent'}
                                </button>
                              </div>
                              <div className="hidden print:block h-6 w-12 border-2 border-slate-200 rounded print:border-slate-400" />
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-6 w-full border-b-2 border-slate-100 print:border-slate-300" />
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>

                {registrations.filter(r => r.preferredBatchTime === selectedBatch && r.status === 'Confirmed').length === 0 && (
                  <div className="py-20 text-center">
                    <p className="text-lg font-medium text-slate-400 italic">No confirmed students found for this batch time.</p>
                  </div>
                )}

                <div className="mt-20 flex justify-between hidden print:flex">
                  <div className="text-center">
                    <div className="h-px w-48 bg-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Instructor Signature</p>
                  </div>
                  <div className="text-center">
                    <div className="h-px w-48 bg-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Office Seal</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- CERTIFICATES TAB --- */}
          {activeTab === 'certificates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-slate-900">Certificate Issuance</h3>
              </div>
              <div className="rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 mb-6">Listed below are students with <strong>Confirmed</strong> admission. You can generate professional graduation certificates for them once they complete their courses.</p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {registrations
                    .filter(r => r.status === 'Confirmed')
                    .map(reg => (
                      <div key={reg.id} className="group relative overflow-hidden rounded-3xl bg-slate-50 p-6 border border-transparent hover:border-blue-200 hover:bg-white hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
                            <FileText size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{reg.fullName}</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{reg.courseSelected}</p>
                          </div>
                        </div>
                        <div className="space-y-2 text-xs text-slate-500 mb-6">
                          <div className="flex justify-between">
                            <span>Student ID:</span>
                            <span className="font-bold text-slate-700">#REG-{reg.id.toString().padStart(4, '0')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Admission Date:</span>
                            <span className="font-bold text-slate-700">{new Date(reg.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => generateCertificate(reg)}
                            className="flex-1 rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                          >
                            <Download size={16} />
                            Download
                          </button>
                          <button
                            onClick={() => handleNotify(reg.id)}
                            className="flex-1 rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            title="Send via Email & WhatsApp"
                          >
                            <Send size={16} />
                            Send
                          </button>
                        </div>
                      </div>
                    ))}
                  {registrations.filter(r => r.status === 'Confirmed').length === 0 && (
                    <div className="col-span-full py-20 text-center">
                      <p className="text-lg font-medium text-slate-400 italic">No confirmed students eligible for certification yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- SETTINGS TAB --- */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-8 animate-in slide-in-from-bottom-5 duration-500">
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-6 rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                    <BookOpen className="text-blue-600" size={24} />
                    Batch Timings
                  </h3>
                  <div className="space-y-3">
                    {settingsForm.batchTimes.map((batch: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <input
                          value={batch}
                          onChange={e => {
                            const newBatches = [...settingsForm.batchTimes];
                            newBatches[idx] = e.target.value;
                            setSettingsForm({ ...settingsForm, batchTimes: newBatches });
                          }}
                          className="flex-1 rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900"
                        />
                        <button
                          onClick={() => {
                            const newBatches = settingsForm.batchTimes.filter((_: any, i: number) => i !== idx);
                            setSettingsForm({ ...settingsForm, batchTimes: newBatches });
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setSettingsForm({ ...settingsForm, batchTimes: [...settingsForm.batchTimes, 'New Batch Time'] })}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-bold text-slate-400 hover:border-blue-400 hover:text-blue-500 transition"
                    >
                      <Plus size={16} /> Add Batch Time
                    </button>
                  </div>
                </div>

                <div className="space-y-6 rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                    <Send className="text-emerald-500" size={24} />
                    Promo Codes
                  </h3>
                  <div className="space-y-4">
                    {settingsForm.promoCodes.map((promo: any, idx: number) => (
                      <div key={idx} className="rounded-2xl bg-slate-50 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <input
                            value={promo.code}
                            onChange={e => {
                              const newPromos = [...settingsForm.promoCodes];
                              newPromos[idx].code = e.target.value.toUpperCase();
                              setSettingsForm({ ...settingsForm, promoCodes: newPromos });
                            }}
                            placeholder="CODE"
                            className="w-24 rounded-lg bg-white px-3 py-1.5 text-xs font-black text-emerald-600 border border-emerald-100"
                          />
                          <button
                            onClick={() => {
                              const newPromos = settingsForm.promoCodes.filter((_: any, i: number) => i !== idx);
                              setSettingsForm({ ...settingsForm, promoCodes: newPromos });
                            }}
                            className="p-1 text-slate-400 hover:text-red-500 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <input
                          value={promo.description}
                          onChange={e => {
                            const newPromos = [...settingsForm.promoCodes];
                            newPromos[idx].description = e.target.value;
                            setSettingsForm({ ...settingsForm, promoCodes: newPromos });
                          }}
                          placeholder="Description"
                          className="w-full rounded-lg bg-white px-3 py-1.5 text-xs font-medium"
                        />
                      </div>
                    ))}
                    <button
                      onClick={() => setSettingsForm({ ...settingsForm, promoCodes: [...settingsForm.promoCodes, { code: 'NEW50', discount: '50', description: '50% Discount' }] })}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-bold text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition"
                    >
                      <Plus size={16} /> New Promo Code
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6 rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900">General Information</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Contact Number</label>
                      <input
                        value={settingsForm.contactNumber}
                        onChange={e => setSettingsForm({ ...settingsForm, contactNumber: e.target.value })}
                        className="w-full rounded-2xl bg-slate-50 border-none px-6 py-4 text-lg font-bold text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Academy Address</label>
                      <input
                        value={settingsForm.address}
                        onChange={e => setSettingsForm({ ...settingsForm, address: e.target.value })}
                        className="w-full rounded-2xl bg-slate-50 border-none px-6 py-4 text-lg font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  className="rounded-2xl bg-blue-600 px-12 py-5 text-lg font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}
      {editingStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-[3rem] bg-white p-8 md:p-12 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-black text-slate-900 mb-8">Edit Student Record</h2>
            <form onSubmit={handleSaveStudent} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                  <input value={editingStudent.fullName} onChange={e => setEditingStudent({ ...editingStudent, fullName: e.target.value })} className="w-full rounded-2xl bg-slate-50 px-6 py-3.5 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Mobile Number</label>
                  <input value={editingStudent.mobileNumber} onChange={e => setEditingStudent({ ...editingStudent, mobileNumber: e.target.value })} className="w-full rounded-2xl bg-slate-50 px-6 py-3.5 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Batch Time</label>
                  <select value={editingStudent.preferredBatchTime} onChange={e => setEditingStudent({ ...editingStudent, preferredBatchTime: e.target.value })} className="w-full rounded-2xl bg-slate-50 px-6 py-3.5 font-bold">
                    {settingsForm.batchTimes.map((t: string) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Course</label>
                  <select value={editingStudent.courseSelected} onChange={e => setEditingStudent({ ...editingStudent, courseSelected: e.target.value })} className="w-full rounded-2xl bg-slate-50 px-6 py-3.5 font-bold">
                    {courses.map(c => <option key={c.id} value={c.title}>{c.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-1 rounded-2xl bg-blue-600 py-4 font-black text-white">Save Changes</button>
                <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 rounded-2xl bg-slate-100 py-4 font-black text-slate-400">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {studentPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-slate-900 mb-1">Record Fee Payment</h2>
            <p className="text-slate-400 mb-6 text-sm">
              For <span className="font-bold text-blue-600">{studentPayment.fullName}</span> — {studentPayment.courseSelected}
              {(() => { 
                let baseFee = courses.find(c => c.title === studentPayment.courseSelected)?.totalFee;
                if (!baseFee) return null;
                const d = Number(paymentForm.discount_amount) || 0;
                const netFee = Math.max(0, baseFee - d);
                return (
                  <span className="ml-2 text-slate-500">
                    (Course Fee: <strong>₹{netFee}</strong>
                    {d > 0 ? <span className="text-emerald-500 ml-1 font-bold"> -₹{d} discount</span> : ''})
                  </span>
                );
              })()}
            </p>
            <form onSubmit={handleAddPayment} className="space-y-5">
              {/* Payment Type Toggle */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Payment Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Full', 'Installment 1', 'Installment 2'] as const).map(pt => {
                    let netFee = courses.find(c => c.title === studentPayment.courseSelected)?.totalFee;
                    const d = Number(paymentForm.discount_amount) || 0;
                    if (netFee) netFee = Math.max(0, netFee - d);
                    let hint = '';
                    if (pt === 'Full' && netFee) hint = `₹${netFee}`;
                    else if ((pt === 'Installment 1' || pt === 'Installment 2') && netFee) hint = `₹${Math.round(netFee / 2)}`;
                    return (
                      <button
                        key={pt}
                        type="button"
                        onClick={() => {
                          let netFee2 = courses.find(c => c.title === studentPayment.courseSelected)?.totalFee;
                          if (netFee2) netFee2 = Math.max(0, netFee2 - d);
                          setPaymentForm(prev => ({
                            ...prev,
                            payment_type: pt,
                            custom_amount: netFee2 ? String(pt === 'Full' ? netFee2 : Math.round(netFee2 / 2)) : ''
                          }));
                        }}
                        className={`rounded-2xl p-4 border-2 text-sm font-black text-center transition ${
                          paymentForm.payment_type === pt
                            ? pt === 'Full' ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-100 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <div>{pt}</div>
                        {hint && <div className="text-xs font-medium mt-1 opacity-70">{hint}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Discount Amount (Only for Full Payment) */}
              {paymentForm.payment_type === 'Full' && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Apply Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={paymentForm.discount_amount}
                    onChange={e => {
                      const newD = Number(e.target.value) || 0;
                      let base = courses.find(c => c.title === studentPayment.courseSelected)?.totalFee || 0;
                      setPaymentForm(prev => ({
                        ...prev,
                        discount_amount: e.target.value,
                        custom_amount: base ? String(Math.max(0, base - newD)) : prev.custom_amount
                      }));
                    }}
                    className="w-full rounded-2xl bg-amber-50 border-2 border-amber-100 px-6 py-4 text-xl font-black text-amber-900 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition"
                  />
                  <p className="text-xs text-amber-600 font-bold">Discount will correctly lower the course fee.</p>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Amount Received (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={paymentForm.custom_amount}
                  onChange={e => setPaymentForm(prev => ({ ...prev, custom_amount: e.target.value }))}
                  className="w-full rounded-2xl bg-slate-50 border-2 border-slate-100 px-6 py-4 text-xl font-black text-slate-900 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition"
                  placeholder="Enter amount"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Payment Method</label>
                <div className="grid grid-cols-5 gap-2">
                  {(['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'DD'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentForm(prev => ({ ...prev, payment_method: m }))}
                      className={`rounded-xl py-2.5 px-1 text-xs font-black text-center border-2 transition ${
                        paymentForm.payment_method === m
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-100 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {m === 'Cash' ? '💵' : m === 'UPI' ? '📱' : m === 'Bank Transfer' ? '🏦' : m === 'Cheque' ? '📝' : '🏛️'}<br />{m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Remarks (Optional)</label>
                <input
                  type="text"
                  value={paymentForm.remarks}
                  onChange={e => setPaymentForm(prev => ({ ...prev, remarks: e.target.value }))}
                  className="w-full rounded-2xl bg-slate-50 border-none px-6 py-3 text-sm font-medium text-slate-900 focus:outline-none"
                  placeholder="e.g. Concession given, reference number..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-2xl bg-blue-600 py-4 font-black text-white hover:bg-blue-700 transition shadow-xl shadow-blue-200">
                  ✅ Confirm & Record
                </button>
                <button type="button" onClick={() => setStudentPayment(null)} className="rounded-2xl px-6 py-4 bg-slate-100 text-slate-400 font-black hover:bg-slate-200 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

