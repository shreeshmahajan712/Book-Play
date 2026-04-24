import { Helmet } from 'react-helmet-async'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[@$!%*?&#^()\-_=+]/, 'Must contain a special character'),
  role: z.enum(['Player', 'Owner']),
})
type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const { register: registerUser, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const defaultRole = searchParams.get('role') === 'Owner' ? 'Owner' : 'Player'
  const [showPwd, setShowPwd] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: defaultRole },
  })

  const selectedRole = watch('role')

  const onSubmit = async (data: RegisterForm) => {
    clearError()
    try {
      await registerUser(data)
      navigate('/')
    } catch { /* error shown via store */ }
  }

  return (
    <>
      <Helmet>
        <title>Create Account — TurfReserve</title>
        <meta name="description" content="Create your TurfReserve account to start booking sports turfs or list your facility." />
      </Helmet>

      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-slide-up">

          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-[#CCFF00] flex items-center justify-center">
              <Zap size={18} strokeWidth={2.5} className="text-[#0a0a0a]" />
            </div>
            <span className="font-display font-bold text-xl">
              Turf<span className="text-[#CCFF00]">Reserve</span>
            </span>
          </div>

          <div className="card-glass p-8">
            <h1 className="text-2xl font-display font-bold text-center mb-1">Create an account</h1>
            <p className="text-sm text-[#525252] text-center mb-8">Join thousands of players and turf owners</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 text-sm text-red-400 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              {/* Role selector */}
              <div>
                <label className="label">I am a</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Player', 'Owner'] as const).map((r) => (
                    <label
                      key={r}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer
                                  transition-all duration-200 text-sm font-medium
                                  ${selectedRole === r
                                    ? 'border-[#CCFF00] bg-[rgba(204,255,0,0.08)] text-[#CCFF00]'
                                    : 'border-[#252525] text-[#525252] hover:border-[#3d3d3d]'}`}
                    >
                      <input type="radio" value={r} {...register('role')} className="sr-only" />
                      {r === 'Player' ? '🏃' : '🏟️'} {r}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="reg-name" className="label">Full Name</label>
                <input id="reg-name" type="text" autoComplete="name"
                  className={`input ${errors.name ? 'input-error' : ''}`}
                  placeholder="Rahul Sharma" {...register('name')} />
                {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="reg-email" className="label">Email</label>
                <input id="reg-email" type="email" autoComplete="email"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="rahul@example.com" {...register('email')} />
                {errors.email && <p className="mt-1.5 text-xs text-red-400">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="reg-password" className="label">Password</label>
                <div className="relative">
                  <input id="reg-password" type={showPwd ? 'text' : 'password'} autoComplete="new-password"
                    className={`input pr-11 ${errors.password ? 'input-error' : ''}`}
                    placeholder="Min 8 chars, uppercase, number, symbol" {...register('password')} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] hover:text-[#a3a3a3] transition-colors"
                    aria-label={showPwd ? 'Hide password' : 'Show password'}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-red-400">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={isLoading}
                className="btn-primary w-full justify-center mt-2" id="register-submit">
                {isLoading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-sm text-[#525252] mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-[#CCFF00] hover:text-[#d9ff4d] font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
