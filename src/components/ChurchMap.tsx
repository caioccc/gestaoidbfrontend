'use client';

import React, { useEffect, useRef } from 'react';
import { Box, Text, Center } from '@mantine/core';

interface ChurchMapProps {
  latitude: number | null;
  longitude: number | null;
  onMove?: (lat: number, lng: number) => void;
  onPick?: (lat: number, lng: number) => void;
  draggable?: boolean;
  scrollWheelZoom?: boolean;
  hint?: string;
}

export default function ChurchMap({
  latitude,
  longitude,
  onMove,
  onPick,
  draggable = true,
  scrollWheelZoom = true,
  hint,
}: ChurchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const iconRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;

    const init = async () => {
      if (disposed || !containerRef.current) return;
      const L = await import('leaflet');
      if (disposed || !containerRef.current) return;
      await import('leaflet/dist/leaflet.css');

      const icon = L.icon({
        iconUrl: `${window.location.origin}/leaflet/marker-icon.png`,
        iconRetinaUrl: `${window.location.origin}/leaflet/marker-icon-2x.png`,
        shadowUrl: `${window.location.origin}/leaflet/marker-shadow.png`,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });
      iconRef.current = icon;

      const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';
      const map = L.map(containerRef.current, {
        scrollWheelZoom,
      }).setView(hasCoords ? [latitude, longitude] : [-7.199, -35.903], 14);
      mapRef.current = map;
      leafletRef.current = L;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      if (hasCoords) {
        const marker = L.marker([latitude, longitude], { icon, draggable }).addTo(map);
        markerRef.current = marker;
        if (draggable && onMove) {
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            onMove(pos.lat, pos.lng);
          });
        }
      }

      map.on('dblclick', (e: { latlng: { lat: number; lng: number } }) => {
        onPick?.(e.latlng.lat, e.latlng.lng);
      });
    };

    init();
    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        leafletRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      mapRef.current &&
      typeof latitude === 'number' &&
      typeof longitude === 'number'
    ) {
      mapRef.current.setView([latitude, longitude]);
      const map = mapRef.current;
      const L = leafletRef.current;
      let marker = markerRef.current;
      if (!marker) {
        marker = L.marker([latitude, longitude], {
          icon: iconRef.current,
          draggable,
        }).addTo(map);
        markerRef.current = marker;
        if (draggable && onMove) {
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            onMove(pos.lat, pos.lng);
          });
        }
      } else {
        marker.setLatLng([latitude, longitude]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  return (
    <Box>
      <Box
        ref={containerRef}
        style={{ height: 300, width: '100%', borderRadius: 8, zIndex: 0 }}
      />
      {(latitude == null || longitude == null) && (
        <Center mt="xs">
          <Text size="xs" c="dimmed">
            {hint ?? 'Preencha o CEP ou arraste o marcador para definir as coordenadas.'}
          </Text>
        </Center>
      )}
    </Box>
  );
}