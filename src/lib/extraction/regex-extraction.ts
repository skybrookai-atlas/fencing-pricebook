/**
 * Regex dimension extraction (spec §12 — priority pattern table)
 *
 * Patterns in priority order:
 *  P1  W×H×T×L   — SHS/RHS with thickness: 50x50x2.0x2400
 *  P2  W×H×T + L — cross-section + space + length: 50x50x2.0 2400
 *  P3  DIA×T + L — CHS/round pipe: 50x2.0 2400 (when round keyword present)
 *  P4  NB + L    — nominal bore: 50NB 2400 / NB50 2400
 *  P5  W×H×L     — 3 x-values, last is length: 150x19x1800
 *  P6  L×W×T     — sheet reversed: 2400x1200x0.42
 *  P7  W×T + L   — 2 x-values + space + length (round): DIA×T + L
 *  P8  W×H + L   — 2 x-values + space + length: 100x75 2400
 *  P9  DIA×L     — explicit round: Ø50x2400 / dia 50x2400
 *  P10 W×L       — 2 x-values, one is length: 100x2400
 *  P11 W×H       — cross-section only: 50x50
 *  P12 Sheet W×L — both large dims: 2400x1200
 *  P13 Ø/dia N   — explicit diameter keyword: Ø50, 50mm dia, dia 50
 *  P14 Len N m   — metres with unit: 2.4m, 3.6m, 1.8m
 *  P15 Len 4dig  — bare 4+ digit mm length: 2400, 3000
 *  P16 NB only   — nominal bore without length: NB50, 50NB
 *  P17 T keyword — thickness keyword: 2.0mm thk / 2mm T
 *  P18 Wire dia  — wire gauge: 2.5mm wire / 3.15mm strand
 *  P19 W keyword — width keyword: 900mm wide / 900 wide
 *  P20 H keyword — height keyword: 1800mm high / 1800 high
 *  P21 Roll W×L  — roll: NNN wide × Lm (mesh/geofabric)
 *  P22 L×W sheet — sheet: 2400x1200 (fallback, both >= 900)
 */

export interface DimensionResult {
  width_mm: number | null
  height_mm: number | null
  length_mm: number | null
  diameter_mm: number | null
  thickness_mm: number | null
  inferred_dims: boolean
}

// ---- Helpers ----

/** Convert a parsed number + optional unit suffix to mm */
function toMm(val: number, unit?: string | null): number {
  // "m" suffix but not "mm" → metres
  if (unit && /^m$/i.test(unit)) return Math.round(val * 1000)
  return val
}

/** True if value looks like a standard fencing length (mm) */
function isLen(v: number): boolean {
  return v >= 900 && v <= 12000
}

/** True if value looks like a cross-section dim (width or height) */
function isSect(v: number): boolean {
  return v >= 6 && v <= 600
}

/** True if value looks like a sheet or structural thickness */
function isThk(v: number): boolean {
  return v > 0 && v < 80   // covers steel (<10) and timber (<60) and thin sheet (0.42)
}

/** True if two values are likely a WxH cross-section (neither looks like a length) */
function isXSection(a: number, b: number): boolean {
  return isSect(a) && isSect(b) && !isLen(a) && !isLen(b)
}

// ---- Token extractor ----
// Each token is a number with optional unit (mm or m)
interface Token { val: number; raw: string; start: number; end: number }

/** Extract all number tokens from the string with their mm-converted values */
function tokenise(s: string): Token[] {
  // Match: digit sequence, optional decimal, optional unit (mm or bare m)
  // Bare "m" only counts if NOT preceded by another letter and followed by non-letter
  const re = /(\d+(?:\.\d+)?)\s*(mm(?!\w)|(?<![a-zA-Z])m(?![a-zA-Z]))?/g
  const tokens: Token[] = []
  let match: RegExpExecArray | null
  while ((match = re.exec(s)) !== null) {
    const raw = match[1]
    const unit = match[2]
    const numVal = parseFloat(raw)
    if (isNaN(numVal)) continue
    tokens.push({
      val: toMm(numVal, unit),
      raw,
      start: match.index,
      end: match.index + match[0].length,
    })
  }
  return tokens
}

// ---- Separator detection ----
/** Returns true if two consecutive tokens are separated only by 'x', 'X', '×', or '*' */
function xSep(s: string, t1: Token, t2: Token): boolean {
  const between = s.slice(t1.end, t2.start).trim()
  return /^[xX×*]$/.test(between)
}

/** Returns true if two consecutive tokens are separated by whitespace/comma (not x) */
function spaceSep(s: string, t1: Token, t2: Token): boolean {
  const between = s.slice(t1.end, t2.start).trim()
  return between === '' || /^[,\-–]$/.test(between)
}

// ---- Main extractor ----

