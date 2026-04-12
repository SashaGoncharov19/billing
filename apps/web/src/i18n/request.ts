import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

export default getRequestConfig(async () => {
  let locale = 'en'

  try {
    // headers() and cookies() throw during static generation (build time)
    const cookieLocale = (await cookies()).get('NEXT_LOCALE')?.value
    const acceptedLanguages = (await headers()).get('accept-language')

    if (cookieLocale) {
      locale = cookieLocale
    } else if (acceptedLanguages?.includes('uk')) {
      locale = 'uk'
    }
  } catch {
    // Fallback to default during static generation
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  }
})
