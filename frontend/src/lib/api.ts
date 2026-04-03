import type {
  Project,
  Hackathon,
  Experience,
  SkillDomain,
  Music,
  ContactRequest,
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
