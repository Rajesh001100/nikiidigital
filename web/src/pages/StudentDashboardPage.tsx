import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStudentDashboard } from '../lib/api'
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
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'payments' | 'materials'>('overview')
    const navigate = useNavigate()

    useEffect(() => {
        async function load() {
            const stored = localStorage.getItem('nikiidigital_student')
            if (!stored) {
                navigate('/student/login')
                return
            }
            const student = JSON.parse(stored)
            try {
                const dashboard = await getStudentDashboard(student.id)
                setData(dashboard)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        void load()
    }, [navigate])

    function handleLogout() {
        localStorage.removeItem('nikiidigital_student')
        navigate('/student/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
        <div className="min-h-screen bg-[#0a0a0c] text-white pt-24 pb-12 px-4 md:px-8">
            {/* Dashboard Header */}
            <div className="max-w-7xl mx-auto mb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass-morphism p-6 md:p-8 rounded-3xl border border-white/10 shadow-xl">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                            <span className="text-2xl font-bold text-blue-400">{student.fullName.charAt(0)}</span>
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Welcome, {student.fullName}</h1>
                            <div className="flex items-center gap-3 text-gray-400 text-sm">
                                <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> {student.courseSelected}</span>
                                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                <span>ID: #REG-{student.id.toString().padStart(4, '0')}</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/20 rounded-xl transition-all font-medium"
                    >
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8">
                {/* Sidebar Navigation */}
                {/* Mobile: horizontal scrollable tabs | Desktop: vertical sidebar */}
                <div className="flex overflow-x-auto gap-2 pb-1 md:hidden">
                    {[
                        { id: 'overview', label: 'Overview', icon: BarChart3 },
                        { id: 'attendance', label: 'Attendance', icon: Calendar },
                        { id: 'payments', label: 'Fee Payments', icon: CreditCard },
                        { id: 'materials', label: 'Materials', icon: FileText },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all border text-sm whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/5'
                                    : 'bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="font-semibold">{tab.label}</span>
                        </button>
                    ))}
                </div>
                {/* Desktop vertical nav */}
                <div className="hidden md:flex md:flex-col md:space-y-3">
                    {[
                        { id: 'overview', label: 'Overview', icon: BarChart3 },
                        { id: 'attendance', label: 'Attendance', icon: Calendar },
                        { id: 'payments', label: 'Fee Payments', icon: CreditCard },
                        { id: 'materials', label: 'Materials', icon: FileText },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all border ${activeTab === tab.id
                                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/5'
                                    : 'bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-300'
                                }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            <span className="font-semibold text-lg">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="md:col-span-3 space-y-8">

                    {activeTab === 'overview' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="glass-morphism p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <TrendingUp className="w-24 h-24" />
                                    </div>
                                    <p className="text-gray-400 mb-2 font-medium">Attendance Progress</p>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <h3 className="text-4xl font-bold text-white mb-2">{attendancePercent}%</h3>
                                            <p className="text-sm text-blue-400">{attendance.filter(a => a.status === 'Present').length} days present</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${attendancePercent}%` }} />
                                    </div>
                                </div>

                                <div className="glass-morphism p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <CreditCard className="w-24 h-24" />
                                    </div>
                                    <div className="flex items-center justify-between mb-4 relative z-10">
                                        <p className="text-gray-400 font-medium">Fee Summary</p>
                                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${isSettled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                            {isSettled ? 'Settled' : 'Pending'}
                                        </span>
                                    </div>
                                    <div className="space-y-3 relative z-10">
                                        <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                                            <span className="text-sm text-gray-400">Total Fee</span>
                                            <span className="font-bold">₹{netFee}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-emerald-500/10 p-2 rounded-xl">
                                            <span className="text-sm text-emerald-400">Total Paid</span>
                                            <span className="font-bold text-emerald-400">₹{totalPaid}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
                                            <span className="text-sm text-blue-400 font-medium tracking-wide">Balance</span>
                                            <span className="text-xl font-black text-blue-400">₹{balance}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Transactions */}
                            <div className="glass-morphism p-6 rounded-3xl border border-white/10 relative overflow-hidden">
                                <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                                    <span>Recent Transactions</span>
                                    <button onClick={() => setActiveTab('payments')} className="text-xs text-blue-400 hover:text-blue-300 font-medium">View All</button>
                                </h3>
                                {payments.length > 0 ? (
                                    <div className="space-y-3">
                                        {payments.slice(0, 3).map((p, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-green-500/10 rounded-xl">
                                                        <CreditCard className="w-5 h-5 text-green-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-400 font-medium">{new Date(p.date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-lg font-black text-white">₹{p.amount_paid}</span>
                                                    <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mt-0.5"><CheckCircle2 className="w-3 h-3 inline mr-1" />Verified</p>
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
                            <div className="glass-morphism p-6 rounded-3xl border border-blue-500/20 bg-blue-500/5 flex items-start gap-4">
                                <AlertCircle className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-blue-400 font-bold mb-1">Academy Notice</h4>
                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        Always maintain 80% attendance to be eligible for the final examination and certificate generation. Contact admin for any leave requests.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attendance' && (
                        <div className="glass-morphism rounded-3xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 border-b border-white/10">
                                <h3 className="text-xl font-bold">Attendance History</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {attendance.length > 0 ? (
                                            attendance.map((entry, idx) => (
                                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-medium">
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
                        <div className="glass-morphism rounded-3xl border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 border-b border-white/10">
                                <h3 className="text-xl font-bold">Fee Tracking</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                {payments.length > 0 ? (
                                    <div className="space-y-4">
                                        {payments.map((p, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-green-500/10 rounded-xl">
                                                        <CreditCard className="w-6 h-6 text-green-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-400 font-medium">{new Date(p.date).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-2xl font-bold text-white">₹{p.amount_paid}</span>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Status: Verified</p>
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
                                <div className="glass-morphism p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-emerald-500/10 rounded-2xl">
                                            <FileText className="w-7 h-7 text-emerald-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-white text-lg">Course Syllabus</h4>
                                            <p className="text-sm text-emerald-400">Official course outline & curriculum</p>
                                        </div>
                                    </div>
                                    <a
                                        href={syllabusUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-900/20 transition-all hover:scale-105"
                                    >
                                        <Download className="w-5 h-5" />
                                        Download
                                    </a>
                                </div>
                            ) : (
                                <div className="glass-morphism p-5 rounded-2xl border border-white/5 flex items-center gap-4 opacity-50">
                                    <FileText className="w-5 h-5 text-gray-500" />
                                    <p className="text-sm text-gray-500 italic">Syllabus not yet uploaded by your instructor.</p>
                                </div>
                            )}

                            {/* --- Study Materials --- */}
                            {materials.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Study Materials</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {materials.map((m, idx) => (
                                            <div key={idx} className="glass-morphism p-6 rounded-3xl border border-white/10 group hover:border-blue-500/30 transition-all">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="p-3 bg-blue-500/10 rounded-2xl">
                                                        <FileText className="w-6 h-6 text-blue-400" />
                                                    </div>
                                                    <a
                                                        href={m.file_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-2.5 bg-white/5 hover:bg-blue-600 text-gray-400 hover:text-white rounded-xl transition-all"
                                                    >
                                                        <Download className="w-5 h-5" />
                                                    </a>
                                                </div>
                                                <h4 className="text-lg font-bold mb-2 group-hover:text-blue-400 transition-colors">{m.title}</h4>
                                                <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{m.description || 'No description provided.'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {materials.length === 0 && !syllabusUrl && (
                                <div className="glass-morphism p-12 rounded-3xl border border-white/10 flex flex-col items-center justify-center text-gray-500">
                                    <FileText className="w-12 h-12 mb-4 opacity-20" />
                                    <p>Study materials will be uploaded soon by your instructor.</p>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
