/** Database money is decimal text. Never silently coerce invalid values or accumulate binary fractions. */
export function financialCents(value: string | number): bigint {
  const text = String(value)
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error('Valor financeiro inválido na fonte.')
  const [integer, fraction = ''] = text.split('.')
  return BigInt(integer) * BigInt(100) + BigInt(fraction.padEnd(2, '0'))
}
export function financialMoney(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error('Total excede precisão numérica segura.')
  return Number(value) / 100
}
