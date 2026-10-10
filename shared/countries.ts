import type { Passport } from './types'

const names: Record<string, string> = {
  AE: 'United Arab Emirates', AR: 'Argentina', AT: 'Austria', AU: 'Australia', BE: 'Belgium', BR: 'Brazil', CA: 'Canada', CH: 'Switzerland', CL: 'Chile', CN: 'China', CO: 'Colombia', CZ: 'Czechia', DE: 'Germany', DK: 'Denmark', EG: 'Egypt', ES: 'Spain', FI: 'Finland', FR: 'France', GB: 'United Kingdom', GR: 'Greece', HK: 'Hong Kong', HU: 'Hungary', ID: 'Indonesia', IE: 'Ireland', IL: 'Israel', IN: 'India', IS: 'Iceland', IT: 'Italy', JP: 'Japan', KR: 'South Korea', LK: 'Sri Lanka', MA: 'Morocco', MX: 'Mexico', MY: 'Malaysia', NG: 'Nigeria', NL: 'Netherlands', NO: 'Norway', NZ: 'New Zealand', PE: 'Peru', PH: 'Philippines', PK: 'Pakistan', PL: 'Poland', PT: 'Portugal', QA: 'Qatar', SA: 'Saudi Arabia', SE: 'Sweden', SG: 'Singapore', TH: 'Thailand', TR: 'Türkiye', TW: 'Taiwan', US: 'United States', VN: 'Vietnam', ZA: 'South Africa'
}

export const flagFor = (code: string) => [...code].map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('')
export const countryName = (code: string) => names[code] ?? code
export const passports: Passport[] = Object.entries(names).map(([code, name]) => ({ code, name, flag: flagFor(code) })).sort((a, b) => a.name.localeCompare(b.name))