export function extractDimensions(raw: string): DimensionResult {
  const result: DimensionResult = {
    width_mm: null,
    height_mm: null,
    length_mm: null,
    diameter_mm: null,
    thickness_mm: null,
    inferred_dims: false,
  }

  const s = raw.toUpperCase()

  // Round/pipe section indicator — changes how 2-value sequences are read
  const isRound = /\b(?:CHS|PIPE|TUBE|ROUND\s+BAR|ROUND\s+POST)\b|[Ø⌀]|\bDIA\b|\bNB\b/.test(s)

  const tokens = tokenise(s)
  const n = tokens.length

  // ---- P1: W×H×T×L (four x-separated values) ----
  for (let i = 0; i <= n - 4; i++) {
    const [t0, t1, t2, t3] = [tokens[i], tokens[i+1], tokens[i+2], tokens[i+3]]
    if (xSep(s, t0, t1) && xSep(s, t1, t2) && xSep(s, t2, t3)) {
      const [a, b, c, d] = [t0.val, t1.val, t2.val, t3.val]
      if (isSect(a) && isSect(b) && isThk(c) && isLen(d)) {
        result.width_mm = a
        result.height_mm = b
        result.thickness_mm = c
        result.length_mm = d
        return result
      }
    }
  }

  // ---- P2: W×H×T + L (three x-sep + space-sep length) ----
  for (let i = 0; i <= n - 4; i++) {
    const [t0, t1, t2, t3] = [tokens[i], tokens[i+1], tokens[i+2], tokens[i+3]]
    if (xSep(s, t0, t1) && xSep(s, t1, t2) && spaceSep(s, t2, t3)) {
      const [a, b, c, d] = [t0.val, t1.val, t2.val, t3.val]
      if (isSect(a) && isSect(b) && isThk(c) && isLen(d)) {
        result.width_mm = a
        result.height_mm = b
        result.thickness_mm = c
        result.length_mm = d
        return result
      }
    }
  }

  // ---- P3: DIA×T + L (CHS round pipe, x-sep then space-sep) ----
  if (isRound) {
    for (let i = 0; i <= n - 3; i++) {
      const [t0, t1, t2] = [tokens[i], tokens[i+1], tokens[i+2]]
      if (xSep(s, t0, t1) && spaceSep(s, t1, t2)) {
        const [a, b, c] = [t0.val, t1.val, t2.val]
        if (isSect(a) && isThk(b) && !isLen(b) && isLen(c)) {
          result.diameter_mm = a
          result.thickness_mm = b
          result.length_mm = c
          return result
        }
      }
    }
  }

  // ---- P4: NB + length ----
  {
    // "50NB 2400", "NB50 2400", "NB 50 2400", "50 NB 2400"
    const re = /(\d+)\s*NB\b\s*(\d+)|NB\s*(\d+)\s+(\d+)/i
    const m = s.match(re)
    if (m) {
      if (m[1] && m[2]) {
        result.diameter_mm = parseFloat(m[1])
        const lv = parseFloat(m[2])
        if (isLen(lv)) result.length_mm = lv
      } else if (m[3] && m[4]) {
        result.diameter_mm = parseFloat(m[3])
        const lv = parseFloat(m[4])
        if (isLen(lv)) result.length_mm = lv
      }
      if (result.diameter_mm) return result
    }
  }

  // ---- P5: W×H×L (three x-separated, last is length) ----
  for (let i = 0; i <= n - 3; i++) {
    const [t0, t1, t2] = [tokens[i], tokens[i+1], tokens[i+2]]
    if (xSep(s, t0, t1) && xSep(s, t1, t2)) {
      const [a, b, c] = [t0.val, t1.val, t2.val]
      if (isSect(a) && isLen(c)) {
        result.width_mm = a
        if (isSect(b) && !isLen(b)) {
          result.height_mm = b
        } else if (isThk(b)) {
          result.thickness_mm = b
        }
        result.length_mm = c
        return result
      }
    }
  }

  // ---- P6: L×W×T (sheet dimensions reversed: 2400x1200x0.42) ----
  for (let i = 0; i <= n - 3; i++) {
    const [t0, t1, t2] = [tokens[i], tokens[i+1], tokens[i+2]]
    if (xSep(s, t0, t1) && xSep(s, t1, t2)) {
      const [a, b, c] = [t0.val, t1.val, t2.val]
      if (isLen(a) && isLen(b) && isThk(c) && !isLen(c)) {
        result.length_mm = Math.max(a, b)
        result.width_mm = Math.min(a, b)
        result.thickness_mm = c
        return result
      }
    }
  }

  // ---- P7: W×H + L (two x-sep + space-sep length) — general ----
  for (let i = 0; i <= n - 3; i++) {
    const [t0, t1, t2] = [tokens[i], tokens[i+1], tokens[i+2]]
    if (xSep(s, t0, t1) && spaceSep(s, t1, t2)) {
      const [a, b, c] = [t0.val, t1.val, t2.val]
      if (isLen(c)) {
        if (isRound && isSect(a) && isThk(b) && !isLen(b)) {
          // P7a: DIA×T + L
          result.diameter_mm = a
          result.thickness_mm = b
          result.length_mm = c
          return result
        }
        if (isSect(a) && isSect(b) && !isLen(a) && !isLen(b)) {
          // P8: W×H + L
          result.width_mm = a
          result.height_mm = b
          result.length_mm = c
          return result
        }
      }
    }
  }

  // ---- P9/P10/P11/P12: Two x-separated values ----
  for (let i = 0; i <= n - 2; i++) {
    const [t0, t1] = [tokens[i], tokens[i+1]]
    if (xSep(s, t0, t1)) {
      const [a, b] = [t0.val, t1.val]

      // P9: DIA×L (explicit round: Ø50x2400)
      if (isRound && isSect(a) && isLen(b)) {
        result.diameter_mm = a
        result.length_mm = b
        return result
      }
      if (isRound && isLen(a) && isSect(b)) {
        result.diameter_mm = b
        result.length_mm = a
        return result
      }

      // P10: W×L (width × length)
      if (isSect(a) && isLen(b) && !isLen(a)) {
        result.width_mm = a
        result.length_mm = b
        return result
      }
      if (isLen(a) && isSect(b) && !isLen(b)) {
        result.length_mm = a
        result.width_mm = b
        return result
      }

      // P12: Sheet (both large): 2400×1200
      if (isLen(a) && isLen(b)) {
        result.length_mm = Math.max(a, b)
        result.width_mm = Math.min(a, b)
        return result
      }

      // P11: Cross-section only: 50×50, 100×75
      if (isXSection(a, b)) {
        result.width_mm = a
        result.height_mm = b
        return result
      }
    }
  }

  // ---- P13: Explicit diameter keyword (Ø, dia, diameter) ----
  {
    const re = /(?:[Ø⌀]|(?:\bDIA(?:METER)?\b\.?\s*))(\d+(?:\.\d+)?)\s*(mm\b)?|(\d+(?:\.\d+)?)\s*(mm\b)?\s*(?:DIA(?:METER)?\b)/i
    const m = s.match(re)
    if (m) {
      const numStr = m[1] ?? m[3]
      if (numStr) result.diameter_mm = parseFloat(numStr)
    }
  }

  // ---- P14: Length in metres (e.g. 2.4m, 3.6m) ----
  if (!result.length_mm) {
    const re = /\b(\d+\.\d+)\s*m\b(?!m)/i
    const m = s.match(re)
    if (m) {
      const v = Math.round(parseFloat(m[1]) * 1000)
      if (isLen(v)) result.length_mm = v
    }
  }

  // ---- P15: Bare 4+ digit mm length ----
  if (!result.length_mm) {
    const re = /\b(\d{4,})\b/g
    let m: RegExpExecArray | null
    while ((m = re.exec(s)) !== null) {
      const v = parseInt(m[1], 10)
      if (isLen(v)) {
        result.length_mm = v
        break
      }
    }
  }

  // ---- P16: NB only (no following length) ----
  if (!result.diameter_mm) {
    const re = /(\d+)\s*NB\b|NB\s*(\d+)/i
    const m = s.match(re)
    if (m) result.diameter_mm = parseFloat(m[1] ?? m[2])
  }

  // ---- P17: Thickness keyword ----
  if (!result.thickness_mm) {
    const re = /(\d+(?:\.\d+)?)\s*(?:mm\s+)?(?:THK|THICK|BMT|TCT|TCB)\b/i
    const m = s.match(re)
    if (m) result.thickness_mm = parseFloat(m[1])
  }

  // ---- P18: Wire / strand gauge ----
  if (!result.diameter_mm && !result.thickness_mm) {
    const re = /(\d+(?:\.\d+)?)\s*mm\s*(?:WIRE|STRAND|GAUGE|DIA\b)/i
    const m = s.match(re)
    if (m) result.thickness_mm = parseFloat(m[1])
  }

  // ---- P19: Width keyword (e.g. "900mm wide", "1800 wide") ----
  if (!result.width_mm) {
    const re = /(\d+(?:\.\d+)?)\s*(mm)?\s*WIDE\b/i
    const m = s.match(re)
    if (m) result.width_mm = toMm(parseFloat(m[1]), m[2])
  }

  // ---- P20: Height keyword ----
  if (!result.height_mm) {
    const re = /(\d+(?:\.\d+)?)\s*(mm)?\s*(?:HIGH|HEIGHT|TALL)\b/i
    const m = s.match(re)
    if (m) result.height_mm = toMm(parseFloat(m[1]), m[2])
  }

  // ---- P21: Roll dimensions "NNN wide × Lm" (mesh / geofabric) ----
  if (!result.width_mm && !result.length_mm) {
    const re = /(\d+)\s*(?:mm)?\s*(?:WIDE|W)\s*[×x]\s*(\d+(?:\.\d+)?)\s*m\b/i
    const m = s.match(re)
    if (m) {
      result.width_mm = parseFloat(m[1])
      result.length_mm = Math.round(parseFloat(m[2]) * 1000)
    }
  }

  return result
}
