import apiClient from './client';
import type {
  Band,
  BandSetlist,
  BandSetlistPayload,
  ChordifyData,
  Ministry,
  MinistryRole,
  RosterAssignment,
  RosterAssignmentStatus,
  RosterBoardRow,
  SetlistItem,
  Song,
  SongHistoryItem,
  VolunteerRoster,
  WorshipSetlist,
  YouTubeSearchResponse,
  YouTubeSearchResult,
} from '../types';

export const musicApi = {
  // ---------------------------------------------------------------------------
  // Bandas
  // ---------------------------------------------------------------------------

  bands: (): Promise<Band[]> =>
    apiClient.get('/api/music/bands/').then((r) => r.data),

  createBand: (payload: {
    name: string;
    color: string;
    photo?: string;
    leader?: number;
  }): Promise<Band> =>
    apiClient.post('/api/music/bands/', payload).then((r) => r.data),

  updateBand: (id: number, payload: Partial<Band>): Promise<Band> =>
    apiClient.patch(`/api/music/bands/${id}/`, payload).then((r) => r.data),

  deleteBand: (id: number): Promise<void> =>
    apiClient.delete(`/api/music/bands/${id}/`).then(() => undefined),

  // ---------------------------------------------------------------------------
  // Ministérios
  // ---------------------------------------------------------------------------

  ministries: (): Promise<Ministry[]> =>
    apiClient.get('/api/music/ministries/').then((r) => r.data),

  createMinistry: (payload: {
    name: string;
    color: string;
    leader?: number;
  }): Promise<Ministry> =>
    apiClient.post('/api/music/ministries/', payload).then((r) => r.data),

  updateMinistry: (id: number, payload: Partial<Ministry>): Promise<Ministry> =>
    apiClient.patch(`/api/music/ministries/${id}/`, payload).then((r) => r.data),

  deleteMinistry: (id: number): Promise<void> =>
    apiClient.delete(`/api/music/ministries/${id}/`).then(() => undefined),

  createMinistryRole: (
    ministryId: number,
    payload: { name: string },
  ): Promise<MinistryRole> =>
    apiClient
      .post(`/api/music/ministries/${ministryId}/roles/`, payload)
      .then((r) => r.data),

  deleteMinistryRole: (ministryId: number, roleId: number): Promise<void> =>
    apiClient
      .delete(`/api/music/ministries/${ministryId}/roles/${roleId}/`)
      .then(() => undefined),

  // ---------------------------------------------------------------------------
  // Escalas
  // ---------------------------------------------------------------------------

  volunteers: (): Promise<{ id: number; name: string; email: string }[]> =>
    apiClient.get('/api/music/rosters/volunteers/').then((r) => r.data),

  rosters: (params?: { month?: string }): Promise<VolunteerRoster[]> =>
    apiClient
      .get('/api/music/rosters/', { params: params ?? {} })
      .then((r) => r.data),

  myRosters: (params?: { month?: string }): Promise<VolunteerRoster[]> =>
    apiClient
      .get('/api/music/rosters/my-rosters/', { params: params ?? {} })
      .then((r) => r.data),

  createRoster: (payload: {
    date: string;
    time?: string;
    theme?: string;
    notes?: string;
    assignments?: {
      ministry: number;
      role: number;
      user: number;
      status?: RosterAssignmentStatus;
      notes?: string;
    }[];
  }): Promise<VolunteerRoster> =>
    apiClient.post('/api/music/rosters/', payload).then((r) => r.data),

  updateRoster: (
    id: number,
    payload: {
      date?: string;
      time?: string;
      theme?: string;
      notes?: string;
      is_published?: boolean;
    },
  ): Promise<VolunteerRoster> =>
    apiClient.patch(`/api/music/rosters/${id}/`, payload).then((r) => r.data),

  deleteRoster: (id: number): Promise<void> =>
    apiClient.delete(`/api/music/rosters/${id}/`).then(() => undefined),

  exportRosterText: (id: number): Promise<{ text: string }> =>
    apiClient.get(`/api/music/rosters/${id}/export-text/`).then((r) => r.data),

  rosterBoard: (id: number): Promise<RosterBoardRow[]> =>
    apiClient.get(`/api/music/rosters/${id}/board/`).then((r) => r.data),

  myAssignments: (rosterId: number): Promise<{
    roster_id: number;
    date: string;
    rows: {
      assignment_id: number;
      ministry: string;
      ministry_color: string;
      role: string;
      status: RosterAssignmentStatus;
      status_display: string;
    }[];
  }> =>
    apiClient.get(`/api/music/rosters/${rosterId}/my-assignments/`).then((r) => r.data),

  // ---------------------------------------------------------------------------
  // Atribuições (CRUD isolado)
  // ---------------------------------------------------------------------------

  createAssignment: (payload: {
    roster: number;
    ministry: number;
    role: number;
    user: number;
    status?: RosterAssignmentStatus;
    notes?: string;
  }): Promise<RosterAssignment> =>
    apiClient.post('/api/music/assignments/', payload).then((r) => r.data),

  updateAssignment: (
    id: number,
    payload: Partial<RosterAssignment>,
  ): Promise<RosterAssignment> =>
    apiClient.patch(`/api/music/assignments/${id}/`, payload).then((r) => r.data),

  deleteAssignment: (id: number): Promise<void> =>
    apiClient.delete(`/api/music/assignments/${id}/`).then(() => undefined),

  // ---------------------------------------------------------------------------
  // Setlists
  // ---------------------------------------------------------------------------

  upsertSetlist: (
    rosterId: number,
    items: {
      song: number;
      order?: number;
      custom_key?: string;
      notes?: string;
    }[],
  ): Promise<WorshipSetlist> =>
    apiClient
      .put(`/api/music/rosters/${rosterId}/setlist/`, { items })
      .then((r) => r.data),

  deleteSetlist: (rosterId: number): Promise<void> =>
    apiClient.delete(`/api/music/rosters/${rosterId}/setlist/`).then(() => undefined),

  // ---------------------------------------------------------------------------
  // Setlists das bandas
  // ---------------------------------------------------------------------------

  bandSetlists: (params?: { month?: string; band?: number }): Promise<BandSetlist[]> =>
    apiClient
      .get('/api/music/setlists/', { params: params ?? {} })
      .then((r) => r.data),

  bandSetlist: (id: number): Promise<BandSetlist> =>
    apiClient.get(`/api/music/setlists/${id}/`).then((r) => r.data),

  createBandSetlist: (payload: BandSetlistPayload): Promise<BandSetlist> =>
    apiClient.post('/api/music/setlists/', payload).then((r) => r.data),

  updateBandSetlist: (
    id: number,
    payload: BandSetlistPayload,
  ): Promise<BandSetlist> =>
    apiClient.put(`/api/music/setlists/${id}/`, payload).then((r) => r.data),

  deleteBandSetlist: (id: number): Promise<void> =>
    apiClient.delete(`/api/music/setlists/${id}/`).then(() => undefined),

  // ---------------------------------------------------------------------------
  // Músicas (repertório)
  // ---------------------------------------------------------------------------

  songs: (params?: {
    key?: string;
    tag?: string;
    q?: string;
    band?: number;
  }): Promise<Song[]> =>
    apiClient.get('/api/music/songs/', { params: params ?? {} }).then((r) => r.data),

  song: (id: number): Promise<Song> =>
    apiClient.get(`/api/music/songs/${id}/`).then((r) => r.data),

  createSong: (payload: {
    title: string;
    artist?: string;
    band?: number | null;
    youtube_id?: string;
    youtube_title?: string;
    thumbnail_url?: string;
    duration_seconds?: number;
    original_key?: string;
    church_key?: string;
    bpm?: number;
    time_signature?: string;
    chords?: string;
    chords_json?: Song['chords_json'];
    lyrics?: string;
    tags?: string;
  }): Promise<Song> =>
    apiClient.post('/api/music/songs/', payload).then((r) => r.data),

  updateSong: (id: number, payload: Partial<Song>): Promise<Song> =>
    apiClient.patch(`/api/music/songs/${id}/`, payload).then((r) => r.data),

  deleteSong: (id: number): Promise<void> =>
    apiClient.delete(`/api/music/songs/${id}/`).then(() => undefined),

  songHistory: (id: number): Promise<{ results: SongHistoryItem[] }> =>
    apiClient.get(`/api/music/songs/${id}/history/`).then((r) => r.data),

  // ---------------------------------------------------------------------------
  // Scraping (YouTube / Chordify)
  // ---------------------------------------------------------------------------

  youtubeSearch: (query: string): Promise<YouTubeSearchResponse> =>
    apiClient
      .get('/api/music/youtube-search/', { params: { q: query } })
      .then((r) => r.data),

  chordify: (youtubeId: string): Promise<ChordifyData> =>
    apiClient
      .get('/api/music/chordify/', { params: { youtube_id: youtubeId } })
      .then((r) => r.data),
};