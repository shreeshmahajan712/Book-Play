import { Helmet } from 'react-helmet-async'
import { useEffect, useState } from 'react'
import { bookingApi } from '@/lib/api'
import { format } from 'date-fns'
import { Calendar, Clock, MapPin, X } from 'lucide-react'
import { Link } from 'react-router-dom'

type BookingStatus = 'Pending' | 'Paid' | 'Completed' | 'Cancelled'
interface Booking {
  _id: string; date: string; startTime: string; endTime: string
  status: BookingStatus; totalPrice: number
  turfId: { name: string; slug: string; city: string; images: string[] }
}

const STATUS_BADGE: Record<BookingStatus, string> = {
  Pending: 'badge-amber', Paid: 'badge-lime',
  Completed: 'badge-green', Cancelled: 'badge-red',
}
const FILTERS = ['All', 'Pending', 'Paid', 'Completed', 'Cancelled'] as const

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const params = filter !== 'All' ? { status: filter } : {}
    bookingApi.myBookings(params)
      .then(r => setBookings(r.data.data.bookings))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [filter])

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this booking?')) return
    setCancellingId(id)
    try {
      await bookingApi.cancel(id, { reason: 'Cancelled by player' })
      setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'Cancelled' as BookingStatus } : b))
    } catch { alert('Could not cancel') }
    finally { setCancellingId(null) }
  }

  return (
    <>
      <Helmet>
        <title>My Bookings — TurfReserve</title>
        <meta name="description" content="View and manage your TurfReserve slot bookings." />
      </Helmet>
      <div className="container-md py-10 animate-fade-in">
        <h1 className="text-3xl font-display font-bold mb-2">My Bookings</h1>
        <p className="text-[#525252] text-sm mb-8">Your upcoming and past turf slots</p>

        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6" role="tablist">
          {FILTERS.map(f => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all
                ${filter === f ? 'bg-[#CCFF00] text-[#0a0a0a]' : 'bg-[#1a1a1a] text-[#a3a3a3] hover:text-[#f5f5f5]'}`}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-5 flex gap-4">
                <div className="skeleton h-20 w-24 rounded-xl" />
                <div className="flex-1 space-y-3"><div className="skeleton h-4 w-1/2" /><div className="skeleton h-3 w-1/3" /></div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-lg font-medium text-[#a3a3a3] mb-4">No bookings found</p>
            <Link to="/explore" className="btn-primary">Find a Turf</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(b => (
              <div key={b._id} className="card p-5 flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-24 h-24 rounded-xl overflow-hidden bg-[#1a1a1a] shrink-0">
                  {b.turfId?.images?.[0]
                    ? <img src={b.turfId.images[0]} alt={b.turfId.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">🏟️</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Link to={`/turf/${b.turfId?.slug}`} className="font-semibold text-[#f5f5f5] hover:text-[#CCFF00] transition-colors truncate">
                      {b.turfId?.name}
                    </Link>
                    <span className={STATUS_BADGE[b.status]}>{b.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-[#525252]">
                    <span className="flex items-center gap-1"><Calendar size={11} />{format(new Date(b.date), 'dd MMM yyyy')}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{b.startTime} – {b.endTime}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} /><span className="capitalize">{b.turfId?.city}</span></span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-sm font-semibold text-[#CCFF00]">₹{b.totalPrice}</span>
                    {['Pending', 'Paid'].includes(b.status) && (
                      <button onClick={() => handleCancel(b._id)} disabled={cancellingId === b._id}
                        className="btn-danger text-xs px-3 py-1.5 flex items-center gap-1"
                        aria-label={`Cancel ${b.turfId?.name} booking`}>
                        {cancellingId === b._id ? '…' : <><X size={12} />Cancel</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
