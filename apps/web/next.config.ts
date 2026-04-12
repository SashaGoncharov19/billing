import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin(
  './src/i18n/request.ts'
);

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    // Bun on Linux ARM64 has a bug where Error.stack returns undefined in workers,
    // causing Next.js static generation to crash on stack.length access.
    // All our pages are dynamic (require auth) so prerender errors don't affect runtime.
    prerenderEarlyExit: false,
  },
};

export default withNextIntl(nextConfig);
