export function formatTime(t?: string | null): string {
  if (!t) return ''
  const [hStr, mStr] = t.slice(0, 5).split(':')
  const h = parseInt(hStr, 10)
  if (isNaN(h) || !mStr) return t
  const hr12 = h % 12 === 0 ? 12 : h % 12
  return `${hr12}:${mStr}${h >= 12 ? 'pm' : 'am'}`
}
