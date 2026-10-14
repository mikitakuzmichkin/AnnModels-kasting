import type { Casting, Child, Gender, MediaItem } from '../types'

export const EYES = ['карие', 'голубые', 'зелёные', 'серые']
export const HAIR = ['блонд', 'русые', 'тёмные', 'рыжие', 'чёрные']
export const CITIES = ['Минск', 'Гродно', 'Брест'] as const

export const STATUS_LABEL = {
  review: 'На рассмотрении',
  accepted: 'Приглашен',
  rejected: 'Отказ',
} as const

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`
}

export function digits(phone: string) {
  let value = phone.replace(/\D/g, '')
  if (value.startsWith('80') && value.length === 11) value = `375${value.slice(2)}`
  if (value.startsWith('8') && value.length === 11) value = `375${value.slice(1)}`
  if (value.length === 9) value = `375${value}`
  return value
}

export function phoneMask(phone: string) {
  const d = digits(phone)
  if (d.length !== 12) return phone
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`
}

export function parseDay(iso: string) {
  if (iso.length <= 10) return new Date(`${iso}T12:00:00`)
  return new Date(iso.length === 19 ? `${iso}` : iso)
}

export function localDay(date: Date) {
  const z = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${z(date.getMonth() + 1)}-${z(date.getDate())}`
}

export function formatDate(iso: string) {
  return parseDay(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export function ageFrom(birth: string, now = new Date()) {
  const born = parseDay(birth)
  let age = now.getFullYear() - born.getFullYear()
  const month = now.getMonth() - born.getMonth()
  if (month < 0 || (month === 0 && now.getDate() < born.getDate())) age -= 1
  return age
}

export function isStale(iso: string, days: number) {
  return Date.now() - new Date(iso).getTime() > days * 86400000
}

export function asset(src: string) {
  if (!src) return ''
  if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('http')) return src
  return `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`
}

export function genderWord(gender: Gender | 'any', plural = false) {
  if (gender === 'female') return plural ? 'Девочки' : 'Девочка'
  if (gender === 'male') return plural ? 'Мальчики' : 'Мальчик'
  return 'Любой пол'
}

export function fitReasons(casting: Casting, child: Child) {
  const age = ageFrom(child.birthDate)
  const reasons: string[] = []
  if (casting.gender !== 'any' && casting.gender !== child.gender) reasons.push('другой пол')
  if (age < casting.ageMin || age > casting.ageMax) reasons.push(`возраст ${age}`)
  if (child.height < casting.heightMin || child.height > casting.heightMax) reasons.push(`рост ${child.height} см`)
  return reasons
}

export function postText(casting: Casting) {
  return [
    `Новый кастинг: ${casting.title}`,
    casting.brand,
    `${formatDate(casting.date)}, ${casting.time}`,
    `${casting.city}, ${casting.location}`,
    casting.criteria,
    '',
    'Отклик — в приложении ANNmodels.',
  ].join('\n')
}

export function miniLink(bot: string, app: string, castingId: string) {
  const name = bot.replace('@', '').trim()
  if (!name) return ''
  return `https://t.me/${name}/${app || 'annmodels'}?startapp=${castingId}`
}

export function hashUrl(path: string) {
  const url = new URL(import.meta.env.BASE_URL, window.location.href)
  url.hash = path.startsWith('#') ? path.slice(1) : path.startsWith('/') ? path : `/${path}`
  return url.href
}

export function daySeries(dates: string[]) {
  if (!dates.length) return [] as { day: string; count: number }[]
  const keys = dates.map((item) => item.slice(0, 10)).sort()
  const counts = new Map<string, number>()
  for (const key of keys) counts.set(key, (counts.get(key) || 0) + 1)
  const start = parseDay(keys[0]).getTime()
  const end = parseDay(keys[keys.length - 1]).getTime()
  const out: { day: string; count: number }[] = []
  for (let time = start; time <= end; time += 86400000) {
    const day = localDay(new Date(time))
    out.push({ day, count: counts.get(day) || 0 })
  }
  return out
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function visitCards(media: MediaItem[], childId: string) {
  return media
    .filter((item) => item.childId === childId && item.kind === 'card')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
