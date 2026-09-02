'use client';

import React, { useEffect, useRef } from 'react';
import { Box, Text, Center } from '@mantine/core';

interface ChurchMapProps {
  latitude: number | null;
  longitude: number | null;
  onMove?: (lat: number, lng: number) => void;
  draggable?: boolean;
}

export default function ChurchMap({
  latitude,
  longitude,
  onMove,
  draggable = true,
}: ChurchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;

    const init = async () => {
      if (disposed || !containerRef.current) return;
      const L = await import('leaflet');
      if (disposed || !containerRef.current) return;
      await import('leaflet/dist/leaflet.css');

      const icon = L.icon({
        iconUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
        hasCoords ? [latitude, longitude] : [-7.199, -35.903],
        14
      );
      mapRef.current = map;

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
    };

    init();
    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
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
      const L = mapRef.current;
      if (!markerRef.current) {
        L.marker([latitude, longitude], { draggable }).addTo(L);
      } else {
        markerRef.current.setLatLng([latitude, longitude]);
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
            Preencha o CEP ou arraste o marcador para definir as coordenadas.
          </Text>
        </Center>
      )}
    </Box>
  );
}
