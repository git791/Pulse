import { describe, it, expect } from 'vitest';
import { computeCo2ForActivity, monthlyRateKg, projectTrajectory } from './simulation';
import type { HabitState } from './types';

describe('simulation engine', () => {
  it('computeCo2ForActivity calculates correctly', () => {
    // car_drive factor is 0.21
    expect(computeCo2ForActivity('car_drive', 10)).toBeCloseTo(2.1);
    // beef factor is 27.0
    expect(computeCo2ForActivity('beef', 2)).toBeCloseTo(54.0);
    // unknown subtype should return 0
    expect(computeCo2ForActivity('unknown_xyz', 10)).toBe(0);
  });

  const baseState: HabitState = {
    commute: { mode: 'car', daysPerWeek: 5, distanceKm: 10 },
    diet: { profile: 'omnivore_avg' },
    energy: { source: 'grid_avg', homeSizeFactor: 1.0 },
    consumption: { intensityIndex: 0.5 },
    region: 'global_avg',
  };

  it('monthlyRateKg computes rate correctly for a given state', () => {
    const rate = monthlyRateKg(baseState);
    expect(typeof rate).toBe('number');
    expect(rate).toBeGreaterThan(0);
  });

  it('projectTrajectory generates points correctly', () => {
    const trajectory = projectTrajectory(baseState, 12);
    expect(trajectory.points.length).toBe(13); // month 0 to month 12
    expect(trajectory.points[0].monthIndex).toBe(0);
    expect(trajectory.points[12].monthIndex).toBe(12);

    // Cumulative CO2 should increase over time
    expect(trajectory.points[12].cumulativeCo2Kg).toBeGreaterThan(trajectory.points[0].cumulativeCo2Kg);
  });
});
