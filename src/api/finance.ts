import apiClient from './client';
import {
  CalendarEvent,
  Category,
  DashboardSummary,
  DepartmentCategory,
  DreSummary,
  ExistingMonthData,
  FinancialEntry,
  FinancialExit,
  FinancialReceipt,
  FinancialReceiptPayload,
  ImportResult,
  MonthlyClosingsResponse,
  MonthlyValidation,
  MonthlyValidationResponse,
  Paginated,
  PublicCalendarPayload,
  Reconciliation,
  RegionalReport,
  Tither,
  TitheRecord,
  TitherMatrix,
  TitherRepeatAudit,
  SpreadsheetInspection,
} from '../types';

export const financeApi = {
  // Dashboard
  dashboardSummary: (year: number): Promise<DashboardSummary> =>
    apiClient
      .get('/api/finance/dashboard/summary/', { params: { year } })
      .then((r) => r.data),

  // Entries (paginated)
  listEntries: (params?: {
    page?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<Paginated<FinancialEntry>> =>
    apiClient.get('/api/finance/entries/', { params }).then((r) => r.data),

  getEntry: (id: number): Promise<FinancialEntry> =>
    apiClient.get(`/api/finance/entries/${id}/`).then((r) => r.data),

  createEntry: (payload: Partial<FinancialEntry>): Promise<FinancialEntry> =>
    apiClient.post('/api/finance/entries/', payload).then((r) => r.data),

  updateEntry: (id: number, payload: Partial<FinancialEntry>): Promise<FinancialEntry> =>
    apiClient.patch(`/api/finance/entries/${id}/`, payload).then((r) => r.data),

  deleteEntry: (id: number): Promise<void> =>
    apiClient.delete(`/api/finance/entries/${id}/`),

  // Exits (paginated)
  listExits: (params?: {
    page?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<Paginated<FinancialExit>> =>
    apiClient.get('/api/finance/exits/', { params }).then((r) => r.data),

  getExit: (id: number): Promise<FinancialExit> =>
    apiClient.get(`/api/finance/exits/${id}/`).then((r) => r.data),

  createExit: (payload: FormData | Partial<FinancialExit>): Promise<FinancialExit> =>
    apiClient.post('/api/finance/exits/', payload).then((r) => r.data),

  updateExit: (id: number, payload: FormData | Partial<FinancialExit>): Promise<FinancialExit> =>
    apiClient.patch(`/api/finance/exits/${id}/`, payload).then((r) => r.data),

  deleteExit: (id: number): Promise<void> =>
    apiClient.delete(`/api/finance/exits/${id}/`),

  // Import spreadsheet
  importSpreadsheet: (formData: FormData): Promise<ImportResult> =>
    apiClient
      .post('/api/finance/import-spreadsheet/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  inspectSpreadsheet: (
    kind: 'entries' | 'exits' | 'tithers',
    file: File
  ): Promise<SpreadsheetInspection> => {
    const fd = new FormData();
    fd.append('kind', kind);
    fd.append('file', file);
    return apiClient
      .post('/api/finance/import-inspect-spreadsheet/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  importAvailability: (year: number, month: number): Promise<ExistingMonthData> =>
    apiClient
      .get('/api/finance/import-availability/', {
        params: { year, month },
      })
      .then((r) => r.data),

  // Reconciliation
  reconciliation: (year: number, month: number): Promise<Reconciliation> =>
    apiClient
      .get('/api/finance/tithers/reconciliation/', {
        params: { year, month },
      })
      .then((r) => r.data),

  tithersMatrix: (year: number): Promise<TitherMatrix> =>
    apiClient
      .get('/api/finance/tithers/matrix/', { params: { year } })
      .then((r) => r.data),

  // Tithers (membros dizimistas)
  listTithers: (): Promise<Tither[]> =>
    apiClient.get('/api/finance/tithers/').then((r) => r.data.results),

  createTither: (payload: Partial<Tither>): Promise<Tither> =>
    apiClient.post('/api/finance/tithers/', payload).then((r) => r.data),

  updateTither: (id: number, payload: Partial<Tither>): Promise<Tither> =>
    apiClient.patch(`/api/finance/tithers/${id}/`, payload).then((r) => r.data),

  deleteTither: (id: number): Promise<void> =>
    apiClient.delete(`/api/finance/tithers/${id}/`),

  updateTitherTitheRecords: (
    id: number,
    year: number,
    months: (string | number | null)[],
  ): Promise<{ member_id: number; year: number; months: (string | null)[] }> =>
    apiClient
      .patch(`/api/finance/tithers/${id}/tithe-records/`, { year, months })
      .then((r) => r.data),

  monthlyClosings: (year: number): Promise<MonthlyClosingsResponse> =>
    apiClient
      .get('/api/finance/monthly-closings/', { params: { year } })
      .then((r) => r.data),

  closeMonth: (
    year: number,
    month: number,
    closed: boolean
  ): Promise<{ year: number; month: number; is_closed: boolean }> =>
    apiClient
      .post(
        '/api/finance/monthly-closings/',
        { closed },
        { params: { year, month } }
      )
      .then((r) => r.data),

  // Reports
  regionalReport: (year: number, month: number): Promise<RegionalReport> =>
    apiClient
      .get('/api/finance/reports/regional/', { params: { year, month } })
      .then((r) => r.data),

  regionalReportPdfUrl: (year: number, month: number): string =>
    `/api/finance/reports/regional/pdf/?year=${year}&month=${month}`,

  // Filled official templates (.xls) as blob
  regionalReportXls: (year: number, month: number): Promise<Blob> =>
    apiClient
      .get('/api/finance/reports/regional/xls/', {
        params: { year, month },
        responseType: 'blob',
      })
      .then((r) => r.data),

  caixaDownload: (year: number, month: number): Promise<Blob> =>
    apiClient
      .get('/api/finance/reports/caixa/download/', {
        params: { year, month },
        responseType: 'blob',
      })
      .then((r) => r.data),

  nationalReportXlsx: (year: number, month: number): Promise<Blob> =>
    apiClient
      .get('/api/finance/reports/national/xlsx/', {
        params: { year, month },
        responseType: 'blob',
      })
      .then((r) => r.data),

  categories: (): Promise<Category[]> =>
    apiClient.get('/api/finance/categories/').then((r) => r.data),

  // DRE por natureza e premissas contábeis IDB
  dreSummary: (year: number, month?: number): Promise<DreSummary> =>
    apiClient
      .get('/api/finance/dre/summary/', { params: { year, month } })
      .then((r) => r.data),

  titherRepeatAudit: (year: number, month: number): Promise<TitherRepeatAudit> =>
    apiClient
      .get('/api/finance/tithers/repeat-audit/', { params: { year, month } })
      .then((r) => r.data),

  validation: (year: number, month: number): Promise<MonthlyValidationResponse> =>
    apiClient
      .get('/api/finance/validation/', { params: { year, month } })
      .then((r) => r.data),

  submitValidation: (
    year: number,
    month: number,
    action: 'approve' | 'reject',
    note?: string,
    photo?: string | null,
    signature?: string | null
  ): Promise<MonthlyValidation> =>
    apiClient
      .post(
        '/api/finance/validation/',
        {
          action,
          note: note ?? '',
          ...(photo ? { photo } : {}),
          ...(signature ? { signature } : {}),
        },
        { params: { year, month } }
      )
      .then((r) => r.data),

  // Exports (planilhas preenchidas / fechamento mensal)
  exportEntries: (year: number, month: number): Promise<Blob> =>
    apiClient
      .get('/api/finance/export/entries/', {
        params: { year, month },
        responseType: 'blob',
      })
      .then((r) => r.data),

  exportExits: (year: number, month: number): Promise<Blob> =>
    apiClient
      .get('/api/finance/export/exits/', {
        params: { year, month },
        responseType: 'blob',
      })
      .then((r) => r.data),

  exportClosings: (
    mode: 'annual' | 'period',
    year: number,
    month?: number
  ): Promise<Blob> =>
    apiClient
      .get('/api/finance/export/closings/', {
        params: { mode, year, ...(month ? { month } : {}) },
        responseType: 'blob',
      })
      .then((r) => r.data),
};

// Eventos do calendário da igreja (agenda da secretaria + financeiro da tesouraria).
export const calendarEventsApi = {
  list: (): Promise<CalendarEvent[]> =>
    apiClient.get('/api/finance/calendar/events/').then((r) => r.data),

  create: (payload: Partial<CalendarEvent>): Promise<CalendarEvent> =>
    apiClient.post('/api/finance/calendar/events/', payload).then((r) => r.data),

  update: (id: number, payload: Partial<CalendarEvent>): Promise<CalendarEvent> =>
    apiClient.patch(`/api/finance/calendar/events/${id}/`, payload).then((r) => r.data),

  delete: (id: number): Promise<void> =>
    apiClient.delete(`/api/finance/calendar/events/${id}/`),
};

// Calendário público (página /calendario/{hash}) — não exige autenticação.
export interface PublicCalendarApi {
  get: (hash: string) => Promise<PublicCalendarPayload>;
}

export const publicCalendarApi: PublicCalendarApi = {
  get: (hash: string) =>
    apiClient
      .get(`/api/finance/public/calendar/${hash}/`)
      .then((r) => r.data as PublicCalendarPayload),
};

// Recibos Financeiros (saída/pagamento e entrada/doação) — PDF A4 em 2 vias.
export const receiptsApi = {
  list: (params?: {
    page?: number;
    year?: number;
    receipt_type?: 'SAIDA' | 'ENTRADA';
    search?: string;
  }): Promise<Paginated<FinancialReceipt>> =>
    apiClient.get('/api/finance/receipts/', { params }).then((r) => r.data),

  get: (id: number): Promise<FinancialReceipt> =>
    apiClient.get(`/api/finance/receipts/${id}/`).then((r) => r.data),

  create: (payload: FinancialReceiptPayload): Promise<FinancialReceipt> =>
    apiClient.post('/api/finance/receipts/', payload).then((r) => r.data),

  update: (
    id: number,
    payload: Partial<FinancialReceiptPayload>
  ): Promise<FinancialReceipt> =>
    apiClient.patch(`/api/finance/receipts/${id}/`, payload).then((r) => r.data),

  delete: (id: number): Promise<void> =>
    apiClient.delete(`/api/finance/receipts/${id}/`),

  pdfUrl: (id: number): string =>
    `/api/finance/receipts/${id}/pdf/`,

  // Emite recibo e retorna o blob PDF para download imediato (stream).
  downloadPdf: (id: number): Promise<Blob> =>
    apiClient
      .get(`/api/finance/receipts/${id}/pdf/`, { responseType: 'blob' })
      .then((r) => r.data),
};

// Arquivos modelo oficiais servidos estaticamente pelo Next (/public/templates).
export const TEMPLATE_FILES: Record<string, string> = {
  entries: '/templates/modelo_entradas.xlsx',
  exits: '/templates/modelo_saidas.xlsx',
  tithers: '/templates/modelo_membros_dizimistas.xls',
  caixa: '/templates/modelo_caixa.xls',
  relatorio: '/templates/modelo_relatorio.xls',
  'relatorio-nacional': '/templates/relatorio-nacional.xlsx',
};

export function saveBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Helpers para criação de FormData de importação
export function buildImportFormData(files: {
  entries?: File;
  exits?: File;
  tithers?: File;
}): FormData {
  const form = new FormData();
  if (files.entries) form.append('entries', files.entries);
  if (files.exits) form.append('exits', files.exits);
  if (files.tithers) form.append('tithers', files.tithers);
  return form;
}

export const CATEGORY_COLORS: Record<DepartmentCategory, string> = {
  DIZIMO: 'blue',
  OFERTA: 'teal',
  VISAO_CORPORATIVA: 'grape',
  CONSTRUCAO: 'orange',
  ESPECIAL: 'grape',
  MISSOES: 'indigo',
  MULHERES: 'pink',
  HOMENS: 'cyan',
  JOVENS: 'lime',
  ESC_BIBLICA: 'yellow',
  INFANTIL: 'red',
  ADOLESCENTES: 'violet',
  CASAIS: 'green',
};

// Busca todas as páginas de um endpoint paginado (limite de segurança)
export async function fetchAllPages<T>(
  fetcher: (page: number) => Promise<Paginated<T>>
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let next: string | null = null;
  do {
    const data = await fetcher(page);
    all.push(...data.results);
    next = data.next;
    page += 1;
  } while (next && page <= 500);
  return all;
}
