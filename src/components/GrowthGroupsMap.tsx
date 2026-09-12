'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Group, Stack, Text } from '@mantine/core';
import { IconCrosshair, IconX } from '@tabler/icons-react';
import type { GrowthGroup } from '../types';
import { groupIdsCovering, nearestGroup } from '../utils/geo';
import { useMediaQuery } from '@mantine/hooks';

export interface SimulationPoint {
  lat: number;
  lng: number;
}

interface GrowthGroupsMapProps {
  groups: GrowthGroup[];
  focusedId?: number | null;
  overlapIds?: number[];
  simulation?: SimulationPoint | null;
  onSimulationChange?: (point: SimulationPoint | null) => void;
  onCoverageChange?: (covered: number[], nearestId: number | null) => void;
}

const ACTIVE_COLOR = '#228be6';
const INACTIVE_COLOR = '#adb5bd';
const OVERLAP_COLOR = '#e03131';
const COVERED_COLOR = '#2f9e44';

function groupIcon(
  L: any,
  label: string,
  covered: boolean,
  overlapping: boolean,
  active: boolean
) {
  const bg = !active
    ? INACTIVE_COLOR
    : covered
      ? COVERED_COLOR
      : overlapping
        ? OVERLAP_COLOR
        : ACTIVE_COLOR;
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${bg};border:2px solid #fff;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 1px 4px rgba(0,0,0,.35)">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function simulationIcon(L: any) {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${COVERED_COLOR};border:3px solid #fff;box-shadow:0 0 0 3px rgba(47,158,68,.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function groupPopup(g: GrowthGroup): string {
  return [
    `<b>${escapeHtml(g.name)}</b>`,
    `Líder: ${escapeHtml(g.leader_name)}`,
    `${g.weekday_display} às ${(g.time || '').slice(0, 5)}`,
    `Endereço: ${escapeHtml(g.address)}`,
    `Raio: ${g.radius_meters} m`,
    g.is_active ? '' : '<i style="color:#868e96">GC inativo</i>',
  ]
    .filter(Boolean)
    .join('<br/>');
}

