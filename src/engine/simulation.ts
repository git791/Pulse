/**
 * @module engine/simulation
 * @description Pure utility functions used by the capture layer.
 *
 * These are intentionally small and side-effect free so they can be
 * called from any context — including Web Workers.
 */

import type { HabitState, Trajectory, TrajectoryPoint } from './types';
import {
  CO2_PER_SUBTYPE,
  COMMUTE_FACTOR,
  DIET_FACTOR,
  getEnergyFactor,
  CONSUMPTION_BASE,
  WEEKS_PER_MONTH,
  DAYS_PER_MONTH,
  DEFAULT_HORIZON_MONTHS,
} from './constants';

// ─── ID Generation ───────────────────────────────────────────────────────────

/**
 * Generate a compact, collision-resistant unique identifier.
 *
 * Uses `crypto.randomUUID()` when available (all modern browsers),
 * falling back to a timestamp + random suffix for older environments.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: 13-char timestamp + 9-char random
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 11)
  );
}

// ─── CO₂ Computation ────────────────────────────────────────────────────────

/**
 * Compute the estimated CO₂e (kg) for a given activity.
 *
 * @param subtype - Machine-readable subtype key (must exist in `CO2_PER_SUBTYPE`).
 * @param quantity - Numeric amount in the subtype's natural unit.
 * @returns Estimated kg CO₂e, rounded to 2 decimal places. Returns 0 for unknown subtypes.
 *
 * @example
 * ```ts
 * computeCo2ForActivity('car_drive', 30); // 6.3  (30 km × 0.21 kg/km)
 * computeCo2ForActivity('beef', 0.5);     // 13.5 (0.5 kg × 27 kg/kg)
 * ```
 */
export function computeCo2ForActivity(subtype: string, quantity: number): number {
  const factor = CO2_PER_SUBTYPE[subtype];
  if (factor === undefined) {
    console.warn(`[simulation] Unknown subtype "${subtype}" — returning 0 kg CO₂e`);
    return 0;
  }
  return Math.round(factor * quantity * 100) / 100;
}

// ─── Trajectory Simulation ──────────────────────────────────────────────────

export function monthlyRateKg(state: HabitState): number {
  let total = 0;

  // Commute (round trip * days per week * weeks per month)
  const commuteFactor = COMMUTE_FACTOR[state.commute.mode];
  total += commuteFactor * (state.commute.distanceKm * 2) * state.commute.daysPerWeek * WEEKS_PER_MONTH;

  // Diet
  total += DIET_FACTOR[state.diet.profile] * DAYS_PER_MONTH;

  // Energy
  total += getEnergyFactor(state.energy.source, state.region) * state.energy.homeSizeFactor;

  // Consumption
  total += CONSUMPTION_BASE * state.consumption.intensityIndex;

  return Math.round(total * 100) / 100;
}

export function projectTrajectory(
  state: HabitState,
  horizonMonths: number = DEFAULT_HORIZON_MONTHS,
  _momentum: number = 0
): Trajectory {
  const points: TrajectoryPoint[] = [];
  let cumulative = 0;
  const rate = monthlyRateKg(state);
  
  for (let m = 0; m <= horizonMonths; m++) {
    points.push({
      monthIndex: m,
      cumulativeCo2Kg: Math.round(cumulative * 100) / 100,
      rateKgPerMonth: rate,
    });
    // Add rate for the next month
    cumulative += rate;
  }

  return {
    id: generateId(),
    label: 'baseline',
    points,
  };
}

export function forkTrajectory(
  baseline: Trajectory,
  currentState: HabitState,
  delta: Partial<HabitState>,
  atMonth: number = 0
): Trajectory {
  const forkedState = deepMerge(currentState, delta);
  const newRate = monthlyRateKg(forkedState);
  
  const points: TrajectoryPoint[] = [];
  
  // Copy points up to fork
  const preFork = baseline.points.filter(p => p.monthIndex < atMonth);
  points.push(...preFork);
  
  // Find fork point state
  const forkPoint = baseline.points.find(p => p.monthIndex === atMonth) || 
    { monthIndex: atMonth, cumulativeCo2Kg: 0, rateKgPerMonth: 0 };
    
  points.push({
    monthIndex: atMonth,
    cumulativeCo2Kg: forkPoint.cumulativeCo2Kg,
    rateKgPerMonth: newRate
  });
  
  let cumulative = forkPoint.cumulativeCo2Kg + newRate;
  const totalMonths = baseline.points.length > 0 
    ? baseline.points[baseline.points.length - 1].monthIndex 
    : DEFAULT_HORIZON_MONTHS;
    
  for (let m = atMonth + 1; m <= totalMonths; m++) {
    points.push({
      monthIndex: m,
      cumulativeCo2Kg: Math.round(cumulative * 100) / 100,
      rateKgPerMonth: newRate,
    });
    cumulative += newRate;
  }

  return {
    id: generateId(),
    label: 'hypothetical',
    forkedFromMonth: atMonth,
    points,
  };
}

// ─── Utilities ──────────────────────────────────────────────────────────────

export function deepMerge<T>(target: T, source: Partial<T>): T {
  const isObject = (obj: any) => obj && typeof obj === 'object' && !Array.isArray(obj);

  const merged = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key as keyof Partial<T>] === undefined) continue;
    
    if (isObject(target[key as keyof T]) && isObject(source[key as keyof Partial<T>])) {
      merged[key as keyof T] = deepMerge(
        target[key as keyof T], 
        source[key as keyof Partial<T>] as any
      );
    } else {
      merged[key as keyof T] = source[key as keyof Partial<T>] as any;
    }
  }

  return merged;
}
