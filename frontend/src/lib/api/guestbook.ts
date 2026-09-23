import type { GuestbookEntry } from '../../types/index';
import { request } from './request';

export function fetchGuestbook(): Promise<GuestbookEntry[]> {
  return request<GuestbookEntry[]>('GET', '/guestbook');
}

export async function createGuestbookEntry(data: {
  githubUsername: string;
  githubAvatarUrl: string;
  githubProfileUrl: string;
  message: string;
}): Promise<GuestbookEntry> {
  return request<GuestbookEntry>('POST', `/guestbook`, { body: data });
}
