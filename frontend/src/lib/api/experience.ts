import type { Experience } from '../../types/index';
import { request } from './request';

export function fetchExperience(): Promise<Experience[]> {
  return request<Experience[]>('GET', '/experience');
}

export async function createExperience(
  token: string,
  data: Experience,
): Promise<Experience> {
  return request<Experience>('POST', `/admin/experience`, { token, body: data });
}

export async function updateExperience(
  token: string,
  id: string,
  data: Experience,
): Promise<Experience> {
  return request<Experience>('PUT', `/admin/experience/${id}`, { token, body: data });
}

export async function deleteExperience(token: string, id: string): Promise<void> {
  return request<void>('DELETE', `/admin/experience/${id}`, { token, responseType: 'none' });
}
