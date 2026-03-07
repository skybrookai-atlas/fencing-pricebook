/**
 * Pack quantity extraction (spec §12 — First Match Wins)
 */

export function extractPackQty(description: string): number | null {
  const s = description.toUpperCase()

  const patterns = [
    /(?:PK|BX|CTN|BAG)\s*(\d+)/,          // PK 10 / BX 10
    /(\d+)\s*(?:PK|BX|CTN|BAG)/,           // 10PK / 10BX
    /(\d+)\s*(?:PCS|PC|EA)/,               // 10PCS
    /PACK\s+OF\s+(\d+)/,                   // PACK OF 10
    /\((\d+)\)\s*$/,                       // trailing (10)
    /\[(\d+)\]\s*$/,                       // trailing [10]
    /-\s*(\d+)\s*$/,                       // trailing - 10
    /\/(\d+)/,                             // /10
    /[Xx]\s*(\d+)\s*$/,                    // trailing x10
  ]

  for (const pattern of patterns) {
    const match = s.match(pattern)
    if (match) {
      const n = parseInt(match[1], 10)
      if (n > 1) return n
    }
  }
  return null
}
