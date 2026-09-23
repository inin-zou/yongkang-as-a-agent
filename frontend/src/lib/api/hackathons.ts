import type { Hackathon } from '../../types/index';
import { request } from './request';

export function fetchHackathons(): Promise<Hackathon[]> {
  return request<Hackathon[]>('GET', '/hackathons');
}

export async function createHackathon(
  token: string,
  data: Hackathon,
): Promise<Hackathon> {
  return request<Hackathon>('POST', `/admin/hackathons`, { token, body: data });
}

export async function updateHackathon(
  token: string,
  id: string,
  data: Hackathon,
): Promise<Hackathon> {
  return request<Hackathon>('PUT', `/admin/hackathons/${id}`, { token, body: data });
}

export async function deleteHackathon(token: string, id: string): Promise<void> {
  return request<void>('DELETE', `/admin/hackathons/${id}`, { token, responseType: 'none' });
}
