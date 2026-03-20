import { useEffect, useState } from 'react'
import { getRegistrations, getAdminPayments, addAdminPayment, getAttendance, updateAttendance, getCourses, getSettings } from '../lib/api'
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

  // Payment form state
  const [studentPayment, setStudentPayment] = useState<RegistrationRow | null>(null)
  const [payForm, setPayForm] = useState({
    payment_method: 'Cash' as 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'DD',
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
      const [r, p, att, c, sett] = await Promise.all([
        getRegistrations(key),
        getAdminPayments(key),
        getAttendance(key, attendanceDate),
        getCourses(),
        getSettings()
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
    if (state.status === 'loaded') {
      getAttendance(staffKey, attendanceDate)
        .then(att => setState(s => s.status === 'loaded' ? { ...s, attendance: att.attendance } : s))
        .catch(() => {})
    }
  }, [attendanceDate])

  async function handleAttendanceToggle(registrationId: number, currentStatus: string) {
    const newStatus = currentStatus === 'Present' ? 'Absent' : 'Present'
    try {
      await updateAttendance(staffKey, attendanceDate, [{ registrationId, status: newStatus }])
      const att = await getAttendance(staffKey, attendanceDate)
      setState(s => s.status === 'loaded' ? { ...s, attendance: att.attendance } : s)
    } catch {
      alert('Attendance update failed')
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

  function getAttStatus(regId: number) {
    const found = attendance.find(a => a.registration_id === regId)
    return found?.status ?? 'Present'
  }

  // ── Login Screen ────────────────────────────────────────────────────────────
  if (state.status === 'idle' || !staffKey) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-emerald-600 text-white shadow-2xl shadow-emerald-200">
          <Users size={48} />
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Staff Gateway</h1>
        <p className="mt-4 max-w-md text-base md:text-lg font-medium text-slate-500 leading-relaxed">
          Enter your staff access key to manage student registrations.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row w-full max-w-lg gap-4">
          <input
            type="password"
            value={staffKey}
            onChange={e => setStaffKey(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { const k = staffKey.trim(); setStaffKey(k); localStorage.setItem(STAFF_KEY_LS, k); void load(k) } }}
            placeholder="Enter Staff Access Key"
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-lg font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition shadow-sm"
          />
          <button
            onClick={() => { const k = staffKey.trim(); setStaffKey(k); localStorage.setItem(STAFF_KEY_LS, k); void load(k) }}
            className="rounded-2xl bg-emerald-600 px-8 py-4 font-bold text-white hover:bg-emerald-700 transition"
          >
            Authenticate
          </button>
        </div>
        {state.status === 'error' && <p className="mt-6 font-bold text-red-500">{state.message}</p>}
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
    <div className="space-y-6 md:space-y-8 pb-20">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start md:items-center justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Staff Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500 font-medium italic text-sm">NiKii Computer Academy</p>
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
          <div className="flex flex-wrap gap-4 items-center">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-slate-400">Date</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
              />
            </div>
            <div className="flex-1 space-y-1">
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

          <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="font-bold text-slate-900">{selectedBatch}</p>
              <p className="text-xs font-bold text-slate-400">{new Date(attendanceDate).toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
            </div>
            {batchRegs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium">No confirmed students in this batch.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {batchRegs.map(reg => {
                  const status = getAttStatus(reg.id)
                  const isPresent = status === 'Present'
                  return (
                    <div key={reg.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                      <div>
                        <p className="font-bold text-slate-900">{reg.fullName}</p>
                        <p className="text-xs text-slate-400">{reg.courseSelected} • {reg.mobileNumber}</p>
                      </div>
                      <button
                        onClick={() => handleAttendanceToggle(reg.id, status)}
                        className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition-all ${
                          isPresent
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle2 size={16} />
                        {isPresent ? 'Present' : 'Absent'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PAYMENTS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'payments' && (
        <div className="space-y-8">
          {/* Add Payment Modal */}
          {studentPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Record Payment</h3>
                    <p className="text-sm font-medium text-slate-500 mt-0.5">{studentPayment.fullName}</p>
                  </div>
                  <button onClick={() => setStudentPayment(null)} className="p-2 rounded-xl hover:bg-slate-100 transition"><X size={20} /></button>
                </div>

                <form onSubmit={handleAddPayment} className="space-y-5">
                  {/* Amount */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Amount (₹)</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={payForm.custom_amount}
                      onChange={e => setPayForm(p => ({ ...p, custom_amount: e.target.value }))}
                      placeholder="e.g. 3000"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-bold text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition text-base"
                    />
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Method</label>
                    <div className="flex flex-wrap gap-2">
                      {(['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'DD'] as const).map(m => (
                        <label key={m} className={`flex items-center gap-1.5 rounded-xl border-2 px-3 py-2 cursor-pointer text-xs font-bold transition-all ${payForm.payment_method === m ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                          <input type="radio" value={m} checked={payForm.payment_method === m} onChange={() => setPayForm(p => ({ ...p, payment_method: m }))} className="hidden" />
                          {m}
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
                    <button type="button" onClick={() => setStudentPayment(null)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition">Cancel</button>
                    <button type="submit" disabled={payBusy} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-60">
                      {payBusy ? 'Recording...' : '✓ Confirm & Record'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
