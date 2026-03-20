import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import StaffPage from './pages/StaffPage'
import CertificateViewPage from './pages/CertificateViewPage'
import StudentLoginPage from './pages/StudentLoginPage'
import StudentDashboardPage from './pages/StudentDashboardPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const isAdminPage = location.pathname.startsWith('/nikii-secure-admin-portal')
  const isStaffPage = location.pathname.startsWith('/nikii-staff-portal')
  const isPortalPage = isAdminPage || isStaffPage
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPortalDropdownOpen, setIsPortalDropdownOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('')

  // Intersection Observer for scroll-spy
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px', // Trigger when section is in the upper middle
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    const sections = ['home', 'courses', 'contact', 'registration-form'];
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Close menu on navigation
  useEffect(() => {
    setIsMenuOpen(false)
  }, [window.location.pathname])

  const navLinks = [
    { name: 'Home', path: 'home', isHash: true },
    { name: 'Courses', path: 'courses', isHash: true },
    { name: 'Contact', path: 'contact', isHash: true },
    { name: 'Student Login', path: '/student/login', isHash: false },
  ]

  const portalLinks = [
    { name: 'Admin', path: '/nikii-secure-admin-portal' },
    { name: 'Staff', path: '/nikii-staff-portal' },
  ]

  const handleNavClick = (link: { name: string, path: string, isHash: boolean }) => {
    if (!link.isHash) {
      setActiveSection('');
      return;
    }

    if (window.location.pathname !== '/') {
      window.location.href = `/#${link.path}`;
    } else {
      document.getElementById(link.path)?.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(link.path);
    }
    setIsMenuOpen(false);
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <NavLink to="/" className="flex items-center gap-3">
            <img src="/Edu_Logo.png" alt="NikiiDigital Logo" className="h-10 w-auto transition-transform hover:scale-110" />
          </NavLink>

          {/* Nav & Theme Toggle Container */}
          <div className="flex items-center gap-4">
            {isPortalPage ? (
              <button
                onClick={() => {
                  if (isAdminPage) localStorage.removeItem('nikiidigital_admin_key');
                  if (isStaffPage) localStorage.removeItem('nikiidigital_staff_key');
                  window.location.reload();
                }}
                className="rounded-xl px-5 py-2 text-sm font-black bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100 flex items-center gap-2"
              >
                <i className="bi bi-box-arrow-right text-lg" />
                Sign Out
              </button>
            ) : (
              <>
                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-1">
                  {navLinks.map((link) => (
                    link.isHash ? (
                      <button
                        key={link.name}
                        onClick={() => handleNavClick(link)}
                        className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${activeSection === link.path
                            ? 'bg-blue-600/10 text-blue-600'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600'
                          }`}
                      >
                        {link.name}
                      </button>
                    ) : (
                      <NavLink
                        key={link.name}
                        to={link.path}
                        className={({ isActive }) =>
                          `rounded-xl px-4 py-2 text-sm font-bold transition-all ${isActive ? 'bg-blue-600/10 text-blue-600' : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600'
                          }`
                        }
                      >
                        {link.name}
                      </NavLink>
                    )
                  ))}

                  {/* Portal Dropdown */}
                  <div 
                    className="relative group ml-1"
                    onMouseEnter={() => setIsPortalDropdownOpen(true)}
                    onMouseLeave={() => setIsPortalDropdownOpen(false)}
                  >
                    <button
                      className={`rounded-xl px-4 py-2 text-sm font-bold transition-all flex items-center gap-1 ${isPortalDropdownOpen ? 'bg-blue-600/10 text-blue-600' : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600'}`}
                    >
                      Portal
                      <i className={`bi bi-chevron-down text-[10px] transition-transform duration-300 ${isPortalDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isPortalDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 w-48 rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl shadow-blue-900/10 animate-in fade-in slide-in-from-top-2 duration-200">
                        {portalLinks.map((link) => (
                           <button
                             key={link.name}
                             onClick={() => {
                               navigate(link.path);
                               setIsPortalDropdownOpen(false);
                             }}
                             className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all text-left"
                           >
                             {link.name}
                             <i className="bi bi-arrow-right text-xs opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                           </button>
                        ))}
                      </div>
                    )}
                  </div>
                </nav>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 md:hidden text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                >
                  <i className={`bi ${isMenuOpen ? 'bi-x-lg' : 'bi-list'} text-xl`} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {isMenuOpen && (
          <div className="border-t border-slate-100 bg-white/95 p-6 md:hidden animate-in slide-in-from-top duration-300">
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => (
                link.isHash ? (
                  <button
                    key={link.name}
                    onClick={() => handleNavClick(link)}
                    className={`flex items-center justify-between rounded-2xl px-6 py-4 text-lg font-black active:scale-[0.98] transition-all ${activeSection === link.path
                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-200'
                        : 'bg-slate-50 text-slate-900 border border-slate-100'
                      }`}
                  >
                    {link.name}
                    <i className={`bi bi-chevron-right ${activeSection === link.path ? 'text-white/50' : 'text-slate-300'}`} />
                  </button>
                ) : (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-2xl px-6 py-4 text-lg font-black active:scale-[0.98] transition-all ${isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-slate-50 text-slate-900 border border-slate-100'
                      }`
                    }
                  >
                    {({ isActive }: { isActive: boolean }) => (
                      <>
                        {link.name}
                        <i className={`bi bi-chevron-right ${isActive ? 'text-white/50' : 'text-slate-300'}`} />
                      </>
                    )}
                  </NavLink>
                )
              ))}

              {/* Mobile Portal Links */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <p className="px-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Internal Portals</p>
                {portalLinks.map((link) => (
                  <button
                    key={link.name}
                    onClick={() => {
                        navigate(link.path);
                        setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl bg-white border border-slate-100 px-6 py-4 text-lg font-black text-slate-900 hover:border-blue-600 active:scale-[0.98] transition-all"
                  >
                    {link.name}
                    <i className="bi bi-shield-lock text-slate-300" />
                  </button>
                ))}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="w-full px-4 md:px-6 py-6 md:py-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/nikii-secure-admin-portal" element={<AdminPage />} />
          <Route path="/nikii-staff-portal" element={<StaffPage />} />
          <Route path="/certificate/:id" element={<CertificateViewPage />} />
          <Route path="/student/login" element={<StudentLoginPage />} />
          <Route path="/student/dashboard" element={<StudentDashboardPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-service" element={<TermsOfServicePage />} />
          <Route
            path="*"
            element={
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
                <div className="text-xl font-bold text-slate-900">Page not found</div>
                <div className="mt-2 text-slate-500">
                  Try going back to the home page or logging in as a student.
                </div>
              </div>
            }
          />
        </Routes>
      </main>

      <footer className="border-t border-slate-100 bg-white py-5">
        {/* Mobile: stacked center | Desktop: 3 columns */}
        <div className="flex flex-col items-center gap-2 px-6 text-xs text-slate-400 font-medium sm:grid sm:grid-cols-3 sm:gap-0">
          <div className="text-center sm:text-left flex flex-wrap gap-3">
            <span onClick={() => navigate('/privacy-policy')} className="hover:text-blue-600 cursor-pointer transition-colors">Privacy Policy</span>
            <span onClick={() => navigate('/terms-of-service')} className="hover:text-blue-600 cursor-pointer transition-colors">Terms of Service</span>
          </div>
          <div className="text-center order-first sm:order-none">© {new Date().getFullYear()} NiKii Computer Academy. All rights reserved.</div>
          <div className="text-center sm:text-right flex flex-wrap gap-3 justify-center sm:justify-end">
            <span onClick={() => navigate('/nikii-staff-portal')} className="hover:text-emerald-600 cursor-pointer font-bold transition-colors">Staff Portal</span>
            <span onClick={() => navigate('/nikii-secure-admin-portal')} className="hover:text-blue-600 cursor-pointer font-bold transition-colors">Admin Gateway</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
