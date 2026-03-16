import { NavLink, Route, Routes } from 'react-router-dom'
import { useState, useEffect } from 'react'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Close menu on navigation
  useEffect(() => {
    setIsMenuOpen(false)
  }, [window.location.pathname])

  const navLinks = [
    { name: 'Home', path: '/', isHash: false },
    { name: 'About', path: 'about-us', isHash: true },
    { name: 'Courses', path: 'courses', isHash: true },
    { name: 'Contact', path: 'contact', isHash: true },
  ]

  const handleNavClick = (link: { name: string, path: string, isHash: boolean }) => {
    if (!link.isHash) return;
    
    if (window.location.pathname !== '/') {
      window.location.href = `/#${link.path}`;
    } else {
      document.getElementById(link.path)?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <NavLink to="/" className="flex items-center gap-3">
            <img src="/Edu_Logo.png" alt="NikiiDigital Logo" className="h-10 w-auto transition-transform hover:scale-110" />
            <div className="leading-tight">
              <div className="text-sm font-black text-slate-900 tracking-tight">Nikii Digital</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Academy</div>
            </div>
          </NavLink>

          {/* Nav & Theme Toggle Container */}
          <div className="flex items-center gap-4">
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                link.isHash ? (
                  <button
                    key={link.name}
                    onClick={() => handleNavClick(link)}
                    className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-all"
                  >
                    {link.name}
                  </button>
                ) : (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    className={({ isActive }) =>
                      `rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                        isActive ? 'bg-blue-600/10 text-blue-600' : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600'
                      }`
                    }
                  >
                    {link.name}
                  </NavLink>
                )
              ))}
            </nav>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 md:hidden text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
            >
              <i className={`bi ${isMenuOpen ? 'bi-x-lg' : 'bi-list'} text-xl`} />
            </button>
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
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-6 py-4 text-lg font-black text-slate-900 border border-slate-100 active:scale-[0.98] transition-all"
                  >
                    {link.name}
                    <i className="bi bi-chevron-right text-slate-300" />
                  </button>
                ) : (
                  <NavLink
                    key={link.name}
                    to={link.path}
                    className={({ isActive }) =>
                      `flex items-center justify-between rounded-2xl px-6 py-4 text-lg font-black active:scale-[0.98] transition-all ${
                        isActive ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-slate-50 text-slate-900 border border-slate-100'
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
            </nav>
          </div>
        )}
      </header>

      <main className="w-full px-6 py-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/nikii-secure-admin-portal" element={<AdminPage />} />
          <Route
            path="*"
            element={
              <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
                <div className="text-xl font-bold text-slate-900">Page not found</div>
                <div className="mt-2 text-slate-500">
                  Try going back to the form page.
                </div>
              </div>
            }
          />
        </Routes>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="flex flex-col gap-4 px-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} NikiiDigital Academy</div>
          <div className="flex gap-6">
            <span className="hover:text-blue-600 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-blue-600 cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
