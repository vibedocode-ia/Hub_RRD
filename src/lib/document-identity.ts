export type DocumentPersonType = 'PF' | 'PJ'

export function normalizeDocument(value: string): string {
  return value.replace(/\D/g, '')
}

function repeated(value: string): boolean {
  return /^(\d)\1+$/.test(value)
}

export function isValidCpf(value: string): boolean {
  const digits = normalizeDocument(value)
  if (digits.length !== 11 || repeated(digits)) return false
  const digitAt = (base: string, factor: number) => {
    const total = [...base].reduce((sum, digit, index) => sum + Number(digit) * (factor - index), 0)
    const rest = (total * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return digitAt(digits.slice(0, 9), 10) === Number(digits[9]) && digitAt(digits.slice(0, 10), 11) === Number(digits[10])
}

export function isValidCnpj(value: string): boolean {
  const digits = normalizeDocument(value)
  if (digits.length !== 14 || repeated(digits)) return false
  const digitAt = (base: string) => {
    let weight = base.length === 12 ? 5 : 6
    const total = [...base].reduce((sum, digit) => {
      const next = sum + Number(digit) * weight
      weight = weight === 2 ? 9 : weight - 1
      return next
    }, 0)
    const rest = total % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return digitAt(digits.slice(0, 12)) === Number(digits[12]) && digitAt(digits.slice(0, 13)) === Number(digits[13])
}

export function resolveDocumentIdentity(value: string): { document: string; type: DocumentPersonType } | null {
  const document = normalizeDocument(value)
  if (isValidCpf(document)) return { document, type: 'PF' }
  if (isValidCnpj(document)) return { document, type: 'PJ' }
  return null
}
