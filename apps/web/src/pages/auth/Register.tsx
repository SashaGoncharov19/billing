import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

import api from '../../lib/api'
import { useAuthStore } from '@/store/auth.store'
import type { AxiosError } from 'axios'

const registerSchema = z.object({
  tenantName: z.string().min(2, 'Workspace name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type RegisterValues = z.infer<typeof registerSchema>

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { tenantName: '', email: '', password: '' }
  })

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterValues) => {
      const response = await api.post('/auth/register', data)
      return response.data
    },
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user, data.tenant)
      toast.success('Account created successfully!')
      navigate('/dashboard', { replace: true })
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const msg = error.response?.data?.message || 'Failed to create account. Email may already be in use.'
      setErrorMsg(msg)
      toast.error(msg)
    }
  })

  const onSubmit = (data: RegisterValues) => {
    setErrorMsg(null)
    registerMutation.mutate(data)
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card/50 backdrop-blur-xl text-card-foreground shadow-2xl rounded-2xl border border-border/50 p-8 space-y-8"
    >
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-sm text-muted-foreground">Enter your details to get started</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none" htmlFor="tenantName">Workspace Name</label>
          <input 
            {...register('tenantName')}
            className="flex h-11 w-full rounded-md border border-input/50 bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary transition-all" 
            id="tenantName" 
            type="text" 
            placeholder="EntitySeven Inc." 
          />
          {errors.tenantName && <p className="text-xs text-destructive">{errors.tenantName.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none" htmlFor="email">Email</label>
          <input 
            {...register('email')}
            className="flex h-11 w-full rounded-md border border-input/50 bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary transition-all" 
            id="email" 
            type="email" 
            placeholder="name@example.com" 
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none" htmlFor="password">Password</label>
          <input 
            {...register('password')}
            className="flex h-11 w-full rounded-md border border-input/50 bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary transition-all" 
            id="password" 
            type="password" 
            placeholder="••••••••" 
          />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        {errorMsg && (
          <div className="p-3 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
            {errorMsg}
          </div>
        )}
        
        <motion.button 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          disabled={registerMutation.isPending}
          type="submit"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-foreground text-background hover:bg-foreground/90 h-11 px-4 py-2 w-full shadow-lg disabled:opacity-50"
        >
          {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
        </motion.button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account? <Link to="/auth/login" className="text-foreground font-medium underline-offset-4 hover:underline transition-all">Sign in</Link>
      </div>
    </motion.div>
  )
}
