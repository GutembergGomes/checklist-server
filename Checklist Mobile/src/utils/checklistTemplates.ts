import { ChecklistItem } from '../types/database'

export const defaultMotivos = ['preventiva', 'corretiva', 'rotina', 'reforma/entressafra']

export function getDefaultItems(tipo: string): ChecklistItem[] {
  const base: ChecklistItem[] = [
    { id: '1', descricao: 'Verificar condição geral', tipo: 'booleano', obrigatorio: true, ordem: 1 },
    { id: '2', descricao: 'Registrar observação', tipo: 'texto', obrigatorio: false, ordem: 2 },
    { id: '3', descricao: 'Foto do equipamento', tipo: 'foto', obrigatorio: false, ordem: 3 },
  ]
  if (tipo === 'preventiva') {
    return [
      { id: 'p1', descricao: 'Checar pontos de desgaste', tipo: 'booleano', obrigatorio: true, ordem: 1 },
      { id: 'p2', descricao: 'Medição de parâmetros críticos', tipo: 'numero', obrigatorio: true, ordem: 2 },
      ...base,
    ]
  }
  if (tipo === 'corretiva') {
    return [
      { id: 'c1', descricao: 'Identificar falha', tipo: 'texto', obrigatorio: true, ordem: 1 },
      { id: 'c2', descricao: 'Ação tomada', tipo: 'texto', obrigatorio: true, ordem: 2 },
      ...base,
    ]
  }
  return base
}
