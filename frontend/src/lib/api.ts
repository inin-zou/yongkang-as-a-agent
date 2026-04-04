import type {
  Project,
  Hackathon,
  Experience,
  SkillDomain,
  Music,
  ContactRequest,
  BlogPost,
  Feedback,
  GuestbookEntry,
  PostStats,
  PostComment,
  AdminNotification,
} from '../types/index';

const BASE_URL = '/api';

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export function fetchProjects(category?: string): Promise<Project[]> {
  const params = category ? `?category=${category}` : '';
  return fetchJSON<Project[]>(`/projects${params}`);
}

export function fetchProject(slug: string): Promise<Project> {
  return fetchJSON<Project>(`/projects/${slug}`);
}

export function fetchHackathons(): Promise<Hackathon[]> {
  return fetchJSON<Hackathon[]>('/hackathons');
}

export function fetchExperience(): Promise<Experience[]> {
  return fetchJSON<Experience[]>('/experience');
}

export function fetchSkills(): Promise<SkillDomain[]> {
  return fetchJSON<SkillDomain[]>('/skills');
}

export function fetchViews(): Promise<{ views: number }> {
  return fetchJSON<{ views: number }>('/views');
}

export function fetchMusic(): Promise<Music> {
  return fetchJSON<Music>('/music');
}

export async function submitContact(data: ContactRequest): Promise<{ message: string }> {
  const res = await fetch(`${BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function fetchBlogPosts(): Promise<BlogPost[]> {
  return fetchJSON<BlogPost[]>('/posts');
}

export function fetchBlogPost(slug: string): Promise<BlogPost> {
  return fetchJSON<BlogPost>(`/posts/${slug}`);
}

export async function submitFeedback(data: { name: string; message: string }): Promise<{ status: string }> {
  const res = await fetch(`${BASE_URL}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/* ─── Admin API (requires auth token) ─── */

export async function createBlogPost(
  token: string,
  data: { slug: string; title: string; content: string; preview: string },
): Promise<BlogPost> {
  const res = await fetch(`${BASE_URL}/admin/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function updateBlogPost(
  token: string,
  id: string,
  data: { slug: string; title: string; content: string; preview: string },
): Promise<BlogPost> {
  const res = await fetch(`${BASE_URL}/admin/posts/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function deleteBlogPost(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/admin/posts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

export async function fetchFeedback(token: string): Promise<Feedback[]> {
  const res = await fetch(`${BASE_URL}/admin/feedback`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function deleteFeedback(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/admin/feedback/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

/* ─── Guestbook ─── */

export function fetchGuestbook(): Promise<GuestbookEntry[]> {
  return fetchJSON<GuestbookEntry[]>('/guestbook');
}

export async function createGuestbookEntry(data: {
  githubUsername: string;
  githubAvatarUrl: string;
  githubProfileUrl: string;
  message: string;
}): Promise<GuestbookEntry> {
  const res = await fetch(`${BASE_URL}/guestbook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/* ─── Post stats / likes / comments ─── */

export function fetchPostStats(slug: string, githubUsername?: string): Promise<PostStats> {
  const params = githubUsername ? `?user=${encodeURIComponent(githubUsername)}` : '';
  return fetchJSON<PostStats>(`/posts/${slug}/stats${params}`);
}

export function fetchPostComments(slug: string): Promise<PostComment[]> {
  return fetchJSON<PostComment[]>(`/posts/${slug}/comments`);
}

export async function togglePostLike(
  slug: string,
  data: { githubUsername: string },
): Promise<{ liked: boolean }> {
  const res = await fetch(`${BASE_URL}/posts/${slug}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function createPostComment(
  slug: string,
  data: {
    githubUsername: string;
    githubAvatarUrl: string;
    githubProfileUrl: string;
    message: string;
  },
): Promise<PostComment> {
  const res = await fetch(`${BASE_URL}/posts/${slug}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/* ─── Admin notifications ─── */

export async function fetchNotifications(token: string): Promise<AdminNotification[]> {
  const res = await fetch(`${BASE_URL}/admin/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchUnreadCount(token: string): Promise<{ count: number }> {
  const res = await fetch(`${BASE_URL}/admin/notifications/unread`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/admin/notifications/${id}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/admin/notifications/read-all`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}
