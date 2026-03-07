/**
 * Pre-cleaning step (spec §12)
 * Normalises raw description strings before extraction.
 */

export function preclean(raw: string): string {
  let s = raw.trim()

  // * separator → x (e.g. 2400*1800 → 2400x1800)
  s = s.replace(/(\d)\*(\d)/g, '$1x$2')

  // Glued 3D dims + 4-digit length: 65x65x2.02400 → 65x65x2.0 2400
  s = s.replace(/(\d+x\d+x\d+(?:\.\d+)?)(\d{4})/g, '$1 $2')

  // Glued 2D dims + 4-digit length: 100x752400 → 100x75 2400
  s = s.replace(/(\d+x\d+)(\d{4})/g, '$1 $2')

  return s
}
