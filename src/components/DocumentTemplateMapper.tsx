'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { DocumentTemplateField, DocumentTemplatePlacement } from '@/lib/document-template-contract'
import { rectangleFromDrag, type Point } from '@/lib/document-template-mapping'

type Props = { source: string | File | null; fields: DocumentTemplateField[]; onChange: (fields: DocumentTemplateField[]) => void }
const inputClass = 'rounded border border-slate-700 bg-slate-900 p-2 text-xs text-white'

export default function DocumentTemplateMapper({ source, fields, onChange }: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(0)
  const [color, setColor] = useState('#000000')
  const [background, setBackground] = useState('#ffffff')
  const [fontSize, setFontSize] = useState(12)
  const selectedIndex = Math.min(selected, fields.length - 1)
  useEffect(() => {
    let cancelled = false
    let task: ReturnType<typeof import('pdfjs-dist')['getDocument']> | undefined
    setPdf(null); setError('')
    if (!source) return
    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
        const data = typeof source === 'string' ? { url: source } : { data: new Uint8Array(await source.arrayBuffer()) }
        if (cancelled) return
        task = pdfjs.getDocument(data)
        const document = await task.promise
        if (!cancelled) setPdf(document)
      } catch {
        if (!cancelled) setError('Não foi possível abrir o PDF fonte. Verifique acesso, formato e proteção por senha.')
      }
    })()
    return () => { cancelled = true; void task?.destroy() }
  }, [source])
  const update = (fieldIndex: number, index: number, patch: Partial<DocumentTemplatePlacement> | null) => onChange(fields.map((f, i) => i !== fieldIndex ? f : { ...f, placements: patch ? f.placements?.map((p, n) => n === index ? { ...p, ...patch } : p) : f.placements?.filter((_, n) => n !== index) }))
  const add = (placement: DocumentTemplatePlacement) => {
    if (!fields[selectedIndex] || (fields[selectedIndex].placements?.length ?? 0) >= 20) return
    onChange(fields.map((f, i) => i !== selectedIndex ? f : { ...f, placements: [...(f.placements ?? []), { ...placement, color, background, fontSize }] }))
  }
  return <section className="space-y-3 rounded-xl border border-slate-700 p-3">
    <h5 className="text-sm font-bold text-slate-100">Mapeamento visual do PDF fonte</h5>
    <p className="text-xs text-slate-400">Selecione o campo e a página. Arraste sobre a área exata a substituir. Repita em outras páginas para o mesmo campo. A fonte permanece intacta; nenhum local é preenchido automaticamente.</p>
    <p className="text-xs text-amber-300">Este editor salva o mapeamento; a emissão depende do motor de preenchimento. A máscara cobre somente o retângulo escolhido.</p>
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
      <label>Campo a mapear <select aria-label="Campo a mapear" className={inputClass} value={selectedIndex} onChange={e => setSelected(Number(e.target.value))}>{fields.map((f, i) => <option key={i} value={i}>{f.label} ({f.key})</option>)}</select></label>
      <label>Cor do texto <input aria-label="Cor do texto para novas áreas" type="color" value={color} onChange={e => setColor(e.target.value)} /></label>
      <label>Cor do fundo <input aria-label="Cor do fundo para novas áreas" type="color" value={background} onChange={e => setBackground(e.target.value)} /></label>
      <label>Fonte (pt) <input aria-label="Fonte para novas áreas" className={`${inputClass} w-16`} type="number" min={4} max={72} value={fontSize} onChange={e => setFontSize(Math.max(4, Math.min(72, Number(e.target.value) || 12)))} /></label>
    </div>
    {!source && <p className="text-xs text-slate-400">Escolha o PDF acima para iniciar o preview.</p>}
    {source && !pdf && !error && <p role="status" className="text-xs text-slate-400">Carregando PDF fonte…</p>}
    {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
    {pdf && <div className="max-h-[70vh] space-y-4 overflow-auto">{Array.from({ length: pdf.numPages }, (_, page) => <PdfPage key={page} pdf={pdf} page={page} fields={fields} onSelect={add} disabled={!fields.length} />)}</div>}
    <div className="space-y-2">{fields.flatMap((field, fi) => (field.placements ?? []).map((p, pi) => <div key={`${fi}-${pi}`} className="flex flex-wrap items-center gap-2 rounded border border-slate-700 p-2 text-xs text-slate-300">
      <span>{field.label} · Página {p.page + 1} · Área {pi + 1}</span>
      <label>Cor do texto <input aria-label={`Cor do texto ${field.key} área ${pi + 1}`} type="color" value={p.color ?? '#000000'} onChange={e => update(fi, pi, { color: e.target.value })} /></label>
      <label>Cor do fundo <input aria-label={`Cor do fundo ${field.key} área ${pi + 1}`} type="color" value={p.background ?? '#ffffff'} onChange={e => update(fi, pi, { background: e.target.value })} /></label>
      <label>Fonte (pt) <input aria-label={`Fonte ${field.key} área ${pi + 1}`} className={`${inputClass} w-16`} type="number" min={4} max={72} value={p.fontSize ?? 12} onChange={e => update(fi, pi, { fontSize: Math.max(4, Math.min(72, Number(e.target.value) || 12)) })} /></label>
      <button type="button" onClick={() => update(fi, pi, null)} className="text-red-300">Remover área</button>
    </div>))}</div>
  </section>
}

