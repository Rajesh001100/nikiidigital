import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudentDashboard, getStudentRegistrations } from '../lib/api'
import type { StudentDashboardData } from '../types'
import {
    BarChart3,
    Calendar,
    CreditCard,
    FileText,
    LogOut,
    CheckCircle2,
    XCircle,
    Clock,
    Download,
    AlertCircle,
    TrendingUp,
    BookOpen
} from 'lucide-react'

export default function StudentDashboardPage() {
    const [data, setData] = useState<StudentDashboardData | null>(null)
    const [allRegistrations, setAllRegistrations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'payments' | 'materials' | 'history'>('overview')
    const navigate = useNavigate()

    async function load() {
        const stored = localStorage.getItem('nikiidigital_student')
        if (!stored) {
            navigate('/student/login')
            return
        }
        const student = JSON.parse(stored)
        setLoading(true)
        try {
            const [dashboard, regs] = await Promise.all([
                getStudentDashboard(student.id),
                getStudentRegistrations(student.mobileNumber, student.dateOfBirth)
            ])
            setData(dashboard)
            setAllRegistrations(regs.registrations)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void load()
    }, [navigate])

    function handleLogout() {
        localStorage.removeItem('nikiidigital_student')
        navigate('/student/login')
    }

    function switchAccount(reg: any) {
        localStorage.setItem('nikiidigital_student', JSON.stringify(reg))
        load()
        setActiveTab('overview')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!data) return null

    const { student, attendance, attendancePercent, payments, materials, syllabusUrl, courseFee } = data

    const netFee = Math.max(0, (courseFee || 0) - (student.discount_amount || 0));
    const totalPaid = payments.reduce((acc, curr) => acc + curr.amount_paid, 0);
    const balance = Math.max(0, netFee - totalPaid);
    const isSettled = balance === 0;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pt-24 pb-12 px-4 md:px-8">
            {/* Dashboard Header */}
            <div className="max-w-7xl mx-auto mb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                            <span className="text-2xl font-bold text-blue-400">{student.fullName.charAt(0)}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Welcome, {student.fullName}</h1>
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-100">
                                    {student.academic_year || '2026-2027'}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-500 text-sm">
                                <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {student.courseSelected}</span>
                                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                <span>ID: #REG-{student.id.toString().padStart(4, '0')}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-xl transition-all font-bold"
                    >
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8">
                {/* Sidebar Navigation */}
                <div className="flex overflow-x-auto gap-2 pb-1 md:hidden">
                    {[
                        { id: 'overview', label: 'Overview', icon: BarChart3 },
                        { id: 'attendance', label: 'Attendance', icon: Calendar },
                        { id: 'payments', label: 'Fee Payments', icon: CreditCard },
                        { id: 'materials', label: 'Materials', icon: FileText },
                        { id: 'history', label: 'My Admissions', icon: Clock },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border text-sm whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="font-semibold">{tab.label}</span>
                        </button>
                    ))}
                </div>
                <div className="hidden md:flex md:flex-col md:space-y-3">
                    {[
                        { id: 'overview', label: 'Overview', icon: BarChart3 },
                        { id: 'attendance', label: 'Attendance', icon: Calendar },
                        { id: 'payments', label: 'Fee Payments', icon: CreditCard },
                        { id: 'materials', label: 'Materials', icon: FileText },
                        { id: 'history', label: 'My Admissions', icon: Clock },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all border ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            <span className="font-semibold text-lg">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="md:col-span-3 space-y-8">

                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                        <TrendingUp className="w-24 h-24" strokeWidth={1} />
                                    </div>
                                    <p className="text-slate-500 mb-2 font-bold uppercase tracking-widest text-[10px]">Attendance Progress</p>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <h3 className="text-4xl font-black text-slate-900 mb-2">{attendancePercent}%</h3>
                                            <p className="text-sm text-blue-400">{attendance.filter(a => a.status === 'Present').length} days present</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${attendancePercent}%` }} />
                                    </div>
                                </div>

                                <div className="glass-morphism p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                        <CreditCard className="w-24 h-24" strokeWidth={1} />
                                    </div>
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Fee Summary</p>
                                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${isSettled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                            {isSettled ? 'Settled' : 'Pending'}
                                        </span>
                                    </div>
                                    <div className="space-y-3 relative z-10">
                                        <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Fee</span>
                                            <span className="font-black text-slate-700">₹{netFee}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Paid</span>
                                            <span className="font-black text-emerald-600">₹{totalPaid}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-100">
                                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider tracking-widest">Balance</span>
                                            <span className="text-2xl font-black text-blue-600">₹{balance}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Transactions */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <h3 className="font-black text-slate-900 text-lg mb-4 flex items-center justify-between">
                                    <span>Recent Transactions</span>
                                    <button onClick={() => setActiveTab('payments')} className="text-xs text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider">View All</button>
                                </h3>
                                {payments.length > 0 ? (
                                    <div className="space-y-3">
                                        {payments.slice(0, 3).map((p, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-sm transition-all border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-emerald-50 rounded-xl">
                                                        <CreditCard className="w-5 h-5 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-slate-500 font-bold">{new Date(p.date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-black text-slate-900">₹{p.amount_paid}</span>
                                                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-0.5"><CheckCircle2 className="w-3 h-3 inline mr-1" />Verified</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-gray-500 text-sm">No payment history found yet.</p>
                                    </div>
                                )}
                            </div>

                            {/* Status Message */}
                            <div className="bg-blue-600 p-6 rounded-3xl border border-blue-700 shadow-lg shadow-blue-200 flex items-start gap-4">
                                <AlertCircle className="w-6 h-6 text-white shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-white font-black mb-1">Academy Notice</h4>
                                    <p className="text-blue-50 text-sm font-medium leading-relaxed">
                                        Always maintain 80% attendance to be eligible for the final examination and certificate generation. Contact admin for any leave requests.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attendance' && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-xl font-black text-slate-900">Attendance History</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {attendance.length > 0 ? (
                                            attendance.map((entry, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-bold">
                                                        {new Date(entry.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${entry.status === 'Present' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                                                            }`}>
                                                            {entry.status === 'Present' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                            {entry.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-12 text-center text-gray-500">No attendance records found yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-xl font-black text-slate-900">Fee Tracking</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                {payments.length > 0 ? (
                                    <div className="space-y-4">
                                        {payments.map((p, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-emerald-50 rounded-xl">
                                                        <CreditCard className="w-6 h-6 text-emerald-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-slate-500 font-bold">{new Date(p.date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-2xl font-black text-slate-900">₹{p.amount_paid}</span>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Status: Verified</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                        <Clock className="w-12 h-12 mb-4 opacity-20" />
                                        <p>No payment history found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'materials' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* --- Syllabus Card --- */}
                            {syllabusUrl ? (
                                <div className="bg-white p-6 rounded-3xl border border-emerald-200 bg-emerald-50/30 flex items-center justify-between gap-4 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                                            <FileText className="w-7 h-7 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 text-lg">Course Syllabus</h4>
                                            <p className="text-sm text-emerald-600 font-bold uppercase tracking-wider">Official Curriculum</p>
                                        </div>
                                    </div>
                                    <a
                                        href={syllabusUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-200 transition-all hover:scale-105"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download
                                    </a>
                                </div>
                            ) : (
                                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 opacity-70">
                                    <FileText className="w-5 h-5 text-slate-400" />
                                    <p className="text-sm text-slate-400 italic font-medium">Syllabus not yet uploaded by your instructor.</p>
                                </div>
                            )}

                            {/* --- Study Materials --- */}
                            {materials.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Study Materials</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {materials.map((m, idx) => (
                                            <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-blue-500 hover:shadow-md transition-all">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="p-3 bg-blue-50 rounded-2xl">
                                                        <FileText className="w-6 h-6 text-blue-600" />
                                                    </div>
                                                    <a
                                                        href={m.file_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-2.5 bg-slate-50 hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl transition-all"
                                                    >
                                                        <Download className="w-5 h-5" />
                                                    </a>
                                                </div>
                                                <h4 className="text-lg font-black mb-2 text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{m.title}</h4>
                                                <p className="text-sm text-slate-500 font-medium line-clamp-2 leading-relaxed">{m.description || 'No description provided.'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {materials.length === 0 && !syllabusUrl && (
                                <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-slate-400 text-center">
                                    <div className="p-5 bg-slate-50 rounded-full mb-4">
                                        <FileText className="w-12 h-12 opacity-30" />
                                    </div>
                                    <p className="font-bold text-slate-500">No study materials found.</p>
                                    <p className="text-sm max-w-[250px] mt-1 italic">Materials will be uploaded soon by your instructor.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100">
                                    <h3 className="text-xl font-black text-slate-900">Your Admission History</h3>
                                    <p className="text-sm text-slate-400 mt-1">Found {allRegistrations.length} total registrations for this account.</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    {allRegistrations.map((reg) => (
                                        <div
                                            key={reg.id}
                                            className={`group relative p-6 rounded-3xl border-2 transition-all ${reg.id === student.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'}`}
                                        >
                                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h4 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">{reg.courseSelected}</h4>
                                                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border ${reg.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                                                            {reg.status}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs font-bold text-slate-400">
                                                        <p>ID: <span className="text-slate-600">#REG-{reg.id.toString().padStart(4, '0')}</span></p>
                                                        <p>YEAR: <span className="text-slate-600">{reg.academic_year || '2026-2027'}</span></p>
                                                        <p>BATCH: <span className="text-slate-600">{reg.preferredBatchTime}</span></p>
                                                        <p>DATE: <span className="text-slate-600">{new Date(reg.createdAt).toLocaleDateString()}</span></p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {reg.id === student.id ? (
                                                        <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-blue-100">
                                                            <CheckCircle2 className="w-4 h-4" /> Currently Viewing
                                                        </div>
                                                    ) : reg.status === 'Confirmed' ? (
                                                        <button
                                                            onClick={() => switchAccount(reg)}
                                                            className="px-6 py-3 bg-white hover:bg-blue-600 text-slate-600 hover:text-white font-black text-xs uppercase tracking-widest rounded-xl border-2 border-slate-100 hover:border-blue-600 transition-all shadow-sm"
                                                        >
                                                            Switch Dashboard
                                                        </button>
                                                    ) : (
                                                        <p className="text-[10px] italic text-slate-400 font-bold max-w-[150px] leading-tight">Dashboard becomes available once admission is confirmed.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
