import apiClient from './client';
import {
  AccountingCategoryOption,
  AlertsResponse,
  BirthdayMember,
  CalendarPublicLink,
  CertificateIssueData,
  CertificateTemplate,
  CertificateType,
  Church,
  ChurchMembership,
  ChurchMinutes,
  EcclesiasticalCertificate,
  CertificateFieldKey,
  CertificateFieldLayout,
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
  PublicMemberProfile,
  PublicSubmissionResult,
  ResponsibleUserPayload,
  Role,
  StorageLocation,
  TransferTargetChurch,
  User,
  WorshipService,
  WorshipServiceType,
  ChurchLinksConfig,
  ChurchPublicLink,
  PublicChurchLinksPayload,
  GrowthGroup,
  GrowthGroupPayload,
  GrowthGroupStats,
  GrowthGroupWeekday,
  MessageTemplate,
  PreparedWhatsApp,
  SecretaryActions,
} from '../types';

export interface MaterialItemPayload {
  name: string;
  description?: string;
  location?: number | null;
  photo?: File | null;
  manual?: File | null;
}

export interface CertificateTemplatePayload {
  name: string;
  certificate_type: CertificateType;
  layout_mode: 'SYSTEM_DEFAULT' | 'CUSTOM_IMAGE' | 'BASE_PDF';
  default_verse?: string;
  is_active?: boolean;
  background_image?: File | null;
  base_pdf?: File | null;
  remove_background_image?: boolean;
  remove_base_pdf?: boolean;
  fields_layout?: Record<CertificateFieldKey, CertificateFieldLayout> | null;
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

export interface MemberListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  area?: string;
  education?: string;
  marital_status?: string;
  church_entry?: string;
}

