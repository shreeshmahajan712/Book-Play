import { Helmet } from 'react-helmet-async'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { turfApi } from '@/lib/api'
import { MapPin, Clock, Star, ChevronLeft, Zap, Shield } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface TurfDetail {
  _id: string; name: string; slug: string; description: string
  city: string; address: string; sport: string; images: string[]
  pricePerHour: number; weekendPricePerHour: number | null
  openingTime: string; closingTime: string; slotDurationMinutes: number
  amenities: string[]; averageRating: number; reviewCount: number
  ownerId: { name: string }
}

export default function TurfDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [turf, setTurf] = useState<TurfDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    turfApi.bySlug(slug)
      .then(r => setTurf(r.data.data.turf))
      .catch(() => navigate('/explore', { replace: true }))
      .finally(() => setLoading(false))
  }, [slug, navigate])

  if (loading) return (
    <div className="container-xl py-10 animate-fade-in space-y-6">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-72 w-full rounded-2xl" />
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4"><div className="skeleton h-6 w-64" /><div className="skeleton h-32 w-full" /></div>
        <div className="skeleton h-56 rounded-2xl" />
      </div>
    </div>
  )

  if (!turf) return null

  const day = new Date().getDay()
  const isWeekend = day === 0 || day === 6
  const displayPrice = isWeekend && turf.weekendPricePerHour ? turf.weekendPricePerHour : turf.pricePerHour

  return (
    <>
      <Helmet>
        <title>{turf.name} — TurfReserve</title>
        <meta name="description" content={`Book ${turf.name} in ${turf.city}. ${turf.sport} — ₹${turf.pricePerHour}/hr.`} />
      </Helmet>
      <div className="container-xl py-8 animate-fade-in">
        <Link to="/explore" className="inline-flex items-center gap-2 text-sm text-[#525252] hover:text-[#f5f5f5] mb-6 transition-colors group">
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Explore
        </Link>

        {/* Gallery */}
        <div className="mb-8">
          <div className="relative h-64 md:h-96 rounded-2xl overflow-hidden bg-[#1a1a1a]">
            {turf.images[activeImg]
              ? <img src={turf.images[activeImg]} alt={turf.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-8xl">{turf.sport === 'Football' ? '⚽' : '🏟️'}</div>
            }
            <div className="absolute top-4 left-4"><span className="badge-lime">{turf.sport}</span></div>
          </div>
          {turf.images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {turf.images.map((img, i) => (
                <button key={i} onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === activeImg ? 'border-[#CCFF00]' : 'border-[#1a1a1a] opacity-60'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-display font-bold mb-2">{turf.name}</h1>
              <div className="flex flex-wrap gap-4 text-sm text-[#525252]">
                <span className="flex items-center gap-1"><MapPin size={14} />{turf.address}</span>
                <span className="flex items-center gap-1"><Clock size={14} />{turf.openingTime}–{turf.closingTime}</span>
                <span className="flex items-center gap-1"><Star size={14} className="fill-[#CCFF00] text-[#CCFF00]" />{turf.averageRating.toFixed(1)} ({turf.reviewCount})</span>
              </div>
            </div>
            {turf.description && (
              <div className="card p-5">
                <h2 className="text-xs text-[#525252] uppercase tracking-wide font-semibold mb-2">About</h2>
                <p className="text-sm text-[#a3a3a3] leading-relaxed">{turf.description}</p>
              </div>
            )}
            {turf.amenities.length > 0 && (
              <div className="card p-5">
                <h2 className="text-xs text-[#525252] uppercase tracking-wide font-semibold mb-3">Amenities</h2>
                <div className="flex flex-wrap gap-2">
                  {turf.amenities.map(a => (
                    <span key={a} className="text-xs px-3 py-1 rounded-full bg-[#1a1a1a] border border-[#252525] text-[#a3a3a3]">✓ {a}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Panel */}
          <div className="card-glass p-6 sticky top-20 h-fit">
            <p className="text-xs text-[#525252] uppercase tracking-wide mb-1">Price</p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-display font-bold text-[#CCFF00]">₹{displayPrice}</span>
              <span className="text-[#525252] text-sm">/hr</span>
            </div>
            {turf.weekendPricePerHour && (
              <p className="text-xs text-[#525252] mb-4">Weekend: ₹{turf.weekendPricePerHour}/hr</p>
            )}
            <div className="space-y-2 text-sm text-[#a3a3a3] mb-6">
              <div className="flex justify-between"><span>Slot</span><span className="text-[#f5f5f5]">{turf.slotDurationMinutes} min</span></div>
              <div className="flex justify-between"><span>Hours</span><span className="text-[#f5f5f5]">{turf.openingTime}–{turf.closingTime}</span></div>
            </div>
            {user
              ? <Link to={`/book/${turf.slug}`} className="btn-primary w-full justify-center"><Zap size={16} />Book Now</Link>
              : <Link to="/login" className="btn-primary w-full justify-center">Log in to Book</Link>
            }
            <p className="text-center text-xs text-[#3d3d3d] mt-3 flex items-center justify-center gap-1">
              <Shield size={11} /> Secured by Razorpay
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
