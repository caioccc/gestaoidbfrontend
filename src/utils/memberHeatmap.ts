import type { MemberLocationPoint } from '../types';

export type MemberHeatPoint = [number, number, number];

export function buildMemberHeatPoints(points: MemberLocationPoint[]): MemberHeatPoint[] {
  const maxMembers = Math.max(4, ...points.map((point) => point.members.length));
  return points.map((point) => [
    point.latitude,
    point.longitude,
    Math.min(1, point.members.length / maxMembers),
  ]);
}
