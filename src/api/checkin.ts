import apiClient from './client';
import {
  Event,
  EventSource,
  EventCheckinConfig,
  EventCheckinListParams,
  EventCheckinRow,
  EventCheckinSession,
  EventCheckinSummary,
  EventCheckinTeamMember,
  EventRegistration,
  EventShareLink,
  Paginated,
  PublicEventCheckinResult,
  PublicEventCheckinSession,
  PublicEventRegistrationMeta,
  PublicEventRegistrationResult,
} from '../types';

type ConfigParams = {
  event?: number;
  checkinEvent?: number;
};

type EventParams = {
  calendarEvent?: number;
  search?: string;
  source?: EventSource;
  month?: number;
  year?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

type RegistrationParams = {
  event?: number;
  kind?: string;
  search?: string;
};

function configQuery(params?: ConfigParams | number) {
  if (typeof params === 'number') return { event: params };
  if (!params) return {};
  return {
    event: params.event,
    checkin_event: params.checkinEvent,
  };
}

export const eventCheckinApi = {
  listEvents: (params?: EventParams): Promise<Paginated<Event>> =>
    apiClient
      .get('/api/events/events/', {
        params: params
          ? {
              calendar_event: params.calendarEvent,
              search: params.search,
              source: params.source,
              month: params.month,
              year: params.year,
              date_from: params.dateFrom,
              date_to: params.dateTo,
              page: params.page,
              page_size: params.pageSize,
            }
          : {},
      })
      .then((r) => r.data),

  getEvent: (id: number): Promise<Event> =>
    apiClient.get(`/api/events/events/${id}/`).then((r) => r.data),

  createEvent: (payload: Partial<Event>): Promise<Event> =>
    apiClient.post('/api/events/events/', payload).then((r) => r.data),

  updateEvent: (id: number, payload: Partial<Event>): Promise<Event> =>
    apiClient.patch(`/api/events/events/${id}/`, payload).then((r) => r.data),

  deleteEvent: (id: number): Promise<void> =>
    apiClient.delete(`/api/events/events/${id}/`),

  enableCheckin: (
    id: number,
    payload?: { mode?: 'PER_DAY' | 'ONCE' }
  ): Promise<EventCheckinConfig> =>
    apiClient.post(`/api/events/events/${id}/enable-checkin/`, payload ?? {}).then((r) => r.data),

  shareRegistration: (id: number): Promise<EventShareLink> =>
    apiClient.get(`/api/events/events/${id}/share-registration/`).then((r) => r.data),

  regenerateEventToken: (id: number): Promise<{ token: string; url: string }> =>
    apiClient.post(`/api/events/events/${id}/regenerate-registration-token/`).then((r) => r.data),

  listConfigs: (params?: ConfigParams | number): Promise<EventCheckinConfig[]> =>
    apiClient
      .get('/api/events/checkin-configs/', { params: configQuery(params) })
      .then((r) => r.data.results ?? r.data),

  createConfig: (
    payload: Partial<EventCheckinConfig> & { event: number }
  ): Promise<EventCheckinConfig> =>
    apiClient.post('/api/events/checkin-configs/', payload).then((r) => r.data),

  updateConfig: (
    id: number,
    payload: Partial<EventCheckinConfig>
  ): Promise<EventCheckinConfig> =>
    apiClient.patch(`/api/events/checkin-configs/${id}/`, payload).then((r) => r.data),

  generateSessions: (
    id: number,
    payload?: { start?: string; end?: string }
  ): Promise<{
    created: number;
    total: number;
    sessions: EventCheckinSession[];
  }> =>
    apiClient
      .post(`/api/events/checkin-configs/${id}/generate-sessions/`, payload ?? {})
      .then((r) => r.data),

  previewDates: (
    id: number,
    params?: { start?: string; end?: string }
  ): Promise<{ dates: string[] }> =>
    apiClient
      .get(`/api/events/checkin-configs/${id}/preview-dates/`, { params })
      .then((r) => r.data),

  setConfigActive: (id: number, active: boolean): Promise<EventCheckinConfig> =>
    apiClient
      .post(`/api/events/checkin-configs/${id}/set-active/`, { active })
      .then((r) => r.data),

  listSessions: (config?: number): Promise<EventCheckinSession[]> =>
    apiClient
      .get('/api/events/checkin-sessions/', { params: config ? { config } : {} })
      .then((r) => r.data.results ?? r.data),

  regenerateToken: (id: number): Promise<EventCheckinSession> =>
    apiClient
      .post(`/api/events/checkin-sessions/${id}/regenerate-token/`)
      .then((r) => r.data),

  setTokenActive: (id: number, active: boolean): Promise<EventCheckinSession> =>
    apiClient
      .post(`/api/events/checkin-sessions/${id}/set-token-active/`, { active })
      .then((r) => r.data),

  listTeam: (config?: number): Promise<EventCheckinTeamMember[]> =>
    apiClient
      .get('/api/events/checkin-team/', { params: config ? { config } : {} })
      .then((r) => r.data.results ?? r.data),

  addTeamMember: (
    payload: Pick<EventCheckinTeamMember, 'config' | 'member' | 'role'>
  ): Promise<EventCheckinTeamMember> =>
    apiClient.post('/api/events/checkin-team/', payload).then((r) => r.data),

  removeTeamMember: (id: number): Promise<void> =>
    apiClient.delete(`/api/events/checkin-team/${id}/`),

  listRegistrations: (
    params?: RegistrationParams
  ): Promise<Paginated<EventRegistration>> =>
    apiClient.get('/api/events/registrations/', { params }).then((r) => r.data),

  createRegistration: (
    payload: Partial<EventRegistration> & { event: number }
  ): Promise<EventRegistration> =>
    apiClient.post('/api/events/registrations/', payload).then((r) => r.data),

  bulkMembers: (payload: {
    event: number;
    members?: number[];
    all_members?: boolean;
  }): Promise<{ created: number }> =>
    apiClient.post('/api/events/registrations/bulk-members/', payload).then((r) => r.data),

  cancelRegistration: (id: number): Promise<EventRegistration> =>
    apiClient.post(`/api/events/registrations/${id}/cancel/`).then((r) => r.data),

  regenerateRegistrationCode: (id: number): Promise<EventRegistration> =>
    apiClient.post(`/api/events/registrations/${id}/regenerate-code/`).then((r) => r.data),

  listCheckins: (
    params?: EventCheckinListParams
  ): Promise<Paginated<EventCheckinRow>> =>
    apiClient
      .get('/api/events/checkins/', { params })
      .then((r) => r.data),

  scan: (payload: {
    session: number;
    code: string;
    operator?: number | null;
    source?: 'SCAN' | 'MANUAL';
  }): Promise<{ result: string; already: boolean; in_roster: boolean; checkin: EventCheckinRow }> =>
    apiClient.post('/api/events/checkins/scan/', payload).then((r) => r.data),

  manual: (payload: {
    session: number;
    member?: number;
    registration?: number;
    operator?: number | null;
  }): Promise<{ result: string; already: boolean; in_roster: boolean; checkin: EventCheckinRow }> =>
    apiClient.post('/api/events/checkins/manual/', payload).then((r) => r.data),

  cancel: (id: number): Promise<EventCheckinRow> =>
    apiClient.post(`/api/events/checkins/${id}/cancel/`).then((r) => r.data),

  summary: (params?: EventCheckinListParams): Promise<EventCheckinSummary> =>
    apiClient.get('/api/events/checkins/summary/', { params }).then((r) => r.data),

  exportCsv: (params?: EventCheckinListParams): Promise<Blob> =>
    apiClient
      .get('/api/events/checkins/export/', {
        params,
        responseType: 'blob',
      })
      .then((r) => r.data),
};

export const publicEventCheckinApi = {
  get: (token: string): Promise<PublicEventCheckinSession> =>
    apiClient
      .get(`/api/events/public/checkin/${token}/`)
      .then((r) => r.data),

  scan: (
    token: string,
    payload: { code: string; operator?: number | null }
  ): Promise<PublicEventCheckinResult> =>
    apiClient
      .post(`/api/events/public/checkin/${token}/`, payload)
      .then((r) => r.data),
};

export const publicEventRegistrationApi = {
  get: (token: string): Promise<PublicEventRegistrationMeta> =>
    apiClient
      .get(`/api/events/public/registration/${token}/`)
      .then((r) => r.data),

  submit: (
    token: string,
    payload: { name: string; phone?: string; email?: string }
  ): Promise<PublicEventRegistrationResult> =>
    apiClient
      .post(`/api/events/public/registration/${token}/`, payload)
      .then((r) => r.data),
};
