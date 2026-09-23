import type { BlogPost, PostStats, PostComment } from '../../types/index';
import { request } from './request';

export function fetchBlogPosts(): Promise<BlogPost[]> {
  return request<BlogPost[]>('GET', '/posts');
}

export function fetchBlogPost(slug: string): Promise<BlogPost> {
  return request<BlogPost>('GET', `/posts/${slug}`);
}

export async function createBlogPost(
  token: string,
  data: { slug: string; title: string; content: string; preview: string; category: string; publishedAt?: string },
): Promise<BlogPost> {
  return request<BlogPost>('POST', `/admin/posts`, { token, body: data });
}

export async function setPostArchived(token: string, id: string, archived: boolean): Promise<void> {
  return request<void>('PUT', `/admin/posts/${id}/archive`, { token, body: { archived }, responseType: 'none' });
}

export async function updateBlogPost(
  token: string,
  id: string,
  data: { slug: string; title: string; content: string; preview: string; category: string; publishedAt?: string; updatedAt?: string; archived?: boolean },
): Promise<BlogPost> {
  return request<BlogPost>('PUT', `/admin/posts/${id}`, { token, body: data });
}

export async function deleteBlogPost(token: string, id: string): Promise<void> {
  return request<void>('DELETE', `/admin/posts/${id}`, { token, responseType: 'none' });
}

export function fetchPostStats(slug: string, githubUsername?: string): Promise<PostStats> {
  const params = githubUsername ? `?user=${encodeURIComponent(githubUsername)}` : '';
  return request<PostStats>('GET', `/posts/${slug}/stats${params}`);
}

export function fetchPostComments(slug: string): Promise<PostComment[]> {
  return request<PostComment[]>('GET', `/posts/${slug}/comments`);
}

export async function togglePostLike(
  slug: string,
  data: { githubUsername: string },
): Promise<{ liked: boolean }> {
  return request<{ liked: boolean }>('POST', `/posts/${slug}/like`, { body: data });
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
  return request<PostComment>('POST', `/posts/${slug}/comments`, { body: data });
}
