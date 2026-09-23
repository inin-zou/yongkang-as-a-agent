import type { Music, MusicTrack } from '../../types/index';
import { request } from './request';

export function fetchMusic(): Promise<Music> {
  return request<Music>('GET', '/music');
}

export function fetchMusicTracks(): Promise<MusicTrack[]> {
  return request<MusicTrack[]>('GET', '/music-tracks');
}

export async function createMusicTrack(
  token: string,
  data: Omit<MusicTrack, 'id'>,
): Promise<MusicTrack> {
  return request<MusicTrack>('POST', `/admin/music-tracks`, { token, body: data });
}

export async function updateMusicTrack(
  token: string,
  id: string,
  data: Omit<MusicTrack, 'id'>,
): Promise<MusicTrack> {
  return request<MusicTrack>('PUT', `/admin/music-tracks/${id}`, { token, body: data });
}

export async function deleteMusicTrack(token: string, id: string): Promise<void> {
  return request<void>('DELETE', `/admin/music-tracks/${id}`, { token, responseType: 'none' });
}
