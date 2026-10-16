type PdfFetch = (url: string, options: RequestInit) => Promise<Response>

/** Read first. Issue only for an explicitly absent PDF and an authorized reviewer.
 * The POST still enforces documents.issue server-side; this flag is UX, not authority. */
export async function prepareOfficialPdfDownload(id: string, request: PdfFetch = fetch, canIssue = false): Promise<Blob> {
  const endpoint = `/api/documents/${encodeURIComponent(id)}/pdf`
  const call = (method: string) => request(endpoint, { method, credentials: 'same-origin', cache: 'no-store' })
  const assertOk = (response: Response) => {
    if (response.ok) return
    if (response.status === 409) throw new Error('Conflito de integridade ou anexo legado: o PDF existente não será substituído. Consulte o anexo no Hub.')
    if (response.status === 401 || response.status === 403) throw new Error('Sessão ou permissão insuficiente. Entre novamente ou solicite acesso.')
    throw new Error('Não foi possível preparar o PDF oficial. Tente novamente.')
  }
  let response = await call('GET')
  if (response.status === 404) {
    const missing = await response.clone().json().catch(() => null)
    if (missing?.code === 'PDF_NOT_GENERATED') {
      if (!canIssue) throw new Error('PDF ainda não gerado. Solicite a geração a um usuário com permissão de emissão.')
      assertOk(await call('POST'))
      response = await call('GET')
    }
  }
  assertOk(response)
  if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/pdf')) throw new Error('PDF inválido recebido. Tente novamente.')
  const blob = await response.blob()
  if (await blob.slice(0, 5).text() !== '%PDF-') throw new Error('PDF inválido recebido. Tente novamente.')
  return blob
}
