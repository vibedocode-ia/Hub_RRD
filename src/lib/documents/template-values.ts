/** Converte dados confirmados em valores do cadastro, sem completar campos com exemplos do PDF. */
export function resolveTemplateValues(data: Record<string, unknown>, explicit: Record<string, unknown> = {}): Record<string, unknown> {
  const values: Record<string, unknown> = { ...data, ...explicit }
  const alias = (target: string, sources: string[]) => {
    if (values[target] !== undefined) return
    for (const source of sources) if (values[source] !== undefined) { values[target] = values[source]; break }
  }
  alias('totalValue', ['totalAmount', 'amount'])
  alias('totalAmount', ['totalValue', 'amount'])
  alias('amount', ['totalAmount', 'totalValue'])
  alias('clientName', ['contractorName', 'contractor'])
  alias('contractor', ['contractorName', 'clientName'])
  alias('contractorName', ['contractor', 'clientName'])
  alias('contractorDocument', ['clientDoc'])
  alias('contractorAddress', ['clientAddress', 'address'])
  alias('serviceTitle', ['object', 'serviceType'])
  alias('includedDescription', ['serviceScope', 'serviceDescription'])
  alias('clientDocument', ['clientDoc', 'contractorDocument'])
  alias('paymentCity', ['city', 'issuedAtCity'])
  alias('contractorCity', ['issueCity', 'city'])
  const items = Array.isArray(data.items) ? data.items : []
  if (items.length === 1 && items[0] && typeof items[0] === 'object') {
    const item = items[0] as Record<string, unknown>
    if (values.quantity === undefined) values.quantity = item.quantity
    if (values.unitAmount === undefined) values.unitAmount = item.unitPrice
    if (values.subtotal === undefined) values.subtotal = item.subtotal
  }
  if (values.paymentDateAndPlace === undefined && values.city && values.paymentDateExtended) values.paymentDateAndPlace = `${values.city}, ${values.paymentDateExtended}`
  if (values.receiptStatement === undefined && values.clientName && values.clientDoc && values.amount && values.amountInWords && values.paymentMethod && values.paymentDateExtended && values.serviceDescription && values.address) {
    const documentLabel = String(values.clientDoc).replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ'
    values.receiptStatement = `Declaramos, para os devidos fins, que recebemos de ${values.clientName}, inscrita no ${documentLabel} nº ${values.clientDoc}, a quantia de R$ ${String(values.amount).replace(/^R\$\s*/, '')} (${values.amountInWords}), paga por meio de ${values.paymentMethod} em ${values.paymentDateExtended}, referente ao serviço de ${values.serviceDescription}, realizado no endereço ${values.address}.`
  }
  return values
}
