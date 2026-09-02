// Tipos compartilhados do frontend - Eclésia IDB
// Refletem as respostas do backend Django/DRF

export interface Church {
  id: number;
  name: string;
  pastor_name: string;
  treasurer_name: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  pastoral_prebenda_percent?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  is_staff: boolean;
  is_active: boolean;
  church?: Church | null;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type DepartmentCategory =
  | 'DIZIMO'
  | 'OFERTA'
  | 'VISAO_CORPORATIVA'
  | 'CONSTRUCAO'
  | 'ESPECIAL'
  | 'MISSOES'
  | 'MULHERES'
  | 'HOMENS'
  | 'JOVENS'
  | 'ESC_BIBLICA'
  | 'INFANTIL'
  | 'ADOLESCENTES'
  | 'CASAIS';

export interface Category {
  value: DepartmentCategory;
  label: string;
}

export interface FinancialEntry {
  id: number;
  church: number;
  date: string;
  service_description: string;
  category: DepartmentCategory;
  category_display: string;
  amount: string;
  created_at: string;
}

export interface FinancialExit {
  id: number;
  church: number;
  date: string;
  description: string;
  category: DepartmentCategory;
  category_display: string;
  amount: string;
  receipt: string | null;
  receipt_url: string | null;
  created_at: string;
}

export type CalendarEventCategory = 'bill' | 'deadline' | 'meeting' | 'event';

export interface CalendarEvent {
  id: number;
  church: number;
  title: string;
  category: CalendarEventCategory;
  category_display: string;
  repeat_monthly: boolean;
  date: string | null;
  month: number | null;
  day: number | null;
  created_at: string;
}

export interface Tither {
  id: number;
  church: number;
  name: string;
  is_anonymous: boolean;
  created_at: string;
}

export interface TitheRecord {
  id: number;
  tither: number;
  tither_name: string;
  year: number;
  month: number;
  amount: string;
}

export interface MonthlyClosing {
  id: number;
  church: number;
  year: number;
  month: number;
  is_closed: boolean;
  previous_balance: string;
  total_entries: string;
  total_exits: string;
  final_balance: string;
}

export interface MonthlyClosingsResponse {
  year: number;
  grand_total: {
    previous_balance: string;
    total_entries: string;
    total_exits: string;
    final_balance: string;
  };
  months: MonthlyClosing[];
}

export interface MonthlySeriesPoint {
  month: number;
  entries: number;
  exits: number;
  monthly_balance: number;
  cumulative: number;
}

export interface DashboardSummary {
  year: number;
  total_entries: number;
  total_exits: number;
  balance: number;
  series: MonthlySeriesPoint[];
}

export interface Reconciliation {
  year: number;
  month: number;
  status: 'CONCILIADO' | 'DIVERGENTE';
  total_tithe_records: number;
  total_entries_dizimo: number;
  difference: number;
  is_reconciled?: boolean;
  tithers_total?: number;
  entries_tithe_total?: number;
}

export interface TitherMatrixMember {
  id: number;
  name: string;
  is_anonymous: boolean;
  months: (string | null)[];
  total: string;
}

export interface TitherMatrix {
  year: number;
  grand_total: string;
  month_totals: string[];
  members: TitherMatrixMember[];
}

export interface TitheRateio {
  total_dizimos: number;
  percentual_total: number;
  regiao: number;
  fundo_ministerial: number;
  distrito: number;
  evangelismo: number;
  total_remessa_dizimos: number;
}

export interface DepartmentOffer {
  categoria: DepartmentCategory;
  total: number;
  percentual: number;
  remessa: number;
}

export interface Remittance {
  title: string;
  year: number;
  month: number;
  dizimos: TitheRateio;
  ofertas_departamentos: Record<DepartmentCategory, DepartmentOffer>;
  total_remittance_offers: number;
  total_remittance: number;
}

export interface MonthlyBalance {
  year: number;
  month: number;
  total_entries: number;
  total_exits: number;
  balance: number;
}

export interface RegionalReport {
  remittance: Remittance;
  monthly_balance: MonthlyBalance;
  monthly_closing: {
    id: number;
    previous_balance: number;
    total_entries: number;
    total_exits: number;
    final_balance: number;
    is_closed: boolean;
  };
}

export interface ImportResult {
  entries_imported: number;
  exits_imported: number;
  tithers_imported: number;
  tithe_records_imported: number;
  errors: string[];
  errors_by_file?: Record<string, string[]>;
  diagnostics?: { caixa?: ReconciliationItem[]; relatorio?: ReconciliationItem[] };
  existing_entries?: number;
  existing_exits?: number;
  existing_tithe_records?: number;
  dry_run?: boolean;
}

export interface ExistingMonthData {
  year: number;
  month: number;
  entries: number;
  exits: number;
  tithe_records: number;
}

export interface SpreadsheetExpectedColumn {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
}

export interface SpreadsheetInspection {
  kind: 'entries' | 'exits' | 'tithers';
  headers: string[];
  expected: SpreadsheetExpectedColumn[];
  suggested: Record<string, string>;
  rows: string[][];
}

export interface ReconciliationItem {
  label: string;
  provided: number;
  expected: number;
  difference: number;
  status: 'OK' | 'DIVERGENTE';
}

export interface DreSummary {
  year: number;
  month: number | null;
  total_revenue: string;
  total_expenses: string;
  net_result: string;
  revenue_by_category: { category: string; label: string; value: string }[];
  expenses_by_nature: { nature: string; label: string; value: string }[];
}

export interface TitherRepeatAudit {
  year: number;
  month: number;
  base_year: number;
  base_month: number;
  base_count: number;
  current_count: number;
  repeated_count: number;
  repeat_percent: string | null;
  threshold: string;
  ok: boolean;
  missing_members: { id: number; name: string }[];
}

export interface ValidationChecks {
  closing: {
    is_closed: boolean;
    previous_balance: string;
    total_entries: string;
    total_exits: string;
    final_balance: string;
  };
  prebenda: {
    percent: string;
    expected: string;
    recorded: string;
    difference: string;
    tolerance: string;
    ok: boolean;
  };
  tither_repeat: TitherRepeatAudit;
  nature_summary: { nature: string; label: string; value: string }[];
}

export type MonthlyValidationStatus =
  | 'PENDING'
  | 'TREASURY_APPROVED'
  | 'LEADERSHIP_APPROVED'
  | 'REJECTED';

export interface MonthlyValidation {
  id: number;
  church: number;
  year: number;
  month: number;
  status: MonthlyValidationStatus;
  status_display: string;
  note: string;
  approved_by_treasury: number | null;
  treasury_approved_at: string | null;
  approved_by_leadership: number | null;
  leadership_approved_at: string | null;
  rejected_by_treasury: number | null;
  treasury_rejected_at: string | null;
  rejected_by_leadership: number | null;
  leadership_rejected_at: string | null;
  updated_at: string | null;
}

export interface MonthlyValidationResponse {
  year: number;
  month: number;
  checks: ValidationChecks;
  validation: MonthlyValidation | null;
}

export interface PendingChurch {
  id: number;
  name: string;
  pastor_name: string;
  treasurer_name: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
  user?: User | null;
}
