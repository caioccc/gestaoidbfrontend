import { useCallback, useEffect, useState } from 'react';
import { accountsApi } from '../api/accounts';
import type { CardConfig } from '../types';

export const DEFAULT_CARD_CONFIG: CardConfig = {
  card_primary_color: '#0f766e',
  card_secondary_color: '#0ea5e9',
  card_valid_until: null,
  card_front_phrase: '',
  card_back_phrase: '',
};

export interface ChurchContact {
  pastor_name: string;
  phone: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
}

const EMPTY_CONTACT: ChurchContact = {
  pastor_name: '',
  phone: '',
  street: '',
  number: '',
  neighborhood: '',
  city: '',
  state: '',
};

type Fetcher = () => Promise<Record<string, any>>;

function fromChurch(data: Record<string, any> | null | undefined): CardConfig {
  if (!data) return DEFAULT_CARD_CONFIG;
  return {
    card_primary_color:
      data.card_primary_color || DEFAULT_CARD_CONFIG.card_primary_color,
    card_secondary_color:
      data.card_secondary_color || DEFAULT_CARD_CONFIG.card_secondary_color,
    card_valid_until: data.card_valid_until || null,
    card_front_phrase: data.card_front_phrase || '',
    card_back_phrase: data.card_back_phrase || '',
  };
}

function toContact(data: Record<string, any> | null | undefined): ChurchContact {
  if (!data) return EMPTY_CONTACT;
  return {
    pastor_name: data.pastor_name || '',
    phone: data.phone || '',
    street: data.street || '',
    number: data.number || '',
    neighborhood: data.neighborhood || '',
    city: data.city || '',
    state: data.state || '',
  };
}

export interface ChurchCardData {
  config: CardConfig;
  contact: ChurchContact;
  profile: Record<string, any> | null;
  refresh: () => void;
}

export function useChurchCardConfig(
  fetcher?: Fetcher
): ChurchCardData {
  const [config, setConfig] = useState<CardConfig>(DEFAULT_CARD_CONFIG);
  const [contact, setContact] = useState<ChurchContact>(EMPTY_CONTACT);
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let active = true;
    const load = fetcher ?? (accountsApi.getProfile as Fetcher);
    load()
      .then((data) => {
        if (!active) return;
        setProfile(data ?? null);
        setConfig(fromChurch(data));
        setContact(toContact(data));
      })
      .catch(() => {
        if (!active) return;
        setProfile(null);
        setConfig(DEFAULT_CARD_CONFIG);
        setContact(EMPTY_CONTACT);
      });
    return () => {
      active = false;
    };
  }, [fetcher, version]);

  return { config, contact, profile, refresh };
}