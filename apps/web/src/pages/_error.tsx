/**
 * Custom Pages Router _error page.
 * This prevents Next.js from auto-generating a Pages Router error page
 * that accidentally includes App Router chunks (causing the <Html> import error
 * when building with Bun on Linux ARM64).
 */
import type { NextPageContext } from 'next'

interface ErrorProps {
  statusCode?: number
}

function ErrorPage({ statusCode }: ErrorProps) {
  return (
    <p>
      {statusCode
        ? `An error ${statusCode} occurred on the server`
        : 'An error occurred on the client'}
    </p>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? (err as { statusCode?: number }).statusCode : 404
  return { statusCode }
}

export default ErrorPage
