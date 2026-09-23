import { request } from './request';

export function fetchViews(): Promise<{ views: number }> {
  return request<{ views: number }>('GET', '/views');
}

export interface ContributionDay {
  date: string;
  contributionCount: number;
}

export interface ContributionCalendar {
  totalContributions: number;
  weeks: { contributionDays: ContributionDay[] }[];
}

export function fetchGitHubContributions(): Promise<ContributionCalendar> {
  return request<ContributionCalendar>('GET', '/github-contributions');
}
