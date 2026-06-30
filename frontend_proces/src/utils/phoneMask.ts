/** Казахстан: +7 (7XX) XXX-XX-XX — стандартный формат мобильного номера */
export const KZ_PHONE_PLACEHOLDER = '+7 (777) 123-45-67'

export const KZ_PHONE_EMPTY_PREFIX = '+7 ('

export function formatKzPhoneInput(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('8')) digits = '7' + digits.slice(1)
  if (!digits.startsWith('7')) digits = '7' + digits
  digits = digits.slice(0, 11)

  let formatted = '+7'
  if (digits.length > 1) formatted += ' (' + digits.slice(1, 4)
  if (digits.length >= 4) formatted += ') '
  if (digits.length > 4) formatted += digits.slice(4, 7)
  if (digits.length > 7) formatted += '-' + digits.slice(7, 9)
  if (digits.length > 9) formatted += '-' + digits.slice(9, 11)
  return formatted
}

export function getKzPhoneDigits(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

export function isValidKzPhone(formatted: string): boolean {
  const digits = getKzPhoneDigits(formatted)
  return digits.length === 11 && digits.startsWith('7')
}

export function normalizeKzPhoneOnFocus(current: string): string {
  if (!current || current === '+7') return KZ_PHONE_EMPTY_PREFIX
  return current
}

export function normalizeKzPhoneOnBlur(current: string): string {
  const digits = getKzPhoneDigits(current)
  if (digits.length <= 1) return ''
  return formatKzPhoneInput(current)
}
