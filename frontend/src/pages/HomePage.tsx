import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Zap, MapPin, Clock, Shield, ChevronRight, Star } from 'lucide-react'

const SPORTS = [
  { label: 'Football',   emoji: '⚽', count: '2,400+' },
  { label: 'Cricket',    emoji: '🏏', count: '1,800+' },
  { label: 'Badminton',  emoji: '🏸', count: '3,200+' },
  { label: 'Basketball', emoji: '🏀', count: '900+'   },
  { label: 'Tennis',     emoji: '🎾', count: '1,100+' },
]

const FEATURES = [
  { icon: <Zap size={20} className="text-[#CCFF00]" />, title: 'Instant Booking', desc: 'Reserve your slot in under 30 seconds with real-time availability.' },
  { icon: <MapPin size={20} className="text-[#CCFF00]" />, title: 'Find Nearby', desc: 'Geo-location powered search to find the closest turfs to you.' },
  { icon: <Clock size={20} className="text-[#CCFF00]" />, title: 'Flexible Slots', desc: '30-min or 1-hour slots from 6 AM to midnight every day.' },
  { icon: <Shield size={20} className="text-[#CCFF00]" />, title: 'Secure Payments', desc: 'Razorpay-powered payments with UPI, cards, netbanking & wallets.' },
]

export default function HomePage() {
  return (
    <>
      <Helmet>
        <title>TurfReserve — Book Sports Turfs Near You</title>
        <meta name="description" content="India's fastest-growing sports turf booking marketplace. Find and book football, cricket, badminton courts near you." />
      </Helmet>

      {/* ── Hero ── */}
      <section className="relative min-h-[92dvh] flex items-center overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px]
                          bg-[#CCFF00] rounded-full opacity-[0.04] blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px]
                          bg-[#CCFF00] rounded-full opacity-[0.03] blur-[80px]" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'linear-gradient(#CCFF00 1px, transparent 1px), linear-gradient(90deg, #CCFF00 1px, transparent 1px)', backgroundSize: '64px 64px' }} />

        <div className="container-xl relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-slide-up">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                            bg-[rgba(204,255,0,0.08)] border border-[rgba(204,255,0,0.2)]
                            text-[#CCFF00] text-xs font-semibold uppercase tracking-widest mb-8">
              <Zap size={12} />
              India's #1 Turf Booking Platform
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-black mb-6 leading-[1.05]">
              Book Your Perfect
              <br />
              <span className="text-gradient">Sports Turf</span>
              <br />
              in Seconds
            </h1>

            <p className="text-lg sm:text-xl text-[#525252] max-w-2xl mx-auto mb-10 leading-relaxed">
              From football arenas to badminton courts — discover thousands of sports facilities
              near you, check real-time availability, and pay instantly with UPI.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/explore" className="btn-primary-lg text-base w-full sm:w-auto">
                Find Turfs Near You
                <ChevronRight size={18} />
              </Link>
              <Link to="/register?role=Owner" className="btn-ghost text-base w-full sm:w-auto">
                List Your Turf
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-8 mt-16 pt-10 border-t border-[#1a1a1a]">
              {[
                { value: '10,000+', label: 'Turfs Listed' },
                { value: '5 Lakh+', label: 'Bookings Made' },
                { value: '50+',     label: 'Cities' },
                { value: '4.8★',    label: 'Avg Rating' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-display font-bold text-[#CCFF00]">{value}</div>
                  <div className="text-xs text-[#525252] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Sport Filter ── */}
      <section className="section border-t border-[#1a1a1a]">
        <div className="container-xl">
          <h2 className="text-3xl font-display font-bold text-center mb-3">Browse by Sport</h2>
          <p className="text-center text-[#525252] mb-10">Thousands of venues across every sport</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {SPORTS.map(({ label, emoji, count }) => (
              <Link
                key={label}
                to={`/explore?sport=${label}`}
                className="card-hover p-6 text-center group cursor-pointer"
              >
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                  {emoji}
                </div>
                <div className="font-semibold text-sm text-[#f5f5f5] mb-1">{label}</div>
                <div className="text-xs text-[#525252]">{count} venues</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="section border-t border-[#1a1a1a] bg-[#0f0f0f]">
        <div className="container-xl">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <h2 className="text-3xl font-display font-bold mb-3">Why TurfReserve?</h2>
            <p className="text-[#525252]">Everything you need to play, in one place.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="card p-6 group hover:border-[#252525] transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-[rgba(204,255,0,0.08)] flex items-center justify-center mb-4
                                group-hover:bg-[rgba(204,255,0,0.12)] transition-colors">
                  {icon}
                </div>
                <h3 className="font-semibold text-[#f5f5f5] mb-2">{title}</h3>
                <p className="text-sm text-[#525252] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="section border-t border-[#1a1a1a]">
        <div className="container-xl">
          <div className="relative rounded-3xl bg-[#0f0f0f] border border-[#1a1a1a] p-10 md:p-16 overflow-hidden text-center">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                              w-[400px] h-[200px] bg-[#CCFF00] opacity-[0.05] blur-[80px]" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} className="fill-[#CCFF00] text-[#CCFF00]" />)}
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-black mb-4">
                Own a sports facility?
              </h2>
              <p className="text-[#525252] max-w-lg mx-auto mb-8">
                List your turf on TurfReserve and start earning. We handle the bookings,
                payments, and player communication — you focus on running your facility.
              </p>
              <Link to="/register?role=Owner" className="btn-primary-lg inline-flex">
                Start Listing For Free
                <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
