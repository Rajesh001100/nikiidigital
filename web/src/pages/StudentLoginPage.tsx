import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { studentLogin } from '../lib/api'
import { GraduationCap, Phone, Calendar, ArrowRight, Loader2 } from 'lucide-react'

export default function StudentLoginPage() {
    const [mobile, setMobile] = useState('')
    const [dob, setDob] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')
        try {
            const { student } = await studentLogin(mobile, dob)
            localStorage.setItem('nikiidigital_student', JSON.stringify(student))
            navigate('/student/dashboard')
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your details.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 pt-24 pb-12 px-4 flex items-center justify-center relative overflow-hidden">
            {/* Soft Decorative Background Blobs */}
            <div className="absolute top-[5%] left-[-5%] w-[30rem] h-[30rem] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[5%] right-[-5%] w-[30rem] h-[30rem] bg-indigo-200/40 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-sky-100/30 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-md w-full relative z-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                {/* Card */}
                <div className="bg-white/70 backdrop-blur-2xl p-10 md:p-12 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/80">

                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center p-4 bg-blue-50 rounded-3xl mb-5 border border-blue-100 shadow-sm shadow-blue-100">
                            <GraduationCap className="w-10 h-10 text-blue-600" strokeWidth={1.5} />
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Student Portal</h1>
                        <p className="text-slate-400 font-medium text-base">Login to access your dashboard</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-7">
                        {/* Mobile Input */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-600 ml-1">Mobile Number</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Phone className="w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors duration-300" />
                                </div>
                                <input
                                    type="tel"
                                    required
                                    maxLength={10}
                                    placeholder="10 digit mobile number"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-slate-900 font-semibold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all duration-300 text-base"
                                />
                            </div>
                        </div>

                        {/* DOB Input */}
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-600 ml-1">Date of Birth</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <Calendar className="w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors duration-300" />
                                </div>
                                <input
                                    type="date"
                                    required
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-slate-900 font-semibold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all duration-300 text-base"
                                />
                            </div>
                            <p className="text-[11px] font-semibold text-slate-300 mt-2 ml-2 uppercase tracking-widest">Use the format exactly as registered</p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-sm font-bold text-center">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || mobile.length !== 10}
                            className="group w-full flex items-center justify-center gap-3 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-lg py-5 px-6 rounded-2xl shadow-xl shadow-blue-300/50 hover:shadow-blue-400/60 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <>
                                    <span className="tracking-tight">Access Dashboard</span>
                                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-200" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-10 pt-8 border-t border-slate-100 text-center space-y-1">
                        <p className="text-sm text-slate-400">Registration required to login.</p>
                        <p className="text-sm font-bold text-slate-500">
                            First time?{' '}
                            <Link to="/" className="text-blue-600 hover:text-blue-700 transition-colors">
                                Register on the home page.
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
