import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import { Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function RootLayout() {
  return (
    <div className="min-h-dvh flex flex-col bg-[#080808]">
      <Navbar />

      {/* Page content — pushed below fixed navbar */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#1a1a1a] bg-[#0f0f0f]">
        <div className="container-xl py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#CCFF00] flex items-center justify-center">
                  <Zap size={16} strokeWidth={2.5} className="text-[#0a0a0a]" />
                </div>
                <span className="font-display font-bold text-lg">
                  Turf<span className="text-[#CCFF00]">Reserve</span>
                </span>
              </div>
              <p className="text-sm text-[#525252] max-w-xs leading-relaxed">
                India's fastest-growing sports turf booking marketplace. Find and book your perfect
                football, cricket, badminton, or tennis court in seconds.
              </p>
              <div className="flex gap-3 mt-4">
                <a href="#" className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center
                                       text-[#525252] hover:text-[#f5f5f5] hover:bg-[#252525] transition-colors"
                   aria-label="GitHub">
                  {/* GitHub mark */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center
                                       text-[#525252] hover:text-[#f5f5f5] hover:bg-[#252525] transition-colors"
                   aria-label="X (Twitter)">
                  {/* X / Twitter mark */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-xs font-semibold text-[#525252] uppercase tracking-widest mb-4">Platform</h4>
              <ul className="space-y-2.5">
                {['Explore Turfs', 'Near Me', 'List Your Turf', 'Pricing'].map((label) => (
                  <li key={label}>
                    <Link to="/explore" className="text-sm text-[#525252] hover:text-[#a3a3a3] transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[#525252] uppercase tracking-widest mb-4">Legal</h4>
              <ul className="space-y-2.5">
                {['Privacy Policy', 'Terms of Service', 'Refund Policy', 'Contact Us'].map((label) => (
                  <li key={label}>
                    <a href="#" className="text-sm text-[#525252] hover:text-[#a3a3a3] transition-colors">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="divider mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#3d3d3d]">
              © {new Date().getFullYear()} TurfReserve. All rights reserved.
            </p>
            <p className="text-xs text-[#3d3d3d]">
              10% commission per booking · Powered by Razorpay
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
