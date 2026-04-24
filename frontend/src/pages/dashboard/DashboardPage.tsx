import { Helmet } from 'react-helmet-async'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { bookingApi, turfApi } from '@/lib/api'
import { TrendingUp, Calendar, DollarSign, LayoutGrid, Plus, ChevronRight } from 'lucide-react'

interface Revenue {
  summary: { totalRevenue: number; totalCommission: number; totalOwnerPayout: number; totalBookings: number }
  monthly: { _id: { year: number; month: number }; revenue: number; bookings: number }[]
}
interface Turf { _id: string; name: string; slug: string; sport: string; isActive: boolean; pricePerHour: number }

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-[rgba(204,255,0,0.08)] flex items-center justify-center">{icon}</div>
      </div>
      <p className="text-xs text-[#525252] uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-display font-bold text-[#f5f5f5]">{value}</p>
      {sub && <p className="text-xs text-[#525252] mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [revenue, setRevenue] = useState<Revenue | null>(null)
  const [turfs, setTurfs] = useState<Turf[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([bookingApi.revenue(), turfApi.myTurfs()])
      .then(([revRes, turfRes]) => {
        setRevenue(revRes.data.data)
        setTurfs(turfRes.data.data.turfs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const maxRevenue = Math.max(...(revenue?.monthly.map(m => m.revenue) || [1]), 1)

  return (
    <>
      <Helmet>
        <title>Owner Dashboard — TurfReserve</title>
        <meta name="description" content="Manage your turfs and track revenue on TurfReserve." />
      </Helmet>

      <div className="container-xl py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Dashboard</h1>
            <p className="text-[#525252] text-sm mt-1">Your turf performance overview</p>
          </div>
          <Link to="/dashboard/new-turf" className="btn-primary gap-2">
            <Plus size={16} /> List New Turf
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
          </div>
        ) : (
          <>
            {/* ── Stats ── */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard icon={<DollarSign size={18} className="text-[#CCFF00]" />}
                label="Total Revenue" value={`₹${(revenue?.summary.totalRevenue || 0).toLocaleString('en-IN')}`}
                sub="Gross player payments" />
              <StatCard icon={<TrendingUp size={18} className="text-[#CCFF00]" />}
                label="Your Earnings" value={`₹${(revenue?.summary.totalOwnerPayout || 0).toLocaleString('en-IN')}`}
                sub="After 10% platform commission" />
              <StatCard icon={<Calendar size={18} className="text-[#CCFF00]" />}
                label="Total Bookings" value={String(revenue?.summary.totalBookings || 0)}
                sub="Paid + Completed" />
              <StatCard icon={<LayoutGrid size={18} className="text-[#CCFF00]" />}
                label="Active Turfs" value={String(turfs.filter(t => t.isActive).length)}
                sub={`of ${turfs.length} listed`} />
            </div>

            {/* ── Revenue Chart (CSS bar chart) ── */}
            {revenue && revenue.monthly.length > 0 && (
              <div className="card p-6 mb-8">
                <h2 className="font-display font-semibold mb-6">Monthly Revenue</h2>
                <div className="flex items-end gap-2 h-36" role="img" aria-label="Monthly revenue bar chart">
                  {[...revenue.monthly].reverse().map(m => (
                    <div key={`${m._id.year}-${m._id.month}`}
                      className="flex-1 flex flex-col items-center gap-1.5 group min-w-0">
                      <span className="text-[10px] text-[#CCFF00] opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                        ₹{(m.revenue / 1000).toFixed(1)}k
                      </span>
                      <div className="w-full rounded-t-lg bg-[rgba(204,255,0,0.15)] hover:bg-[rgba(204,255,0,0.25)]
                                      transition-all duration-300 border-b-2 border-[#CCFF00]"
                        style={{ height: `${Math.max((m.revenue / maxRevenue) * 100, 4)}%` }} />
                      <span className="text-[10px] text-[#525252] truncate w-full text-center">
                        {MONTHS[m._id.month]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── My Turfs ── */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-semibold">My Turfs</h2>
                <Link to="/dashboard/new-turf" className="text-xs text-[#CCFF00] hover:text-[#d9ff4d] transition-colors flex items-center gap-1">
                  Add New <ChevronRight size={12} />
                </Link>
              </div>
              {turfs.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-[#525252] text-sm mb-4">No turfs listed yet</p>
                  <Link to="/dashboard/new-turf" className="btn-primary text-sm">List Your First Turf</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {turfs.map(t => (
                    <div key={t._id} className="flex items-center justify-between p-4 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] transition-colors">
                      <div>
                        <p className="font-medium text-sm text-[#f5f5f5]">{t.name}</p>
                        <p className="text-xs text-[#525252]">{t.sport} · ₹{t.pricePerHour}/hr</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={t.isActive ? 'badge-green' : 'badge-red'}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <Link to={`/turf/${t.slug}`} className="text-xs text-[#525252] hover:text-[#f5f5f5] transition-colors">
                          View →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
