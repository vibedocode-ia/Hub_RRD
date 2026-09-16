export type StockDirection = 'ENTRADA' | 'SAIDA'

type StockValidationOptions = Readonly<{
  direction?: StockDirection
  available?: number
}>

export type StockAdjustmentValidation =
  | { ok: true; quantity: number }
  | { ok: false; error: string }

/** Validates a stock adjustment before any persistence mutation. */
export function validateStockAdjustment(value: unknown, options: StockValidationOptions = {}): StockAdjustmentValidation {
  const quantity = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: 'Quantidade deve ser um número finito maior que zero.' }
  }

  const normalizedQuantity = Math.round((quantity + Number.EPSILON) * 100) / 100
  if (normalizedQuantity <= 0) {
    return { ok: false, error: 'Quantidade deve resultar em pelo menos 0,01.' }
  }

  if (
    options.direction === 'SAIDA' &&
    (!Number.isFinite(options.available) || normalizedQuantity > Number(options.available))
  ) {
    return { ok: false, error: 'Estoque insuficiente para esta saída.' }
  }

  return { ok: true, quantity: normalizedQuantity }
}
