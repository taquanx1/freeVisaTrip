import type { Passport } from './types'
import countryData from './countries.generated.json'

const names: Record<string, string> = countryData

export const flagFor = (code: string) => [...code].map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
export const countryName = (code: string) => names[code] ?? code
export const passports: Passport[] = Object.entries(names).map(([code, name]) => ({ code, name, flag: flagFor(code) })).sort((a, b) => a.name.localeCompare(b.name))
