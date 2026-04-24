import { Helmet } from 'react-helmet-async'
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { turfApi } from '@/lib/api'
import { MapPin, Star, Clock, Navigation, Loader2, AlertTriangle } from 'lucide-react'

interface NearbyTurf {
  _id: string; name: string; slug: string; city: string; sport: string
  pricePerHour: number; images: string[]
  averageRating: number; reviewCount: number
  openingTime: string; closingTime: string; address: string
  distance?: number
}

type GeoState = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

function TurfCard({ turf }: { turf: NearbyTurf }) {
  return (
    <Link to={`/turf/${turf.slug}`} className="card-hover group block" aria-label={`View ${turf.name}`}>
      <div className="relative h-44 bg-[#1a1a1a] overflow-hidden">
        {turf.images[0] ? (
          <img src={turf.images[0]} alt={turf.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-[#1a1a1a]">
            {turf.sport === 'Football' ? '⚽' : turf.sport === 'Cricket' ? '🏏' : turf.sport === 'Badminton' ? '🏸' : '🏟️'}
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="badge-lime text-[10px]">{turf.sport}</span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="badge bg-[rgba(0,0,0,0.7)] text-[#f5f5f5] backdrop-blur-sm text-[10px] border border-[#252525]">
            ₹{turf.pricePerHour}/hr
          </span>
        </div>
        {turf.distance !== undefined && (
          <div className="absolute bottom-3 right-3">
            <span className="badge bg-[rgba(0,0,0,0.75)] text-[#CCFF00] backdrop-blur-sm text-[10px] border border-[rgba(204,255,0,0.2)]">
              <Navigation size={9} /> {turf.distance < 1 ? `${(turf.distance * 1000).toFixed(0)}m` : `${turf.distance.toFixed(1)}km`}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-[#f5f5f5] mb-1 truncate group-hover:text-[#CCFF00] transition-colors">
          {turf.name}
        </h3>
        <div className="flex items-center gap-1 text-xs text-[#525252] mb-3">
          <MapPin size={11} /> <span className="truncate capitalize">{turf.address.split(',').slice(-2).join(',').trim()}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[#525252]">
            <Star size={11} className="fill-[#CCFF00] text-[#CCFF00]" />
            <span className="font-medium text-[#a3a3a3]">{turf.averageRating.toFixed(1)}</span>
            <span>({turf.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#525252]">
            <Clock size={11} />
            <span>{turf.openingTime}–{turf.closingTime}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-44 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-3 w-full" />
      </div>
    </div>
  )
}

export default function NearbyPage() {
  const [turfs,    setTurfs]    = useState<NearbyTurf[]>([])
  const [loading,  setLoading]  = useState(false)
  const [geoState, setGeoState] = useState<GeoState>('idle')
  const [coords,   setCoords]   = useState<{ lat: number; lng: number } | null>(null)
  const [radius,   setRadius]   = useState(5) // km

  const fetchNearby = useCallback(async (lat: number, lng: number, r: number) => {
    setLoading(true)
    try {
      const res = await turfApi.nearby({ lat, lng, radius: r * 1000 }) // backend expects metres
      const data = res.data.data.turfs as NearbyTurf[]
      // Attach a mock distance from haversine for display (actual distance comes from $near sort)
      setTurfs(data)
    } catch {
      setTurfs([])
    } finally {
      setLoading(false)
    }
  }, [])

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoState('error')
      return
    }
    setGeoState('requesting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setCoords({ lat, lng })
        setGeoState('granted')
        fetchNearby(lat, lng, radius)
      },
      () => setGeoState('denied'),
      { timeout: 10000, maximumAge: 60000 }
    )
  }

  useEffect(() => {
    if (coords) fetchNearby(coords.lat, coords.lng, radius)
  }, [radius, coords, fetchNearby])

  return (
    <>
      <Helmet>
        <title>Turfs Near Me — TurfReserve</title>
        <meta name="description" content="Find sports turfs near your location. Book football, cricket, and badminton courts close to you on TurfReserve." />
      </Helmet>

      <div className="container-xl py-8 animate-fade-in">
        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2 flex items-center gap-3">
            <Navigation size={28} className="text-[#CCFF00]" />
            Turfs Near Me
          </h1>
          <p className="text-[#525252] text-sm">Discover sports facilities within your area</p>
        </div>

        {/* ── Location Gate ── */}
        {geoState === 'idle' && (
          <div className="card p-10 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(204,255,0,0.08)] flex items-center justify-center mx-auto mb-5">
              <Navigation size={28} className="text-[#CCFF00]" />
            </div>
            <h2 className="font-display font-bold text-xl mb-2">Share Your Location</h2>
            <p className="text-[#525252] text-sm mb-6 leading-relaxed">
              Allow TurfReserve to access your location to discover sports turfs near you.
            </p>
            <button
              onClick={requestLocation}
              className="btn-primary mx-auto"
              id="enable-location-btn"
            >
              <Navigation size={16} /> Enable Location
            </button>
          </div>
        )}

        {geoState === 'requesting' && (
          <div className="card p-10 text-center max-w-lg mx-auto">
            <Loader2 size={32} className="animate-spin text-[#CCFF00] mx-auto mb-4" />
            <p className="text-[#525252]">Detecting your location…</p>
          </div>
        )}

        {(geoState === 'denied' || geoState === 'error') && (
          <div className="card p-10 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <h2 className="font-display font-bold text-lg mb-2">Location Access Denied</h2>
            <p className="text-[#525252] text-sm mb-6">
              {geoState === 'error'
                ? 'Geolocation is not supported by your browser.'
                : 'Please allow location access in your browser settings, then try again.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={requestLocation} className="btn-primary">Try Again</button>
              <Link to="/explore" className="btn-ghost">Browse All Turfs</Link>
            </div>
          </div>
        )}

        {geoState === 'granted' && (
          <>
            {/* ── Radius Filter ── */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm text-[#525252] shrink-0">Search radius:</span>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {[2, 5, 10, 20].map(r => (
                  <button
                    key={r}
                    onClick={() => setRadius(r)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all
                      ${radius === r
                        ? 'bg-[#CCFF00] text-[#0a0a0a]'
                        : 'bg-[#1a1a1a] text-[#a3a3a3] hover:text-[#f5f5f5]'}`}
                    aria-pressed={radius === r}
                  >
                    {r} km
                  </button>
                ))}
              </div>
              {loading && <Loader2 size={16} className="animate-spin text-[#525252] shrink-0" />}
            </div>

            {/* ── Count ── */}
            {!loading && (
              <p className="text-sm text-[#525252] mb-6">
                {turfs.length > 0
                  ? `${turfs.length} turf${turfs.length !== 1 ? 's' : ''} found within ${radius} km`
                  : 'No turfs found in this area'}
              </p>
            )}

            {/* ── Grid ── */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {loading
                ? [...Array(8)].map((_, i) => <SkeletonCard key={i} />)
                : turfs.length > 0
                  ? turfs.map(t => <TurfCard key={t._id} turf={t} />)
                  : (
                    <div className="col-span-full text-center py-20 text-[#525252]">
                      <div className="text-5xl mb-4">🏟️</div>
                      <p className="text-lg font-medium text-[#a3a3a3]">No turfs nearby</p>
                      <p className="text-sm mt-1 mb-6">Try increasing the search radius</p>
                      <Link to="/explore" className="btn-ghost inline-flex">Browse All Turfs</Link>
                    </div>
                  )
              }
            </div>
          </>
        )}
      </div>
    </>
  )
}
