import { ChecklistItem } from '../types/database'

function detectType(v: any): 'texto' | 'numero' | 'booleano' | 'foto' | 'assinatura' {
  if (typeof v === 'boolean') return 'booleano'
  if (typeof v === 'number') return 'numero'
  if (typeof v === 'string') return 'texto'
  return 'texto'
}

function pickDesc(obj: any, prefix?: string): string {
  const cands = ['descricao','label','question','nome','title']
  for (const k of cands) { if (obj && typeof obj[k] === 'string' && obj[k].trim().length) return prefix ? `${prefix} • ${obj[k]}` : obj[k] }
  if (typeof obj === 'string') return prefix ? `${prefix} • ${obj}` : obj
  return prefix ? `${prefix}` : 'Item'
}

export function normalizeItems(raw: any): ChecklistItem[] {
  const out: ChecklistItem[] = []
  const pushItem = (desc: string, type: any, required?: any, ordem?: number, options?: string[]) => {
    const id = crypto.randomUUID()
    const tipo = typeof type === 'string' ? (['texto','numero','booleano','foto','assinatura','opcoes'].includes(type) ? type : (type==='number'?'numero':type==='boolean'?'booleano':'texto')) : 'texto'
    const item: any = { id, descricao: desc || 'Item', tipo: tipo as any, obrigatorio: !!required, ordem: ordem ?? (out.length+1) }
    if (Array.isArray(options) && options.length) item.opcoes = options
    out.push(item)
  }
  if (Array.isArray(raw)) {
    raw.forEach((el, idx) => {
      if (typeof el === 'string') pushItem(el, 'texto', false, idx+1)
      else if (el && typeof el === 'object') pushItem(pickDesc(el), el.tipo ?? el.type ?? 'texto', el.obrigatorio ?? el.required, idx+1)
      else pushItem('Item', 'texto', false, idx+1)
    })
    return out
  }
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.rows)) {
      const prefix = typeof raw.section === 'string' ? raw.section : (typeof raw.tipo === 'string' ? raw.tipo : undefined)
      raw.rows.forEach((row: any, idx: number) => {
        if (Array.isArray(row)) {
          const desc = String(row[0] ?? 'Item')
          const opts = row.slice(1).filter((v:any)=>typeof v==='string').map((v:string)=>v.trim()).filter(Boolean)
          const defaultOpts = ['OK','Não OK','Não Aplica']
          pushItem(prefix ? `${prefix} • ${desc}` : desc, 'opcoes', false, idx+1, opts.length ? opts : defaultOpts)
        } else if (row && typeof row === 'object') {
          const options = Array.isArray(row.options) ? row.options : (Array.isArray(row.opcoes) ? row.opcoes : undefined)
          pushItem(pickDesc(row, prefix), row.tipo ?? row.type ?? (options?'opcoes':'texto'), row.obrigatorio ?? row.required, idx+1, options)
        } else {
          pushItem('Item', 'texto', false, idx+1)
        }
      })
      return out
    }
    if (Array.isArray(raw.header)) {
      raw.header.forEach((h:string, idx:number)=>pushItem(String(h), 'texto', false, idx+1))
      return out
    }
  }
  return out
}
