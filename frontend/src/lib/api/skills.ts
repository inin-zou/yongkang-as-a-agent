import type { SkillDomain } from '../../types/index';
import { request } from './request';

export function fetchSkills(): Promise<SkillDomain[]> {
  return request<SkillDomain[]>('GET', '/skills');
}

export async function createSkill(
  token: string,
  data: { title: string; slug: string; skills: string[]; battleTested: string[]; sortOrder: number },
): Promise<SkillDomain> {
  return request<SkillDomain>('POST', `/admin/skills`, { token, body: data });
}

export async function updateSkill(
  token: string,
  id: string,
  data: { title: string; slug: string; skills: string[]; battleTested: string[]; sortOrder: number },
): Promise<SkillDomain> {
  return request<SkillDomain>('PUT', `/admin/skills/${id}`, { token, body: data });
}

export async function deleteSkill(token: string, id: string): Promise<void> {
  return request<void>('DELETE', `/admin/skills/${id}`, { token, responseType: 'none' });
}