export interface MemberListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Member[];
}

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

  me: (): Promise<{ user: User }> =>
    apiClient.get('/api/accounts/me/').then((r) => r.data),

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

  members: (params?: MemberListParams): Promise<Member[]> =>
    apiClient.get('/api/accounts/members/', { params }).then((r) => r.data),

  membersPage: (params?: MemberListParams): Promise<MemberListResponse> =>
    apiClient
      .get('/api/accounts/members/', { params: { ...(params || {}), paginate: 1 } })
      .then((r) => r.data),

  messageTemplates: (): Promise<MessageTemplate[]> =>
    apiClient.get('/api/accounts/message-templates/').then((r) => r.data),

  createMessageTemplate: (payload: Partial<MessageTemplate>): Promise<MessageTemplate> =>
    apiClient.post('/api/accounts/message-templates/', payload).then((r) => r.data),

  updateMessageTemplate: (
    id: number,
    payload: Partial<MessageTemplate>,
  ): Promise<MessageTemplate> =>
    apiClient.patch(`/api/accounts/message-templates/${id}/`, payload).then((r) => r.data),

  deleteMessageTemplate: (id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/message-templates/${id}/`).then(() => undefined),

  prepareWhatsapp: (
    id: number,
    payload: {
      template_id?: number;
      custom_text?: string;
      category?: string;
    },
  ): Promise<PreparedWhatsApp> =>
    apiClient
      .post(`/api/accounts/members/${id}/prepare-whatsapp/`, payload)
      .then((r) => r.data),

  setMemberStage: (id: number, stage: string): Promise<{ id: number; lifecycle_stage: string }> =>
    apiClient
      .patch(`/api/accounts/members/${id}/stage/`, { lifecycle_stage: stage })
      .then((r) => r.data),

  secretaryActions: (): Promise<SecretaryActions> =>
    apiClient.get('/api/accounts/secretary-actions/').then((r) => r.data),

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
    apiClient.post('/api/accounts/materials/', materialFormData(payload)).then((r) => r.data),

  updateMaterial: (id: number, payload: MaterialItemPayload): Promise<MaterialItem> =>
    apiClient.patch(`/api/accounts/materials/${id}/`, materialFormData(payload)).then((r) => r.data),

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

  certificateTemplates: (): Promise<CertificateTemplate[]> =>
    apiClient.get('/api/accounts/certificate-templates/').then((r) => r.data),

  createCertificateTemplate: (payload: CertificateTemplatePayload): Promise<CertificateTemplate> =>
    apiClient
      .post('/api/accounts/certificate-templates/', certificateTemplateFormData(payload))
      .then((r) => r.data),

  updateCertificateTemplate: (
    id: number,
    payload: CertificateTemplatePayload,
  ): Promise<CertificateTemplate> =>
    apiClient
      .patch(`/api/accounts/certificate-templates/${id}/`, certificateTemplateFormData(payload))
      .then((r) => r.data),

  deleteCertificateTemplate: (id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/certificate-templates/${id}/`).then(() => undefined),

  certificates: (
    params?: { type?: CertificateType; year?: string; search?: string },
  ): Promise<EcclesiasticalCertificate[]> =>
    apiClient.get('/api/accounts/certificates/', { params }).then((r) => r.data),

  issueCertificate: (
    payload: CertificateIssueData,
    template: number | null,
    generatedPdf?: File | null,
  ): Promise<EcclesiasticalCertificate> =>
    apiClient
      .post('/api/accounts/certificates/', certificateIssueFormData(payload, template, generatedPdf))
      .then((r) => r.data),

  certificatePdfDownload: (id: number): Promise<Blob> =>
    apiClient
      .get(`/api/accounts/certificates/${id}/pdf/`, { responseType: 'blob' })
      .then((r) => r.data),

  deleteCertificate: (id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/certificates/${id}/`).then(() => undefined),
};

function appendMinutesPayload(fd: FormData, payload: Record<string, any>): void {
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    fd.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  });
}

const FILE_EXT_BY_TYPE: Record<string, string> = {
  'image/webp': '.webp',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'application/pdf': '.pdf',
};

function fileWithName(file: File | null | undefined, fallback: string): File | undefined {
  if (!file) return undefined;
  if (file.name && file.name.trim()) return file;
  const ext = FILE_EXT_BY_TYPE[file.type] ?? '';
  return new File([file], `${fallback}${ext}`, { type: file.type });
}

function certificateTemplateFormData(payload: CertificateTemplatePayload): FormData {
  const fd = new FormData();
  fd.append('name', payload.name);
  fd.append('certificate_type', payload.certificate_type);
  fd.append('layout_mode', payload.layout_mode);
  if (payload.default_verse) fd.append('default_verse', payload.default_verse);
  if (payload.is_active != null) fd.append('is_active', payload.is_active ? 'true' : 'false');
  const background = fileWithName(payload.background_image, 'background');
  const basePdf = fileWithName(payload.base_pdf, 'base');
  if (background) fd.append('background_image', background);
  if (basePdf) fd.append('base_pdf', basePdf);
  if (payload.remove_background_image) fd.append('remove_background_image', 'true');
  if (payload.remove_base_pdf) fd.append('remove_base_pdf', 'true');
  if (payload.fields_layout) fd.append('fields_layout', JSON.stringify(payload.fields_layout));
  return fd;
}

function certificateIssueFormData(
  payload: CertificateIssueData,
  template: number | null,
  generatedPdf?: File | null,
): FormData {
  const fd = new FormData();
  fd.append('certificate_type', payload.certificate_type);
  fd.append('recipient_name', payload.recipient_name);
  if (payload.member != null) fd.append('member', String(payload.member));
  fd.append('event_date', payload.event_date);
  fd.append('officiant_name', payload.officiant_name);
  if (payload.father_name) fd.append('father_name', payload.father_name);
  if (payload.mother_name) fd.append('mother_name', payload.mother_name);
  if (payload.scripture_verse) fd.append('scripture_verse', payload.scripture_verse);
  if (payload.registry_book) fd.append('registry_book', payload.registry_book);
  if (payload.registry_page) fd.append('registry_page', payload.registry_page);
  if (payload.registry_number) fd.append('registry_number', payload.registry_number);
  if (template != null) fd.append('template', String(template));
  const generated = fileWithName(generatedPdf, 'certificate');
  if (generated) fd.append('generated_pdf', generated);
  return fd;
}

function materialFormData(payload: MaterialItemPayload): FormData {
  const fd = new FormData();
  fd.append('name', payload.name);
  if (payload.description) fd.append('description', payload.description);
  if (payload.location != null) fd.append('location', String(payload.location));
  if (payload.photo) fd.append('photo', payload.photo);
  if (payload.manual) fd.append('manual', payload.manual);
  return fd;
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

export const publicMemberProfileApi = {
  get: (hash: string): Promise<PublicMemberProfile> =>
    apiClient
      .get(`/api/accounts/public/profile/${hash}/`)
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

export const churchLinksApi = {
  list: (): Promise<ChurchPublicLink[]> =>
    apiClient.get('/api/accounts/church-links/').then((r) => r.data),

  create: (data: Partial<ChurchPublicLink>): Promise<ChurchPublicLink> =>
    apiClient.post('/api/accounts/church-links/', data).then((r) => r.data),

  update: (id: number, data: Partial<ChurchPublicLink>): Promise<ChurchPublicLink> =>
    apiClient.patch(`/api/accounts/church-links/${id}/`, data).then((r) => r.data),

  remove: (id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/church-links/${id}/`).then((r) => r.data),

  reorder: (order: number[]): Promise<{ status: string }> =>
    apiClient.post('/api/accounts/church-links/reorder/', { order }).then((r) => r.data),

  config: (): Promise<ChurchLinksConfig> =>
    apiClient.get('/api/accounts/church-links/config/').then((r) => r.data),

  updateConfig: (data: Partial<ChurchLinksConfig>): Promise<ChurchLinksConfig> =>
    apiClient.patch('/api/accounts/church-links/config/', data).then((r) => r.data),
};

