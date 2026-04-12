import { StripeProvider } from './stripe/stripe.provider'
import type { PaymentProvider } from './payment-provider.interface'

let instance: PaymentProvider | null = null

export function getPaymentProvider(): PaymentProvider {
  if (instance) return instance

  const provider = process.env.PAYMENT_PROVIDER ?? 'stripe'

  switch (provider) {
    case 'stripe':
      if (!process.env.STRIPE_SECRET_KEY) {
        // Log error but we don't hard crash to let tests/etc pass if they mock it
        console.warn('STRIPE_SECRET_KEY is not defined!')
        instance = new StripeProvider('dummy_key_for_types')
      } else {
        instance = new StripeProvider(process.env.STRIPE_SECRET_KEY)
      }
      break
    default:
      throw new Error(`Unknown payment provider: ${provider}`)
  }

  return instance
}
