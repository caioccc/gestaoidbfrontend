import apiClient from './client';
import type {
  FolderCulto,
  FolderCultoAniversarianteItem,
  FolderCultoRow,
  PublicFolderChurch,
} from '../types';

export interface FolderListParams {
  tipo?: string;
  year?: number;
  month?: number;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface FolderListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FolderCulto[];
}

export type FolderRowPayload = Pick<
  FolderCultoRow,
  'service_type' | 'date' | 'start_time' | 'end_time' | 'title' | 'preacher' | 'sort_order'
>;

export type FolderPayload = Partial<
  Pick<
    FolderCulto,
    | 'tipo'
    | 'title'
    | 'subtitle'
    | 'service_type'
    | 'versiculo'
    | 'cover_template'
    | 'theme_color'
    | 'background_color'
    | 'cover_font'
    | 'mensagem_pastoral'
    | 'article_title'
    | 'reference_start'
    | 'reference_end'
    | 'programacao'
    | 'anuncios'
    | 'aniversariantes'
    | 'qr'
    | 'social'
    | 'blocks'
    | 'block_order'
  > & {
    rows?: FolderRowPayload[];
  }
>;

export interface FolderSyncResult {
  created: number;
  folder: FolderCulto;
}

export interface FolderPreviewSyncResult {
  created: number;
  rows: FolderRowPayload[];
}

export interface PublicFolderPayload extends Omit<FolderCulto, 'church'> {
  church: PublicFolderChurch;
}

export const boletimApi = {
  list: (params?: FolderListParams): Promise<FolderListResponse> =>
    apiClient
      .get('/api/boletim/folders/', { params: { ...params, paginate: '1' } })
      .then((r) => r.data),

  all: (params?: { tipo?: string }): Promise<FolderCulto[]> =>
    apiClient.get('/api/boletim/folders/', { params }).then((r) => r.data),

  get: (id: number): Promise<FolderCulto> =>
    apiClient.get(`/api/boletim/folders/${id}/`).then((r) => r.data),

  create: (payload: FolderPayload): Promise<FolderCulto> =>
    apiClient.post('/api/boletim/folders/', payload).then((r) => r.data),

  update: (id: number, payload: FolderPayload): Promise<FolderCulto> =>
    apiClient.patch(`/api/boletim/folders/${id}/`, payload).then((r) => r.data),

  remove: (id: number): Promise<void> =>
    apiClient.delete(`/api/boletim/folders/${id}/`).then(() => undefined),

  syncEvents: (id: number): Promise<FolderSyncResult> =>
    apiClient
      .post(`/api/boletim/folders/${id}/sync-events/`)
      .then((r) => r.data),

  birthdays: (id: number): Promise<FolderCultoAniversarianteItem[]> =>
    apiClient.get(`/api/boletim/folders/${id}/birthdays/`).then((r) => r.data),

  previewSyncEvents: (
    referenceStart: string,
    referenceEnd: string
  ): Promise<FolderPreviewSyncResult> =>
    apiClient
      .post('/api/boletim/folders/preview-sync-events/', {
        reference_start: referenceStart,
        reference_end: referenceEnd,
      })
      .then((r) => r.data),

  previewBirthdays: (
    referenceStart: string,
    referenceEnd: string
  ): Promise<FolderCultoAniversarianteItem[]> =>
    apiClient
      .post('/api/boletim/folders/preview-birthdays/', {
        reference_start: referenceStart,
        reference_end: referenceEnd,
      })
      .then((r) => r.data),

  regenerateHash: (id: number): Promise<FolderCulto> =>
    apiClient
      .post(`/api/boletim/folders/${id}/regenerate-hash/`)
      .then((r) => r.data),

  public: (hash: string): Promise<PublicFolderPayload> =>
    apiClient
      .get(`/api/boletim/public/folders/${hash}/`)
      .then((r) => r.data),
};