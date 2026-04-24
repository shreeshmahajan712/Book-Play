import { Helmet } from 'react-helmet-async'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { turfApi } from '@/lib/api'
import { MapPin, Star, Clock, Search, SlidersHorizontal, X } from 'lucide-react'

const SPORTS = ['Football', 'Cricket', 'Basketball', 'Badminton', 'Tennis', 'Multi-Sport']

interface Turf {
  _id: string; name: string; slug: string; city: string; sport: string
  pricePerHour: number; weekendPricePerHour?: number; images: string[]
  averageRating: number; reviewCount: number; amenities: string[]
  openingTime: string; closingTime: string; address: string
}

function TurfCard({ turf }: { turf: Turf }) {
  return (
    <Link to={`/turf/${turf.slug}`} className="card-hover group block" aria-label={`View ${turf.name}`}>
      {/* Image */}
      <div className="relative h-44 bg-[#1a1a1a] overflow-hidden">
        {turf.images[0] ? (
          <img src={turf.images[0]} alt={turf.name} className="w-full h-full object-cover
                 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
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
      </div>

      {/* Info */}
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
        {turf.amenities.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {turf.amenities.slice(0, 3).map(a => (
              <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a1a1a] text-[#525252]">{a}</span>
            ))}
          </div>
        )}
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

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [turfs, setTurfs] = useState<Turf[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const city    = searchParams.get('city')    || ''
  const sport   = searchParams.get('sport')   || ''
  const page    = parseInt(searchParams.get('page') || '1')
  const search  = searchParams.get('q')       || ''

  const fetchTurfs = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page, limit: 12 }
      if (city)  params.city  = city
      if (sport) params.sport = sport
      const res = await turfApi.list(params)
      setTurfs(res.data.data.turfs)
      setTotal(res.data.data.total)
      setPages(res.data.data.pages)
    } catch { setTurfs([]) }
    finally  { setLoading(false) }
  }, [city, sport, page])

  useEffect(() => { fetchTurfs() }, [fetchTurfs])

  const setParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams)
    val ? next.set(key, val) : next.delete(key)
    next.delete('page')
    setSearchParams(next)
  }

  return (
    <>
      <Helmet>
        <title>{sport ? `${sport} Turfs` : 'Explore Turfs'} — TurfReserve</title>
        <meta name="description" content={`Find and book ${sport || 'sports'} turfs${city ? ` in ${city}` : ' near you'} on TurfReserve.`} />
      </Helmet>

      <div className="container-xl py-8 animate-fade-in">
        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">
            {sport ? `${sport} Turfs` : 'Explore All Turfs'}
          </h1>
          <p className="text-[#525252] text-sm">{total} venue{total !== 1 ? 's' : ''} found</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Sidebar Filters ── */}
          <aside className={`lg:w-64 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}
                 aria-label="Turf filters">
            <div className="card p-5 sticky top-20 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">Filters</h2>
                {(city || sport) && (
                  <button onClick={() => { setSearchParams({}); }} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                    <X size={12} /> Clear
                  </button>
                )}
              </div>

              {/* City */}
              <div>
                <label htmlFor="filter-city" className="label">City</label>
                <input id="filter-city" type="text" placeholder="e.g. Mumbai" value={city}
                  onChange={e => setParam('city', e.target.value.toLowerCase())}
                  className="input text-sm" />
              </div>

              {/* Sport */}
              <div>
                <p className="label">Sport</p>
                <div className="space-y-1.5">
                  {SPORTS.map(s => (
                    <button key={s} onClick={() => setParam('sport', sport === s ? '' : s)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150
                        ${sport === s ? 'bg-[rgba(204,255,0,0.1)] text-[#CCFF00] border border-[rgba(204,255,0,0.3)]'
                                     : 'text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-[#f5f5f5]'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* ── Main Grid ── */}
          <div className="flex-1">
            {/* Search + filter toggle */}
            <div className="flex items-center gap-3 mb-6">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#525252]" />
                <input type="search" placeholder="Search turf name…" value={search}
                  onChange={e => setParam('q', e.target.value)}
                  className="input pl-9 text-sm" aria-label="Search turfs" />
              </div>
              <button onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden btn-ghost gap-2 text-sm shrink-0" aria-label="Toggle filters">
                <SlidersHorizontal size={15} /> Filters
              </button>
            </div>

            {/* Grid */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {loading
                ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
                : turfs.length > 0
                  ? turfs.map(t => <TurfCard key={t._id} turf={t} />)
                  : (
                    <div className="col-span-full text-center py-20 text-[#525252]">
                      <div className="text-5xl mb-4">🏟️</div>
                      <p className="text-lg font-medium text-[#a3a3a3]">No turfs found</p>
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                  )
              }
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                {[...Array(pages)].map((_, i) => (
                  <button key={i} onClick={() => setParam('page', String(i + 1))}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all
                      ${page === i + 1
                        ? 'bg-[#CCFF00] text-[#0a0a0a]'
                        : 'bg-[#1a1a1a] text-[#a3a3a3] hover:bg-[#252525]'}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
