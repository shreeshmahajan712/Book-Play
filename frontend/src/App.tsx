import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'

import RootLayout from '@/components/layout/RootLayout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'

// Pages (lazy imports for code splitting)
import HomePage        from '@/pages/HomePage'
import ExplorePage     from '@/pages/ExplorePage'
import TurfDetailPage  from '@/pages/TurfDetailPage'
import BookingPage     from '@/pages/BookingPage'
import LoginPage       from '@/pages/auth/LoginPage'
import RegisterPage    from '@/pages/auth/RegisterPage'
import MyBookingsPage  from '@/pages/MyBookingsPage'
import ProfilePage     from '@/pages/ProfilePage'
import NearbyPage      from '@/pages/NearbyPage'
import DashboardPage   from '@/pages/dashboard/DashboardPage'
import NewTurfPage     from '@/pages/dashboard/NewTurfPage'
import NotFoundPage    from '@/pages/NotFoundPage'

export default function App() {
  const fetchMe = useAuthStore((s) => s.fetchMe)

  // Hydrate user from HTTP-only cookie on app load
  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  return (
    <Routes>
      <Route element={<RootLayout />}>
        {/* ── Public ── */}
        <Route index element={<HomePage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="nearby" element={<NearbyPage />} />
        <Route path="turf/:slug" element={<TurfDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* ── Protected: Any logged-in user ── */}
        <Route element={<ProtectedRoute />}>
          <Route path="book/:slug" element={<BookingPage />} />
          <Route path="bookings" element={<MyBookingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* ── Protected: Owner / Admin only ── */}
        <Route element={<ProtectedRoute allowedRoles={['Owner', 'Admin']} />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="dashboard/new-turf" element={<NewTurfPage />} />
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
