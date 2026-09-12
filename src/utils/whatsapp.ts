import type { LifecycleStage, MessageTemplateCategory } from '../types';

const LIFE_CYCLE_STAGES: LifecycleStage[] = [
  'VISITOR',
  'INTEGRATION',
  'ACTIVE',
  'ABSENT_CARE',
  'TRANSITION',
];

const LIFECYCLE_TO_CATEGORY: Record<LifecycleStage, MessageTemplateCategory> = {
  VISITOR: 'WELCOME',
  INTEGRATION: 'WELCOME',
  ACTIVE: 'CUSTOM',
  ABSENT_CARE: 'CARE',
  TRANSITION: 'CUSTOM',
};

export const FUNNEL_STAGES = LIFE_CYCLE_STAGES;

export function lifecycleCategoryHint(stage: LifecycleStage): MessageTemplateCategory {
  return LIFECYCLE_TO_CATEGORY[stage] ?? 'CUSTOM';
}

export function normalizeWhatsAppPhone(phone: string): string | null {
  const digits = (phone || '').replace(/\D/g, '');
  let normalized = digits;
  if (normalized.length === 10 || normalized.length === 11) {
    normalized = `55${normalized}`;
  }
  if (normalized.length < 12 || normalized.length > 15) {
    return null;
  }
  return normalized;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = normalizeWhatsAppPhone(phone);
  if (!digits) return '';
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function renderWhatsAppMessage(
  content: string,
  memberName: string,
  churchName: string,
  churchCity: string,
): string {
  const name = (memberName || '').trim();
  const firstName = name.split(' ')[0] || '';
  let result = content || '';
  result = result.replace(/\{\{NOME\}\}/g, name);
  result = result.replace(/\{\{PRIMEIRO_NOME\}\}/g, firstName);
  result = result.replace(/\{\{IGREJA\}\}/g, churchName || '');
  result = result.replace(/\{\{CIDADE\}\}/g, churchCity || '');
  return result;
}

export function daysSinceLastContact(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - date.getTime()) / 86_400_000));
}