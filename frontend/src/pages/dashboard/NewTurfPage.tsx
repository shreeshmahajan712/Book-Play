import { Helmet } from 'react-helmet-async'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { turfApi } from '@/lib/api'
import { useState } from 'react'
import { ChevronLeft, Plus } from 'lucide-react'

const SPORTS = ['Football', 'Cricket', 'Basketball', 'Badminton', 'Tennis', 'Multi-Sport'] as const
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

// Validation schema (used directly in onSubmit — avoids hookform/resolvers v5 × Zod v4 type mismatch)
const schema = z.object({
  name:        z.string().min(3, 'Min 3 characters'),
  description: z.string().max(2000).optional(),
  city:        z.string().min(2, 'City required'),
  address:     z.string().min(5, 'Address required'),
  sport:       z.enum(SPORTS),
  pricePerHour:        z.number().min(100, 'Min ₹100').max(50000),
  weekendPricePerHour: z.number().min(100).optional().nullable(),
  openingTime: z.string().regex(TIME_RE, 'HH:MM format'),
  closingTime: z.string().regex(TIME_RE, 'HH:MM format'),
  slotDurationMinutes: z.number().refine(v => v === 30 || v === 60),
  amenities:   z.string().optional(),
  lngLat:      z.string().regex(/^-?\d+\.?\d*,\s*-?\d+\.?\d*$/, 'Format: lng,lat'),
})

// Loosely typed form values — react-hook-form works with string DOM values
interface RawForm {
  name: string; description: string; city: string; address: string
  sport: string; pricePerHour: string; weekendPricePerHour: string
  openingTime: string; closingTime: string; slotDurationMinutes: string
  amenities: string; lngLat: string
}

export default function NewTurfPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [zodErrors, setZodErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit } = useForm<RawForm>({
    defaultValues: { slotDurationMinutes: '60', openingTime: '06:00', closingTime: '23:00' },
  })

  const onSubmit = async (raw: RawForm) => {
    setServerError(null)
    setZodErrors({})

    // Parse + coerce numbers before Zod validation
    const parsed = schema.safeParse({
      ...raw,
      pricePerHour:        raw.pricePerHour        ? Number(raw.pricePerHour)        : undefined,
      weekendPricePerHour: raw.weekendPricePerHour ? Number(raw.weekendPricePerHour) : null,
      slotDurationMinutes: Number(raw.slotDurationMinutes),
    })

    if (!parsed.success) {
      const flat: Record<string, string> = {}
      parsed.error.issues.forEach(i => { flat[String(i.path[0])] = i.message })
      setZodErrors(flat)
      return
    }

    setLoading(true)
    try {
      const data = parsed.data
      const [lng, lat] = data.lngLat.split(',').map(Number)
      const amenities = data.amenities ? data.amenities.split(',').map(s => s.trim()).filter(Boolean) : []
      await turfApi.create({
        ...data,
        coordinates: [lng, lat],
        amenities,
        weekendPricePerHour: data.weekendPricePerHour || null,
        images: [],
      })
      navigate('/dashboard')
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Failed to create turf')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({
    id, label, error, children,
  }: { id: string; label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )

  const e = zodErrors

  return (
    <>
      <Helmet>
        <title>List New Turf — TurfReserve</title>
        <meta name="description" content="List your sports turf on TurfReserve and start earning." />
      </Helmet>

      <div className="container-md py-10 animate-fade-in">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-[#525252] hover:text-[#f5f5f5] mb-6 transition-colors group">
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-display font-bold mb-2">List a New Turf</h1>
        <p className="text-[#525252] text-sm mb-8">Fill in your facility details to start accepting bookings</p>

        {serverError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 text-sm text-red-400">{serverError}</div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="card p-8 space-y-6" noValidate>
          {/* Basic Info */}
          <div className="grid sm:grid-cols-2 gap-6">
            <Field id="turf-name" label="Turf Name *" error={e.name}>
              <input id="turf-name" className={`input ${e.name ? 'input-error' : ''}`}
                placeholder="Green FC Arena" {...register('name')} />
            </Field>
            <Field id="turf-sport" label="Sport *" error={e.sport}>
              <select id="turf-sport" className={`input ${e.sport ? 'input-error' : ''}`} {...register('sport')}>
                {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <Field id="turf-desc" label="Description" error={e.description}>
            <textarea id="turf-desc" className="input min-h-[80px] resize-y"
              placeholder="Describe your facility…" {...register('description')} />
          </Field>

          <div className="grid sm:grid-cols-2 gap-6">
            <Field id="turf-city" label="City *" error={e.city}>
              <input id="turf-city" className={`input ${e.city ? 'input-error' : ''}`}
                placeholder="mumbai" {...register('city')} />
            </Field>
            <Field id="turf-address" label="Address *" error={e.address}>
              <input id="turf-address" className={`input ${e.address ? 'input-error' : ''}`}
                placeholder="123 Marine Drive, Mumbai" {...register('address')} />
            </Field>
          </div>

          <Field id="turf-lnglat" label="Coordinates (lng, lat) *" error={e.lngLat}>
            <input id="turf-lnglat" className={`input ${e.lngLat ? 'input-error' : ''}`}
              placeholder="72.8777, 19.0760" {...register('lngLat')} />
            <p className="text-xs text-[#525252] mt-1">Get from Google Maps → right-click → "What's here?"</p>
          </Field>

          {/* Pricing */}
          <div className="grid sm:grid-cols-3 gap-6">
            <Field id="turf-price" label="Price/hr (₹) *" error={e.pricePerHour}>
              <input id="turf-price" type="number" className={`input ${e.pricePerHour ? 'input-error' : ''}`}
                placeholder="800" {...register('pricePerHour')} />
            </Field>
            <Field id="turf-wprice" label="Weekend Price/hr (₹)" error={e.weekendPricePerHour}>
              <input id="turf-wprice" type="number" className="input" placeholder="1200"
                {...register('weekendPricePerHour')} />
            </Field>
            <Field id="turf-slot" label="Slot Duration" error={e.slotDurationMinutes}>
              <select id="turf-slot" className="input" {...register('slotDurationMinutes')}>
                <option value={60}>60 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </Field>
          </div>

          {/* Hours */}
          <div className="grid sm:grid-cols-2 gap-6">
            <Field id="turf-open" label="Opening Time *" error={e.openingTime}>
              <input id="turf-open" type="time" className={`input ${e.openingTime ? 'input-error' : ''}`}
                {...register('openingTime')} />
            </Field>
            <Field id="turf-close" label="Closing Time *" error={e.closingTime}>
              <input id="turf-close" type="time" className={`input ${e.closingTime ? 'input-error' : ''}`}
                {...register('closingTime')} />
            </Field>
          </div>

          <Field id="turf-amenities" label="Amenities (comma-separated)" error={e.amenities}>
            <input id="turf-amenities" className="input"
              placeholder="Floodlights, Parking, Showers, Changing Rooms" {...register('amenities')} />
          </Field>

          <div className="flex gap-4 pt-2">
            <button type="submit" disabled={loading} className="btn-primary gap-2" id="submit-new-turf">
              {loading ? 'Creating…' : <><Plus size={16} /> List Turf</>}
            </button>
            <Link to="/dashboard" className="btn-ghost">Cancel</Link>
          </div>
        </form>
      </div>
    </>
  )
}
