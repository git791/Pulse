/**
 * @module engine/constants
 * @description EPA / DEFRA / IEA-grounded emission factor constants for the
 * Pulse simulation engine.
 *
 * Every constant is annotated with its source assumption so reviewers and
 * auditors can trace each number back to primary data.
 *
 * This module is pure data — no runtime logic, no DOM dependencies.
 */

import type { CommuteMode, DietProfile, EnergySource, RegionType } from './types';

// ────────────────────────────────────────────────────────────────────────────
// Commute emission factors
// ────────────────────────────────────────────────────────────────────────────

/**
 * CO₂ emission factor per **one-way kilometre** by commute mode (kg CO₂/km).
 *
 * | Mode    | Factor  | Source / Assumption                                     |
 * |---------|---------|---------------------------------------------------------|
 * | car     | 0.21    | EPA avg passenger vehicle ≈ 404 g/mi ≈ 0.251 kg/mi     |
 * |         |         | ≈ 0.156 kg/km; bumped to 0.21 for cold-start, US fleet |
 * | transit | 0.089   | DEFRA 2024 average local bus: 0.089 kg CO₂/passenger-km |
 * | bike    | 0.0     | Zero direct emissions                                  |
 * | walk    | 0.0     | Zero direct emissions                                  |
 * | mixed   | 0.12    | Weighted avg ≈ 60 % car + 40 % transit                 |
 */
