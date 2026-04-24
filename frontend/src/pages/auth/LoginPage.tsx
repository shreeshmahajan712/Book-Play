import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    clearError()
    try {
      await login(data.email, data.password)
      navigate('/')
    } catch { /* error shown via store */ }
  }

  return (
    <>
      <Helmet>
        <title>Log In — TurfReserve</title>
        <meta name="description" content="Log in to your TurfReserve account to book sports turfs." />
      </Helmet>

      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-slide-up">

          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#CCFF00] flex items-center justify-center">
              <Zap size={18} strokeWidth={2.5} className="text-[#0a0a0a]" />
            </div>
            <span className="font-display font-bold text-xl">
              Turf<span className="text-[#CCFF00]">Reserve</span>
            </span>
          </div>

          <div className="card-glass p-8">
            <h1 className="text-2xl font-display font-bold text-center mb-1">Welcome back</h1>
            <p className="text-sm text-[#525252] text-center mb-8">Log in to your account</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6
                              text-sm text-red-400 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <div>
                <label htmlFor="login-email" className="label">Email</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="rahul@example.com"
                  {...register('email')}
                />
                {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="login-password" className="label">Password</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`input pr-11 ${errors.password ? 'input-error' : ''}`}
                    placeholder="••••••••"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252]
                               hover:text-[#a3a3a3] transition-colors"
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full justify-center mt-2"
                id="login-submit"
              >
                {isLoading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-sm text-[#525252] mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#CCFF00] hover:text-[#d9ff4d] font-medium transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
