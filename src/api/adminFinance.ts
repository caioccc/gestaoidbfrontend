import apiClient from './client';
import {
  CalendarEvent,
  Category,
  DashboardSummary,
  DreSummary,
  ExistingMonthData,
  FinancialEntry,
  FinancialExit,
  ImportResult,
  MonthlyClosingsResponse,
  MonthlyValidation,
  MonthlyValidationResponse,
  Paginated,
  Reconciliation,
  RegionalReport,
  SpreadsheetInspection,
  Tither,
  TitherMatrix,
  TitherRepeatAudit,
} from '../types';

export interface AdminFinanceApi {
  dashboardSummary: (year: number) => Promise<DashboardSummary>;
  listEntries: (params?: {
    page?: number;
    start_date?: string;
    end_date?: string;
  }) => Promise<Paginated<FinancialEntry>>;
  createEntry: (payload: Partial<FinancialEntry>) => Promise<FinancialEntry>;
  updateEntry: (id: number, payload: Partial<FinancialEntry>) => Promise<FinancialEntry>;
  deleteEntry: (id: number) => Promise<void>;
  listExits: (params?: {
    page?: number;
    start_date?: string;
    end_date?: string;
  }) => Promise<Paginated<FinancialExit>>;
  createExit: (
    payload: FormData | Partial<FinancialExit>
  ) => Promise<FinancialExit>;
  updateExit: (
    id: number,
    payload: FormData | Partial<FinancialExit>
  ) => Promise<FinancialExit>;
  deleteExit: (id: number) => Promise<void>;
  importSpreadsheet: (formData: FormData) => Promise<ImportResult>;
  inspectSpreadsheet: (
    kind: 'entries' | 'exits' | 'tithers',
    file: File
  ) => Promise<SpreadsheetInspection>;
  importAvailability: (year: number, month: number) => Promise<ExistingMonthData>;
  reconciliation: (year: number, month: number) => Promise<Reconciliation>;
  tithersMatrix: (year: number) => Promise<TitherMatrix>;
  listTithers: () => Promise<Tither[]>;
  createTither: (payload: Partial<Tither>) => Promise<Tither>;
  updateTither: (id: number, payload: Partial<Tither>) => Promise<Tither>;
  deleteTither: (id: number) => Promise<void>;
  updateTitherTitheRecords: (
    id: number,
    year: number,
    months: (string | number | null)[],
  ) => Promise<{ member_id: number; year: number; months: (string | null)[] }>;
  monthlyClosings: (year: number) => Promise<MonthlyClosingsResponse>;
  closeMonth: (
    year: number,
    month: number,
    closed: boolean
  ) => Promise<{ year: number; month: number; is_closed: boolean }>;
  regionalReport: (year: number, month: number) => Promise<RegionalReport>;
  regionalReportPdfUrl: (year: number, month: number) => string;
  nationalReportXlsx: (year: number, month: number) => Promise<Blob>;
  categories: () => Promise<Category[]>;
  dreSummary: (year: number, month?: number) => Promise<DreSummary>;
  titherRepeatAudit: (year: number, month: number) => Promise<TitherRepeatAudit>;
  validation: (year: number, month: number) => Promise<MonthlyValidationResponse>;
  submitValidation: (
    year: number,
    month: number,
    action: 'approve' | 'reject',
    note?: string,
    photo?: string | null,
    signature?: string | null
  ) => Promise<MonthlyValidation>;
  exportEntries: (year: number, month: number) => Promise<Blob>;
  exportExits: (year: number, month: number) => Promise<Blob>;
  exportClosings: (
    mode: 'annual' | 'period',
    year: number,
    month?: number
  ) => Promise<Blob>;
  caixaDownload: (year: number, month: number) => Promise<Blob>;
  listCalendarEvents: () => Promise<CalendarEvent[]>;
  createCalendarEvent: (payload: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  updateCalendarEvent: (id: number, payload: Partial<CalendarEvent>) => Promise<CalendarEvent>;
  deleteCalendarEvent: (id: number) => Promise<void>;
}

export function createAdminFinance(churchId: number): AdminFinanceApi {
  const base = `/api/finance/admin/churches/${churchId}`;

  return {
    dashboardSummary: (year) =>
      apiClient
        .get(`${base}/dashboard/summary/`, { params: { year } })
        .then((r) => r.data),

    listEntries: (params) =>
      apiClient.get(`${base}/entries/`, { params }).then((r) => r.data),

    createEntry: (payload) =>
      apiClient.post(`${base}/entries/`, payload).then((r) => r.data),

    updateEntry: (id, payload) =>
      apiClient.patch(`${base}/entries/${id}/`, payload).then((r) => r.data),

    deleteEntry: (id) => apiClient.delete(`${base}/entries/${id}/`),

    listExits: (params) =>
      apiClient.get(`${base}/exits/`, { params }).then((r) => r.data),

    createExit: (payload) =>
      apiClient.post(`${base}/exits/`, payload).then((r) => r.data),

    updateExit: (id, payload) =>
      apiClient.patch(`${base}/exits/${id}/`, payload).then((r) => r.data),

    deleteExit: (id) => apiClient.delete(`${base}/exits/${id}/`),

    importSpreadsheet: (formData) =>
      apiClient
        .post(`${base}/import-spreadsheet/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data),

    inspectSpreadsheet: (kind, file) => {
      const fd = new FormData();
      fd.append('kind', kind);
      fd.append('file', file);
      return apiClient
        .post(`${base}/import-inspect-spreadsheet/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
    },

    importAvailability: (year, month) =>
      apiClient
        .get(`${base}/import-availability/`, { params: { year, month } })
        .then((r) => r.data),

    reconciliation: (year, month) =>
      apiClient
        .get(`${base}/tithers/reconciliation/`, { params: { year, month } })
        .then((r) => r.data),

    tithersMatrix: (year) =>
      apiClient
        .get(`${base}/tithers/matrix/`, { params: { year } })
        .then((r) => r.data),

    listTithers: () =>
      apiClient.get(`${base}/tithers/`).then((r) => r.data.results),

    createTither: (payload) =>
      apiClient.post(`${base}/tithers/`, payload).then((r) => r.data),

    updateTither: (id, payload) =>
      apiClient.patch(`${base}/tithers/${id}/`, payload).then((r) => r.data),

    deleteTither: (id) =>
      apiClient.delete(`${base}/tithers/${id}/`).then((r) => r.data),

    updateTitherTitheRecords: (id, year, months) =>
      apiClient
        .patch(`${base}/tithers/${id}/tithe-records/`, { year, months })
        .then((r) => r.data),

    monthlyClosings: (year) =>
      apiClient
        .get(`${base}/monthly-closings/`, { params: { year } })
        .then((r) => r.data),

    closeMonth: (year, month, closed) =>
      apiClient
        .post(
          `${base}/monthly-closings/`,
          { closed },
          { params: { year, month } }
        )
        .then((r) => r.data),

    regionalReport: (year, month) =>
      apiClient
        .get(`${base}/reports/regional/`, { params: { year, month } })
        .then((r) => r.data),

    regionalReportPdfUrl: (year, month) =>
      `${base}/reports/regional/pdf/?year=${year}&month=${month}`,

    nationalReportXlsx: (year, month) =>
      apiClient
        .get(`${base}/reports/national/xlsx/`, {
          params: { year, month },
          responseType: 'blob',
        })
        .then((r) => r.data),

    categories: () =>
      apiClient.get(`${base}/categories/`).then((r) => r.data),

    dreSummary: (year, month) =>
      apiClient
        .get(`${base}/dre/summary/`, { params: { year, month } })
        .then((r) => r.data),

    titherRepeatAudit: (year, month) =>
      apiClient
        .get(`${base}/tithers/repeat-audit/`, { params: { year, month } })
        .then((r) => r.data),

    validation: (year, month) =>
      apiClient
        .get(`${base}/validation/`, { params: { year, month } })
        .then((r) => r.data),

    submitValidation: (year, month, action, note, photo, signature) =>
      apiClient
        .post(
          `${base}/validation/`,
          {
            action,
            note: note ?? '',
            ...(photo ? { photo } : {}),
            ...(signature ? { signature } : {}),
          },
          { params: { year, month } }
        )
        .then((r) => r.data),

    exportEntries: (year, month) =>
      apiClient
        .get(`${base}/export/entries/`, {
          params: { year, month },
          responseType: 'blob',
        })
        .then((r) => r.data),

    exportExits: (year, month) =>
      apiClient
        .get(`${base}/export/exits/`, {
          params: { year, month },
          responseType: 'blob',
        })
        .then((r) => r.data),

    exportClosings: (mode, year, month) =>
      apiClient
        .get(`${base}/export/closings/`, {
          params: { mode, year, ...(month ? { month } : {}) },
          responseType: 'blob',
        })
        .then((r) => r.data),
    caixaDownload: (year, month) =>
      apiClient
        .get(`${base}/reports/caixa/download/`, {
          params: { year, month },
          responseType: 'blob',
        })
        .then((r) => r.data),
    listCalendarEvents: () =>
      apiClient.get(`${base}/calendar/events/`).then((r) => r.data),

    createCalendarEvent: (payload) =>
      apiClient.post(`${base}/calendar/events/`, payload).then((r) => r.data),

    updateCalendarEvent: (id, payload) =>
      apiClient.patch(`${base}/calendar/events/${id}/`, payload).then((r) => r.data),

    deleteCalendarEvent: (id) =>
      apiClient.delete(`${base}/calendar/events/${id}/`),
  };
}
