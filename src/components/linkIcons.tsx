import React from 'react';
import {
  IconLink,
  IconQrcode,
  IconBrandWhatsapp,
  IconBrandYoutube,
  IconMapPin,
  IconBrandInstagram,
  IconCalendarEvent,
  IconUserPlus,
  IconPray,
} from '@tabler/icons-react';

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  link: IconLink,
  qrcode: IconQrcode,
  'brand-whatsapp': IconBrandWhatsapp,
  'brand-youtube': IconBrandYoutube,
  'map-pin': IconMapPin,
  'brand-instagram': IconBrandInstagram,
  calendar: IconCalendarEvent,
  'user-plus': IconUserPlus,
  pray: IconPray,
};

export function LinkTypeIcon({
  iconKey,
  size = 18,
  color,
}: {
  iconKey?: string | null;
  size?: number;
  color?: string;
}) {
  const Icon = (iconKey && ICONS[iconKey]) || IconLink;
  return <Icon size={size} color={color} />;
}