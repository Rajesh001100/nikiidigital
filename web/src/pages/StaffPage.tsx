import { useEffect, useState } from 'react'
import { getRegistrations, getAdminPayments, addAdminPayment, getAttendance, updateAttendance, getCourses, getSettings, staffLogin } from '../lib/api'
import type { RegistrationRow, Payment, Course } from '../types'
import { Users, Send, CheckCircle2, Search, X } from 'lucide-react'

const STAFF_KEY_LS = 'nikiidigital_staff_key'

type Tab = 'students' | 'attendance' | 'payments'

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; rows: RegistrationRow[]; payments: Payment[]; attendance: any[]; courses: Course[]; settings: any }
  | { status: 'error'; message: string }

export default function StaffPage() {
  const [staffKey, setStaffKey] = useState(() => localStorage.getItem(STAFF_KEY_LS) ?? '')
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('students')
  const [state, setState] = useState<LoadState>({ status: 'idle' })
  const [search, setSearch] = useState('')
  const [batchFilter, setBatchFilter] = useState('All Batches')
  const [paySearch, setPaySearch] = useState('')
  const [payBatchFilter, setPayBatchFilter] = useState('All Batches')
  const [payRecSearch, setPayRecSearch] = useState('')
  const [payRecBatchFilter, setPayRecBatchFilter] = useState('All Batches')

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedBatch, setSelectedBatch] = useState('Batch - I (9.30am - 11.30am)')
  const [selectedYear, setSelectedYear] = useState('')
  const [stagedAttendance, setStagedAttendance] = useState<Record<number, string>>({})
  const [isSavingAttendance, setIsSavingAttendance] = useState(false)


  // Payment form state
  const [studentPayment, setStudentPayment] = useState<RegistrationRow | null>(null)
  const [payForm, setPayForm] = useState({
    payment_method: 'Cash' as 'Cash' | 'UPI',
    custom_amount: '',
    remarks: '',
  })
  const [payBusy, setPayBusy] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const registrations = state.status === 'loaded' ? state.rows : []
  const payments = state.status === 'loaded' ? state.payments : []
  const attendance = state.status === 'loaded' ? state.attendance : []
  const courses = state.status === 'loaded' ? state.courses : []
  const settings = state.status === 'loaded' ? state.settings : null

  const batches = settings?.batchTimes?.length > 0 ? settings.batchTimes : [
    'Batch - I (9.30am - 11.30am)',
    'Batch - II (11.30am - 1.30pm)',
    'Batch - III (1.30pm - 3.30pm)',
    'Batch - IV (3.30pm - 5.30pm)',
    'Batch - V (5.30pm - 7.30pm)',
  ]

  async function load(k?: string) {
    const key = k ?? staffKey
    if (!key) return
    setState({ status: 'loading' })
    setIsRefreshing(true)
    try {
      const sett = await getSettings();
      const activeYear = (sett as any).currentAcademicYear || '2026-2027';
      setSelectedYear(activeYear);

      const [r, p, att, c] = await Promise.all([
        getRegistrations(key, activeYear),
        getAdminPayments(key, activeYear),
        getAttendance(key, attendanceDate, activeYear),
        getCourses()
      ])
      setState({ status: 'loaded', rows: r.registrations, payments: p.payments, attendance: att.attendance, courses: c.courses, settings: sett })
    } catch (e: any) {
      setState({ status: 'error', message: e.message || 'Failed to load' })
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (staffKey) void load(staffKey)
  }, [])

  // Reload attendance when date changes
  useEffect(() => {
    if (state.status === 'loaded' && selectedYear && staffKey) {
      getAttendance(staffKey, attendanceDate, selectedYear)
        .then(att => {
          setState(s => {
            if (s.status === 'loaded') {
              return { ...s, attendance: att.attendance };
            }
            return s;
          });
        })
        .catch(() => {})
    }
  }, [attendanceDate, selectedYear])

  // Sync staged attendance when batch, date or data changes
  useEffect(() => {
    if (state.status !== 'loaded') return;
    const newStaged: Record<number, string> = {};
    const batchConfirmed = confirmedRegs.filter(r => r.preferredBatchTime === selectedBatch);
    
    batchConfirmed.forEach(reg => {
      const existing = attendance.find(a => a.registration_id === reg.id && a.date === attendanceDate);
      newStaged[reg.id] = existing?.status || 'Present';
    });
    setStagedAttendance(newStaged);
  }, [selectedBatch, attendanceDate, state.status, attendance]);

  // Security Guards: Anti-Screenshot, Anti-Copy, Anti-F12
  useEffect(() => {
    if (!staffKey) return;
    
    const handleContext = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' || 
        e.key === 'PrintScreen' || 
        (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'u' || e.key === 'c' || e.key === 'i' || e.key === 'x' || e.key === 'v')) ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) // Mac Screenshots
      ) {
        e.preventDefault();
        return false;
      }
    };
    const handleFocus = () => document.body.classList.remove('blur-md');
    const handleBlur = () => document.body.classList.add('blur-md');
    const handleCopy = (e: ClipboardEvent) => { e.preventDefault(); alert("Copying is disabled.") };

    window.addEventListener('contextmenu', handleContext);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('selectstart', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('contextmenu', handleContext);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.body.classList.remove('blur-md');
    };
  }, [staffKey]);

  async function handleBatchAttendanceSave() {
    const records = Object.entries(stagedAttendance).map(([regId, status]) => ({
      registrationId: Number(regId),
      status
    }));
    
    if (records.length === 0) return;
    
    setIsSavingAttendance(true);
    try {
      await updateAttendance(staffKey, attendanceDate, records);
      // Refetch to ensure everything is in sync
      const att = await getAttendance(staffKey, attendanceDate, selectedYear);
      setState(s => s.status === 'loaded' ? { ...s, attendance: att.attendance } : s);
      alert('Attendance recorded for ' + records.length + ' students');
    } catch {
      alert('Attendance update failed');
    } finally {
      setIsSavingAttendance(false);
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!studentPayment) return
    const amount = Number(payForm.custom_amount)
    if (!amount || isNaN(amount)) { alert('Enter a valid amount'); return }
    setPayBusy(true)
    try {
      await addAdminPayment(staffKey, {
        registration_id: studentPayment.id,
        amount_paid: amount,
        payment_type: 'Full',
        payment_method: payForm.payment_method,
        remarks: payForm.remarks || `Via ${payForm.payment_method}`,
      })
      setStudentPayment(null)
      setPayForm({ payment_method: 'Cash', custom_amount: '', remarks: '' })
      void load()
    } catch {
      alert('Failed to record payment')
    } finally {
      setPayBusy(false)
    }
  }

  const filteredRegs = registrations.filter(r => {
    const searchLower = search.toLowerCase()
    const matchesSearch = r.fullName.toLowerCase().includes(searchLower) ||
      r.courseSelected.toLowerCase().includes(searchLower) ||
      r.mobileNumber.includes(search)
    const matchesBatch = batchFilter === 'All Batches' || r.preferredBatchTime === batchFilter
    return matchesSearch && matchesBatch
  })

  const confirmedRegs = registrations.filter(r => r.status === 'Confirmed')
  const confirmedForPayment = confirmedRegs.filter(r => {
    const searchLower = paySearch.toLowerCase()
    const matchesSearch = r.fullName.toLowerCase().includes(searchLower) ||
      r.courseSelected.toLowerCase().includes(searchLower) ||
      r.mobileNumber.includes(paySearch)
    const matchesBatch = payBatchFilter === 'All Batches' || r.preferredBatchTime === payBatchFilter
    return matchesSearch && matchesBatch
  })

  const batchRegs = confirmedRegs.filter(r => r.preferredBatchTime === selectedBatch)


  // ── Login Screen ────────────────────────────────────────────────────────────
  if (state.status === 'idle' || !staffKey) {
    const onLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!loginUsername || !loginPassword) return;
      setState({ status: 'loading' });
      try {
        const { ok, staffKey: key } = await staffLogin(loginUsername, loginPassword);
        if (ok) {
          setStaffKey(key);
          localStorage.setItem(STAFF_KEY_LS, key);
          void load(key);
        }
      } catch (err: any) {
        setState({ status: 'error', message: err.message || 'Login failed' });
      }
    };

    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-emerald-600 text-white shadow-2xl shadow-emerald-200">
          <Users size={48} />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Staff Gateway</h1>
        <p className="mt-4 max-w-md text-base md:text-lg font-medium text-slate-500 leading-relaxed">
          Sign in to your individual staff account to manage academy operations.
        </p>
        
        <form onSubmit={onLogin} className="mt-10 w-full max-w-md space-y-4">
          <div className="space-y-4">
            <div className="relative group">
              <i className="bi bi-person absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type="text"
                value={loginUsername}
                onChange={e => setLoginUsername(e.target.value)}
                placeholder="Username"
                className="w-full rounded-2xl border border-slate-200 bg-white pl-14 pr-6 py-4 text-lg font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition shadow-sm"
                required
              />
            </div>
            
            <div className="relative group">
              <i className="bi bi-shield-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
              <input
                type={showLoginPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-2xl border border-slate-200 bg-white pl-14 pr-14 py-4 text-lg font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition shadow-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <i className={`bi ${showLoginPassword ? 'bi-eye-slash' : 'bi-eye'} text-lg`} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={state.status === 'loading'}
            className="w-full rounded-2xl bg-emerald-600 py-5 font-black text-white hover:bg-emerald-700 transition shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {state.status === 'loading' ? <div className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
              <>
                <span className="tracking-tight uppercase">Enter Dashboard</span>
                <i className="bi bi-arrow-right" />
              </>
            )}
          </button>
        </form>

        {state.status === 'error' && <p className="mt-6 font-bold text-red-500 bg-red-50 px-6 py-3 rounded-xl border border-red-100 inline-block">{state.message}</p>}
      </div>
    )
  }

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center p-8 bg-red-50 rounded-3xl border border-red-100">
        <h2 className="text-2xl font-black text-slate-900 mb-2">Authentication Failed</h2>
        <p className="text-slate-500 font-medium mb-6">{state.message}</p>
        <button
          onClick={() => { localStorage.removeItem(STAFF_KEY_LS); setStaffKey(''); setState({ status: 'idle' }) }}
          className="rounded-2xl bg-slate-900 px-10 py-4 font-bold text-white hover:bg-slate-800 transition"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="select-none space-y-6 md:space-y-8 pb-20">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start md:items-center justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Staff Dashboard</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <p className="text-slate-500 font-medium italic text-sm">NiKii Computer Academy</p>
            <div className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-1 border border-emerald-100">
              <span className="text-[10px] font-black tracking-widest uppercase text-emerald-600">Active Year:</span>
              <span className="text-sm font-black text-emerald-700">{selectedYear}</span>
            </div>
            <button
              onClick={() => void load()}
              className="text-emerald-600 hover:text-emerald-800 p-1 transition-colors"
              title="Refresh"
            >
              <i className={`bi bi-arrow-clockwise text-lg ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Nav - horizontally scrollable on mobile */}
        <div className="overflow-x-auto w-full md:w-auto -mx-1 px-1">
          <div className="flex gap-1 md:gap-3 rounded-2xl bg-white p-1.5 shadow-sm border border-slate-100 w-max md:w-auto">
            {([
              { id: 'students', label: 'Registrations', icon: Users },
              { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
              { id: 'payments', label: 'Payments', icon: Send },
            ] as { id: Tab; label: string; icon: any }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 md:gap-2 rounded-xl px-4 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Summary Strip ───────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Registrations', value: registrations.length, color: 'text-slate-900' },
          { label: 'Confirmed', value: registrations.filter(r => r.status === 'Confirmed').length, color: 'text-emerald-600' },
          { label: 'Pending', value: registrations.filter(r => r.status === 'Pending').length, color: 'text-amber-500' },
        ].map((s, i) => (
          <div key={i} className="rounded-3xl bg-white p-6 border border-slate-100 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{s.label}</p>
            <p className={`mt-2 text-4xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── REGISTRATIONS TAB ────────────────────────────────────────────────── */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Search & Filter */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, course, or mobile..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-6 py-4 text-base font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition shadow-sm"
              />
            </div>
            <div className="relative">
              <select
                value={batchFilter}
                onChange={e => setBatchFilter(e.target.value)}
                className="appearance-none rounded-2xl border border-slate-200 bg-white pl-6 pr-12 py-4 text-base font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition shadow-sm min-w-[220px]"
              >
                <option>All Batches</option>
                {batches.map((b: string) => <option key={b} value={b}>{b}</option>)}
              </select>
              <i className="bi bi-chevron-down absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-400">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-400">Student Name</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-400">Course</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-400">Batch</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-400">Mobile</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-widest text-slate-400">Registered</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegs.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-medium">No registrations found.</td></tr>
                )}
                {filteredRegs.map(reg => (
                  <tr key={reg.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-400 text-xs">#{String(reg.id).padStart(4, '0')}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{reg.fullName}</p>
                      <p className="text-xs text-slate-400">{reg.email}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{reg.courseSelected}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{reg.preferredBatchTime}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{reg.mobileNumber}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider ${
                        reg.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700' :
                        reg.status === 'Rejected' ? 'bg-red-50 text-red-600' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          reg.status === 'Confirmed' ? 'bg-emerald-500' :
                          reg.status === 'Rejected' ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                        {reg.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {reg.createdAt ? new Date(reg.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end justify-between w-full rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900">Attendance</h2>
              <p className="text-sm font-bold text-slate-400 mt-1">Record daily attendance here.</p>
            </div>
            
            <div className="flex flex-wrap items-end gap-6 w-full md:w-auto">
              <div className="flex flex-wrap items-center gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Batch</label>
                  <select
                    value={selectedBatch}
                    onChange={e => setSelectedBatch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
                  >
                    {batches.map((b: string) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden print:hidden block">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="font-bold text-slate-900">{selectedBatch}</p>
              
              <div className="flex items-center gap-3 bg-slate-50/50 p-1.5 pr-2 rounded-2xl border border-slate-100">
                <label className="text-[10px] pl-3 font-black uppercase tracking-widest text-slate-400">Record Date</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={e => setAttendanceDate(e.target.value)}
                    className="rounded-xl bg-white border border-slate-200 px-4 py-1.5 text-sm font-bold text-slate-900 shadow-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition cursor-pointer"
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {attendanceDate !== new Date().toISOString().split('T')[0] && (
                    <button
                      onClick={() => setAttendanceDate(new Date().toISOString().split('T')[0])}
                      className="rounded-xl bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-100 transition border border-emerald-100"
                    >
                      Today
                    </button>
                  )}
                </div>
              </div>
            </div>
            {batchRegs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium">No confirmed students in this batch.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {batchRegs.map(reg => {
                  return (
                    <div key={reg.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <p className="font-bold text-slate-900">{reg.fullName}</p>
                        <p className="text-xs text-slate-400">{reg.courseSelected} • {reg.mobileNumber}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                          {[
                            { id: 'Present', color: 'bg-emerald-600' },
                            { id: 'Absent', color: 'bg-red-600' }
                          ].map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => setStagedAttendance(prev => ({ ...prev, [reg.id]: opt.id }))}
                              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                stagedAttendance[reg.id] === opt.id 
                                  ? `${opt.color} text-white shadow-sm` 
                                  : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                              }`}
                            >
                              {opt.id}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                <div className="px-6 py-8 flex justify-center bg-slate-50/30 border-t border-slate-100">
                  <button
                    onClick={handleBatchAttendanceSave}
                    disabled={isSavingAttendance || batchRegs.length === 0}
                    className="flex items-center gap-3 rounded-2xl bg-emerald-600 px-12 py-4 font-black text-white hover:bg-emerald-700 transition shadow-2xl shadow-emerald-200 disabled:opacity-50 active:scale-95"
                  >
                    {isSavingAttendance ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 size={20} />
                    )}
                    {isSavingAttendance ? 'Recording Attendance...' : 'Record Batch Attendance'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── PAYMENTS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <div className="space-y-8">
          {/* Add Payment Modal */}
          {studentPayment && (() => {
            const course = courses.find(c => c.title === studentPayment.courseSelected);
            const netFee = Math.max(0, (course?.totalFee || 0) - (studentPayment.discount_amount || 0));
            const paid = payments.filter(p => p.registration_id === studentPayment.id).reduce((s, p) => s + p.amount_paid, 0);
            const balance = Math.max(0, netFee - paid);

            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Record Payment</h3>
                      <p className="text-sm font-medium text-slate-500 mt-0.5">{studentPayment.fullName}</p>
                    </div>
                    <button onClick={() => setStudentPayment(null)} className="p-2 rounded-xl hover:bg-slate-100 transition"><X size={20} /></button>
                  </div>

                  <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-600">Outstanding Balance</span>
                    <span className="text-xl font-black text-emerald-700">₹{balance}</span>
                  </div>

                  <form onSubmit={handleAddPayment} className="space-y-5">
                    {/* Amount */}
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Amount (₹)</label>
                      <input
                        type="number"
                        min={1}
                        max={balance}
                        required
                        value={payForm.custom_amount}
                        onChange={e => {
                          const val = Number(e.target.value);
                          if (val > balance) {
                            alert(`Amount cannot exceed the balance of ₹${balance}`);
                            setPayForm(p => ({ ...p, custom_amount: balance.toString() }));
                          } else {
                            setPayForm(p => ({ ...p, custom_amount: e.target.value }));
                          }
                        }}
                        placeholder={`Max ₹${balance}`}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition text-base"
                      />
                      {Number(payForm.custom_amount) > balance && (
                        <p className="text-[10px] font-bold text-red-500">⚠ Amount exceeds outstanding balance!</p>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Method</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Cash', 'UPI'] as const).map(m => (
                          <label key={m} className={`flex items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-3 cursor-pointer text-xs font-bold transition-all ${payForm.payment_method === m ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                            <input type="radio" value={m} checked={payForm.payment_method === m} onChange={() => setPayForm(p => ({ ...p, payment_method: m }))} className="hidden" />
                            <span className="text-lg">{m === 'Cash' ? '💵' : '📱'}</span> {m}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Remarks */}
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-slate-400">Remarks (Optional)</label>
                      <input
                        type="text"
                        value={payForm.remarks}
                        onChange={e => setPayForm(p => ({ ...p, remarks: e.target.value }))}
                        placeholder="e.g. Second installment"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setStudentPayment(null)} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                      <button 
                        type="submit" 
                        disabled={payBusy || Number(payForm.custom_amount) > balance || !payForm.custom_amount} 
                        className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition shadow-xl shadow-emerald-100 disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none"
                      >
                        {payBusy ? 'Recording...' : '✅ Confirm & Record'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            );
          })()}

          {/* Confirmed Students with SEARCH & FILTER */}
          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-slate-900">Record Fee Payment</h3>
                <p className="text-xs text-slate-400 mt-0.5">Select a confirmed student</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                   <input
                     type="text"
                     placeholder="Search student..."
                     value={paySearch}
                     onChange={e => setPaySearch(e.target.value)}
                     className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
                   />
                </div>
                <div className="relative">
                  <select
                    value={payBatchFilter}
                    onChange={e => setPayBatchFilter(e.target.value)}
                    className="appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-10 py-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
                  >
                    <option>All Batches</option>
                    {batches.map((b: string) => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                </div>
              </div>
            </div>

            {confirmedForPayment
              .filter(reg => {
                const course = courses.find(c => c.title === reg.courseSelected);
                const netFee = Math.max(0, (course?.totalFee || 0) - (reg.discount_amount || 0));
                const paid = payments.filter(p => p.registration_id === reg.id).reduce((s, p) => s + p.amount_paid, 0);
                return Math.max(0, netFee - paid) > 0;
              })
              .length === 0 ? (
              <div className="py-12 text-center text-emerald-600 font-bold">
                <CheckCircle2 className="mx-auto mb-2" size={28} />
                All fees are settled!
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {confirmedForPayment.filter(reg => {
                  const c2 = courses.find(c => c.title === reg.courseSelected);
                  const nf = Math.max(0, (c2?.totalFee || 0) - (reg.discount_amount || 0));
                  const paid2 = payments.filter(p => p.registration_id === reg.id).reduce((s, p) => s + p.amount_paid, 0);
                  return Math.max(0, nf - paid2) > 0;
                }).map(reg => {
                  const course = courses.find(c => c.title === reg.courseSelected);
                  const netFee = Math.max(0, (course?.totalFee || 0) - (reg.discount_amount || 0));
                  const paid = payments.filter(p => p.registration_id === reg.id).reduce((s, p) => s + p.amount_paid, 0);
                  const balance = Math.max(0, netFee - paid);
                  
                  return (
                    <div key={reg.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{reg.fullName}</p>
                        <p className="text-xs text-slate-400">{reg.courseSelected} • {reg.mobileNumber} • {reg.preferredBatchTime}</p>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right flex flex-col items-end">
                          <span className="text-[10px] font-black uppercase text-slate-300 tracking-widest mb-0.5">Balance</span>
                          <span className={`text-sm font-black ${balance > 0 ? 'text-blue-600' : 'text-emerald-500'}`}>
                            {balance > 0 ? `₹${balance}` : '✓ Settled'}
                          </span>
                        </div>

                        {balance > 0 ? (
                          <button
                            onClick={() => { setStudentPayment(reg); setActiveTab('payments') }}
                            className="flex items-center gap-2 rounded-xl bg-emerald-50 px-5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all font-black"
                          >
                            <Send size={14} />
                            Record Payment
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-100/50">
                            <CheckCircle2 size={14} />
                            Fees Paid
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Payments list */}
          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <h3 className="font-black text-slate-900">Recent Payments</h3>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                   <input
                     type="text"
                     placeholder="Search student..."
                     value={payRecSearch}
                     onChange={e => setPayRecSearch(e.target.value)}
                     className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
                   />
                </div>
                <div className="relative">
                  <select
                    value={payRecBatchFilter}
                    onChange={e => setPayRecBatchFilter(e.target.value)}
                    className="appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-4 pr-10 py-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
                  >
                    <option>All Batches</option>
                    {batches.map((b: string) => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-400">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-400">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-black uppercase tracking-widest text-slate-400">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-400">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-widest text-slate-400">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredPayments = payments.filter(p => {
                      const reg = (p as any).registrations;
                      if (!reg) return false;
                      const s = payRecSearch.toLowerCase();
                      const matchesSearch = reg.fullName.toLowerCase().includes(s) || (reg.mobileNumber && reg.mobileNumber.includes(payRecSearch));
                      const matchesBatch = payRecBatchFilter === 'All Batches' || reg.preferredBatchTime === payRecBatchFilter;
                      return matchesSearch && matchesBatch;
                    });

                    if (filteredPayments.length === 0) {
                      return <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400">No payments found matching filters.</td></tr>;
                    }

                    return filteredPayments.map((p: any) => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-6 py-3">
                          <p className="font-bold text-slate-900">{p.registrations?.fullName ?? '—'}</p>
                          <p className="text-xs text-slate-400">{p.registrations?.courseSelected ?? ''}</p>
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-600">{p.payment_type}</td>
                        <td className="px-6 py-3 text-right font-black text-emerald-600">₹{Number(p.amount_paid).toLocaleString()}</td>
                        <td className="px-6 py-3 text-slate-500">{p.payment_method}</td>
                        <td className="px-6 py-3 text-xs text-slate-400">{p.date ? new Date(p.date).toLocaleDateString('en-IN') : '—'}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
