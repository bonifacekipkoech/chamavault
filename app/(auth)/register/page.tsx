'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Loader2, Shield, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import axios from 'axios'

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().regex(/^(?:254|0)[17]\d{8}$/, 'Enter a valid Kenyan phone e.g. 0712345678'),
  password: z.string().min(6, 'At least 6 characters'),
  confirmPassword: z.string(),
  chamaId: z.string().min(1, 'Required'),
  nationalId: z.string().optional(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      await axios.post('/api/auth/register', data)
      setSuccess(true)
      setTimeout(() => router.push('/login'), 2000)
    } catch (err: any) {
      setServerError(err.response?.data?.error ?? 'Registration failed. Please try again.')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-brand-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Account created!</h2>
          <p className="text-gray-500 mt-2">Redirecting you to sign in…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Join ChamaVault</h1>
          <p className="text-gray-500 mt-1">Create your member account</p>
        </div>

        <div className="card p-8">
          {serverError && (
            <div className="alert-error mb-4 rounded-lg">
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First name</label>
                <input {...register('firstName')} placeholder="John" className={cn('input', errors.firstName && 'input-error')} />
                {errors.firstName && <p className="field-error">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="label">Last name</label>
                <input {...register('lastName')} placeholder="Kamau" className={cn('input', errors.lastName && 'input-error')} />
                {errors.lastName && <p className="field-error">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Email address</label>
              <input {...register('email')} type="email" placeholder="you@example.com" className={cn('input', errors.email && 'input-error')} />
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">M-Pesa phone number</label>
              <input {...register('phone')} type="tel" placeholder="0712 345 678" className={cn('input', errors.phone && 'input-error')} />
              <p className="field-hint">This is used for M-Pesa contribution payments</p>
              {errors.phone && <p className="field-error">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="label">Chama ID</label>
              <input {...register('chamaId')} placeholder="Ask your chairperson for this" className={cn('input', errors.chamaId && 'input-error')} />
              {errors.chamaId && <p className="field-error">{errors.chamaId.message}</p>}
            </div>

            <div>
              <label className="label">National ID <span className="text-gray-400 font-normal">(optional)</span></label>
              <input {...register('nationalId')} placeholder="e.g. 12345678" className="input" />
            </div>

            <div>
              <label className="label">Password</label>
              <input {...register('password')} type="password" placeholder="Min. 6 characters" className={cn('input', errors.password && 'input-error')} />
              {errors.password && <p className="field-error">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Confirm password</label>
              <input {...register('confirmPassword')} type="password" placeholder="Re-enter password" className={cn('input', errors.confirmPassword && 'input-error')} />
              {errors.confirmPassword && <p className="field-error">{errors.confirmPassword.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full btn-lg mt-2">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Want to create a new chama?{' '}
          <Link href="/onboard" className="text-brand-600 hover:underline">Register your chama</Link>
        </p>
      </div>
    </div>
  )
}
