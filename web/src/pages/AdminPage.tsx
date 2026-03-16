import { useEffect, useState } from 'react'
import { getRegistrations, registrationsCsvUrl, getCourses, createCourse, updateCourse, deleteCourse, getDashboardStats, updateRegistrationStatus, getSettings, updateSettings, getAttendance, updateAttendance } from '../lib/api'
import type { RegistrationRow, Course } from '../types'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { LayoutDashboard, Users, BookOpen, Download, Plus, Trash2, Edit3, CheckCircle2, Settings, FileText, Send } from 'lucide-react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; rows: RegistrationRow[]; courses: Course[]; stats: any; settings: any; attendance: any[] }
  | { status: 'error'; message: string }

const STORAGE_KEY = 'nikiidigital_admin_key'

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const [activeTab, setActiveTab] = useState<'stats' | 'regs' | 'courses' | 'attendance' | 'settings'>('stats')
  const [state, setState] = useState<LoadState>({ status: 'idle' })
  const [csvBusy, setCsvBusy] = useState(false)
  
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
    try {
      const [r, c, s, sett, att] = await Promise.all([
        getRegistrations(key),
        getCourses(),
        getDashboardStats(key),
        getSettings(),
        getAttendance(key, attendanceDate)
      ])
      setState({ 
        status: 'loaded', 
        rows: r.registrations, 
        courses: c.courses, 
        stats: s, 
        settings: sett,
        attendance: att.attendance
      })
      if (sett) setSettingsForm(sett)
    } catch (e: unknown) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Failed to load' })
    }
  }

  async function handleUpdateStatus(id: number, newStatus: 'Pending' | 'Confirmed' | 'Rejected') {
    try {
      await updateRegistrationStatus(adminKey, id, newStatus);
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
      setCourseForm({ title: '', duration: '', description: '', icon: 'bi-mortarboard-fill', color: 'from-blue-500 to-indigo-600', features: [], imageUrl: '', isActive: true, isPromoted: false, badgeText: '' })
      void load(adminKey)
    } catch (err) {
      alert("Action failed. Check console.")
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
    doc.text("ISO 9001:2015 Certified Academy • Anthiyur", 105, 32, { align: "center" });
    
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
          </div>
        </div>
        <div className="flex gap-3 rounded-2xl bg-white p-1.5 shadow-sm border border-slate-100">
          {[
            { id: 'stats', label: 'Analytics', icon: LayoutDashboard },
            { id: 'regs', label: 'Students', icon: Users },
            { id: 'courses', label: 'CMS', icon: BookOpen },
            { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
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

      {state.status === 'loaded' && (
        <div className="animate-in fade-in duration-500">
          {/* --- ANALYTICS TAB --- */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-8">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Enrolled</p>
                  <p className="mt-3 text-5xl font-black text-slate-900">{registrations.length}</p>
                </div>
                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Programs</p>
                  <p className="mt-3 text-5xl font-black text-blue-600">{courses.length}</p>
                </div>
                <div className="rounded-3xl bg-white p-8 shadow-sm border border-slate-100">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Conversion Rate</p>
                  <p className="mt-3 text-5xl font-black text-emerald-500">92%</p>
                </div>
                <div className="rounded-3xl bg-blue-600 p-8 text-white shadow-xl">
                  <p className="text-xs font-black uppercase tracking-widest text-blue-200">Revenue Potential</p>
                  <p className="mt-3 text-4xl font-black">₹{registrations.length * 5000}+</p>
                </div>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                <div className="rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-100">
                  <h3 className="mb-8 text-xl font-bold text-slate-900 px-2">Course Popularity</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.courseDistribution}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
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
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        reg.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' :
                        reg.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {reg.status}
                      </span>
                      {reg.status === 'Pending' && (
                        <button 
                          onClick={() => handleUpdateStatus(reg.id, 'Confirmed')}
                          className="text-[10px] font-black uppercase tracking-tighter bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition"
                        >
                          Confirm Admission
                        </button>
                      )}
                      {reg.status === 'Confirmed' && (
                        <button 
                          onClick={() => generateAdmissionLetter(reg)}
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-700 transition"
                          title="Generate Admission Letter"
                        >
                          <FileText size={12} />
                          Letter
                        </button>
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
                    onClick={() => { setIsEditingCourse(null); setCourseForm({ title: '', duration: '', description: '', icon: 'bi-mortarboard-fill', color: 'from-blue-500 to-indigo-600', features: [], imageUrl: '', isActive: true, isPromoted: false, badgeText: '' }) }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200"
                  >
                    <Plus size={24} />
                  </button>
                </div>
                <div className="grid gap-4">
                  {courses.map(course => (
                    <div key={course.id} className="group flex items-center gap-6 rounded-3xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all">
                      <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${course.color} text-white shadow-lg overflow-hidden`}>
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
                        value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})}
                        className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" 
                        placeholder="Ex: Web Designing"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration</label>
                        <input value={courseForm.duration} onChange={e => setCourseForm({...courseForm, duration: e.target.value})} className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" placeholder="6 Months" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Icon (B-Icon)</label>
                        <input value={courseForm.icon} onChange={e => setCourseForm({...courseForm, icon: e.target.value})} className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" placeholder="bi-cpu-fill" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                      <textarea value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} rows={3} className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gradient Colors</label>
                        <input value={courseForm.color} onChange={e => setCourseForm({...courseForm, color: e.target.value})} className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" placeholder="from-blue-500 to-indigo-600" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo URL (Optional)</label>
                        <input value={courseForm.imageUrl || ''} onChange={e => setCourseForm({...courseForm, imageUrl: e.target.value})} className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" placeholder="https://logo.png" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Highlights (Comma Separated)</label>
                      <input 
                        value={(courseForm.features || []).join(', ')} 
                        onChange={e => setCourseForm({...courseForm, features: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '')})} 
                        className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" 
                        placeholder="Ex: Photoshop, Tally, GST" 
                      />
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4">
                      <input 
                        type="checkbox" 
                        id="isPromoted"
                        checked={courseForm.isPromoted} 
                        onChange={e => setCourseForm({...courseForm, isPromoted: e.target.checked})}
                        className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="isPromoted" className="text-sm font-bold text-slate-700">Promote Course (Highlight)</label>
                    </div>

                    {courseForm.isPromoted && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Badge Text (e.g., 50% OFF)</label>
                        <input value={courseForm.badgeText || ''} onChange={e => setCourseForm({...courseForm, badgeText: e.target.value})} className="w-full rounded-2xl bg-slate-50 border-none px-5 py-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition outline-none" placeholder="SUMMER OFFER" />
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
                                className={`h-10 w-20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                  status === 'Present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-400'
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
                            setSettingsForm({...settingsForm, batchTimes: newBatches});
                          }}
                          className="flex-1 rounded-xl bg-slate-50 border-none px-4 py-2.5 text-sm font-bold text-slate-900"
                        />
                        <button 
                          onClick={() => {
                            const newBatches = settingsForm.batchTimes.filter((_: any, i: number) => i !== idx);
                            setSettingsForm({...settingsForm, batchTimes: newBatches});
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => setSettingsForm({...settingsForm, batchTimes: [...settingsForm.batchTimes, 'New Batch Time']})}
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
                              setSettingsForm({...settingsForm, promoCodes: newPromos});
                            }}
                            placeholder="CODE"
                            className="w-24 rounded-lg bg-white px-3 py-1.5 text-xs font-black text-emerald-600 border border-emerald-100"
                          />
                          <button 
                            onClick={() => {
                              const newPromos = settingsForm.promoCodes.filter((_: any, i: number) => i !== idx);
                              setSettingsForm({...settingsForm, promoCodes: newPromos});
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
                            setSettingsForm({...settingsForm, promoCodes: newPromos});
                          }}
                          placeholder="Description"
                          className="w-full rounded-lg bg-white px-3 py-1.5 text-xs font-medium"
                        />
                      </div>
                    ))}
                    <button 
                      onClick={() => setSettingsForm({...settingsForm, promoCodes: [...settingsForm.promoCodes, { code: 'NEW50', discount: '50', description: '50% Discount' }]})}
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
                        onChange={e => setSettingsForm({...settingsForm, contactNumber: e.target.value})}
                        className="w-full rounded-2xl bg-slate-50 border-none px-6 py-4 text-lg font-bold text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Academy Address</label>
                      <input 
                        value={settingsForm.address} 
                        onChange={e => setSettingsForm({...settingsForm, address: e.target.value})}
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
    </div>
  )
}
