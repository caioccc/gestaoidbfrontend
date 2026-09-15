'use client';

import React, { useEffect, useRef } from 'react';
import { Box, Group, Text } from '@mantine/core';
import type { PastoralVisit, PastoralVisitStatus } from '../types';
import { formatDate } from '../utils/format';

export type VisitationAction = 'complete' | 'cancel';

interface VisitationMapProps {
  visits: PastoralVisit[];
  focusedId?: number | null;
  focusNonce?: number;
  onSelect?: (visit: PastoralVisit) => void;
  onAction?: (visitId: number, action: VisitationAction) => void;
  height?: number | string;
  minHeight?: number;
  popupOnClick?: boolean;
  labels?: {
    watcha: string;
    route: string;
    complete: string;
    cancel: string;
  };
  legend?: {
    planned: string;
    completed: string;
    cancelled: string;
  };
}

const STATUS_COLORS: Record<PastoralVisitStatus, string> = {
  PLANNED: '#f08c00',
  COMPLETED: '#2f9e44',
  CANCELLED: '#adb5bd',
};

function visitIcon(L: any, status: PastoralVisitStatus) {
  const bg = STATUS_COLORS[status] ?? STATUS_COLORS.PLANNED;
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${bg};border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><div style="width:8px;height:8px;border-radius:50%;background:#fff"></div></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

function visitPopup(v: PastoralVisit, labels: VisitationMapProps['labels']): string {
  const name = escapeHtml(v.member_name || v.target_name || 'Visita');
  const address = v.full_address
    ? escapeHtml(v.full_address)
    : '<i style="color:#868e96">Endereço não informado</i>';
  const phone =
    (v.member_phone || v.target_phone || '').trim()
      ? escapeHtml(v.member_phone || v.target_phone)
      : '<i style="color:#868e96">Sem telefone</i>';
  const typeLine = v.visit_type_display ? escapeHtml(v.visit_type_display) : '';
  const dateLine = v.scheduled_date
    ? `📅 ${escapeHtml(formatDate(v.scheduled_date))}${typeLine ? ` · ${typeLine}` : ''}`
    : typeLine;
  const notes = (v.notes || '').trim()
    ? `📝 ${escapeHtml(v.notes.trim())}`
    : '';
  const statusDot = `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${STATUS_COLORS[v.status]};margin-right:5px"></span>${escapeHtml(v.status_display)}`;

  const completeBtn =
    v.status === 'PLANNED'
      ? `<button type="button" data-visit-action="complete" data-visit-id="${v.id}" style="display:block;width:100%;margin-top:8px;padding:5px 10px;border:1px solid #2f9e44;border-radius:6px;background:#ebfbee;color:#2b8a3e;font-size:12px;font-weight:600;cursor:pointer">${escapeHtml(labels?.complete || 'Registrar como realizada')}</button>`
      : '';

  const cancelBtn =
    v.status === 'PLANNED'
      ? `<button type="button" data-visit-action="cancel" data-visit-id="${v.id}" style="display:block;width:100%;margin-top:4px;padding:5px 10px;border:1px solid #ced4da;border-radius:6px;background:#fff;color:#495057;font-size:12px;font-weight:600;cursor:pointer">${escapeHtml(labels?.cancel || 'Cancelar visita')}</button>`
      : '';

  const mapsLink = v.maps_url
    ? `<a href="${v.maps_url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;font-size:12px;color:#228be6;text-decoration:none;margin-right:10px">${escapeHtml(labels?.route || 'Abrir rota no Google Maps')}</a>`
    : '';

  const whatsappLink =
    (v.member_whatsapp_url || '').trim()
      ? `<a href="${v.member_whatsapp_url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;font-size:12px;color:#2f9e44;text-decoration:none">${escapeHtml(labels?.watcha || 'Enviar WhatsApp')}</a>`
      : '';

  return [
    `<b>${name}</b>`,
    `${statusDot}`,
    dateLine,
    `${address}`,
    `📞 ${phone}`,
    notes,
    mapsLink + whatsappLink,
    completeBtn + cancelBtn,
  ]
    .filter(Boolean)
    .join('<br/>');
}

export default function VisitationMap({
  visits,
  focusedId,
  focusNonce = 0,
  onSelect,
  onAction,
  height,
  minHeight = 420,
  popupOnClick = true,
  labels,
  legend,
}: VisitationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const featureRef = useRef<any>(null);
  const actionRef = useRef(onAction);
  actionRef.current = onAction;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;
  const autoFittedRef = useRef(false);
  const focusedIdRef = useRef<number | null>(null);
  const visitsSigRef = useRef('');

  useEffect(() => {
    let disposed = false;
    const init = async () => {
      if (disposed || !containerRef.current) return;
      const L = await import('leaflet');
      if (disposed || !containerRef.current) return;
      await import('leaflet/dist/leaflet.css');

      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        [-7.199, -35.903],
        12
      );
      mapRef.current = map;
      leafletRef.current = L;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      featureRef.current = L.layerGroup().addTo(map);

      // Botões do popup (Registrar como realizada / Cancelar): delegação de
      // eventos no container — os marcadores são recriados a cada `visits`.
      containerRef.current.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('[data-visit-action]') as HTMLElement | null;
        if (!btn || !btn.dataset.visitId || !btn.dataset.visitAction) return;
        const id = Number(btn.dataset.visitId);
        const action = btn.dataset.visitAction as VisitationAction;
        actionRef.current?.(id, action);
      });

      const observer = new ResizeObserver(() => {
        mapRef.current?.invalidateSize();
      });
      observer.observe(containerRef.current);

      map.invalidateSize();
    };
    init();
    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        leafletRef.current = null;
        featureRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const feature = featureRef.current;
    const L = leafletRef.current;
    if (!map || !feature || !L) return;

    feature.clearLayers();
    const withCoords = visits.filter(
      (v) => typeof v.latitude === 'number' && typeof v.longitude === 'number'
    );
    withCoords.forEach((v) => {
      const marker = L.marker([v.latitude, v.longitude], {
        icon: visitIcon(L, v.status),
      });
      if (popupOnClick) {
        marker.bindPopup(visitPopup(v, labels));
      }
      marker.on('click', () => {
        selectRef.current?.(v);
      });
      marker.addTo(feature);
    });

    const visitSig = visits.map((v) => v.id).join(',');
    if (visitSig !== visitsSigRef.current) {
      visitsSigRef.current = visitSig;
      if (focusedId == null) {
        autoFittedRef.current = false;
        focusedIdRef.current = null;
      }
    }

    if (focusedId == null && !autoFittedRef.current && withCoords.length > 0) {
      autoFittedRef.current = true;
      map.fitBounds(
        L.latLngBounds(
          withCoords.map((v) => [v.latitude, v.longitude] as [number, number])
        ).pad(0.3),
        { maxZoom: 15 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits, popupOnClick, labels]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || focusedId == null) return;
    const focused = visits.find((v) => v.id === focusedId);
    if (
      focused &&
      typeof focused.latitude === 'number' &&
      typeof focused.longitude === 'number'
    ) {
      map.flyTo([focused.latitude, focused.longitude], 15, { duration: 0.6 });
      focusedIdRef.current = focusedId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId, focusNonce]);

  return (
    <Box style={{ position: 'relative', width: '100%', height: height ?? '100%' }}>
      <Box
        ref={containerRef}
        style={{
          height: '100%',
          width: '100%',
          minHeight,
          borderRadius: 'var(--mantine-radius-md)',
          zIndex: 0,
          border: '1px solid var(--mantine-color-default-border)',
          overflow: 'hidden',
        }}
      />
      <Box
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 999,
          borderRadius: 8,
          padding: '5px 10px',
          border: '1px solid var(--mantine-color-default-border)',
          background: 'rgba(255,255,255,0.92)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          pointerEvents: 'none',
        }}
      >
        <Group gap={12} wrap="nowrap">
          <LegendItem color="#f08c00" label={legend?.planned ?? 'Planejadas'} />
          <LegendItem color="#2f9e44" label={legend?.completed ?? 'Realizadas'} />
          <LegendItem color="#adb5bd" label={legend?.cancelled ?? 'Canceladas'} />
        </Group>
      </Box>
    </Box>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <Text size="xs" c="dimmed" lh={1}>
      <Group gap={5} wrap="nowrap">
        <Dot color={color} />
        {label}
      </Group>
    </Text>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
      }}
    />
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}