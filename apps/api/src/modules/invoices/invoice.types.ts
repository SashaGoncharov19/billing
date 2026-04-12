export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'

export const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['open', 'void'],
  open: ['paid', 'void', 'uncollectible'],
  paid: [],
  void: [],
  uncollectible: [],
}

export class InvalidTransitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidTransitionError'
  }
}
