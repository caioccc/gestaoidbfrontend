import apiClient from './client';
import {
  AccountingCategoryOption,
  AlertsResponse,
  BirthdayMember,
  CalendarPublicLink,
  Church,
  ChurchMembership,
  ChurchMinutes,
  Loan,
  LoginResponse,
  MaterialItem,
  Member,
  MemberDocument,
  MemberImportInspection,
  MemberImportResult,
  MemberSubmission,
  MemberSubmissionStatus,
  MemberTransfer,
  MinistryArea,
  MeetingType,
  PendingChurch,
  PublicCardPayload,
  PublicFormMeta,
  PublicMinutesPayload,
  PublicSubmissionResult,
  ResponsibleUserPayload,
  Role,
  StorageLocation,
  TransferTargetChurch,
  User,
  WorshipService,
  WorshipServiceType,
} from '../types';

export interface MaterialItemPayload {
  name: string;
  description?: string;
  location?: number | null;
}

export interface WorshipServicePayload {
  date: string;
  time?: string | null;
  service_type?: WorshipServiceType;
  presider?: string;
  preacher?: string;
  theme?: string;
  scripture?: string;
  attendees?: number;
  visitors?: number;
  conversions?: number;
  offering?: string | number;
  notes?: string;
}

export interface ChurchMinutesPayload {
  title: string;
  meeting_type: MeetingType;
  meeting_date: string;
  location?: string;
  recorder?: string;
  participants?: string;
  content: string;
}

export interface LoanPayload {
  item: number;
  member?: number | null;
  borrower_name?: string;
  borrowed_at: string;
  expected_return: string;
  notes?: string;
}

export type RegisterChurchType = 'INDEPENDENT' | 'CONGREGATION';

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  church_name: string;
  church_type: RegisterChurchType;
  parent_church?: number;
  role: Role;
  pastor_name?: string;
  phone?: string;
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface AddChurchUserPayload {
  email: string;
  name?: string;
  role: Role;
  password: string;
  password2: string;
}

export interface CreateChurchPayload {
  name: string;
  church_type?: 'INDEPENDENT' | 'CONGREGATION';
  parent_church?: number;
  accounting_category: string;
  city: string;
  state: string;
  cep?: string;
  phone?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  pastor_name?: string;
  pastoral_prebenda_percent?: string;
  responsible_user?: ResponsibleUserPayload;
}

export type ChurchUpdatePayload = Partial<Church> & {
  responsible_user?: ResponsibleUserPayload | null;
};

