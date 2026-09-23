import type { Project, ProjectStatus } from '../../types/index';
import { request } from './request';

export function fetchProjects(category?: string): Promise<Project[]> {
  const params = category ? `?category=${category}` : '';
  return request<Project[]>('GET', `/projects${params}`);
}

export function fetchProject(slug: string): Promise<Project> {
  return request<Project>('GET', `/projects/${slug}`);
}

export function fetchProjectStatuses(): Promise<ProjectStatus[]> {
  return request<ProjectStatus[]>('GET', '/project-statuses');
}

export async function createProjectStatus(
  token: string,
  data: { name: string; status: string; description: string; nextStep: string; links: string; sortOrder: number },
): Promise<ProjectStatus> {
  return request<ProjectStatus>('POST', `/admin/project-statuses`, { token, body: data });
}

export async function updateProjectStatus(
  token: string,
  id: string,
  data: { name: string; status: string; description: string; nextStep: string; links: string; sortOrder: number },
): Promise<ProjectStatus> {
  return request<ProjectStatus>('PUT', `/admin/project-statuses/${id}`, { token, body: data });
}

export async function deleteProjectStatus(token: string, id: string): Promise<void> {
  return request<void>('DELETE', `/admin/project-statuses/${id}`, { token, responseType: 'none' });
}
