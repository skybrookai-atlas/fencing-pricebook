/**
 * Junk row detection (spec §12)
 * Classifies rows as JUNK, DELIVERY, SECTION_HEADER, or VALID_CANDIDATE.
 */

export type RowClassification = 'JUNK' | 'DELIVERY' | 'SECTION_HEADER' | 'VALID_CANDIDATE'

const JUNK_KEYWORDS = [
  'discount', 'credit', 'refund', 'rounding', 'adjustment',
  'admin fee', 'statement fee', 'return of', 'returned',
  'order payment', 'subtotal', 'sub total', 'eft',
  'payment received', 'gst included', 'total gst',
]

const DELIVERY_KEYWORDS = [
  'freight', 'delivery', 'shipping', 'cartage', 'curbside',
]

const ADDRESS_PATTERN = /^\d+\s+\w[\w\s]+,?\s+\w[\w\s]+,?\s+[A-Z]{2,3}\s+\d{4}/i

export function classifyRow(description: string): RowClassification {
  const lower = description.toLowerCase().trim()

  if (!description || description.length < 4) return 'JUNK'
  if (/\*\*\*ORDER PAYMENT\*\*\*/i.test(description)) return 'JUNK'
  if (ADDRESS_PATTERN.test(description)) return 'JUNK'

  if (JUNK_KEYWORDS.some(kw => lower.includes(kw))) return 'JUNK'

  if (DELIVERY_KEYWORDS.some(kw => lower.includes(kw))) return 'DELIVERY'

  // Section header: ALL CAPS without numbers, or "FENCING - CATEGORY" pattern
  const upper = description.toUpperCase()
  if (
    upper === description && !/\d/.test(description) ||
    /^[A-Z\s]+\s*-\s*[A-Z\s]+$/.test(description)
  ) {
    return 'SECTION_HEADER'
  }

  return 'VALID_CANDIDATE'
}
