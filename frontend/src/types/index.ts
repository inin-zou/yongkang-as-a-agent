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
  id?: string;
  date: string;
  name: string;
  city?: string;
  country?: string;
  coordinates?: [number, number];
  lat?: number;
  lng?: number;
  isRemote?: boolean;
  projectName: string;
  projectSlug?: string;
  projectUrl?: string;
  result?: string;
  solo?: boolean;
  domain: string;
}

export interface Experience {
  id?: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate?: string;
  skillAssembled: string;
  highlights: string[];
  note?: string;
  sortOrder?: number;
}

export interface SkillSubcategory {
  name: string;
  skills: string[];
}

export interface SkillDomain {
  id?: string;
  title: string;
  slug?: string;
  icon?: string;
  subcategories?: SkillSubcategory[];
  skills?: string[];
  battleTested: string[];
  sortOrder?: number;
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
  category: string;
  publishedAt: string;
  updatedAt?: string;
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

export interface ProjectStatus {
  id?: string
  name: string
  status: string // 'ACTIVE' | 'PLANNING' | 'ON HOLD' | 'SHIPPED'
  description: string
  nextStep?: string
  links?: string
  sortOrder: number
}

export interface MusicTrack {
  id?: string;
  slug: string;
  name: string;
  genre: string;
  original: string;
  notes: string;
  fileUrl: string;
  sortOrder?: number;
}
