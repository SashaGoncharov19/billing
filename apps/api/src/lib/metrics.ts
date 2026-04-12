// Simple in-memory metrics storage
const metrics = {
  requestCount: 0,
  errorCount: 0,
  requestDurations: [] as number[],
}

export function recordRequest(duration: number, isError: boolean) {
  metrics.requestCount++
  metrics.requestDurations.push(duration)
  if (isError) metrics.errorCount++

  // Keep only last 1000 requests in memory
  if (metrics.requestDurations.length > 1000) {
    metrics.requestDurations.shift()
  }
}

export function getMetrics() {
  const durations = [...metrics.requestDurations].sort((a, b) => a - b)
  const p95 = durations[Math.floor(durations.length * 0.95)] ?? 0
  const p99 = durations[Math.floor(durations.length * 0.99)] ?? 0

  return {
    requestCount: metrics.requestCount,
    errorCount: metrics.errorCount,
    errorRate: metrics.requestCount > 0
      ? (metrics.errorCount / metrics.requestCount * 100).toFixed(2) + '%'
      : '0%',
    latency: { p95, p99 },
  }
}
