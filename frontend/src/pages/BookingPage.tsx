import { Helmet } from 'react-helmet-async'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { turfApi, bookingApi } from '@/lib/api'
import { useBookingStore, type Slot } from '@/store/bookingStore'
import SlotPicker from '@/components/booking/SlotPicker'
import { ChevronLeft, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'

interface TurfBasic {
  _id: string; name: string; slug: string; sport: string
  pricePerHour: number; weekendPricePerHour: number | null
  slotDurationMinutes: number; city: string
}

type BookingStep = 'select' | 'confirm' | 'success'

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { draft, setDraft, selectedDate, clearDraft, clearOptimistic } = useBookingStore()

  const [turf, setTurf] = useState<TurfBasic | null>(null)
  const [step, setStep] = useState<BookingStep>('select')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookingId, setBookingId] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    turfApi.bySlug(slug).then(r => {
      const t = r.data.data.turf
      setTurf(t)
      setDraft({ turfId: t._id, turfName: t.name, turfSlug: t.slug, date: selectedDate, slot: null })
    }).catch(() => navigate('/explore', { replace: true }))
  }, [slug, navigate, selectedDate, setDraft])

  const handleSlotSelect = (_slot: Slot) => {
    setStep('confirm')
    setError(null)
  }

  const handleConfirm = async () => {
    if (!draft?.slot || !turf) return
    setLoading(true)
    setError(null)
    try {
      const res = await bookingApi.create({
        turfId: turf._id,
        date: selectedDate,
        startTime: draft.slot.startTime,
      })
      const { booking, razorpay } = res.data.data

      // ── Razorpay checkout ──────────────────────────────────────────────────
      const options = {
        key: razorpay.keyId,
        amount: razorpay.amount,
        currency: razorpay.currency,
        name: 'TurfReserve',
        description: `${turf.name} · ${draft.slot.startTime}–${draft.slot.endTime} on ${selectedDate}`,
        order_id: razorpay.orderId,
        theme: { color: '#CCFF00' },
        handler: () => {
          // Payment captured — webhook will mark it Paid in the background
          setBookingId(booking._id)
          setStep('success')
          clearOptimistic()
        },
        modal: {
          ondismiss: () => {
            setError('Payment was cancelled. Your slot is held for 10 minutes.')
            setLoading(false)
          },
        },
      }

      // @ts-ignore — Razorpay loaded via CDN
      if (typeof window.Razorpay !== 'undefined') {
        // @ts-ignore
        const rzp = new window.Razorpay(options)
        rzp.open()
      } else {
        // Fallback: mark as booked (dev/demo mode without Razorpay loaded)
        setBookingId(booking._id)
        setStep('success')
        clearOptimistic()
      }
    } catch (err: any) {
      setError(err.message || 'Booking failed. Please try again.')
      clearOptimistic()
    } finally {
      setLoading(false)
    }
  }

  const day = selectedDate ? new Date(selectedDate).getDay() : new Date().getDay()
  const isWeekend = day === 0 || day === 6
  const price = turf ? (isWeekend && turf.weekendPricePerHour ? turf.weekendPricePerHour : turf.pricePerHour) : 0
  const slotPrice = turf ? (price * (turf.slotDurationMinutes / 60)) : 0
  const commission = parseFloat((slotPrice * 0.10).toFixed(2))

  if (!turf) return (
    <div className="container-xl py-10">
      <div className="skeleton h-8 w-48 mb-6" />
      <div className="skeleton h-96 rounded-2xl" />
    </div>
  )

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (step === 'success') return (
    <>
      <Helmet><title>Booking Confirmed — TurfReserve</title></Helmet>
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4">
        <div className="text-center max-w-md animate-slide-up">
          <div className="w-20 h-20 rounded-full bg-[rgba(204,255,0,0.12)] border-2 border-[#CCFF00]
                          flex items-center justify-center mx-auto mb-6 lime-glow">
            <CheckCircle2 size={36} className="text-[#CCFF00]" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-3">Booking Confirmed!</h1>
          <p className="text-[#525252] mb-2">
            Your slot at <span className="text-[#f5f5f5] font-medium">{turf.name}</span> on{' '}
            <span className="text-[#CCFF00]">{format(new Date(selectedDate + 'T00:00:00'), 'MMMM d, yyyy')}</span>{' '}
            at <span className="text-[#CCFF00]">{draft?.slot?.startTime}</span> is confirmed.
          </p>
          <p className="text-xs text-[#3d3d3d] mb-8">
            Booking ID: {bookingId}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/bookings" className="btn-primary" onClick={clearDraft}>
              View My Bookings
            </Link>
            <Link to="/explore" className="btn-ghost" onClick={clearDraft}>
              Explore More Turfs
            </Link>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <Helmet>
        <title>Book {turf.name} — TurfReserve</title>
        <meta name="description" content={`Book a slot at ${turf.name}. Check availability and pay securely.`} />
      </Helmet>

      <div className="container-xl py-8 animate-fade-in">
        <Link to={`/turf/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-[#525252] hover:text-[#f5f5f5] mb-6 transition-colors group">
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to {turf.name}
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* ── Left: Slot Picker ── */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <h1 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
                <Zap size={20} className="text-[#CCFF00]" />
                Select Your Slot
              </h1>
              <SlotPicker
                turfSlug={turf.slug}
                turfId={turf._id}
                onSlotSelect={handleSlotSelect}
              />
            </div>
          </div>

          {/* ── Right: Summary ── */}
          <div>
            <div className="card-glass p-6 sticky top-20">
              <h2 className="font-display font-bold mb-4">Booking Summary</h2>

              <div className="space-y-3 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-[#525252]">Turf</span>
                  <span className="text-[#f5f5f5] font-medium truncate max-w-[140px]">{turf.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525252]">Date</span>
                  <span className="text-[#f5f5f5]">
                    {format(new Date(selectedDate + 'T00:00:00'), 'dd MMM yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#525252]">Slot</span>
                  <span className="text-[#f5f5f5]">
                    {draft?.slot ? `${draft.slot.startTime} – ${draft.slot.endTime}` : '—'}
                  </span>
                </div>
                <div className="divider" />
                <div className="flex justify-between">
                  <span className="text-[#525252]">Base price</span>
                  <span className="text-[#f5f5f5]">₹{slotPrice.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#525252]">Platform fee (10%)</span>
                  <span className="text-[#525252]">₹{commission}</span>
                </div>
                <div className="divider" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-[#CCFF00] text-lg">₹{slotPrice.toFixed(0)}</span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20
                                rounded-xl px-4 py-3 mb-4 text-sm text-red-400">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={!draft?.slot || loading}
                className="btn-primary w-full justify-center"
                id="confirm-booking-btn"
              >
                {loading ? (
                  <><span className="animate-spin">⏳</span> Processing…</>
                ) : (
                  <><Zap size={16} /> {draft?.slot ? `Pay ₹${slotPrice.toFixed(0)}` : 'Select a slot first'}</>
                )}
              </button>

              <p className="text-center text-xs text-[#3d3d3d] mt-3">
                Slot held for 10 minutes after booking
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