export const accountsApi = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    apiClient.post('/api/accounts/login/', { email, password }).then((r) => r.data),

  refresh: (refresh: string): Promise<{ access: string }> =>
    apiClient
      .post('/api/accounts/token/refresh/', { refresh })
      .then((r) => r.data),

  register: (payload: RegisterPayload): Promise<{ detail: string; church_id: number; user: User }> =>
    apiClient.post('/api/accounts/register/', payload).then((r) => r.data),

  getProfile: (): Promise<any> =>
    apiClient.get('/api/accounts/profile/').then((r) => r.data),

  updateProfile: (payload: Record<string, any>): Promise<any> =>
    apiClient.put('/api/accounts/profile/', payload).then((r) => r.data),

  resetPassword: (newPassword: string): Promise<{ detail: string }> =>
    apiClient
      .post('/api/accounts/profile/reset-password/', { new_password: newPassword })
      .then((r) => r.data),

  switchChurch: (churchId: number): Promise<{ user: User; detail: string }> =>
    apiClient
      .post('/api/accounts/switch-church/', { church_id: churchId })
      .then((r) => r.data),

  searchParentChurches: (q?: string): Promise<Church[]> =>
    apiClient
      .get('/api/accounts/churches/search-parents/', {
        params: q ? { q } : {},
      })
      .then((r) => r.data),

  churches: (): Promise<Church[]> =>
    apiClient.get('/api/accounts/churches/').then((r) => r.data),

  createChurch: (payload: CreateChurchPayload): Promise<Church> =>
    apiClient.post('/api/accounts/churches/', payload).then((r) => r.data),

  updateChurch: (id: number, payload: ChurchUpdatePayload): Promise<Church> =>
    apiClient.patch(`/api/accounts/churches/${id}/`, payload).then((r) => r.data),

  deleteChurch: (id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/churches/${id}/`).then((r) => r.data),

  churchUsers: (churchId: number): Promise<ChurchMembership[]> =>
    apiClient.get(`/api/accounts/churches/${churchId}/users/`).then((r) => r.data),

  addChurchUser: (churchId: number, payload: AddChurchUserPayload): Promise<ChurchMembership> =>
    apiClient.post(`/api/accounts/churches/${churchId}/users/`, payload).then((r) => r.data),

  updateChurchUserRole: (churchId: number, membershipId: number, role: Role): Promise<ChurchMembership> =>
    apiClient
      .patch(`/api/accounts/churches/${churchId}/users/${membershipId}/`, { role })
      .then((r) => r.data),

  removeChurchUser: (churchId: number, membershipId: number): Promise<void> =>
    apiClient.delete(`/api/accounts/churches/${churchId}/users/${membershipId}/`).then((r) => r.data),

  pendingCongregations: (): Promise<PendingChurch[]> =>
    apiClient.get('/api/accounts/pending-congregations/').then((r) => r.data),

  approveCongregation: (id: number, accountingCategory: string): Promise<any> =>
    apiClient
      .post(`/api/accounts/pending-congregations/${id}/approve/`, {
        accounting_category: accountingCategory,
      })
      .then((r) => r.data),

  rejectCongregation: (id: number): Promise<any> =>
    apiClient.post(`/api/accounts/pending-congregations/${id}/reject/`).then((r) => r.data),

  accountingCategories: (): Promise<{
    categories: AccountingCategoryOption[];
    custom_allowed: boolean;
  }> => apiClient.get('/api/accounts/accounting-categories/').then((r) => r.data),

  members: (): Promise<Member[]> =>
    apiClient.get('/api/accounts/members/').then((r) => r.data),

  storageLocations: (): Promise<StorageLocation[]> =>
    apiClient.get('/api/accounts/storage-locations/').then((r) => r.data),

  createStorageLocation: (payload: { name: string }): Promise<StorageLocation> =>
    apiClient
      .post('/api/accounts/storage-locations/', payload)
      .then((r) => r.data),

  updateStorageLocation: (id: number, payload: { name: string }): Promise<StorageLocation> =>
    apiClient
      .patch(`/api/accounts/storage-locations/${id}/`, payload)
      .then((r) => r.data),

  deleteStorageLocation: (id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/storage-locations/${id}/`).then(() => undefined),

  materials: (): Promise<MaterialItem[]> =>
    apiClient.get('/api/accounts/materials/').then((r) => r.data),

  createMaterial: (payload: MaterialItemPayload): Promise<MaterialItem> =>
    apiClient.post('/api/accounts/materials/', payload).then((r) => r.data),

  updateMaterial: (id: number, payload: MaterialItemPayload): Promise<MaterialItem> =>
    apiClient.patch(`/api/accounts/materials/${id}/`, payload).then((r) => r.data),

  deleteMaterial: (id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/materials/${id}/`).then(() => undefined),

  loans: (): Promise<Loan[]> =>
    apiClient.get('/api/accounts/loans/').then((r) => r.data),

  createLoan: (payload: LoanPayload): Promise<Loan> =>
    apiClient.post('/api/accounts/loans/', payload).then((r) => r.data),

  updateLoan: (id: number, payload: Partial<LoanPayload>): Promise<Loan> =>
    apiClient.patch(`/api/accounts/loans/${id}/`, payload).then((r) => r.data),

  deleteLoan: (id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/loans/${id}/`).then(() => undefined),

  returnLoan: (id: number): Promise<Loan> =>
    apiClient.post(`/api/accounts/loans/${id}/return/`).then((r) => r.data),

  createMember: (payload: Partial<Member>): Promise<Member> =>
    apiClient.post('/api/accounts/members/', payload).then((r) => r.data),

  updateMember: (id: number, payload: Partial<Member>): Promise<Member> =>
    apiClient.patch(`/api/accounts/members/${id}/`, payload).then((r) => r.data),

  deleteMember: (id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/members/${id}/`).then((r) => r.data),

  memberDeclaration: (id: number): Promise<Blob> =>
    apiClient
      .get(`/api/accounts/members/${id}/declaration/`, { responseType: 'blob' })
      .then((r) => r.data),

  churchMembers: (churchId: number): Promise<Member[]> =>
    apiClient.get(`/api/accounts/churches/${churchId}/members/`).then((r) => r.data),

  createChurchMember: (churchId: number, payload: Partial<Member>): Promise<Member> =>
    apiClient.post(`/api/accounts/churches/${churchId}/members/`, payload).then((r) => r.data),

  updateChurchMember: (churchId: number, id: number, payload: Partial<Member>): Promise<Member> =>
    apiClient.patch(`/api/accounts/churches/${churchId}/members/${id}/`, payload).then((r) => r.data),

  deleteChurchMember: (churchId: number, id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/churches/${churchId}/members/${id}/`).then((r) => r.data),

  churchMinistryAreas: (churchId: number): Promise<MinistryArea[]> =>
    apiClient.get(`/api/accounts/churches/${churchId}/ministry-areas/`).then((r) => r.data),

  createChurchMinistryArea: (churchId: number, payload: Partial<MinistryArea>): Promise<MinistryArea> =>
    apiClient.post(`/api/accounts/churches/${churchId}/ministry-areas/`, payload).then((r) => r.data),

  updateChurchMinistryArea: (churchId: number, id: number, payload: Partial<MinistryArea>): Promise<MinistryArea> =>
    apiClient.patch(`/api/accounts/churches/${churchId}/ministry-areas/${id}/`, payload).then((r) => r.data),

  deleteChurchMinistryArea: (churchId: number, id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/churches/${churchId}/ministry-areas/${id}/`).then((r) => r.data),

  ministryAreas: (): Promise<MinistryArea[]> =>
    apiClient.get('/api/accounts/ministry-areas/').then((r) => r.data),

  createMinistryArea: (payload: Partial<MinistryArea>): Promise<MinistryArea> =>
    apiClient.post('/api/accounts/ministry-areas/', payload).then((r) => r.data),

  updateMinistryArea: (id: number, payload: Partial<MinistryArea>): Promise<MinistryArea> =>
    apiClient.patch(`/api/accounts/ministry-areas/${id}/`, payload).then((r) => r.data),

  deleteMinistryArea: (id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/ministry-areas/${id}/`).then((r) => r.data),

  allChurches: (): Promise<PendingChurch[]> =>
    apiClient.get('/api/accounts/admin/churches/').then((r) => r.data),

  pendingChurches: (): Promise<PendingChurch[]> =>
    apiClient.get('/api/accounts/admin/pending-churches/').then((r) => r.data),

  approveChurch: (id: number): Promise<any> =>
    apiClient.post(`/api/accounts/admin/churches/${id}/approve/`).then((r) => r.data),

  rejectChurch: (id: number): Promise<any> =>
    apiClient.post(`/api/accounts/admin/churches/${id}/reject/`).then((r) => r.data),

  getChurchProfile: (id: number): Promise<any> =>
    apiClient.get(`/api/accounts/admin/churches/${id}/profile/`).then((r) => r.data),

  updateChurchProfile: (id: number, payload: Record<string, any>): Promise<any> =>
    apiClient.put(`/api/accounts/admin/churches/${id}/profile/`, payload).then((r) => r.data),

  getChurchProfileForSede: (id: number): Promise<any> =>
    apiClient.get(`/api/accounts/churches/${id}/profile/`).then((r) => r.data),

  updateChurchProfileForSede: (id: number, payload: Record<string, any>): Promise<any> =>
    apiClient.put(`/api/accounts/churches/${id}/profile/`, payload).then((r) => r.data),

  resetAdminChurchPassword: (id: number, newPassword: string): Promise<{ detail: string }> =>
    apiClient
      .post(`/api/accounts/admin/churches/${id}/reset-password/`, { new_password: newPassword })
      .then((r) => r.data),

  clearChurchData: (id: number): Promise<{ detail: string; deleted: Record<string, number> }> =>
    apiClient.post(`/api/accounts/admin/churches/${id}/clear-data/`).then((r) => r.data),

  importMembersInspect: (file: File): Promise<MemberImportInspection> => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient
      .post('/api/accounts/members/import-inspect/', fd)
      .then((r) => r.data);
  },

  importMembers: (
    file: File,
    mapping: Record<string, string>,
    dryRun: boolean,
  ): Promise<MemberImportResult> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('mapping', JSON.stringify(mapping));
    if (dryRun) fd.append('dry_run', '1');
    return apiClient
      .post('/api/accounts/members/import/', fd)
      .then((r) => r.data);
  },

  alerts: (): Promise<AlertsResponse> =>
    apiClient.get('/api/accounts/alerts/').then((r) => r.data),

  memberTransfers: (): Promise<MemberTransfer[]> =>
    apiClient.get('/api/accounts/transfers/').then((r) => r.data),

  incomingTransfers: (): Promise<MemberTransfer[]> =>
    apiClient.get('/api/accounts/transfers/incoming/').then((r) => r.data),

  createMemberTransfer: (
    memberId: number,
    targetChurchId: number,
  ): Promise<MemberTransfer> =>
    apiClient
      .post('/api/accounts/transfers/', {
        member_id: memberId,
        target_church_id: targetChurchId,
      })
      .then((r) => r.data),

  receiveTransfer: (id: number): Promise<MemberTransfer> =>
    apiClient
      .post(`/api/accounts/transfers/${id}/receive/`)
      .then((r) => r.data),

  cancelTransfer: (id: number): Promise<MemberTransfer> =>
    apiClient
      .post(`/api/accounts/transfers/${id}/cancel/`)
      .then((r) => r.data),

  transferTargetChurches: (q?: string): Promise<TransferTargetChurch[]> =>
    apiClient
      .get('/api/accounts/churches/search-transfers/', {
        params: q ? { q } : {},
      })
      .then((r) => r.data),

  memberDocuments: (memberId: number): Promise<MemberDocument[]> =>
    apiClient
      .get(`/api/accounts/members/${memberId}/documents/`)
      .then((r) => r.data),

  uploadMemberDocument: (
    memberId: number,
    formData: FormData,
  ): Promise<MemberDocument> =>
    apiClient
      .post(`/api/accounts/members/${memberId}/documents/`, formData)
      .then((r) => r.data),

  deleteMemberDocument: (id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/documents/${id}/`).then(() => undefined),

  documentDownload: (id: number): Promise<Blob> =>
    apiClient
      .get(`/api/accounts/documents/${id}/download/`, {
        responseType: 'blob',
      })
      .then((r) => r.data),

  memberReport: (status?: string): Promise<Blob> =>
    apiClient
      .get('/api/accounts/members/report/', {
        params: status ? { status } : {},
        responseType: 'blob',
      })
      .then((r) => r.data),

  birthdays: (month: number, status?: string): Promise<BirthdayMember[]> =>
    apiClient
      .get('/api/accounts/birthdays/', {
        params: { month, ...(status ? { status } : {}) },
      })
      .then((r) => r.data),

  calendarPublicLink: (): Promise<CalendarPublicLink> =>
    apiClient.get('/api/accounts/calendar/public-link/').then((r) => r.data),

  regenerateCalendarPublicLink: (): Promise<CalendarPublicLink> =>
    apiClient.post('/api/accounts/calendar/public-link/regenerate/').then((r) => r.data),

  worshipServices: (): Promise<WorshipService[]> =>
    apiClient.get('/api/accounts/cultos/').then((r) => r.data),

  createWorshipService: (payload: WorshipServicePayload): Promise<WorshipService> =>
    apiClient.post('/api/accounts/cultos/', payload).then((r) => r.data),

  updateWorshipService: (
    id: number,
    payload: Partial<WorshipServicePayload>,
  ): Promise<WorshipService> =>
    apiClient.patch(`/api/accounts/cultos/${id}/`, payload).then((r) => r.data),

  deleteWorshipService: (id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/cultos/${id}/`).then(() => undefined),

  minutes: (): Promise<ChurchMinutes[]> =>
    apiClient.get('/api/accounts/minutes/').then((r) => r.data),

  createMinutes: (payload: ChurchMinutesPayload, pdf?: File | null): Promise<ChurchMinutes> => {
    const fd = new FormData();
    appendMinutesPayload(fd, payload);
    if (pdf) fd.append('pdf', pdf);
    return apiClient.post('/api/accounts/minutes/', fd).then((r) => r.data);
  },

  updateMinutes: (
    id: number,
    payload: Partial<ChurchMinutesPayload>,
    pdf?: File | null,
  ): Promise<ChurchMinutes> => {
    const fd = new FormData();
    appendMinutesPayload(fd, payload);
    if (pdf) fd.append('pdf', pdf);
    return apiClient.patch(`/api/accounts/minutes/${id}/`, fd).then((r) => r.data);
  },

  deleteMinutes: (id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/minutes/${id}/`).then(() => undefined),

  removeMinutesPdf: (id: number): Promise<ChurchMinutes> => {
    const fd = new FormData();
    fd.append('remove_pdf', 'true');
    return apiClient.patch(`/api/accounts/minutes/${id}/`, fd).then((r) => r.data);
  },

  regenerateMinutesHash: (id: number): Promise<ChurchMinutes> =>
    apiClient
      .post(`/api/accounts/minutes/${id}/regenerate-hash/`)
      .then((r) => r.data),

  minutesPdfDownload: (id: number): Promise<Blob> =>
    apiClient
      .get(`/api/accounts/minutes/${id}/pdf/`, { responseType: 'blob' })
      .then((r) => r.data),

  memberPublicLink: (id: number): Promise<{ id: number; public_url: string }> =>
    apiClient
      .get(`/api/accounts/members/${id}/public-link/`)
      .then((r) => r.data),

  memberPublicLinkRegenerate: (id: number): Promise<{ id: number; public_url: string }> =>
    apiClient
      .post(`/api/accounts/members/${id}/public-link/regenerate/`)
      .then((r) => r.data),

  churchMemberFormLink: (): Promise<{ hash: string; url: string }> =>
    apiClient.get('/api/accounts/members/form/public-link/').then((r) => r.data),

  churchMemberFormLinkRegenerate: (): Promise<{ hash: string; url: string }> =>
    apiClient.post('/api/accounts/members/form/public-link/').then((r) => r.data),

  memberSubmissions: (status?: MemberSubmissionStatus): Promise<MemberSubmission[]> =>
    apiClient
      .get('/api/accounts/member-submissions/', {
        params: status ? { status } : {},
      })
      .then((r) => r.data),

  reviewMemberSubmission: (
    id: number,
    action: 'approve' | 'reject',
    notes?: string,
  ): Promise<MemberSubmission> =>
    apiClient
      .post(`/api/accounts/member-submissions/${id}/review/`, {
        action,
        ...(notes ? { notes } : {}),
      })
      .then((r) => r.data),
};

function appendMinutesPayload(fd: FormData, payload: Record<string, any>): void {
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    fd.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  });
}

export const publicMinutesApi = {
  get: (hash: string): Promise<PublicMinutesPayload> =>
    apiClient
      .get(`/api/accounts/public/minutes/${hash}/`)
      .then((r) => r.data),

  pdfUrl: (hash: string): string =>
    `${apiClient.defaults.baseURL}/api/accounts/public/minutes/${hash}/pdf/`,
};

export const publicCardApi = {
  get: (hash: string): Promise<PublicCardPayload> =>
    apiClient
      .get(`/api/accounts/public/card/${hash}/`)
      .then((r) => r.data),
};

export const publicFormApi = {
  get: (hash: string): Promise<PublicFormMeta> =>
    apiClient
      .get(`/api/accounts/public/forms/${hash}/`)
      .then((r) => r.data),

  submit: (hash: string, data: Record<string, unknown>): Promise<PublicSubmissionResult> =>
    apiClient
      .post(`/api/accounts/public/forms/${hash}/`, { data })
      .then((r) => r.data),
};