export default function GrowthGroupsMap({
  groups,
  focusedId,
  overlapIds = [],
  simulation,
  onSimulationChange,
  onCoverageChange,
}: GrowthGroupsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const featureRef = useRef<any>(null);
  const focusedIdRef = useRef<number | null>(null);
  const autoFittedRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);

  // Inicialização única do mapa.
  useEffect(() => {
    let disposed = false;
    const init = async () => {
      if (disposed || !containerRef.current) return;
      const L = await import('leaflet');
      if (disposed || !containerRef.current) return;
      await import('leaflet/dist/leaflet.css');

      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        [-7.199, -35.903],
        13
      );
      mapRef.current = map;
      leafletRef.current = L;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      featureRef.current = L.layerGroup().addTo(map);

      map.on('click', (e: { latlng: { lat: number; lng: number } }) => {
        onSimulationChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      // As abas Mantine mantêm os painéis montados com `display:none`
      // (keepMounted=true); quando a aba Dashboard&Mapa volta a ficar visível,
      // o container sai do tamanho 0 e o Leaflet precisa recalcular o layout,
      // senão zonas/círculos e marcadores ficam "invisíveis".
      const observer = new ResizeObserver(() => {
        mapRef.current?.invalidateSize();
      });
      observer.observe(containerRef.current);
      resizeObserverRef.current = observer;

      setReady(true);
      map.invalidateSize();
    };
    init();
    return () => {
      disposed = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        leafletRef.current = null;
        featureRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Renderiza marcadores + círculos sempre que os dados mudam.
  useEffect(() => {
    const map = mapRef.current;
    const feature = featureRef.current;
    const L = leafletRef.current;
    if (!ready || !map || !feature || !L) return;

    feature.clearLayers();

    const coveredIds = simulation ? groupIdsCovering(groups, simulation) : [];
    const withCoords = groups.filter(
      (g) => g.latitude != null && g.longitude != null
    );

    withCoords.forEach((g, idx) => {
      const lat = g.latitude as number;
      const lng = g.longitude as number;
      const marker = L.marker([lat, lng], {
        icon: groupIcon(
          L,
          String(idx + 1),
          coveredIds.includes(g.id),
          overlapIds.includes(g.id),
          g.is_active
        ),
      });
      marker.bindPopup(groupPopup(g));
      marker.addTo(feature);

      L.circle([lat, lng], {
        radius: g.radius_meters,
        color: !g.is_active
          ? INACTIVE_COLOR
          : coveredIds.includes(g.id)
            ? COVERED_COLOR
            : overlapIds.includes(g.id)
              ? OVERLAP_COLOR
              : ACTIVE_COLOR,
        fillColor: !g.is_active
          ? INACTIVE_COLOR
          : coveredIds.includes(g.id)
            ? COVERED_COLOR
            : overlapIds.includes(g.id)
              ? OVERLAP_COLOR
              : ACTIVE_COLOR,
        fillOpacity: 0.35,
        weight: 2,
      }).addTo(feature);
    });

    // Simulação: marcador verde + abrange o mapa segundo os dados atuais.
    if (map._simMarker) map.removeLayer(map._simMarker);
    if (simulation) {
      map._simMarker = L.marker([simulation.lat, simulation.lng], {
        icon: simulationIcon(L),
        zIndexOffset: 1000,
        interactive: false,
      }).addTo(map);
    }

    // Ajusta a visão do mapa conforme o GC focado.
    const focused = groups.find((g) => g.id === focusedId);
    if (focused && focused.latitude != null && focused.longitude != null) {
      map.flyTo([focused.latitude, focused.longitude], 14, { duration: 0.6 });
      focusedIdRef.current = focusedId ?? null;
    } else if (
      focusedId != null &&
      focusedIdRef.current !== focusedId &&
      !focused
    ) {
      focusedIdRef.current = focusedId ?? null;
      if (withCoords.length > 0) {
        map.fitBounds(
          L.latLngBounds(
            withCoords.map((g) => [g.latitude, g.longitude] as [number, number])
          ).pad(0.25),
          { maxZoom: 15 }
        );
      }
    } else if (!focusedId && !autoFittedRef.current) {
      // Primeira carga sem GC focado: enquadra todos os GCs cadastrados,
      // garantindo que a área de cobertura (raios) fique visível.
      if (withCoords.length > 0) {
        autoFittedRef.current = true;
        map.fitBounds(
          L.latLngBounds(
            withCoords.map((g) => [g.latitude, g.longitude] as [number, number])
          ).pad(0.3),
          { maxZoom: 15 }
        );
      }
    }
  }, [ready, groups, overlapIds, simulation, focusedId]);

  // Reporta cobertura (quais GCs cobrem a simulação + mais próximo).
  useEffect(() => {
    if (!simulation) {
      onCoverageChange?.([], null);
      return;
    }
    const covered = groupIdsCovering(groups, simulation);
    const nearest = nearestGroup(groups, simulation);
    onCoverageChange?.(covered, nearest ? nearest.id : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulation, groups]);

  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <Box>
      <Box
        ref={containerRef}
        style={{ height: isMobile ? 320 : 520, width: '100%', borderRadius: 8, zIndex: 0 }}
      />
      <Group mt="xs" justify="space-between" align="center" wrap="wrap" gap="sm">
        <Text size="xs" c="dimmed">
          Clique no mapa para simular um ponto de residência e checar a
          cobertura dos GCs.
        </Text>
        <Group gap="xs" wrap="nowrap">
          {simulation && (
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<IconX size={13} />}
              onClick={() => onSimulationChange?.(null)}
            >
              Remover marcador
            </Button>
          )}
          <Button
            size="xs"
            variant="default"
            leftSection={<IconCrosshair size={14} />}
            loading={locating}
            onClick={() => {
              if (!navigator.geolocation) {
                onSimulationChange?.(null);
                return;
              }
              setLocating(true);
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setLocating(false);
                  onSimulationChange?.({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                  });
                },
                () => setLocating(false),
                { enableHighAccuracy: true, timeout: 8000 }
              );
            }}
          >
            Minha localização
          </Button>
        </Group>
      </Group>
    </Box>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}