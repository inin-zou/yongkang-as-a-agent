import type { ContactRequest, Feedback, AdminNotification } from '../../types/index';
import { request } from './request';

export async function submitContact(data: ContactRequest): Promise<{ message: string }> {
  return request<{ message: string }>('POST', `/contact`, { body: data });
}

export async function submitFeedback(data: { name: string; message: string }): Promise<{ status: string }> {
  return request<{ status: string }>('POST', `/feedback`, { body: data });
}

export function fetchFeedback(token: string): Promise<Feedback[]> {
  return request<Feedback[]>('GET', '/admin/feedback', { token: token });
}

export async function deleteFeedback(token: string, id: string): Promise<void> {
  return request<void>('DELETE', `/admin/feedback/${id}`, { token, responseType: 'none' });
}

export function fetchNotifications(token: string): Promise<AdminNotification[]> {
  return request<AdminNotification[]>('GET', '/admin/notifications', { token: token });
}

export function fetchUnreadCount(token: string): Promise<{ count: number }> {
  return request<{ count: number }>('GET', '/admin/notifications/unread', { token: token });
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
  return request<void>('PUT', `/admin/notifications/${id}/read`, { token, responseType: 'none' });
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  return request<void>('PUT', `/admin/notifications/read-all`, { token, responseType: 'none' });
}
