import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

import api from '../../lib/api'
import { useAuthStore } from '../../store/auth.store'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginValues = z.infer<typeof loginSchema>

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const from = location.state?.from?.pathname || '/dashboard'

  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  })

  const loginMutation = useMutation({
    mutationFn: async (data: LoginValues) => {
      const response = await api.post('/auth/login', data)
      return response.data
    },
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user, data.tenant)
      toast.success('Logged in successfully')
      
      const isSystemAdmin = data.user.role === 'admin' || data.user.role === 'owner'
      const isDefaultRoute = from === '/dashboard' || from === '/'
      const targetPath = !isDefaultRoute ? from : (isSystemAdmin ? '/admin' : '/dashboard')
      
      navigate(targetPath, { replace: true })
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to login. Please check your credentials.'
      setErrorMsg(msg)
      toast.error(msg)
    }
  })

  const onSubmit = (data: LoginValues) => {
    setErrorMsg(null)
    loginMutation.mutate(data)
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card/50 backdrop-blur-xl text-card-foreground shadow-2xl rounded-2xl border border-border/50 p-8 space-y-8"
    >
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Log in to your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none" htmlFor="email">Email</label>
          <input 
            {...register('email')}
            className="flex h-11 w-full rounded-md border border-input/50 bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary transition-all" 
            id="email" 
            type="email" 
            placeholder="admin@entityseven.com" 
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
          disabled={loginMutation.isPending}
          type="submit"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-foreground text-background hover:bg-foreground/90 h-11 px-4 py-2 w-full shadow-lg disabled:opacity-50"
        >
          {loginMutation.isPending ? 'Signing In...' : 'Sign In'}
        </motion.button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account? <Link to="/auth/register" className="text-foreground font-medium underline-offset-4 hover:underline transition-all">Sign up</Link>
      </div>
    </motion.div>
  )
}