export const COMMUTE_FACTOR: Record<CommuteMode, number> = {
  car: 0.21,     // EPA avg passenger vehicle (US fleet avg incl. SUVs/trucks)
  transit: 0.089, // DEFRA 2024 local bus per passenger-km
  bike: 0.0,     // Zero direct emissions
  walk: 0.0,     // Zero direct emissions
  mixed: 0.12,   // Blended ≈ 60 % car / 40 % transit
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Diet emission factors
// ────────────────────────────────────────────────────────────────────────────

/**
 * CO₂ emission factor per **day** by dietary profile (kg CO₂/day).
 *
 * | Profile        | Factor | Source / Assumption                                  |
 * |----------------|--------|------------------------------------------------------|
 * | omnivore_high  | 7.2    | Scarborough et al. 2023 (high-meat: ≈ 7.19 kg/day)  |
 * | omnivore_avg   | 5.6    | Our World in Data, avg Western diet                  |
 * | flexitarian    | 4.1    | 1–2 meat-free days/week (OWID estimate)              |
 * | vegetarian     | 3.8    | Scarborough et al. 2023 (vegetarian: ≈ 3.81 kg/day) |
 * | vegan          | 2.9    | Scarborough et al. 2023 (vegan: ≈ 2.89 kg/day)      |
 */
export const DIET_FACTOR: Record<DietProfile, number> = {
  omnivore_high: 7.2,  // Scarborough et al. 2023 — high-meat diet
  omnivore_avg: 5.6,   // Our World in Data — avg Western omnivore
  flexitarian: 4.1,    // 1–2 meat-free days/week
  vegetarian: 3.8,     // Scarborough et al. 2023 — lacto-ovo vegetarian
  vegan: 2.9,          // Scarborough et al. 2023 — fully plant-based
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Home energy emission factors
// ────────────────────────────────────────────────────────────────────────────

/**
 * Baseline monthly CO₂ from home energy by electricity source and region.
 * Returns kg CO₂/month for an average household before homeSizeFactor.
 */
export const REGIONAL_GRID_INTENSITY: Record<RegionType, number> = {
  global_avg: 420,     // IEA 2023 global avg
  us_avg: 450,         // EIA US avg
  eu_avg: 210,         // EEA EU avg
  california: 240,     // CAISO cleaner mix
  india_avg: 710,      // CEA India avg (coal heavy)
  india_karnataka: 340 // Karnataka state (high renewable mix)
} as const;

export function getEnergyFactor(source: EnergySource, region: RegionType): number {
  const baseIntensity = REGIONAL_GRID_INTENSITY[region] || 450;
  if (source === 'grid_renewable') return 50; // Residual grid backup
  if (source === 'mixed') return baseIntensity * 0.5 + 50 * 0.5;
  return baseIntensity;
}

// ────────────────────────────────────────────────────────────────────────────
// Consumption (goods & services) baseline
// ────────────────────────────────────────────────────────────────────────────

/**
 * Maximum monthly CO₂ from goods and services consumption (kg CO₂/month)
 * when {@link HabitState.consumption.intensityIndex} = 1.0.
 *
 * Based on:
 * - EPA: avg US per-capita goods/services footprint ≈ 2,400 kg CO₂/yr
 *   → ≈ 200 kg/month at full intensity
 * - DEFRA 2024 scope-3 "other goods & services" per-capita estimates
 *
 * The actual value scales linearly: `CONSUMPTION_BASE * intensityIndex`.
 */
export const CONSUMPTION_BASE: number = 200; // kg CO₂/month at intensityIndex = 1.0

// ────────────────────────────────────────────────────────────────────────────
// Per-subtype emission factors (for individual ActivityEvent → CO₂ conversion)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Emission factor lookup: subtype → kg CO₂e per declared unit.
 *
 * The unit associated with each factor is implicitly defined by the
 * capture UI presets — keep them in sync.
 *
 * | Subtype            | Unit   | Factor (kg CO₂e) | Source                |
 * |--------------------|--------|-------------------|-----------------------|
 * | car_drive          | km     | 0.21              | EPA avg sedan         |
 * | flight             | mile   | 0.255             | DEFRA short-haul avg  |
 * | bus                | km     | 0.089             | DEFRA bus avg         |
 * | train              | km     | 0.041             | DEFRA rail avg        |
 * | bike               | km     | 0.0               | Zero direct           |
 * | walk               | km     | 0.0               | Zero direct           |
 * | beef               | kg     | 27.0              | Our World in Data     |
 * | poultry            | kg     | 6.9               | Our World in Data     |
 * | pork               | kg     | 12.1              | Our World in Data     |
 * | fish               | kg     | 6.1               | Our World in Data     |
 * | dairy              | L      | 3.15              | Our World in Data     |
 * | vegetables         | kg     | 2.0               | Our World in Data     |
 * | grains             | kg     | 1.4               | Our World in Data     |
 * | processed_food     | kg     | 5.0               | WRAP / DEFRA avg      |
 * | grid_electricity   | kWh    | 0.42              | IEA global avg 2023   |
 * | natural_gas        | therm  | 5.3               | EPA                   |
 * | heating_oil        | L      | 2.68              | DEFRA 2024            |
 * | clothing           | item   | 10.0              | WRAP avg garment      |
 * | electronics        | item   | 50.0              | Avg consumer device   |
 * | furniture          | item   | 100.0             | Avg furniture piece   |
 * | packaging          | item   | 1.5               | DEFRA 2024 avg        |
 */
export const CO2_PER_SUBTYPE: Record<string, number> = {
  // ── Transport (per km, except flight per mile) ──
  car_drive: 0.21,        // EPA avg passenger vehicle
  flight: 0.255,          // DEFRA 2024 short-haul economy class per passenger-mile
  bus: 0.089,             // DEFRA 2024 local bus per passenger-km
  train: 0.041,           // DEFRA 2024 national rail per passenger-km
  bike: 0.0,              // Zero direct emissions
  walk: 0.0,              // Zero direct emissions

  // ── Food (per kg, except dairy per litre) ──
  beef: 27.0,             // Our World in Data — beef herd (incl. land use)
  poultry: 6.9,           // Our World in Data — poultry
  pork: 12.1,             // Our World in Data — pig meat
  fish: 6.1,              // Our World in Data — farmed fish avg
  dairy: 3.15,            // Our World in Data — milk per litre
  vegetables: 2.0,        // Our World in Data — avg vegetables
  grains: 1.4,            // Our World in Data — wheat / rice avg
  processed_food: 5.0,    // WRAP / DEFRA avg processed food item

  // ── Energy (per kWh / therm / litre) ──
  grid_electricity: 0.42, // IEA 2023 global avg grid intensity
  natural_gas: 5.3,       // EPA — per therm (100,000 BTU)
  heating_oil: 2.68,      // DEFRA 2024 — per litre

  // ── Consumption (per item) ──
  clothing: 10.0,         // WRAP avg garment lifecycle
  electronics: 50.0,      // Avg consumer electronics device lifecycle
  furniture: 100.0,       // Avg furniture piece lifecycle
  packaging: 1.5,         // DEFRA 2024 avg packaging item
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Reference constants
// ────────────────────────────────────────────────────────────────────────────

/** Globally-averaged monthly CO₂ per capita (kg). ~4 t CO₂/yr. */
export const GLOBAL_AVG_MONTHLY_KG: number = 333;

/** US / UK typical monthly CO₂ per capita (kg). ~9 t CO₂/yr. */
export const DEVELOPED_AVG_MONTHLY_KG: number = 750;

/** Paris-Agreement-aligned 2030 target monthly CO₂ per capita (kg). ~2.3 t CO₂/yr. */
export const PARIS_TARGET_MONTHLY_KG: number = 192;

/** Default simulation horizon in months (5 years). */
export const DEFAULT_HORIZON_MONTHS: number = 60;

/** Average weeks per month (365.25 / 12 / 7). */
export const WEEKS_PER_MONTH: number = 4.345;

/** Average days per month (365.25 / 12). */
export const DAYS_PER_MONTH: number = 30.44;
