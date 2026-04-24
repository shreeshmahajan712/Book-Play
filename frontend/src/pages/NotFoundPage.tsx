import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>404 — Page Not Found · TurfReserve</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4">
        <div className="text-center max-w-md animate-slide-up">
          <div className="text-8xl font-display font-black text-gradient mb-4 leading-none">404</div>
          <h1 className="text-2xl font-display font-bold mb-3">Page not found</h1>
          <p className="text-[#525252] text-sm mb-8 leading-relaxed">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="btn-primary gap-2">
              <Zap size={16} /> Back to Home
            </Link>
            <Link to="/explore" className="btn-ghost">Explore Turfs</Link>
          </div>
        </div>
      </div>
    </>
  )
}
