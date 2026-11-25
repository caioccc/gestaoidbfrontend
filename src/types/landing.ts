export interface Belief {
  number: string;
  text: string;
}

export interface ScheduleItem {
  period: string;
  activity: string;
  description: string;
}

export interface Leader {
  name: string;
  role: string;
  photo?: string;
}

export interface Region {
  region: string;
  supervisor: string;
}

export interface SocialLink {
  label: string;
  href: string;
  shortLabel: string;
}

export interface LandingEvent {
  title: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
}
