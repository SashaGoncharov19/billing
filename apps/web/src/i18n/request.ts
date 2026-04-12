import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

export default getRequestConfig(async () => {
  // Provide a static locale, fetch from user, or negotiate from accept-language header
  let locale = 'en'
  const acceptedLanguages = (await headers()).get('accept-language')
  const cookieLocale = (await cookies()).get('NEXT_LOCALE')?.value
  
  if (cookieLocale) {
    locale = cookieLocale
  } else if (acceptedLanguages && acceptedLanguages.includes('uk')) {
    locale = 'uk'
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  }
})
