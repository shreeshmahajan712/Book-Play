import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Menu, X, Zap, LogOut, User, LayoutDashboard, Plus } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
    setMenuOpen(false)
  }

  const navLinks = [
    { to: '/explore', label: 'Explore' },
    { to: '/nearby',  label: 'Near Me' },
  ]

  return (
    <nav className="navbar animate-fade-in" role="navigation" aria-label="Main navigation">
      {/* ── Logo ── */}
      <Link to="/" className="flex items-center gap-2 group" aria-label="TurfReserve home">
        <div className="w-8 h-8 rounded-lg bg-[#CCFF00] flex items-center justify-center
                        group-hover:shadow-[0_0_16px_rgba(204,255,0,0.5)] transition-all duration-300">
          <Zap size={16} strokeWidth={2.5} className="text-[#0a0a0a]" />
        </div>
        <span className="font-display font-bold text-lg text-[#f5f5f5] hidden sm:block">
          Turf<span className="text-[#CCFF00]">Reserve</span>
        </span>
      </Link>

      {/* ── Desktop Nav Links ── */}
      <div className="hidden md:flex items-center gap-1">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${location.pathname === link.to
                ? 'bg-[#1a1a1a] text-[#f5f5f5]'
                : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#1a1a1a]'
              }`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* ── Desktop Auth Controls ── */}
      <div className="hidden md:flex items-center gap-3">
        {user ? (
          <>
            {user.role === 'Owner' && (
              <Link to="/dashboard" className="btn-ghost gap-2 text-sm">
                <LayoutDashboard size={15} />
                Dashboard
              </Link>
            )}
            {user.role === 'Owner' && (
              <Link to="/dashboard/new-turf" className="btn-primary text-sm px-4 py-2">
                <Plus size={15} />
                List Turf
              </Link>
            )}

            {/* User Menu */}
            <div className="relative group">
              <button
                className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-xl
                           bg-[#1a1a1a] border border-[#252525] hover:border-[#313131]
                           transition-all duration-200"
                aria-label="User menu"
              >
                <div className="w-6 h-6 rounded-full bg-[#CCFF00] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#0a0a0a]">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-[#f5f5f5] max-w-[100px] truncate">
                  {user.name.split(' ')[0]}
                </span>
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-52 card-glass p-1
                              opacity-0 invisible group-hover:opacity-100 group-hover:visible
                              transition-all duration-200 z-50">
                <Link
                  to="/profile"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm
                             text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors"
                >
                  <User size={14} />
                  Profile
                </Link>
                <Link
                  to="/bookings"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm
                             text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors"
                >
                  My Bookings
                </Link>
                <div className="divider my-1" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm
                             text-red-400 hover:bg-red-500/10 w-full transition-colors"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-ghost text-sm">Log In</Link>
            <Link to="/register" className="btn-primary text-sm px-5 py-2">Get Started</Link>
          </>
        )}
      </div>

      {/* ── Mobile Hamburger ── */}
      <button
        className="md:hidden p-2 rounded-lg text-[#a3a3a3] hover:text-[#f5f5f5]
                   hover:bg-[#1a1a1a] transition-colors"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* ── Mobile Menu ── */}
      {menuOpen && (
        <div className="absolute top-16 inset-x-0 card-glass border-t border-[#1a1a1a]
                        p-4 flex flex-col gap-2 md:hidden z-40 animate-slide-up">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="px-4 py-3 rounded-xl text-sm font-medium text-[#a3a3a3]
                         hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors"
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <>
              <Link to="/bookings" onClick={() => setMenuOpen(false)}
                className="px-4 py-3 rounded-xl text-sm text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors">
                My Bookings
              </Link>
              {user.role === 'Owner' && (
                <Link to="/dashboard" onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 rounded-xl text-sm text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors">
                  Dashboard
                </Link>
              )}
              <button onClick={handleLogout}
                className="px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10 text-left transition-colors">
                Sign Out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2 border-t border-[#1a1a1a]">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-ghost justify-center">Log In</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary justify-center">Get Started</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
