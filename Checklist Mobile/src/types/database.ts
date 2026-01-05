export interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: 'tecnico' | 'supervisor' | 'admin';
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Equipamento {
  id: string;
  codigo: string;
  tipo: string;
  descricao?: string;
  localizacao?: string;
  qr_code_data?: string;
  ativo: boolean;
  ultima_manutencao?: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  descricao: string;
  tipo: 'texto' | 'numero' | 'booleano' | 'foto' | 'assinatura' | 'opcoes';
  obrigatorio: boolean;
  valor_esperado?: string | number | boolean;
  ordem: number;
  opcoes?: string[];
}

export interface Checklist {
  id: string;
  equipamento_id: string;
  tipo: 'irrigacao' | 'cct' | 'coque' | 'geral';
  titulo: string;
  itens: ChecklistItem[];
  data_prevista: string;
  status: 'pendente' | 'em_andamento' | 'completo' | 'atrasado';
  criado_por: string;
  created_at: string;
  updated_at: string;
  created_locally?: boolean;
}

export interface RespostaChecklistItem {
  item_id: string;
  valor: string | number | boolean;
  observacao?: string;
}

export interface RespostaChecklist {
  id: string;
  checklist_id: string;
  equipamento_id: string;
  usuario_id: string;
  respostas: RespostaChecklistItem[];
  observacoes?: string;
  assinatura?: string;
  data_execucao: string;
  sincronizado: boolean;
  created_at: string;
}

export interface Foto {
  id: string;
  resposta_id: string;
  url?: string;
  nome_arquivo?: string;
  bucket_path?: string;
  created_at: string;
}

export interface SyncControl {
  id: string;
  usuario_id: string;
  tabela: string;
  ultima_sincronizacao?: string;
  registros_pendentes: number;
  created_at: string;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  usuario_id: string;
  tipo_operacao: 'insert' | 'update' | 'delete' | 'sync';
  tabela_afetada?: string;
  registro_id?: string;
  status: 'success' | 'error' | 'pending';
  mensagem?: string;
  created_at: string;
}

export type ChecklistStatus = 'pendente' | 'em_andamento' | 'completo' | 'atrasado';
export type EquipmentType = 'irrigacao' | 'cct' | 'coque' | 'geral';
export type UserRole = 'tecnico' | 'supervisor' | 'admin';

export interface CalibragemHeader {
  frota: string;
  equipamento: string;
  hodo?: string;
  os_item?: string;
  matricula?: string;
  nome?: string;
  data_ini: string;
  hora_ini?: string;
  data_fim?: string;
  hora_fim?: string;
}

export type SulcoMap = Record<string, { a: string; b: string }> & { est?: string };
export type PosMap = Record<string, string>;
export type CalibragemMap = Record<string, { encon: string; colo: string }>;

export interface CalibragemRecord {
  local_id: string;
  created_at: string;
  user_id: string;
  header: CalibragemHeader;
  pos: PosMap;
  sulco: SulcoMap;
  calibragem: CalibragemMap;
  observacoes?: string;
}

export interface Controle3pRow {
  seq: number;
  posicao: string;
  fogo?: string;
  medida?: string;
  fabricante?: string;
  modelo?: string;
  indice?: string;
  dot?: string;
  sulco1?: string;
  sulco2?: string;
  sulco3?: string;
  pressao?: string;
}

export interface Controle3pRecord {
  local_id: string;
  created_at: string;
  user_id: string;
  header: CalibragemHeader;
  rows: Controle3pRow[];
}
