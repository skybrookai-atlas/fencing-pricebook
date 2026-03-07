/**
 * AI fallback extraction (spec §10 — step 6)
 * Called for rows that fail regex detection.
 * Uses Claude claude-sonnet-4-20250514 for field extraction.
 * Phase 5 — to be fully implemented.
 */

// TODO: Phase 5 — implement Claude API call for field extraction
// Confidence ≥ 0.7 → auto-apply + save as learning rule
// Confidence < 0.7 → surface in Suggested Corrections queue

export interface AIExtractionResult {
  material?: string
  category?: string
  finish?: string
  colour?: string
  width_mm?: number
  height_mm?: number
  length_mm?: number
  diameter_mm?: number
  thickness_mm?: number
  unit?: string
  pack_qty?: number
  notes?: string
  confidence: number
}

export async function aiExtract(_description: string): Promise<AIExtractionResult> {
  // Stub — returns low confidence so nothing auto-applies
  return { confidence: 0 }
}
