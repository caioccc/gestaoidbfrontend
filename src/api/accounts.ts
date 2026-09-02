import apiClient from './client';
import {
  LoginResponse,
  Paginated,
  PendingChurch,
  User,
} from '../types';

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  church_name: string;
  pastor_name?: string;
  treasurer_name?: string;
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

  resetAdminChurchPassword: (id: number, newPassword: string): Promise<{ detail: string }> =>
    apiClient
      .post(`/api/accounts/admin/churches/${id}/reset-password/`, { new_password: newPassword })
      .then((r) => r.data),

  clearChurchData: (id: number): Promise<{ detail: string; deleted: Record<string, number> }> =>
    apiClient.post(`/api/accounts/admin/churches/${id}/clear-data/`).then((r) => r.data),
};
