import type {
  GrowthGroup,
  GrowthGroupMapLayer,
  GrowthGroupMapPoint,
} from '../types';

const hasCoordinates = (
  group: GrowthGroup
): group is GrowthGroup & { latitude: number; longitude: number } =>
  typeof group.latitude === 'number' &&
  Number.isFinite(group.latitude) &&
  typeof group.longitude === 'number' &&
  Number.isFinite(group.longitude);

export function buildGrowthGroupMapLayer(groups: GrowthGroup[]): GrowthGroupMapLayer {
  const points: GrowthGroupMapPoint[] = [];
  const missing: GrowthGroupMapLayer['missing'] = [];

  groups
    .filter((group) => group.is_active)
    .forEach((group) => {
      if (!hasCoordinates(group)) {
        missing.push({
          id: group.id,
          name: group.name,
          address: group.address,
          reason: 'no_coordinates',
        });
        return;
      }
      if (group.radius_meters <= 0) {
        missing.push({
          id: group.id,
          name: group.name,
          address: group.address,
          reason: 'no_radius',
        });
        return;
      }
      points.push({
        id: group.id,
        name: group.name,
        leader_name: group.leader_name,
        weekday_display: group.weekday_display,
        time: group.time,
        category_display: group.category_display,
        address: group.address,
        radius_meters: group.radius_meters,
        latitude: group.latitude,
        longitude: group.longitude,
      });
    });

  return { points, missing };
}
