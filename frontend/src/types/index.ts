export interface Project {
  slug: string;
  title: string;
  description: string;
  features?: string[];
  tags: string[];
  category: "hackathon" | "industry" | "academic" | "side";
  codeUrl?: string;
  demoUrl?: string;
  date: string;
  isFavorite?: boolean;
  result?: string;
  thumbnail?: string;
}

export interface Hackathon {
  date: string;
  name: string;
  city?: string;
  country?: string;
  coordinates?: [number, number];
  isRemote?: boolean;
  projectName: string;
  projectSlug?: string;
  projectUrl?: string;
  result?: string;
  solo?: boolean;
  domain: string;
}

export interface Experience {
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate?: string;
  skillAssembled: string;
  highlights: string[];
  note?: string;
}

export interface SkillSubcategory {
  name: string;
  skills: string[];
}

export interface SkillDomain {
  title: string;
  slug?: string;
  icon?: string;
  subcategories?: SkillSubcategory[];
  skills?: string[];
  battleTested: string[];
}

export interface Music {
  artistName: string;
  genre: string;
  status: string;
  location: string;
  bio: string;
  platforms: Record<string, string>;
}

export interface ContactRequest {
  name: string;
  email: string;
  message: string;
  website: string; // honeypot
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  preview: string;
  publishedAt: string;
}

export interface Feedback {
  id: string;
  name: string;
  message: string;
  createdAt: string;
}

export interface GuestbookEntry {
  id: string;
  githubUsername: string;
  githubAvatarUrl: string;
  githubProfileUrl: string;
  message: string;
  createdAt: string;
}

export interface PostComment {
  id: string;
  postId: string;
  githubUsername: string;
  githubAvatarUrl: string;
  githubProfileUrl: string;
  message: string;
  createdAt: string;
}

export interface PostStats {
  likeCount: number;
  commentCount: number;
  userLiked: boolean;
}

export interface AdminNotification {
  id: string;
  type: string;
  message: string;
  postId: string | null;
  isRead: boolean;
  createdAt: string;
}
