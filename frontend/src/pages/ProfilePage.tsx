import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/lib/api'
import { User, Lock, CheckCircle2, AlertTriangle } from 'lucide-react'

// ─── Schemas ──────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  name:  z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\+?[0-9\s\-()]{7,15}$/, 'Invalid phone number').optional().or(z.literal('')),
})
type ProfileForm = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword:     z.string().min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Need at least one uppercase letter')
    .regex(/[0-9]/, 'Need at least one number'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type PasswordForm = z.infer<typeof passwordSchema>

// ─── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ─── Alert banner ──────────────────────────────────────────────────────────────
function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const isSuccess = type === 'success'
  return (
    <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm
      ${isSuccess
        ? 'bg-[rgba(204,255,0,0.08)] border border-[rgba(204,255,0,0.2)] text-[#CCFF00]'
        : 'bg-red-500/10 border border-red-500/20 text-red-400'
      }`}>
      {isSuccess
        ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
        : <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      }
      {message}
    </div>
  )
}

export default function ProfilePage() {
  const { user, fetchMe } = useAuthStore()
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [pwStatus,      setPwStatus]      = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [pwLoading,      setPwLoading]      = useState(false)

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onProfileSubmit = async (data: ProfileForm) => {
    setProfileLoading(true)
    setProfileStatus(null)
    try {
      await authApi.updateProfile(data)
      await fetchMe()
      setProfileStatus({ type: 'success', msg: 'Profile updated successfully.' })
    } catch (err: any) {
      setProfileStatus({ type: 'error', msg: err.message || 'Update failed.' })
    } finally {
      setProfileLoading(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordForm) => {
    setPwLoading(true)
    setPwStatus(null)
    try {
      await authApi.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword })
      setPwStatus({ type: 'success', msg: 'Password changed successfully.' })
      passwordForm.reset()
    } catch (err: any) {
      setPwStatus({ type: 'error', msg: err.message || 'Could not change password.' })
    } finally {
      setPwLoading(false)
    }
  }

  if (!user) return null

  return (
    <>
      <Helmet>
        <title>My Profile — TurfReserve</title>
        <meta name="description" content="Manage your TurfReserve account and security settings." />
      </Helmet>

      <div className="container-md py-10 animate-fade-in">
        <h1 className="text-3xl font-display font-bold mb-2">My Profile</h1>
        <p className="text-[#525252] text-sm mb-8">Manage your account details and password</p>

        {/* ── Avatar & role banner ── */}
        <div className="card p-6 flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#CCFF00] flex items-center justify-center shrink-0 lime-glow">
            <span className="text-2xl font-black text-[#0a0a0a]">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-display font-bold text-xl text-[#f5f5f5]">{user.name}</p>
            <p className="text-sm text-[#525252]">{user.email}</p>
            <span className={`mt-1 inline-block ${user.role === 'Owner' ? 'badge-lime' : 'badge-neutral'}`}>
              {user.role}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── Edit Profile ── */}
          <div className="card p-6">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[rgba(204,255,0,0.08)] flex items-center justify-center">
                <User size={16} className="text-[#CCFF00]" />
              </div>
              <h2 className="font-display font-semibold">Personal Info</h2>
            </div>

            {profileStatus && (
              <div className="mb-5">
                <Alert type={profileStatus.type} message={profileStatus.msg} />
              </div>
            )}

            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-5" noValidate>
              <Field id="profile-name" label="Full Name *" error={profileForm.formState.errors.name?.message}>
                <input
                  id="profile-name"
                  className={`input ${profileForm.formState.errors.name ? 'input-error' : ''}`}
                  placeholder="Your name"
                  {...profileForm.register('name')}
                />
              </Field>

              <Field id="profile-email" label="Email Address">
                <input
                  id="profile-email"
                  type="email"
                  className="input opacity-60 cursor-not-allowed"
                  value={user.email}
                  disabled
                  aria-readonly
                />
                <p className="mt-1.5 text-xs text-[#525252]">Email cannot be changed</p>
              </Field>

              <Field id="profile-phone" label="Phone Number" error={profileForm.formState.errors.phone?.message}>
                <input
                  id="profile-phone"
                  type="tel"
                  className={`input ${profileForm.formState.errors.phone ? 'input-error' : ''}`}
                  placeholder="+91 98765 43210"
                  {...profileForm.register('phone')}
                />
              </Field>

              <button
                type="submit"
                disabled={profileLoading}
                className="btn-primary w-full justify-center"
                id="save-profile-btn"
              >
                {profileLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* ── Change Password ── */}
          <div className="card p-6">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-[rgba(204,255,0,0.08)] flex items-center justify-center">
                <Lock size={16} className="text-[#CCFF00]" />
              </div>
              <h2 className="font-display font-semibold">Change Password</h2>
            </div>

            {pwStatus && (
              <div className="mb-5">
                <Alert type={pwStatus.type} message={pwStatus.msg} />
              </div>
            )}

            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5" noValidate>
              <Field id="current-pw" label="Current Password *" error={passwordForm.formState.errors.currentPassword?.message}>
                <input
                  id="current-pw"
                  type="password"
                  autoComplete="current-password"
                  className={`input ${passwordForm.formState.errors.currentPassword ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  {...passwordForm.register('currentPassword')}
                />
              </Field>

              <Field id="new-pw" label="New Password *" error={passwordForm.formState.errors.newPassword?.message}>
                <input
                  id="new-pw"
                  type="password"
                  autoComplete="new-password"
                  className={`input ${passwordForm.formState.errors.newPassword ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  {...passwordForm.register('newPassword')}
                />
                <p className="mt-1.5 text-xs text-[#525252]">Min 8 chars, 1 uppercase, 1 number</p>
              </Field>

              <Field id="confirm-pw" label="Confirm New Password *" error={passwordForm.formState.errors.confirmPassword?.message}>
                <input
                  id="confirm-pw"
                  type="password"
                  autoComplete="new-password"
                  className={`input ${passwordForm.formState.errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  {...passwordForm.register('confirmPassword')}
                />
              </Field>

              <button
                type="submit"
                disabled={pwLoading}
                className="btn-primary w-full justify-center"
                id="change-pw-btn"
              >
                {pwLoading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
