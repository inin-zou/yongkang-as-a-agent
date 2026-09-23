import { request } from './request';

export async function fetchPage(id: string): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>('GET', `/pages/${id}`);
}

export async function updatePage(
  token: string,
  id: string,
  content: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return request<Record<string, unknown>>('PUT', `/admin/pages/${id}`, { token, body: content });
}
