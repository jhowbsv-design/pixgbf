export type UserRole = 'admin' | 'promoter' | 'cashier' | 'ADM' | 'PROMOTOR' | 'CAIXA';

export interface UserProfile {
  uid: string;
  id?: string; // For compatibility
  displayName: string;
  nome?: string; // For compatibility
  email: string;
  usuario?: string; // For compatibility
  phoneNumber?: string;
  role: UserRole;
  tipo?: UserRole; // For compatibility
  company: string;
  empresa_id?: string; // For compatibility
  empresa_nome?: string; // For compatibility
  grupo_empresa_id?: string;
  active: boolean;
  ativo?: boolean; // For compatibility
  isPreRegistered?: boolean;
  ultimo_login?: string;
  tentativas_login?: number;
  bloqueado_ate?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LoginLog {
  id: string;
  usuario: string;
  data_hora: string;
  ip?: string;
  dispositivo?: string;
  sucesso: boolean;
  detalhes?: string;
}

export type PixKeyType = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';

export interface Bank {
  id: string;
  name: string;
  nome?: string; // Add alias for compatibility
  code?: string;
  pixKey: string;
  pixKeyType: PixKeyType;
  active: boolean;
  logoUrl?: string;
  empresa_id?: string;
  grupo_empresa_id?: string;
  created_at: string;
  updated_at: string;
}

export type PixStatus = 'pending' | 'confirmed' | 'cancelled' | 'launched';

export interface Empresa {
  id: string;
  name: string;
  nome?: string; // Add alias for compatibility
  cnpj?: string;
  active: boolean;
  grupo_empresa_id?: string;
}

export interface BusinessGroup {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface PixRecord {
  id: string;
  valor: number;
  data_pix: string; // ISO 8601
  cliente: string;
  depositante: string;
  promotor: string;
  promotor_id: string;
  empresa: string;
  empresa_nome?: string; // Add alias for compatibility
  empresa_id: string;
  grupo_empresa_id?: string;
  cpf_cliente?: string;
  banco_id: string;
  banco_nome?: string;
  banco_chave?: string;
  banco_tipo_chave?: PixKeyType;
  status: PixStatus;
  observacoes?: string;
  comprovante_url?: string;
  confirmed_at?: string;
  confirmed_by?: string;
  confirmed_by_id?: string;
  cash_launched_at?: string;
  cash_launched_by?: string;
  cash_launched_by_id?: string;
  justification?: string;
  old_valor?: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  empresa_id?: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Draw {
  id: string;
  type: string;
  periodStart?: string;
  periodEnd?: string;
  minValue?: number;
  filters?: {
    startDate?: string;
    endDate?: string;
    startConfirmDate?: string;
    endConfirmDate?: string;
    minValue?: number;
    empresaId?: string;
    winnersCount: number;
  };
  participantsCount: number;
  participantsIds?: string[];
  participantsNames?: string[]; // Added for TV Mode scrolling
  winners: PixRecord[];
  createdBy: string;
  createdById?: string;
  empresa_id?: string;
  timestamp: string;
}

export interface TVState {
  id: string;
  status: 'idle' | 'drawing' | 'result';
  drawId?: string;
  participantsNames?: string[];
  winners?: PixRecord[];
  timestamp: string;
}
