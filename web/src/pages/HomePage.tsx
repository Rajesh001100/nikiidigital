import { useState, useEffect } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { createRegistration, getInitialData, getRegistrationStatus } from '../lib/api'
import { fallbackCourses, fallbackSettings } from '../data/fallbackData'
import type { Course } from '../types'
import { MessageSquare, ArrowRight, Search, CheckCircle2, Clock, XCircle, Award, Target, Zap, ShieldCheck, AlertCircle } from 'lucide-react'

// Skeleton Component
const CourseSkeleton = () => (
  <div className="rounded-[2.5rem] p-8 bg-white border border-slate-100 animate-pulse">
    <div className="flex flex-col">
      <div className="shrink-0 mb-6 h-16 w-16 rounded-2xl bg-slate-200" />
      <div className="flex-1 space-y-4">
        <div className="h-4 w-1/4 bg-slate-200 rounded" />
        <div className="h-6 w-3/4 bg-slate-200 rounded" />
        <div className="h-20 w-full bg-slate-50 rounded" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-blue-50 rounded" />
          <div className="h-6 w-16 bg-blue-50 rounded" />
        </div>
      </div>
      <div className="mt-8 h-12 w-full bg-slate-100 rounded-xl" />
    </div>
  </div>
)

const Schema = z.object({
  fullName: z.string().min(2, 'Please enter your full name').max(100),
  email: z.string().email('Please enter a valid email').max(200),
  gender: z.string().min(1, 'Please select gender'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  address: z.string().min(5, 'Please enter your full address').max(500),
  highestQualification: z.string().min(1, 'Please select your qualification'),
  schoolCollegeName: z.string().min(2, 'Please enter your school/college name'),
  yearOfStudy: z.string().min(1, 'Please enter year of study'),
  mobileNumber: z.string().length(10, 'Please enter exactly 10 digit mobile number'),
  preferredBatchTime: z.string().min(1, 'Please select a batch time'),
  courseSelected: z.string().min(1, 'Please select a course'),
  howDidYouHear: z.string().min(1, 'Please tell us how you heard about us'),
  paymentMode: z.string().min(1, 'Please select a payment mode'),
  promoCode: z.string().optional(),
})

type FormValues = z.infer<typeof Schema>

export default function HomePage() {
  const [successId, setSuccessId] = useState<number | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [statusSearch, setStatusSearch] = useState('')
  const [statusResult, setStatusResult] = useState<any>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('nikii_courses');
    return saved ? JSON.parse(saved) : fallbackCourses;
  })
  const [settings, setSettings] = useState<any>(() => {
    const saved = localStorage.getItem('nikii_settings');
    return saved ? JSON.parse(saved) : fallbackSettings;
  })

  useEffect(() => {
    getInitialData().then(res => {
      setCourses(res.courses);
      setSettings(res.settings);
      localStorage.setItem('nikii_courses', JSON.stringify(res.courses));
      localStorage.setItem('nikii_settings', JSON.stringify(res.settings));
    }).catch(err => {
      console.error("HomePage: Failed to refresh dynamic data.", err);
    });
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      fullName: '',
      email: '',
      dateOfBirth: '',
      address: '',
      schoolCollegeName: '',
      yearOfStudy: '',
      mobileNumber: '',
    },
    mode: 'onTouched',
  })

  async function onSubmit(values: FormValues) {
    setSubmitError(null)
    setSuccessId(null)
    try {
      const res = await createRegistration({ ...values, status: 'Pending' })
      setSuccessId(res.registrationId)
      form.reset()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Registration failed')
    }
  }

  async function onCheckStatus(e: React.FormEvent) {
    e.preventDefault()
    const normalized = statusSearch.replace(/\D/g, '').slice(-10)
    try {
      const res = await getRegistrationStatus(normalized)
      setStatusResult(res)
    } catch (e: any) {
      setStatusError(e.message || 'No registration found')
    } finally {
      setStatusLoading(false)
    }
  }

  const qualifications = [
    'Class 1 to 6',
    'Class 7 to 10',
    'Class 11 to 12',
    'Diploma',
    'UG & PG (Any Degree)',
  ]

  const batches = settings?.batchTimes || [
    'Batch - I (9.30am - 11.30am)',
    'Batch - II (11.30am - 1.30pm)',
    'Batch - III (1.30pm - 3.30pm)',
    'Batch - IV (3.30pm - 5.30pm)',
    'Batch - V (5.30pm - 7.30pm)',
  ]

  const sources = ['Friends / Relatives', 'WhatsApp', 'Instagram', 'Facebook', 'Google Search']

  return (
    <div className="space-y-16 md:space-y-24 pb-20 animate-in fade-in duration-1000">
      {/* --- HERO SECTION --- */}
      <section id="home" className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden rounded-[3rem] bg-white px-6 py-20 shadow-2xl lg:flex-row lg:gap-12 lg:px-16">
        <div className="relative z-10 flex-1 space-y-8 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-600 ring-1 ring-blue-100 w-fit mx-auto lg:mx-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            State and Central Certified Academy
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-7xl">
            Education is <br />
            <span className="text-blue-600">Power of Life</span>
          </h1>
          <p className="mx-auto max-w-xl text-xl font-medium leading-relaxed text-slate-500 lg:mx-0">
            "Education is the most powerful weapon which you can use to change the world."
          </p>
          <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
            <button
              onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
              className="group flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95"
            >
              Get Started
              <i className="bi bi-chevron-down group-hover:translate-y-1 transition-transform" />
            </button>
          </div>
        </div>
        <div className="relative flex-1 mt-12 lg:mt-0">
          <div className="absolute -inset-10 rounded-full bg-blue-100/50 blur-3xl" />
          <img
            src="/hero_illustration.png"
            alt="Education Illustration"
            className="relative z-10 mx-auto w-full max-w-lg drop-shadow-2xl animate-float"
          />
        </div>
      </section>

      {/* --- STATUS TRACKER SECTION --- */}
      <section className="relative -mt-10 mb-0 mx-auto max-w-3xl px-4 z-20">
        <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-white/50 p-5 md:p-7 shadow-xl shadow-blue-500/10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-8">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none">Track Your Admission</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">Enter your registered mobile number to check your status instantly.</p>
            </div>
            <form onSubmit={onCheckStatus} className="w-full md:w-auto flex flex-row items-center gap-2">
              <div className="relative group flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="Mobile Number"
                  value={statusSearch}
                  onChange={(e) => setStatusSearch(e.target.value.replace(/\D/g, ''))}
                  className="w-full md:w-56 rounded-xl border border-slate-200 bg-white/70 pl-9 pr-3 py-2.5 text-sm font-bold outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm"
                />
              </div>
              <button
                type="submit"
                disabled={statusLoading}
                className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
              >
                {statusLoading ? '...' : 'Check'}
              </button>
            </form>
          </div>

          {statusError && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-red-600 text-xs font-bold flex items-center gap-2">
              <XCircle size={15} />
              {statusError}
            </div>
          )}

          {statusResult && (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 animate-in zoom-in-95 duration-500">
              <div className="space-y-0.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Registration for</p>
                <h4 className="text-sm font-black text-slate-900">{statusResult.courseSelected}</h4>
                <p className="text-xs font-bold text-slate-400">Student: {statusResult.fullName}</p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm shrink-0 ${statusResult.status === 'Confirmed' ? 'bg-emerald-500 text-white shadow-emerald-200' :
                statusResult.status === 'Rejected' ? 'bg-red-500 text-white shadow-red-200' :
                  'bg-amber-500 text-white shadow-amber-200 animate-pulse'
                }`}>
                {statusResult.status === 'Confirmed' ? <CheckCircle2 size={16} /> :
                  statusResult.status === 'Rejected' ? <XCircle size={16} /> : <Clock size={16} />}
                <span className="text-sm font-black uppercase tracking-tight">{statusResult.status}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* --- WHY CHOOSE US SECTION --- */}
      <section className="space-y-16 pt-24 md:pt-32">
        <div className="text-center">
          <div className="inline-block border-y-2 border-blue-500/20 px-8 py-2 text-sm font-black uppercase tracking-[0.3em] text-blue-600">
            Academy Excellence
          </div>
          <h2 className="mt-6 text-4xl font-extrabold text-slate-900 md:text-5xl">Why Choose NiKii Academy?</h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 px-4 overflow-visible">
          {[
            {
              title: "Expert Mentors",
              desc: "Learn from professionals with years of real-world industry experience.",
              icon: <Award className="text-blue-600" size={32} />,
              color: "blue"
            },
            {
              title: "100% Practical",
              desc: "We focus on hands-on project based learning approach.",
              icon: <Target className="text-emerald-500" size={32} />,
              color: "emerald"
            },
            {
              title: "Modern Lab",
              desc: "Well-equipped computer labs with latest software and high-speed internet.",
              icon: <Zap className="text-amber-500" size={32} />,
              color: "amber"
            },
            {
              title: "Authorized Center",
              desc: "State and Central government recognized certification for your career.",
              icon: <ShieldCheck className="text-purple-500" size={32} />,
              color: "purple"
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className="group relative rounded-[2.5rem] bg-white/40 backdrop-blur-md border border-white/60 p-10 text-center shadow-lg transition-all duration-500 hover:-translate-y-4 hover:bg-white/80 hover:shadow-2xl hover:shadow-slate-200"
            >
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                {item.icon}
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900">{item.title}</h3>
              <p className="text-sm font-medium leading-relaxed text-slate-500">{item.desc}</p>
              <div className={`absolute -inset-2 -z-10 rounded-[3rem] opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-br ${item.color === 'blue' ? 'from-blue-500/10 to-transparent' :
                item.color === 'emerald' ? 'from-emerald-500/10 to-transparent' :
                  item.color === 'amber' ? 'from-amber-500/10 to-transparent' : 'from-purple-500/10 to-transparent'
                }`} />
            </div>
          ))}
        </div>
      </section>

      {/* --- COURSES SECTION --- */}
      <section id="courses" className="space-y-16">
        <div className="text-center">
          <div className="inline-block border-y-2 border-blue-500/20 px-8 py-2 text-sm font-black uppercase tracking-[0.3em] text-blue-600">
            Our Programs
          </div>
          <h2 className="mt-6 text-4xl font-extrabold text-slate-900 md:text-5xl">Explore Specialized Courses</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg font-medium text-slate-500">
            Master the most in-demand technical skills with our State and Central certified curriculum and expert guidance.
          </p>
        </div>

        <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {courses.length > 0 ? (
            [...courses]
              .sort((a, b) => (b.isPromoted ? 1 : 0) - (a.isPromoted ? 1 : 0))
              .filter(c => c.isActive)
              .map((course, i) => (
                <div
                  key={i}
                  className={`group relative overflow-hidden rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 bg-white shadow-sm border transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl ${course.isPromoted
                    ? 'border-amber-200 ring-4 ring-amber-500/10 hover:shadow-amber-200/50 lg:col-span-3 md:col-span-2'
                    : 'border-slate-100 hover:shadow-blue-200/50'
                    }`}
                >
                  <div className={`flex flex-col ${course.isPromoted ? 'md:flex-row md:items-center md:gap-10' : ''}`}>
                    <div className={`shrink-0 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${course.color} text-white shadow-lg overflow-hidden ${course.isPromoted ? 'md:mb-0 md:h-24 md:w-24' : ''}`}>
                      {course.imageUrl ? (
                        <img src={course.imageUrl} alt={course.title} className="h-full w-full object-cover" />
                      ) : (
                        <i className={`bi ${course.icon} ${course.isPromoted ? 'text-5xl' : 'text-3xl'}`} />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="absolute right-8 top-8 flex flex-col items-end gap-2">
                        <div className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-slate-400">
                          {course.duration}
                        </div>
                        {course.isPromoted && course.badgeText && (
                          <div className="animate-pulse rounded-full bg-amber-500 px-3 py-1 text-[10px] font-black uppercase tracking-tighter text-white shadow-md">
                            {course.badgeText}
                          </div>
                        )}
                      </div>

                      <h3 className={`mb-3 font-black leading-tight text-slate-900 ${course.isPromoted ? 'text-3xl' : 'text-xl'}`}>{course.title}</h3>
                      <p className={`mb-6 font-medium leading-relaxed text-slate-500 ${course.isPromoted ? 'text-lg max-w-2xl' : 'text-sm'}`}>{course.description}</p>

                      <div className="flex flex-wrap gap-2">
                        {(course.features || []).map((f, j) => (
                          <span key={j} className={`rounded-lg bg-blue-50 px-3 py-1 font-bold text-blue-600 ${course.isPromoted ? 'text-xs' : 'text-[10px]'}`}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className={`${course.isPromoted ? 'md:w-64 shrink-0' : ''} flex justify-center`}>
                      <button
                        onClick={() => {
                          form.setValue('courseSelected', course.title);
                          document.getElementById('registration-form')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className={`mt-6 flex w-fit mx-auto items-center justify-center gap-2 rounded-xl px-8 py-2.5 text-sm font-bold transition-all ${course.isPromoted
                          ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200'
                          : 'bg-slate-50 text-slate-600 group-hover:bg-blue-600 group-hover:text-white'
                          }`}
                      >
                        Register Now
                        <ArrowRight size={18} />
                      </button>
                    </div>
                  </div>

                  <div className={`absolute -bottom-2 -right-2 h-16 w-16 rounded-full blur-3xl transition-all ${course.isPromoted ? 'bg-amber-500/10 group-hover:bg-amber-500/30' : 'bg-blue-500/5 group-hover:bg-blue-500/20'
                    }`} />
                </div>
              ))
          ) : (
            <>
              <CourseSkeleton />
              <CourseSkeleton />
              <CourseSkeleton />
            </>
          )}
        </div>
      </section>

      {/* --- REGISTRATION FORM SECTION --- */}
      <section id="registration-form" className="space-y-12">
        <div className="text-center space-y-4 md:space-y-6">
          <h2 className="text-3xl font-extrabold text-slate-900 md:text-5xl">Nikii Digital Academy</h2>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-1.5 md:px-6 md:py-2 text-xs md:text-sm font-bold text-white shadow-lg shadow-blue-200">
            Digital Registration Form
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-12 items-start">
          <div className="lg:col-span-12">
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 md:p-12 shadow-xl border-t-8 border-t-blue-600">
              {successId != null ? (
                <div className="text-center py-16 space-y-6">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 scale-110">
                    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900">Registration Successful!</h2>
                  <p className="text-slate-500 text-xl font-medium">
                    Welcome to the Academy. We'll contact you soon.<br />
                    Ref ID: <span className="text-blue-600 font-black px-3 py-1 bg-blue-50 rounded-lg">#REG-{successId.toString().padStart(4, '0')}</span>
                  </p>
                  <button
                    onClick={() => { setSuccessId(null); window.scrollTo({ top: document.getElementById('registration-form')?.offsetTop ? document.getElementById('registration-form')!.offsetTop - 100 : 0, behavior: 'smooth' }); }}
                    className="mt-8 rounded-2xl bg-blue-600 px-8 py-3 text-base font-bold text-white hover:bg-blue-700 transition shadow-2xl shadow-blue-200"
                  >
                    New Registration
                  </button>
                  <div className="pt-4">
                    <a
                      href="https://wa.me/919750534434?text=Hi, I just registered on your website and would like to know more about the next steps."
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:underline"
                    >
                      <i className="bi bi-whatsapp text-2xl" />
                      Chat with us on WhatsApp
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  {submitError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 flex gap-4 items-center">
                      <i className="bi bi-exclamation-octagon-fill text-2xl" />
                      <span className="font-bold">{submitError}</span>
                    </div>
                  )}

                  <div className="space-y-8">
                    {/* Selected Course Display */}
                    {form.watch('courseSelected') && (
                      <div className="rounded-3xl bg-blue-50/50 border border-blue-100 p-8 flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                        <div className="space-y-2 text-center md:text-left">
                          <div className="flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-blue-600 border border-blue-100 shadow-sm animate-in fade-in slide-in-from-left duration-700 delay-100">
                            <span className="flex h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            <span className="text-[10px] font-black uppercase tracking-widest">State and Central Certified Academy</span>
                          </div>
                          <h4 className="text-xl font-black text-slate-900">{form.watch('courseSelected')}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => document.getElementById('courses')?.scrollIntoView({ behavior: 'smooth' })}
                          className="px-6 py-2 rounded-xl bg-white border border-blue-200 text-blue-600 font-bold text-sm hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                          Change Course
                        </button>
                        <input type="hidden" {...form.register('courseSelected')} />
                      </div>
                    )}

                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm">1</span>
                      Student Identity
                    </h3>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Student's Full Name *</label>
                        <input
                          {...form.register('fullName')}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition font-medium text-sm placeholder:text-slate-300"
                          placeholder="Your Name"
                        />
                        {form.formState.errors.fullName && <p className="text-xs font-bold text-red-500">{form.formState.errors.fullName.message}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address *</label>
                        <input
                          type="email"
                          {...form.register('email')}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition font-medium text-sm placeholder:text-slate-300"
                          placeholder="hello@example.com"
                        />
                        {form.formState.errors.email && <p className="text-xs font-bold text-red-500">{form.formState.errors.email.message}</p>}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Gender *</label>
                        <div className="flex gap-6">
                          {['Male', 'Female'].map((g) => (
                            <label key={g} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                value={g}
                                {...form.register('gender')}
                                className="w-4 h-4 accent-blue-600 cursor-pointer"
                              />
                              <span className="text-sm font-semibold text-slate-700">{g}</span>
                            </label>
                          ))}
                        </div>
                        {form.formState.errors.gender && <p className="text-xs font-bold text-red-500">{form.formState.errors.gender.message}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Date of Birth *</label>
                        <input
                          type="date"
                          {...form.register('dateOfBirth')}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition font-medium text-sm"
                        />
                        {form.formState.errors.dateOfBirth && <p className="text-xs font-bold text-red-500">{form.formState.errors.dateOfBirth.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Permanent Address *</label>
                      <textarea
                        {...form.register('address')}
                        rows={2}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition font-medium text-sm resize-none placeholder:text-slate-300"
                        placeholder="Ex: No 1, Main Street, Anthiyur..."
                      />
                      {form.formState.errors.address && <p className="text-xs font-bold text-red-500">{form.formState.errors.address.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-5">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white text-sm">2</span>
                      Qualifications
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Highest Qualification *</label>
                        <div className="relative">
                          <select {...form.register('highestQualification')} className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition font-medium text-sm">
                            <option value="">Choose one</option>
                            {qualifications.map(q => <option key={q} value={q}>{q}</option>)}
                          </select>
                          <i className="bi bi-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Institution Name *</label>
                        <input {...form.register('schoolCollegeName')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition font-medium text-sm" placeholder="School/College Name" />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Year / Grade *</label>
                        <input {...form.register('yearOfStudy')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition font-medium text-sm" placeholder="Ex: 10th Standard or 3rd Year" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Mobile (WhatsApp) *</label>
                        <input
                          type="tel"
                          maxLength={10}
                          {...form.register('mobileNumber')}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            form.setValue('mobileNumber', val);
                          }}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition font-medium text-sm"
                          placeholder="10 digit mobile number"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm">3</span>
                      Extra Information
                    </h3>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Promocode (Optional)</label>
                      <input
                        {...form.register('promoCode')}
                        placeholder="Ex: SUMMER50"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition shadow-sm uppercase placeholder:normal-case"
                      />
                      {settings?.promoCodes?.find((p: any) => p.code === form.watch('promoCode')?.toUpperCase()) && (
                        <p className="text-xs font-bold text-emerald-600 flex items-center gap-2 animate-bounce">
                          <i className="bi bi-patch-check-fill" /> {settings.promoCodes.find((p: any) => p.code === form.watch('promoCode')?.toUpperCase()).description}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Preferred Batch *</label>
                        <div className="relative">
                          <select {...form.register('preferredBatchTime')} className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition font-medium text-sm">
                            <option value="">Choose Batch Time</option>
                            {batches.map((b: string) => <option key={b} value={b}>{b}</option>)}
                          </select>
                          <i className="bi bi-clock absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">How did you hear? *</label>
                        <div className="relative">
                          <select {...form.register('howDidYouHear')} className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition font-medium text-sm">
                            <option value="">Choose Source</option>
                            {sources.map((s: string) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <i className="bi bi-megaphone absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white text-sm">4</span>
                      Payment Preferences
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        { id: 'Online Mode', label: 'Online Payment', desc: 'UPI / Card / NetBanking', icon: 'bi-lightning-charge-fill' },
                        { id: 'Offline Mode', label: 'Offline Payment', desc: 'Cash at Academy Counter', icon: 'bi-cash' }
                      ].map((p) => (
                        <label key={p.id} className="flex items-center gap-3 rounded-xl border-2 border-slate-100 bg-slate-50/50 p-4 cursor-pointer hover:bg-white transition group has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50/30">
                          <input type="radio" value={p.id} {...form.register('paymentMode')} className="hidden" />
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors shadow-sm">
                            <i className={`bi ${p.icon} text-base`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-slate-900">{p.label}</p>
                            <p className="text-xs font-medium text-slate-400 truncate">{p.desc}</p>
                          </div>
                          <div className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-200 group-has-[:checked]:border-emerald-500 group-has-[:checked]:bg-emerald-500 flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white opacity-0 group-has-[:checked]:opacity-100" />
                          </div>
                        </label>
                      ))}
                    </div>

                    {form.watch('paymentMode') === 'Online Mode' && (
                      <div className="mt-6 rounded-2xl bg-white border border-emerald-100 p-6 shadow-sm overflow-hidden relative animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                          <i className="bi bi-qr-code text-8xl"></i>
                        </div>
                        <h4 className="text-sm font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                          <ShieldCheck size={16} /> Online Payment Details
                        </h4>

                        <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
                          <div className="shrink-0 p-2 bg-white rounded-xl shadow-md border border-slate-100">
                            <img src="/paymentqr.png" alt="Payment QR Code" className="w-32 h-32 md:w-36 md:h-36 object-contain" />
                          </div>
                          <div className="space-y-4 flex-1 text-center md:text-left">
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Scan QR or use UPI ID</p>
                              <p className="text-lg md:text-xl font-black text-slate-900 select-all tracking-wide">97509344434-2@okbizaxis</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 text-amber-700 p-3 rounded-xl text-xs sm:text-sm font-semibold leading-relaxed text-left">
                              <span className="flex items-center gap-1.5 mb-1 text-amber-800 font-bold"><AlertCircle size={14} /> Attention</span>
                              Please verify with the admin mobile number (+91 9750534434) before making an online payment for instant confirmation.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex flex-col items-center">
                    <button
                      type="submit"
                      disabled={form.formState.isSubmitting}
                      className="group relative w-fit mx-auto overflow-hidden rounded-xl bg-slate-900 px-10 py-2.5 text-sm font-black text-white transition-all hover:bg-blue-600 hover:shadow-[0_10px_30px_rgba(37,99,235,0.2)] disabled:opacity-70 active:scale-[0.98]"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-3">
                        {form.formState.isSubmitting ? 'Submitting...' : 'Register as Student'}
                        {!form.formState.isSubmitting && <i className="bi bi-arrow-right-circle text-lg opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />}
                      </span>
                    </button>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                      <div className="flex items-center gap-1.5"><i className="bi bi-shield-check text-sm text-blue-500" /> Secure SSL</div>
                      <div className="flex items-center gap-1.5"><i className="bi bi-patch-check text-sm text-emerald-500" /> Authorized</div>
                      <div className="flex items-center gap-1.5"><i className="bi bi-clock text-sm text-amber-500" /> Instant Confirm</div>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- CONTACT & MAP SECTION --- */}
      <section id="contact" className="space-y-16 py-12">
        <div className="text-center">
          <div className="inline-block border-y-2 border-emerald-500/20 px-8 py-2 text-sm font-black uppercase tracking-[0.3em] text-emerald-600">
            Contact & Location
          </div>
        </div>

        <div className="space-y-16">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: 'bi-geo-alt-fill',
                color: 'bg-blue-600',
                title: 'Our Address',
                lines: [
                  'Near Anthiyur Bus Stand, Bhavani Main Road,',
                  'Udhayam Department 1st Floor,',
                  'Anthiyur - 638 501'
                ]
              },
              {
                icon: 'bi-telephone-fill',
                color: 'bg-emerald-500',
                title: 'Call Support',
                lines: ['+91 97505 34434', '+91 98653 20076']
              },
              {
                icon: 'bi-envelope-at-fill',
                color: 'bg-slate-900',
                title: 'Official Email',
                lines: ['nikiiacademy@gmail.com']
              },
            ].map((item, idx) => (
              <div key={idx} className="group flex flex-col items-center text-center gap-4 rounded-[2rem] bg-white p-8 shadow-sm border border-slate-100 transition-all hover:shadow-xl hover:-translate-y-1">
                <div className={`shrink-0 flex h-14 w-14 items-center justify-center rounded-2xl ${item.color} text-white shadow-lg transition-transform group-hover:scale-110`}>
                  <i className={`bi ${item.icon} text-2xl`} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{item.title}</h3>
                  <div className="text-slate-900 font-black leading-relaxed text-lg">
                    {item.lines.map((line, i) => <p key={i}>{line}</p>)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <h2 className="text-4xl font-extrabold text-slate-900 md:text-5xl">Visit Our Academy</h2>
          </div>

          <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-3 shadow-xl h-[450px] md:h-[550px] group">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3910.4554316975513!2d77.5897441!3d11.5751703!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ba947005d2d6769%3A0xab7232af2f85f78c!2sNiKii%20Computer%20Academy!5e0!3m2!1sen!2sin!4v1710600000000!5m2!1sen!2sin"
              className="w-full h-full rounded-[2rem] border-none grayscale-[0.2] transition-all duration-700 group-hover:grayscale-0"
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>

          <div className="flex justify-center">
            <a
              href="https://www.google.com/maps/dir//HHGQ%2B3V9+NiKii+Computer+Academy,+Anthiyur,+Tamil+Nadu+638501/@11.5751703,77.5897441,17z"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-900 px-12 py-5 font-black text-white hover:bg-blue-600 transition-all shadow-2xl shadow-slate-200 hover:scale-105 active:scale-95"
            >
              <i className="bi bi-cursor-fill" />
              Get Direction to Academy
            </a>
          </div>
        </div>
      </section>

      {/* --- FLOATING WHATSAPP BUTTON --- */}
      <a
        href="https://wa.me/919750534434"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-20 right-4 md:bottom-10 md:right-10 z-50 flex h-13 w-13 md:h-16 md:w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl transition hover:scale-110 active:scale-95"
      >
        <MessageSquare size={28} className="md:hidden" />
        <MessageSquare size={32} className="hidden md:block" />
      </a>
    </div>
  )
}
