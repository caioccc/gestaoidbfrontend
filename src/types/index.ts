// Tipos compartilhados do frontend - Gestão IDB
// Refletem as respostas do backend Django/DRF

export type ChurchType = 'INDEPENDENT' | 'CONGREGATION';
export type Role = 'PASTOR' | 'SECRETARIA' | 'TESOUREIRO' | 'INTERCESSAO' | 'LOUVOR' | 'MUSICO' | 'PROFESSOR_EBD';

export interface Church {
  id: number;
  name: string;
  church_type: ChurchType;
  church_type_display?: string;
  parent_church: number | null;
  is_approved: boolean;
  accounting_category?: string | null;
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
  logo?: string | null;
  pastoral_prebenda_percent?: string;
  responsible_user_id?: number | null;
  created_at: string;
  updated_at: string;
}

export type CardTheme = 'CLASSIC' | 'BLACK_PREMIUM';

export interface CardConfig {
  card_primary_color: string;
  card_secondary_color: string;
  card_valid_until: string | null;
  card_front_phrase: string;
  card_back_phrase: string;
  card_theme?: CardTheme;
}

export interface User {
  id: number;
  email: string;
  name: string;
  is_staff: boolean;
  is_active: boolean;
  church?: Church | null;
  role?: Role | null;
  role_display?: string | null;
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
  receipt?: string | null;
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
  receipt?: string | null;
  created_at: string;
}

export type FinancialReceiptType = 'SAIDA' | 'ENTRADA';