export const publicLinksApi = {
  get: (slug: string): Promise<PublicChurchLinksPayload> =>
    apiClient
      .get(`/api/accounts/public/churches/${slug}/links/`)
      .then((r) => r.data),

  click: (id: number): Promise<void> =>
    apiClient
      .post(`/api/accounts/public/links/${id}/click/`)
      .then((r) => r.data),
};

export interface PublicGrowthGroupChurch {
  name: string;
  city: string;
  neighborhood?: string | null;
  state: string;
  theme_color: string;
  logo?: string | null;
}

export interface PublicGrowthGroup {
  id: number;
  name: string;
  category: string;
  category_display: string;
  weekday: GrowthGroupWeekday;
  weekday_display: string;
  time: string | null;
  leader_name: string;
  host_name: string | null;
  leader_phone: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  full_address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number | null;
  is_full: boolean;
  whatsapp_url: string | null;
  maps_url: string | null;
}

export interface PublicGrowthGroupsPayload {
  church: PublicGrowthGroupChurch;
  growth_groups: PublicGrowthGroup[];
}

export const publicGrowthGroupsApi = {
  get: (slug: string): Promise<PublicGrowthGroupsPayload> =>
    apiClient
      .get(`/api/accounts/public/churches/${slug}/growth-groups/`)
      .then((r) => r.data),
};

export interface GrowthGroupListParams {
  search?: string;
  weekday?: GrowthGroupWeekday | '';
}

export const growthGroupsApi = {
  list: (params?: GrowthGroupListParams): Promise<GrowthGroup[]> =>
    apiClient.get('/api/accounts/growth-groups/', { params }).then((r) => r.data),

  create: (payload: GrowthGroupPayload): Promise<GrowthGroup> =>
    apiClient.post('/api/accounts/growth-groups/', payload).then((r) => r.data),

  update: (id: number, payload: Partial<GrowthGroupPayload>): Promise<GrowthGroup> =>
    apiClient.patch(`/api/accounts/growth-groups/${id}/`, payload).then((r) => r.data),

  remove: (id: number): Promise<void> =>
    apiClient.delete(`/api/accounts/growth-groups/${id}/`).then(() => undefined),

  stats: (): Promise<GrowthGroupStats> =>
    apiClient.get('/api/accounts/growth-groups/stats/').then((r) => r.data),
};