import { request } from './request';

export interface DraftRequest {
  title: string
  category: string
  roughIdea: string
  mediaUrls?: string[]
}

export interface DraftResponse {
  content: string
  preview: string
  slug: string
}

export async function generateDraft(token: string, data: DraftRequest): Promise<DraftResponse> {
  return request<DraftResponse>('POST', `/admin/generate-draft`, { token, body: data, errorFormat: 'server' });
}

export interface RefineRequest {
  title: string
  category: string
  existingContent: string
  mediaUrls?: string[]
}

export async function refineDraft(token: string, data: RefineRequest): Promise<DraftResponse> {
  return request<DraftResponse>('POST', `/admin/refine-draft`, { token, body: data, errorFormat: 'server' });
}