export interface FinancialReceipt {
  id: number;
  church: number;
  year: number;
  number: number;
  full_number: string;
  receipt_type: FinancialReceiptType;
  type_display: string;
  date: string;
  amount: string;
  amount_extenso: string;
  description: string;
  category?: DepartmentCategory | '';
  favored_name: string;
  favored_document?: string;
  favored_rg?: string;
  favored_city?: string;
  favored_state?: string;
  pix?: string;
  member?: number | null;
  member_name?: string | null;
  entry?: number | null;
  exit?: number | null;
  linked_description?: string;
  auto_launched: boolean;
  locked: boolean;
  pdf_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinancialReceiptPayload {
  receipt_type: FinancialReceiptType;
  date: string;
  amount: string | number;
  description: string;
  category?: DepartmentCategory | '';
  favored_name: string;
  favored_document?: string;
  favored_rg?: string;
  favored_city?: string;
  favored_state?: string;
  pix?: string;
  member?: number | null;
  entry?: number | null;
  exit?: number | null;
  auto_launch?: boolean;
}

export type CalendarEventCategory =
  | 'bill'
  | 'deadline'
  | 'meeting'
  | 'event'
  | 'culto'
  | 'ensaio';

export type CalendarEventAudience = 'GENERAL' | 'FINANCE';

export interface CalendarEvent {
  id: number;
  church: number;
  audience: CalendarEventAudience;
  audience_display: string;
  created_by: number | null;
  created_by_name: string;
  title: string;
  category: CalendarEventCategory;
  category_display: string;
  color: string;
  description: string;
  start_time: string | null;
  end_time: string | null;
  members: number[];
  members_names: { id: number; name: string }[];
  repeat_monthly: boolean;
  repeat_weekly: boolean;
  weekdays: number[];
  repeat_interval: number;
  repeat_end_date: string | null;
  date: string | null;
  month: number | null;
  day: number | null;
  repeat_monthly_weekday: number | null;
  repeat_monthly_ordinal: number | null;
  created_at: string;
}

export interface PublicCalendarEvent {
  id: number;
  title: string;
  category: CalendarEventCategory;
  category_display: string;
  color: string;
  description: string;
  start_time: string | null;
  end_time: string | null;
  repeat_monthly: boolean;
  repeat_weekly: boolean;
  weekdays: number[];
  repeat_interval: number;
  repeat_end_date: string | null;
  date: string | null;
  month: number | null;
  day: number | null;
  repeat_monthly_weekday: number | null;
  repeat_monthly_ordinal: number | null;
}

export interface PublicCalendarPayload {
  church: { id: number; name: string };
  events: PublicCalendarEvent[];
}

export interface CalendarPublicLink {
  hash: string;
  url: string;
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

export interface MemberImportInspection {
  kind: 'members';
  headers: string[];
  expected: SpreadsheetExpectedColumn[];
  suggested: Record<string, string>;
  rows: string[][];
}

export interface MemberImportResult {
  imported: number;
  updated: number;
  skipped: number;
  dry_run: boolean;
  errors: string[];
  rows_by_line: Record<number, [string, number | null]>;
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
  prebenda?: {
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
  treasury_photo_url: string | null;
  treasury_signature_url: string | null;
  signature_hash: string | null;
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
  church_type: ChurchType;
  church_type_display?: string;
  parent_church: number | null;
  parent_church_name?: string | null;
  is_approved: boolean;
  accounting_category?: string | null;
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
  requester_role?: { role: Role; role_display: string } | null;
}

export interface ChurchMembership {
  id: number;
  user_id: number;
  user_email: string;
  user_name: string;
  user_is_active: boolean;
  role: Role;
  role_display: string;
  created_at: string;
}

export type MemberStatus = 'ACTIVE' | 'INACTIVE';

export type LifecycleStage =
  | 'VISITOR'
  | 'INTEGRATION'
  | 'ACTIVE'
  | 'ABSENT_CARE'
  | 'TRANSITION';

export type ChurchEntry =
  | 'ACLAMACAO'
  | 'BATISMO'
  | 'RECONCILIACAO'
  | 'TRANSFERENCIA'
  | 'OUTRO';

export type MaritalStatus =
  | 'SOLTEIRO'
  | 'CASADO'
  | 'UNIAO_ESTAVEL'
  | 'SEPARADO'
  | 'DIVORCIADO'
  | 'VIUVO';

export type EducationLevel =
  | 'SEM_ESCOLARIDADE'
  | 'FUNDAMENTAL'
  | 'MEDIO_INCOMPLETO'
  | 'MEDIO'
  | 'SUPERIOR_INCOMPLETO'
  | 'SUPERIOR'
  | 'POS_GRADUACAO';

export type Kinship =
  | 'CONJUGE'
  | 'PAI'
  | 'MAE'
  | 'FILHO'
  | 'IRMAO'
  | 'AVO'
  | 'NETO'
  | 'OUTRO';

export interface MemberRelative {
  id: number;
  name: string;
  kinship: Kinship;
  birth_date: string | null;
  phone: string;
}

export interface MinistryArea {
  id: number;
  church: number;
  name: string;
  created_at: string;
}

export interface Member {
  id: number;
  church: number;
  name: string;
  phone: string;
  email: string;
  birth_date: string | null;
  baptism_date: string | null;
  cpf: string;
  rg: string;
  born_in_city: string;
  born_in_state: string;
  profession: string;
  education_level: EducationLevel | '';
  education_level_display: string;
  marital_status: MaritalStatus | '';
  marital_status_display: string;
  marriage_date: string | null;
  father_name: string;
  mother_name: string;
  card_number: string | null;
  church_entry: ChurchEntry | '';
  church_entry_display: string;
  church_entry_other: string;
  ministry_areas: number[];
  ministry_areas_display: MinistryArea[];
  photo: string | null;
  status: MemberStatus;
  status_display: string;
  lifecycle_stage?: LifecycleStage;
  lifecycle_stage_display?: string;
  last_contact_at?: string | null;
  notes: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  relatives: MemberRelative[];
  public_hash?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicCardPayload {
  name: string;
  card_number: string;
  photo: string | null;
  birth_date: string | null;
  status: MemberStatus;
  church_name: string;
  church_city: string;
  church_state: string;
  church_phone: string;
  card_primary_color: string;
  card_secondary_color: string;
  card_valid_until: string | null;
  card_front_phrase: string;
  card_back_phrase: string;
  card_theme?: CardTheme;
  public_hash?: string | null;
}

export interface PublicMemberProfile {
  name: string;
  photo: string | null;
  birth_date: string | null;
  status: MemberStatus;
  status_label: string;
  member_since: string | null;
  ministry_areas: string[];
  role_title: string | null;
  whatsapp: string | null;
  card_theme: CardTheme;
  valid_until: string | null;
  church: {
    name: string;
    city: string;
    state: string;
    logo: string | null;
  };
}

export interface PublicFormMeta {
  type: 'member' | 'candidate';
  church_name: string;
  church_city: string;
  church_state: string;
  church_phone: string;
  member_name?: string | null;
  card_number?: string | null;
}

export interface PublicSubmissionResult {
  id: number;
  status: string;
}

export type MemberSubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MemberSubmissionData {
  name: string;
  phone: string;
  email: string;
  birth_date: string | null;
  cpf: string;
  rg: string;
  born_in_city: string;
  born_in_state: string;
  profession: string;
  education_level: string;
  marital_status: string;
  marriage_date: string | null;
  father_name: string;
  mother_name: string;
  church_entry: string;
  church_entry_other: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  notes: string;
}

export interface MemberSubmission {
  id: number;
  church: number;
  member: number | null;
  member_name: string | null;
  member_card_number: string | null;
  source_hash: string;
  data: Partial<MemberSubmissionData>;
  status: MemberSubmissionStatus;
  status_display: string;
  reviewed_by: number | null;
  reviewed_by_name: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
}

export interface AccountingCategoryOption {
  value: string;
  label: string;
}

export type AppAlertType =
  | 'birthday_today'
  | 'birthday_upcoming'
  | 'card_validity_soon'
  | 'card_validity_expired'
  | 'loan_return_today'
  | 'loan_return_soon'
  | 'loan_return_overdue';

export interface AppAlert {
  type: AppAlertType;
  member_id?: number;
  member_name?: string;
  loan_id?: number;
  item_id?: number;
  item_name?: string;
  borrower_name?: string;
  date: string;
}

export interface AlertsResponse {
  alerts: AppAlert[];
  generated_at: string;
}

export interface StorageLocation {
  id: number;
  church: number;
  name: string;
  created_at: string;
}

export interface MaterialItemCurrentLoan {
  loan_id: number;
  borrower_display: string;
  borrowed_at: string;
  expected_return: string;
}

export interface MaterialItem {
  id: number;
  church: number;
  name: string;
  description: string;
  location: number | null;
  location_name: string | null;
  photo?: string | null;
  manual?: string | null;
  current_loan: MaterialItemCurrentLoan | null;
  created_at: string;
  updated_at: string;
}

export type LoanStatus = 'active' | 'overdue' | 'returned';

export interface Loan {
  id: number;
  church: number;
  item: number;
  item_name: string;
  member: number | null;
  member_name: string | null;
  member_phone: string | null;
  borrower_name: string;
  borrower_phone: string;
  borrower_display: string;
  contact_phone: string | null;
  whatsapp_url: string | null;
  borrowed_at: string;
  expected_return: string;
  returned_at: string | null;
  status: LoanStatus;
  notes: string;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export type MemberTransferStatus = 'PENDING' | 'RECEIVED' | 'CANCELED';

export interface MemberTransfer {
  id: number;
  source_church: number;
  source_church_name: string;
  source_member: number;
  target_church: number;
  target_church_name: string;
  status: MemberTransferStatus;
  status_display: string;
  issued_at: string;
  received_at: string | null;
  member_name: string;
  member_cpf: string;
  member_rg: string;
  member_birth_date: string | null;
  member_baptism_date: string | null;
  member_phone: string;
  member_email: string;
  member_profession: string;
  member_father_name: string;
  member_mother_name: string;
  member_street: string;
  member_number: string;
  member_complement: string;
  member_neighborhood: string;
  member_city: string;
  member_state: string;
  member_cep: string;
  member_notes: string;
}

export interface TransferTargetChurch {
  id: number;
  name: string;
  city: string;
  state: string;
}

export type MemberDocumentType =
  | 'RESIDENCE_PROOF'
  | 'OTHER';

export interface MemberDocument {
  id: number;
  member: number;
  doc_type: MemberDocumentType;
  doc_type_display: string;
  file_name: string;
  notes: string;
  uploaded_by: number | null;
  uploaded_by_name: string;
  uploaded_at: string;
}

export interface BirthdayMember {
  id: number;
  name: string;
  birth_date: string;
  day: number;
  age: number | null;
  phone: string;
  email: string;
}

export interface ResponsibleUserPayload {
  user_id?: number;
  email?: string;
  name?: string;
  role: Role;
}

export type WorshipServiceType =
  | 'CELEBRACAO'
  | 'DOUTRINA'
  | 'ORACAO'
  | 'VIGILIA'
  | 'CEIA'
  | 'ESCOLA_BIBLICA'
  | 'JOVENS'
  | 'OUTRO';

export interface WorshipService {
  id: number;
  church: number;
  date: string;
  time: string | null;
  service_type: WorshipServiceType;
  service_type_display: string;
  presider: string;
  preacher: string;
  theme: string;
  scripture: string;
  attendees: number;
  visitors: number;
  conversions: number;
  offering: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type MeetingType =
  | 'ASSEMBLEIA_GERAL'
  | 'ASSEMBLEIA_EXTRAORDINARIA'
  | 'DIRETORIA'
  | 'CONSELHO'
  | 'OUTRO';

export interface ChurchMinutes {
  id: number;
  church: number;
  title: string;
  meeting_type: MeetingType;
  meeting_type_display: string;
  meeting_date: string;
  location: string;
  recorder: string;
  participants: string;
  content: string;
  pdf: string | null;
  pdf_name: string | null;
  public_hash: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface PublicMinutesPayload {
  id: number;
  title: string;
  meeting_type: MeetingType;
  meeting_type_display: string;
  meeting_date: string;
  location: string;
  recorder: string;
  participants: string;
  content: string;
  has_pdf: boolean;
  church: {
    id: number;
    name: string;
    city: string;
    state: string;
  };
  created_at: string;
}

export type ChurchLinkType =
  | 'CUSTOM'
  | 'PIX'
  | 'WHATSAPP'
  | 'YOUTUBE'
  | 'MAPS'
  | 'INSTAGRAM'
  | 'CALENDAR'
  | 'MEMBERSHIP'
  | 'PRAYER'
  | 'GROWTH_GROUPS';

export type ChurchPixAmountMode = 'OPEN' | 'FIXED' | 'GRID';

export interface ChurchPublicLink {
  id: number;
  church: number;
  title: string;
  description?: string;
  link_type: ChurchLinkType;
  link_type_display: string;
  url: string;
  pix_key?: string | null;
  pix_type?: string | null;
  pix_amount_mode?: ChurchPixAmountMode | null;
  pix_fixed_amount?: string | number | null;
  pix_grid_amounts?: number[] | null;
  pix_open_amount?: boolean;
  whatsapp_number?: string;
  address_cep?: string;
  address_street?: string;
  address_number?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  icon_key: string | null;
  order: number;
  is_active: boolean;
  highlight: boolean;
  click_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChurchLinksConfig {
  slug: string;
  public_links_enabled: boolean;
  theme_color: string;
  default_pix_key: string | null;
  default_pix_type: string | null;
}

export interface PublicChurchLinkRowBase {
  title: string;
  link_type: ChurchLinkType;
  url: string;
  icon_key: string | null;
  highlight: boolean;
}

export interface PublicChurchLink extends PublicChurchLinkRowBase {
  id: number;
  description?: string;
  address?: string;
  link_type_display: string;
  pix_key?: string | null;
  pix_type?: string | null;
  pix_amount_mode?: ChurchPixAmountMode | null;
  pix_fixed_amount?: string | number | null;
  pix_grid_amounts?: number[] | null;
  pix_open_amount?: boolean;
}

export interface PublicChurchLinkSystem extends PublicChurchLinkRowBase {}

export interface PublicChurchLinksPayload {
  church: {
    id: number;
    name: string;
    city: string;
    state: string;
    theme_color: string;
    logo?: string | null;
  };
  system_links: PublicChurchLinkSystem[];
  links: PublicChurchLink[];
}

export type GrowthGroupWeekday = 0 | 1 | 2 | 4;

export type GrowthGroupCategory =
  | 'ADULTS'
  | 'YOUTH'
  | 'TEENS'
  | 'WOMEN'
  | 'MEN'
  | 'MIXED';

export const GROWTH_GROUP_WEEKDAYS: GrowthGroupWeekday[] = [0, 1, 2, 4];

export interface GrowthGroup {
  id: number;
  church: number;
  name: string;
  leader: number;
  leader_name: string;
  host: number | null;
  host_name: string | null;
  weekday: GrowthGroupWeekday;
  weekday_display: string;
  time: string | null;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  address: string;
  radius_meters: number;
  category: GrowthGroupCategory;
  category_display: string;
  is_full: boolean;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface GrowthGroupPayload {
  name: string;
  leader: number | null;
  host?: number | null;
  weekday: GrowthGroupWeekday | null;
  time: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  radius_meters: number;
  category: GrowthGroupCategory;
  is_full: boolean;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
}

export interface GrowthGroupStats {
  total_active: number;
  total_leaders: number;
  most_frequent_day: number | null;
  coverage: number;
  overlap_count: number;
  overlap_ids: number[];
}

export type PastoralVisitType =
  | 'ROUTINE'
  | 'ILLNESS'
  | 'BEREAVEMENT'
  | 'NEW_CONVERT'
  | 'SOCIAL_AID'
  | 'SPECIAL';

export type PastoralVisitStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED';

export type PrayerRequestCategory =
  | 'HEALTH'
  | 'FAMILY'
  | 'SPIRITUAL'
  | 'FINANCIAL'
  | 'GRIEF'
  | 'THANKSGIVING'
  | 'OTHER';

export type PrayerRequestStatus =
  | 'PENDING'
  | 'PRAYING'
  | 'VISIT_SCHEDULED'
  | 'ANSWERED'
  | 'ARCHIVED';

export type PrayerRequestPreferredPeriod = 'ANY' | 'MORNING' | 'AFTERNOON' | 'NIGHT';

export interface PrayerRequestAssignee {
  id: number;
  name: string;
  role: string;
}

export interface PrayerRequest {
  id: number;
  church: number;
  requester_name: string;
  requester_phone: string;
  is_anonymous: boolean;
  category: PrayerRequestCategory;
  category_display: string;
  description: string;
  wants_visit: boolean;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  preferred_period: PrayerRequestPreferredPeriod;
  preferred_period_display: string;
  status: PrayerRequestStatus;
  status_display: string;
  assigned_to: number | null;
  assigned_to_name: string;
  pastoral_notes: string;
  whatsapp_url: string | null;
  elapsed_days: number;
  created_at: string;
}

export interface PrayerRequestPayload {
  requester_name?: string;
  requester_phone?: string;
  is_anonymous?: boolean;
  category: PrayerRequestCategory;
  description: string;
  wants_visit?: boolean;
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  preferred_period?: PrayerRequestPreferredPeriod;
  status?: PrayerRequestStatus;
  assigned_to?: number | null;
  pastoral_notes?: string;
}

export interface PrayerRequestPublicPayload {
  requester_name?: string;
  requester_phone?: string;
  is_anonymous?: boolean;
  category: PrayerRequestCategory;
  description: string;
  wants_visit?: boolean;
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  preferred_period?: PrayerRequestPreferredPeriod;
}

export type PrayerVisitPreparedPayload = { id: number; url: string; phone: string };

export interface PastoralVisit {
  id: number;
  church: number;
  member: number | null;
  member_name: string;
  member_phone: string;
  member_whatsapp_url: string | null;
  target_name: string;
  target_phone: string;
  visit_type: PastoralVisitType;
  visit_type_display: string;
  status: PastoralVisitStatus;
  status_display: string;
  competence_year: number;
  competence_month: number;
  scheduled_date: string;
  completed_at: string | null;
  visited_by: string;
  notes: string;
  needs_followup: boolean;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  full_address: string;
  latitude: number | null;
  longitude: number | null;
  maps_url: string | null;
  prayer_request: number | null;
  prayer_request_requester_name: string;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface PastoralVisitPayload {
  member?: number | null;
  target_name?: string;
  target_phone?: string;
  visit_type: PastoralVisitType;
  competence_year: number;
  competence_month: number;
  scheduled_date: string;
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  latitude?: number | null;
  longitude?: number | null;
  needs_followup?: boolean;
  prayer_request?: number | null;
}

export interface PastoralVisitCompletePayload {
  completed_at?: string;
  visited_by?: string;
  notes?: string;
  needs_followup?: boolean;
}

export interface PastoralVisitSummary {
  year: number;
  month: number;
  total: number;
  planned: number;
  completed: number;
  cancelled: number;
  needs_followup: number;
  top_neighborhoods: { neighborhood: string; count: number }[];
}

export type MessageTemplateCategory =
  | 'BIRTHDAY'
  | 'WELCOME'
  | 'CARE'
  | 'VERSE'
  | 'CARD_EXPIRING'
  | 'CUSTOM';

export interface MessageTemplate {
  id: number;
  church: number;
  title: string;
  category: MessageTemplateCategory;
  category_display: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PreparedWhatsApp {
  member_id: number;
  whatsapp_url: string;
  formatted_message: string;
}

export interface SecretaryActionItem {
  member_id: number;
  name: string;
  photo: string | null;
  phone: string;
  lifecycle_stage: LifecycleStage | string;
  category_hint: MessageTemplateCategory;
}

export interface SecretaryActions {
  generated_at: string;
  birthdays_today: SecretaryActionItem[];
  absent_pending_contact: SecretaryActionItem[];
  new_visitors: SecretaryActionItem[];
  cards_expiring: SecretaryActionItem[];
}

export type CertificateType =
  | 'BAPTISM'
  | 'CHILD_PRESENTATION'
  | 'MEMBERSHIP_COURSE'
  | 'CUSTOM';

export type CertificateLayoutMode =
  | 'SYSTEM_DEFAULT'
  | 'CUSTOM_IMAGE'
  | 'BASE_PDF';

export type CertificateFieldKey =
  | 'recipient_name'
  | 'event_date'
  | 'church_name'
  | 'officiant_name'
  | 'parents_names'
  | 'scripture_verse'
  | 'custom_text'
  | 'registry_info'
  | 'certificate_number';

export interface CertificateFieldLayout {
  enabled: boolean;
  x: number;
  y: number;
  font_size: number;
  font_weight: '400' | '600' | '700';
  align: 'left' | 'center' | 'right';
  color: string;
}

export interface CertificateTemplate {
  id: number;
  church: number;
  name: string;
  certificate_type: CertificateType;
  certificate_type_display: string;
  layout_mode: CertificateLayoutMode;
  layout_mode_display: string;
  background_image: string | null;
  background_image_url: string | null;
  background_image_name: string | null;
  base_pdf: string | null;
  base_pdf_name: string | null;
  default_verse: string;
  is_active: boolean;
  fields_layout?: Record<CertificateFieldKey, CertificateFieldLayout> | null;
  created_at: string;
}

export interface EcclesiasticalCertificate {
  id: number;
  church: number;
  template: number | null;
  template_name: string | null;
  certificate_type: CertificateType;
  certificate_type_display: string;
  recipient_name: string;
  member: number | null;
  member_name: string | null;
  event_date: string;
  officiant_name: string;
  father_name: string;
  mother_name: string;
  scripture_verse: string;
  registry_book: string;
  registry_page: string;
  registry_number: string;
  generated_pdf: string | null;
  generated_pdf_name: string | null;
  created_by: number | null;
  created_at: string;
}

export interface CertificateIssueData {
  certificate_type: CertificateType;
  recipient_name: string;
  member: number | null;
  event_date: string;
  officiant_name: string;
  father_name?: string;
  mother_name?: string;
  scripture_verse?: string;
  registry_book?: string;
  registry_page?: string;
  registry_number?: string;
}

export type SundaySchoolCategory =
  | 'CHILDREN'
  | 'TEENS'
  | 'YOUTH'
  | 'ADULTS'
  | 'COUPLES'
  | 'DISCIPLESHIP';

export interface SundaySchoolClass {
  id: number;
  church: number;
  name: string;
  category: SundaySchoolCategory;
  category_display: string;
  teacher_name: string;
  co_teacher_name: string;
  room_location: string;
  is_active: boolean;
  enrollment_count: number;
  created_at: string;
  updated_at: string;
}

export interface SundaySchoolClassPayload {
  name: string;
  category: SundaySchoolCategory;
  teacher_name: string;
  co_teacher_name?: string;
  room_location?: string;
  is_active?: boolean;
}

export interface SundaySchoolEnrollment {
  id: number;
  sunday_school_class: number;
  member: number | null;
  member_name: string;
  student_name: string;
  phone: string;
  whatsapp_url: string | null;
  is_active: boolean;
  joined_at: string;
}

export interface SundaySchoolEnrollmentPayload {
  student_name: string;
  phone?: string;
  member?: number | null;
  is_active?: boolean;
}

export interface SundaySchoolAttendance {
  id: number;
  session: number;
  enrollment: number;
  student_name: string;
  is_present: boolean;
  brought_bible: boolean;
  brought_magazine: boolean;
  whatsapp_url: string | null;
}

export interface SundaySchoolSession {
  id: number;
  sunday_school_class: number;
  class_name: string;
  date: string;
  topic: string;
  bibles_count: number;
  magazines_count: number;
  visitors_count: number;
  offering_amount: string;
  notes: string;
  registered_by: number | null;
  registered_by_name: string;
  present_count: number;
  attendances: SundaySchoolAttendance[];
  created_at: string;
  updated_at: string;
}

export interface SundaySchoolAttendanceInput {
  enrollment_id: number;
  is_present?: boolean;
  brought_bible?: boolean;
  brought_magazine?: boolean;
}

export interface SundaySchoolSessionPayload {
  sunday_school_class: number;
  date: string;
  topic?: string;
  bibles_count?: number;
  magazines_count?: number;
  visitors_count?: number;
  offering_amount?: string | number;
  notes?: string;
  attendance?: SundaySchoolAttendanceInput[];
}

export interface SundaySchoolReportColumn {
  date: string;
  session_id: number | null;
  topic: string;
}

export interface SundaySchoolReportStudent {
  enrollment_id: number;
  student_name: string;
  phone: string;
  whatsapp_url: string | null;
  attendance: (boolean | null)[];
  present_count: number;
  total_sessions: number;
  presence_percent: number;
  consecutive_absences: number;
  risk_evasion: boolean;
}

export interface SundaySchoolClassReport {
  class_id: number;
  class_name: string;
  category_display: string;
  teacher_name: string;
  room_location: string;
  columns: SundaySchoolReportColumn[];
  students: SundaySchoolReportStudent[];
  offering_total: string;
  avg_bibles: number;
  avg_magazines: number;
  visitors_total: number;
  session_count: number;
}

export interface SundaySchoolMonthlyReport {
  year: number;
  month: number;
  month_name: string;
  classes: SundaySchoolClassReport[];
}

export interface SundaySchoolWhatsAppRow {
  enrollment_id: number;
  student_name: string;
  phone: string;
  url: string;
}

// ---------------------------------------------------------------------------
// Louvor & Música
// ---------------------------------------------------------------------------

export interface Ministry {
  id: number;
  church: number;
  name: string;
  color: string;
  leader: number | null;
  leader_name: string;
  is_active: boolean;
  roles: MinistryRole[];
}

export interface Band {
  id: number;
  church: number;
  name: string;
  color: string;
  photo: string | null;
  leader: number | null;
  leader_name: string;
  is_active: boolean;
  song_count: number;
}

export interface MinistryRole {
  id: number;
  ministry: number;
  name: string;
  is_active: boolean;
}

export type RosterAssignmentStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

export interface RosterAssignment {
  id: number;
  roster: number;
  ministry: number;
  ministry_name: string;
  ministry_color: string;
  role: number;
  role_name: string;
  user: number;
  user_name: string;
  status: RosterAssignmentStatus;
  status_display: string;
  notes: string;
}

export interface VolunteerRoster {
  id: number;
  church: number;
  date: string;
  time: string | null;
  theme: string;
  notes: string;
  is_published: boolean;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  assignments: RosterAssignment[];
  setlist: WorshipSetlist | null;
}

export interface RosterBoardRow {
  user_name: string;
  role_name: string;
  status: RosterAssignmentStatus;
  ministry_color: string;
}

export interface WorshipSetlist {
  id: number;
  roster: number;
  items: SetlistItem[];
  created_at: string;
  updated_at: string;
}

export interface SetlistItem {
  id: number;
  setlist: number;
  song: number;
  song_title: string;
  song_artist: string;
  order: number;
  custom_key: string;
  notes: string;
}

export interface ChordItem {
  note: string;
  note_fmt: string;
  image: string;
  start: number;
  end: number;
  tempo: number | null;
  instrument: string;
}

export type ChordStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'MANUAL';

export interface Song {
  id: number;
  church: number;
  band: number | null;
  band_name: string;
  band_color: string;
  title: string;
  artist: string;
  youtube_id: string;
  youtube_title: string;
  thumbnail_url: string;
  duration_seconds: number | null;
  original_key: string;
  church_key: string;
  bpm: number | null;
  time_signature: string;
  chords: string;
  chords_json: ChordItem[];
  lyrics: string;
  tags: string;
  times_played: number;
  last_played: string | null;
  is_active: boolean;
  chord_status: ChordStatus;
  chord_error: string;
  chord_retries: number;
  chord_processed_at: string | null;
  created_at: string;
}

export interface SongHistoryItem {
  date: string;
  name: string;
  key: string;
  kind: string;
  setlist_id?: number;
}

export interface YouTubeSearchResult {
  title: string;
  youtube_id: string;
  duration: string;
  channel_name: string;
  view_count: string;
  thumbnail_url: string;
}

export interface YouTubeSearchResponse {
  status: 'success' | 'unavailable';
  source?: 'requests' | 'ytdlp' | 'selenium';
  results: YouTubeSearchResult[];
  message?: string;
}

export interface ChordifyData {
  status?: 'success' | 'unavailable';
  youtube_id: string;
  chords_formatada: ChordItem[];
  format_key: string;
  derivedKey?: string;
  derivedBpm?: number;
  message?: string;
  error?: string;
}

export interface BandSetlistItemPayload {
  song: number;
  order?: number;
  custom_key?: string;
  notes?: string;
}

export interface BandSetlistPayload {
  band?: number | null;
  date: string;
  description: string;
  theme?: string;
  notes?: string;
  items?: BandSetlistItemPayload[];
}

export interface BandSetlistItem {
  id: number;
  setlist: number;
  song: number;
  song_title: string;
  song_artist: string;
  song_church_key: string;
  song_bpm: number | null;
  order: number;
  custom_key: string;
  notes: string;
}

export interface BandSetlist {
  id: number;
  church: number;
  band: number | null;
  band_name: string;
  band_color: string;
  date: string;
  description: string;
  theme: string;
  notes: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  items: BandSetlistItem[];
}
