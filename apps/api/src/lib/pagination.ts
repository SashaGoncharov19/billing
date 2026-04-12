export interface PaginationParams {
  cursor?: string
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
}

export function encodeCursor(id: string, createdAt: Date): string {
  return Buffer.from(JSON.stringify({ id, createdAt: createdAt.toISOString() })).toString('base64url')
}

export function decodeCursor(cursor: string): { id: string; createdAt: Date } {
  const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString())
  return { id: decoded.id, createdAt: new Date(decoded.createdAt) }
}

export function paginate<T extends { id: string; createdAt: Date }>(
  items: T[],
  limit: number
): PaginatedResponse<T> {
  const hasMore = items.length > limit
  const data = hasMore ? items.slice(0, limit) : items
  const lastItem = data[data.length - 1]

  return {
    data,
    nextCursor: hasMore && lastItem ? encodeCursor(lastItem.id, lastItem.createdAt) : null,
    hasMore,
  }
}
