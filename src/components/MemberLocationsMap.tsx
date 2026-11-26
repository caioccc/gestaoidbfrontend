'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Anchor, Box, Group, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useLanguage } from '../i18n';
import type {
  MemberLocationPoint,
  MemberLocationsPayload,
} from '../types';
import { haversineMeters } from '../utils/geo';
import styles from '../styles/member-map.module.css';

interface RouteInfo {
  distance: number | null;
  duration: number | null;
  fallback: boolean;
}

interface RouteTarget {
  latitude: number;
  longitude: number;
  label: string;
}

interface MemberLocationsMapProps {
  data: MemberLocationsPayload;
  points: MemberLocationPoint[];
  onEdit?: (memberId: number) => void;
}

const ACTIVE_COLOR = '#228be6';
const GEOCODED_COLOR = '#7950f2';
const INACTIVE_COLOR = '#868e96';
const CHURCH_COLOR = '#2f9e44';

export default function MemberLocationsMap({
  data,
  points,
  onEdit,
}: MemberLocationsMapProps) {
  const { t } = useLanguage();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);
  const geocoderMarkerRef = useRef<any>(null);
  const routeControlRef = useRef<any>(null);
  const routingRef = useRef<any>(null);
  const fallbackLineRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const onEditRef = useRef(onEdit);
  const tRef = useRef(t);
  const [ready, setReady] = useState(false);
  const [routeTarget, setRouteTarget] = useState<RouteTarget | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [geocodeError, setGeocodeError] = useState('');

  onEditRef.current = onEdit;
  tRef.current = t;

  const churchLat = data.church.latitude;
  const churchLng = data.church.longitude;
  const canRoute =
    typeof churchLat === 'number' && typeof churchLng === 'number';

  const bounds = useMemo(() => {
    const coords: [number, number][] = [];
    if (typeof churchLat === 'number' && typeof churchLng === 'number') {
      coords.push([churchLat, churchLng]);
    }
    points.forEach((point) => coords.push([point.latitude, point.longitude]));
    return coords;
  }, [churchLat, churchLng, points]);

  useEffect(() => {
    let disposed = false;
    const init = async () => {
      if (disposed || !containerRef.current) return;
      const LeafletModule = await import('leaflet');
      const L = (LeafletModule as any).default ?? LeafletModule;
      if (disposed || !containerRef.current) return;
      if (typeof window !== 'undefined') (window as any).L = L;
      await import('leaflet/dist/leaflet.css');
      await import('leaflet-control-geocoder/dist/Control.Geocoder.css');
      await import('leaflet-routing-machine/dist/leaflet-routing-machine.css');
      await import('leaflet.markercluster/dist/MarkerCluster.Default.css');
      await import('leaflet.markercluster');
      const RoutingModule: any = await import('leaflet-routing-machine');
      const Routing = RoutingModule.default ?? RoutingModule;
      if (!L.Routing && Routing?.control) L.Routing = Routing;
      routingRef.current = L.Routing ?? Routing;
      const GeocoderModule = await import('leaflet-control-geocoder');
      if (disposed || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        scrollWheelZoom: true,
      }).setView(
        typeof churchLat === 'number' && typeof churchLng === 'number'
          ? [churchLat, churchLng]
          : [-7.199, -35.903],
        13
      );
      mapRef.current = map;
      leafletRef.current = L;
      overlayRef.current = L.layerGroup().addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const geocoder = new GeocoderModule.default({
        collapsed: true,
        defaultMarkGeocode: false,
        placeholder: tRef.current.memberMap.geocodePlaceholder,
        errorMessage: tRef.current.memberMap.geocodeError,
      });
      geocoder.addTo(map);
      geocoder.on('markgeocode', (event: any) => {
        const center = event?.geocode?.center;
        if (!center) return;
        setGeocodeError('');
        map.flyTo(center, 15, { duration: 0.6 });
        if (geocoderMarkerRef.current) {
          map.removeLayer(geocoderMarkerRef.current);
        }
        geocoderMarkerRef.current = L.marker(center, {
          icon: L.divIcon({
            className: '',
            html: '<div style="width:16px;height:16px;border-radius:50%;background:#7048e8;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.35)"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
          zIndexOffset: 1000,
        }).addTo(map);
      });
      geocoder.on('errorgeocode', () => {
        setGeocodeError(tRef.current.memberMap.geocodeError);
      });

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
        overlayRef.current = null;
        geocoderMarkerRef.current = null;
        routeControlRef.current = null;
        routingRef.current = null;
        fallbackLineRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const overlay = overlayRef.current;
    if (!ready || !map || !L || !overlay) return;

    overlay.clearLayers();

    if (typeof churchLat === 'number' && typeof churchLng === 'number') {
      const churchMarker = L.marker([churchLat, churchLng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:28px;height:28px;border-radius:50%;background:${CHURCH_COLOR};border:2px solid #fff;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 1px 5px rgba(0,0,0,.35)">I</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        zIndexOffset: 500,
      });
      churchMarker.bindPopup(
        `<b>${escapeHtml(data.church.name)}</b><br/>${escapeHtml(data.church.address)}`
      );
      churchMarker.addTo(overlay);
    }

    const cluster = L.markerClusterGroup
      ? L.markerClusterGroup({
          maxClusterRadius: 45,
          iconCreateFunction: (group: any) => {
            const count = group.getChildCount();
            return L.divIcon({
              html: `<div style="width:34px;height:34px;border-radius:50%;background:${ACTIVE_COLOR};border:2px solid #fff;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:0 1px 5px rgba(0,0,0,.35)">${count}</div>`,
              className: '',
              iconSize: [34, 34],
              iconAnchor: [17, 17],
            });
          },
        })
      : L.layerGroup();

    points.forEach((point) => {
      const hasInactive = point.members.some(
        (member) => member.status === 'INACTIVE'
      );
      const hasGeocoded = point.members.some(
        (member) => member.location_source === 'geocoded'
      );
      const color = hasInactive
        ? INACTIVE_COLOR
        : hasGeocoded
          ? GEOCODED_COLOR
          : ACTIVE_COLOR;
      const marker = L.marker([point.latitude, point.longitude], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2px solid #fff;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 1px 5px rgba(0,0,0,.35)">${point.members.length}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      });
      marker.bindPopup(
        buildPointPopup(
          point,
          tRef.current,
          setRouteTarget,
          canRoute,
          onEditRef.current
        )
      );
      marker.on('click', () => {
        if (!canRoute) return;
        setRouteTarget({
          latitude: point.latitude,
          longitude: point.longitude,
          label: point.address || point.members[0]?.name || '',
        });
      });
      marker.addTo(cluster);
    });

    cluster.addTo(overlay);

    if (bounds.length > 0) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.2), { maxZoom: 15 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, points, churchLat, churchLng]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const Routing = routingRef.current;
    if (!ready || !map || !L || !Routing) return;

    if (routeControlRef.current) {
      map.removeControl(routeControlRef.current);
      routeControlRef.current = null;
    }
    if (fallbackLineRef.current) {
      map.removeLayer(fallbackLineRef.current);
      fallbackLineRef.current = null;
    }
    setRouteInfo(null);

    if (
      !routeTarget ||
      typeof churchLat !== 'number' ||
      typeof churchLng !== 'number'
    ) {
      return;
    }

    const router = Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1',
      suppressDemoServerWarning: true,
    });
    const control = Routing.control({
      waypoints: [
        L.latLng(churchLat, churchLng),
        L.latLng(routeTarget.latitude, routeTarget.longitude),
      ],
      router,
      show: false,
      addWaypoints: false,
      fitSelectedRoutes: false,
      routeWhileDragging: false,
      createMarker: () => false,
      lineOptions: {
        styles: [
          {
            color: ACTIVE_COLOR,
            weight: 5,
            opacity: 0.85,
            className: styles.memberRouteLine,
          },
        ],
      },
    }).addTo(map);
    routeControlRef.current = control;

    control.on('routesfound', (event: any) => {
      const summary = event?.routes?.[0]?.summary;
      if (summary) {
        setRouteInfo({
          distance: summary.totalDistance ?? null,
          duration: summary.totalTime ?? null,
          fallback: false,
        });
      }
    });
    control.on('routingerror', () => {
      setRouteInfo({
        distance: haversineMeters(
          churchLat,
          churchLng,
          routeTarget.latitude,
          routeTarget.longitude
        ),
        duration: null,
        fallback: true,
      });
      fallbackLineRef.current = L.polyline(
        [
          [churchLat, churchLng],
          [routeTarget.latitude, routeTarget.longitude],
        ],
        {
          color: ACTIVE_COLOR,
          weight: 3,
          dashArray: '6 8',
          className: `${styles.memberRouteLine} ${styles.fallback}`,
        }
      ).addTo(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, routeTarget, churchLat, churchLng]);

  return (
    <Box>
      <Box
        ref={containerRef}
        style={{
          height: isMobile ? 360 : 520,
          width: '100%',
          borderRadius: 8,
          zIndex: 0,
        }}
        data-testid="member-locations-map"
      />
      <Group mt="xs" justify="space-between" align="flex-start" wrap="wrap" gap="xs">
        <Text size="xs" c="dimmed">
          {t.memberMap.mapHint}
        </Text>
        <Group gap="xs" wrap="wrap">
          <Text size="xs" c="dimmed">
            {t.memberMap.legend}:
          </Text>
          <Text size="xs" c={ACTIVE_COLOR}>
            {t.memberMap.legendActive}
          </Text>
          <Text size="xs" c={GEOCODED_COLOR}>
            {t.memberMap.legendGeocoded}
          </Text>
          <Text size="xs" c={INACTIVE_COLOR}>
            {t.memberMap.legendInactive}
          </Text>
        </Group>
      </Group>
      {geocodeError && (
        <Text size="xs" c="red" mt="xs">
          {geocodeError}
        </Text>
      )}
      {routeTarget && (
        <Box mt="xs" p="sm" style={{ borderRadius: 8, background: '#f3f6ff' }}>
          <Text size="sm" fw={600}>
            {t.memberMap.routeTitle}: {routeTarget.label}
          </Text>
          {routeInfo ? (
            <>
              <Text size="xs" c="dimmed">
                {t.memberMap.distance}:{' '}
                {routeInfo.distance == null
                  ? '-'
                  : routeInfo.distance >= 1000
                    ? `${(routeInfo.distance / 1000).toFixed(1)} km`
                    : `${Math.round(routeInfo.distance)} m`}
              </Text>
              <Text size="xs" c="dimmed">
                {t.memberMap.duration}:{' '}
                {routeInfo.duration == null
                  ? '-'
                  : `${Math.max(1, Math.round(routeInfo.duration / 60))} min`}
              </Text>
              {routeInfo.fallback && (
                <Text size="xs" c="orange">
                  {t.memberMap.fallbackRoute}
                </Text>
              )}
            </>
          ) : (
            <Text size="xs" c="dimmed">
              {t.memberMap.routing}
            </Text>
          )}
          {typeof churchLat === 'number' &&
            typeof churchLng === 'number' && (
              <Anchor
                href={`https://www.google.com/maps/dir/?api=1&origin=${churchLat},${churchLng}&destination=${routeTarget.latitude},${routeTarget.longitude}`}
                target="_blank"
                rel="noreferrer"
                size="xs"
              >
                {t.memberMap.googleMaps}
              </Anchor>
            )}
        </Box>
      )}
    </Box>
  );
}

function buildPointPopup(
  point: MemberLocationPoint,
  translation: ReturnType<typeof useLanguage>['t'],
  setRouteTarget: (target: RouteTarget) => void,
  canRoute: boolean,
  onEdit?: (memberId: number) => void
): HTMLElement {
  const root = document.createElement('div');
  root.style.minWidth = '220px';

  const title = document.createElement('div');
  title.style.fontWeight = '700';
  title.style.marginBottom = '4px';
  title.textContent = `${translation.memberMap.membersPoint} (${point.members.length})`;
  root.appendChild(title);

  const address = document.createElement('div');
  address.style.fontSize = '12px';
  address.style.color = '#666';
  address.textContent = point.address || '-';
  root.appendChild(address);

  const source = document.createElement('div');
  source.style.fontSize = '11px';
  source.style.color = '#7950f2';
  source.style.marginTop = '2px';
  source.textContent = point.source === 'geocoded'
    ? translation.memberMap.sourceGeocoded
    : point.source === 'mixed'
      ? translation.memberMap.sourceMixed
      : translation.memberMap.sourceManual;
  root.appendChild(source);

  const list = document.createElement('div');
  list.style.marginTop = '8px';
  point.members.forEach((member) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.justifyContent = 'space-between';
    row.style.gap = '8px';
    row.style.marginTop = '4px';

    const name = document.createElement('span');
    name.style.fontSize = '13px';
    name.textContent = `${member.name}${member.status === 'INACTIVE' ? ` (${translation.memberMap.statusInactive})` : ''}`;
    row.appendChild(name);

    if (member.phone) {
      const call = document.createElement('a');
      call.href = `tel:${member.phone.replace(/\D/g, '')}`;
      call.textContent = translation.membersPage.callMember;
      call.style.fontSize = '12px';
      row.appendChild(call);
    }

    list.appendChild(row);
  });
  root.appendChild(list);

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';
  actions.style.marginTop = '10px';

  if (canRoute) {
    const route = document.createElement('button');
    route.type = 'button';
    route.textContent = translation.memberMap.routeFromChurch;
    route.style.fontSize = '12px';
    route.style.cursor = 'pointer';
    route.addEventListener('click', () => {
      setRouteTarget({
        latitude: point.latitude,
        longitude: point.longitude,
        label: point.address || point.members[0]?.name || '',
      });
    });
    actions.appendChild(route);
  }

  const firstMember = point.members[0];
  if (firstMember) {
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = translation.memberMap.editPoint;
    edit.style.fontSize = '12px';
    edit.style.cursor = 'pointer';
    edit.addEventListener('click', () => {
      onEdit?.(firstMember.id);
    });
    actions.appendChild(edit);
  }

  root.appendChild(actions);
  return root;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
