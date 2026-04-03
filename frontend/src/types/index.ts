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