function PdfPage({ pdf, page, fields, onSelect, disabled }: { pdf: PDFDocumentProxy; page: number; fields: DocumentTemplateField[]; onSelect: (p: DocumentTemplatePlacement) => void; disabled: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const start = useRef<Point | null>(null)
  const [draft, setDraft] = useState<DocumentTemplatePlacement | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    let render: ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined
    void (async () => {
      try {
        const pdfPage = await pdf.getPage(page + 1)
        if (cancelled || !canvas.current) return
        const viewport = pdfPage.getViewport({ scale: 1000 / pdfPage.getViewport({ scale: 1 }).width })
        canvas.current.width = Math.ceil(viewport.width); canvas.current.height = Math.ceil(viewport.height)
        const context = canvas.current.getContext('2d')
        if (!context) throw new Error('Canvas indisponível')
        render = pdfPage.render({ canvas: canvas.current, canvasContext: context, viewport })
        await render.promise
        if (!cancelled) setReady(true)
      } catch { if (!cancelled) setError('Falha ao renderizar esta página.') }
    })()
    return () => { cancelled = true; render?.cancel() }
  }, [pdf, page])
  const point = (event: React.PointerEvent<HTMLDivElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
  }
  const style = (p: DocumentTemplatePlacement) => ({ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: `${p.width * 100}%`, height: `${p.height * 100}%` })
  return <div><p className="mb-1 text-xs font-bold text-slate-300">Página {page + 1}</p>{error && <p role="alert">{error}</p>}
    <div className="relative bg-white" style={{ touchAction: 'none' }} data-pdf-page={page} data-pdf-ready={ready} aria-label={`Selecionar área na página ${page + 1}`}
      onPointerDown={event => { if (!ready || disabled || event.button !== 0) return; event.preventDefault(); start.current = point(event); event.currentTarget.setPointerCapture(event.pointerId) }}
      onPointerMove={event => { if (start.current) setDraft(rectangleFromDrag(page, start.current, point(event))) }}
      onPointerUp={event => { if (!start.current) return; const rectangle = rectangleFromDrag(page, start.current, point(event)); start.current = null; setDraft(null); if (rectangle && rectangle.width * event.currentTarget.clientWidth >= 4 && rectangle.height * event.currentTarget.clientHeight >= 4) onSelect(rectangle); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}
      onPointerCancel={() => { start.current = null; setDraft(null) }}>
      <canvas ref={canvas} className="block h-auto w-full" />
      {ready && fields.flatMap((field, fi) => (field.placements ?? []).filter(p => p.page === page).map((p, pi) => <div key={`${fi}-${pi}`} className="pointer-events-none absolute overflow-hidden border-2 border-cyan-500 bg-cyan-300/20" style={style(p)}><span className="bg-cyan-950 px-1 text-[10px] text-white">{field.label}</span></div>))}
      {draft && <div className="pointer-events-none absolute border-2 border-amber-500 bg-amber-300/30" style={style(draft)} />}
    </div>
  </div>
}
