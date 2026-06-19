/**
 * @module engine/types
 * @description Shared TypeScript interfaces for the Pulse carbon-tracking simulation engine.
 *
 * These types define the contract between ingestion, simulation, and
 * presentation layers. This module is pure — zero runtime dependencies,
 * zero DOM imports.
 */

// ────────────────────────────────────────────────────────────────────────────
// Activity Events
// ────────────────────────────────────────────────────────────────────────────

/** The four top-level emission categories tracked by Pulse. */
export type ActivityCategory = 'transport' | 'food' | 'energy' | 'consumption';
export type Category = ActivityCategory;

/** How the activity was captured. */
export type ActivitySource = 'manual' | 'photo' | 'voice';
export type CaptureSource = ActivitySource;

/**
 * Universal schema that every input mode (manual entry, photo scan, voice)
 * normalises to before storage or simulation.
 *
 * `co2_kg` is computed at ingestion time via {@link computeCo2ForActivity}
 * so downstream consumers never need to look up emission factors.
 *
 * @example
 * ```ts
 * const event: ActivityEvent = {
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   timestamp: '2025-06-18T10:30:00Z',
 *   category: 'transport',
 *   subtype: 'car_drive',
 *   quantity: 25,
 *   unit: 'km',
 *   source: 'manual',
 *   confidence: 1.0,
 *   co2_kg: 5.25,
 * };
 * ```
 */
export interface ActivityEvent {
  /** Unique identifier (UUID v4). */
  id: string;

  /** ISO 8601 timestamp of when the activity occurred. */
  timestamp: string;

  /** High-level emission category. */
  category: ActivityCategory;

  /**
   * Granular activity type within the category.
   * Must match a key in `CO2_PER_SUBTYPE` for automatic CO₂ computation.
   * Examples: `'flight'`, `'beef'`, `'grid_electricity'`, `'car_drive'`.
   */
  subtype: string;

  /**
   * Measured quantity in the unit specified by `unit`.
   * Examples: miles driven, kg of beef, kWh consumed.
   */
  quantity: number;

  /** Unit of measurement for `quantity` (e.g. `'km'`, `'kg'`, `'kWh'`). */
  unit: string;

  /** How this event was captured. */
  source: ActivitySource;

  /**
   * Confidence score in the range **[0, 1]**.
   * 1 = manually confirmed; lower values come from AI-based photo/voice parsing.
   */
  confidence: number;

  /**
   * CO₂-equivalent emissions in **kilograms**, computed at ingestion time
   * using the emission factors in `constants.ts`.
   */
  co2_kg: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Habit State (simulation input)
// ────────────────────────────────────────────────────────────────────────────

/** Commute transportation mode. */
export type CommuteMode = 'car' | 'transit' | 'bike' | 'walk' | 'mixed';

/** Dietary profile, ordered roughly from highest to lowest emissions. */
export type DietProfile =
  | 'omnivore_high'
  | 'omnivore_avg'
  | 'flexitarian'
  | 'vegetarian'
  | 'vegan';

/** Household energy source mix. */
export type EnergySource = 'grid_avg' | 'grid_renewable' | 'mixed';

/** Geographic region for localized emission factors. */
export type RegionType = 'global_avg' | 'us_avg' | 'eu_avg' | 'california' | 'india_avg' | 'india_karnataka';

/**
 * Snapshot of a user's recurring lifestyle habits.
 *
 * This is the **primary input** to the simulation engine — changing any field
 * produces a different CO₂ trajectory. Designed to be serialisable (no
 * functions, no class instances).
 *
 * @example
 * ```ts
 * const state: HabitState = {
 *   commute: { mode: 'car', daysPerWeek: 5, distanceKm: 20 },
 *   diet:    { profile: 'omnivore_avg' },
 *   energy:  { source: 'grid_avg', homeSizeFactor: 1.0 },
 *   consumption: { intensityIndex: 0.5 },
 * };
 * ```
 */
export interface HabitState {
  /** Daily commute parameters. */
  commute: {
    /** Primary transportation mode. */
    mode: CommuteMode;
    /** Number of commute days per week (0–7). */
    daysPerWeek: number;
    /** One-way commute distance in kilometres. */
    distanceKm: number;
  };

  /** Dietary profile. */
  diet: {
    /** Self-reported diet classification. */
    profile: DietProfile;
  };

  /** Home energy usage. */
  energy: {
    /** Primary electricity source. */
    source: EnergySource;
    /**
     * Multiplier for home size / usage relative to the national average.
     * `1.0` = average; `0.5` = small apartment; `1.5` = large house.
     */
    homeSizeFactor: number;
  };

  /** General consumption (goods, services, shopping). */
  consumption: {
    /**
     * Normalised intensity index in the range **[0, 1]**.
     * `0` = minimal consumption; `1` = heavy consumer.
     */
    intensityIndex: number;
  };

  /** Localized region for emission factors. */
  region: RegionType;
}

// ────────────────────────────────────────────────────────────────────────────
// Simulation Output
// ────────────────────────────────────────────────────────────────────────────

/**
 * A single data point on a projected CO₂ trajectory.
 * Each point represents one month of the simulation.
 */
export interface TrajectoryPoint {
  /** Zero-based month offset from the projection start (0 = current month). */
  monthIndex: number;

  /** Running total of CO₂ emitted up to and including this month (kg). */
  cumulativeCo2Kg: number;

  /** Emission rate for this specific month (kg CO₂). */
  rateKgPerMonth: number;
}

/**
 * A complete trajectory — either the user's current-habits baseline
 * or a hypothetical "what-if" fork.
 *
 * Trajectories are immutable once produced; to update, recompute via
 * {@link projectTrajectory} or {@link forkTrajectory}.
 */
export interface Trajectory {
  /** Unique identifier (UUID v4). */
  id: string;

  /** Discriminator: `'baseline'` for current habits, `'hypothetical'` for what-if. */
  label: 'baseline' | 'hypothetical';

  /**
   * If this is a hypothetical trajectory, the month index at which it
   * diverges from the baseline. `undefined` for baselines.
   */
  forkedFromMonth?: number;

  /** Ordered list of monthly data points. */
  points: TrajectoryPoint[];
}

// ────────────────────────────────────────────────────────────────────────────
// Hypothetical Scenarios
// ────────────────────────────────────────────────────────────────────────────

/**
 * A predefined "what-if" scenario the user can tap to see how a specific
 * lifestyle change would alter their trajectory.
 *
 * @example
 * ```ts
 * const scenario: HypotheticalScenario = {
 *   id: 'go-veg',
 *   title: 'Go Vegetarian',
 *   description: 'Switch to a vegetarian diet',
 *   icon: '🥦',
 *   delta: { diet: { profile: 'vegetarian' } },
 * };
 * ```
 */
export interface HypotheticalScenario {
  /** Unique scenario identifier. */
  id: string;

  /** Human-readable title (e.g. "Go Vegetarian"). */
  title: string;

  /** Short description of the change and its expected impact. */
  description: string;

  /** Emoji icon for UI display. */
  icon: string;

  /**
   * Partial `HabitState` that gets deep-merged onto the user's current state
   * to produce the hypothetical trajectory.
   */
  delta: Partial<HabitState>;
}
