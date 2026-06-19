import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Trajectory } from '../engine/types';

// ─── Public Props ────────────────────────────────────────────────────────────

export interface TrajectoryChartProps {
  /** Baseline trajectory (current habits projected forward) */
  baseline: Trajectory;
  /** Optional hypothetical trajectory — shows fork divergence & delta */
  hypothetical?: Trajectory | null;
  /** Additional CSS classes for the wrapper */
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** SVG viewBox dimensions */
const VB_WIDTH = 480;
const VB_HEIGHT = 200;

/** Chart area insets (room for labels/axes) */
const PADDING = { top: 20, right: 55, bottom: 30, left: 48 };

/** Chart drawing area */
const CHART_W = VB_WIDTH - PADDING.left - PADDING.right;
const CHART_H = VB_HEIGHT - PADDING.top - PADDING.bottom;

/** Maximum months on X-axis */
const MAX_MONTHS = 60;

/** Year tick positions (in months) */
const YEAR_TICKS = [0, 12, 24, 36, 48, 60];

// ─── Color helpers ───────────────────────────────────────────────────────────

/**
 * Maps a monthly CO₂ rate to an HSL hue, matching the Twin's color scale.
 */
function rateToHue(rateKgPerMonth: number): number {
  return Math.max(0, Math.min(180, 180 - (rateKgPerMonth / 800) * 180));
}

function hueToStroke(hue: number): string {
  return `hsl(${hue}, 75%, 55%)`;
}

function hueToFill(hue: number, alpha = 0.2): string {
  return `hsla(${hue}, 75%, 55%, ${alpha})`;
}

// ─── Coordinate mapping ─────────────────────────────────────────────────────

function monthToX(month: number): number {
  return PADDING.left + (month / MAX_MONTHS) * CHART_W;
}

function kgToY(kg: number, maxKg: number): number {
  return PADDING.top + CHART_H - (kg / maxKg) * CHART_H;
}

// ─── Path builders ───────────────────────────────────────────────────────────

/**
 * Builds an SVG polyline `d` attribute from trajectory points.
 */
function buildLinePath(
  points: { monthIndex: number; cumulativeCo2Kg: number }[],
  maxKg: number,
): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => {
      const x = monthToX(p.monthIndex);
      const y = kgToY(p.cumulativeCo2Kg, maxKg);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/**
 * Builds a closed SVG area path between two trajectory lines.
 * Used to shade the delta region between baseline and hypothetical.
 */
function buildAreaPath(
  baselinePoints: { monthIndex: number; cumulativeCo2Kg: number }[],
  hypoPoints: { monthIndex: number; cumulativeCo2Kg: number }[],
  forkedFromMonth: number,
  maxKg: number,
): string {
  // Filter to post-fork points
  const blPost = baselinePoints.filter(p => p.monthIndex >= forkedFromMonth);
  const hyPost = hypoPoints.filter(p => p.monthIndex >= forkedFromMonth);

  if (blPost.length === 0 || hyPost.length === 0) return '';

  // Forward along baseline, then backward along hypothetical to close
  const forward = blPost.map(
    p => `${monthToX(p.monthIndex).toFixed(1)},${kgToY(p.cumulativeCo2Kg, maxKg).toFixed(1)}`,
  );
  const backward = [...hyPost].reverse().map(
    p => `${monthToX(p.monthIndex).toFixed(1)},${kgToY(p.cumulativeCo2Kg, maxKg).toFixed(1)}`,
  );

  return `M${forward.join(' L')} L${backward.join(' L')} Z`;
}

// ─── Format helpers ──────────────────────────────────────────────────────────

/** Formats kilograms to a human-readable tons string */
function formatTons(kg: number): string {
  const tons = kg / 1000;
  const abs = Math.abs(tons);
  if (abs >= 10) return `${tons > 0 ? '+' : ''}${tons.toFixed(0)}t`;
  if (abs >= 1) return `${tons > 0 ? '+' : ''}${tons.toFixed(1)}t`;
  return `${tons > 0 ? '+' : ''}${tons.toFixed(2)}t`;
}

/** Formats a Y-axis tick (kg → tons) */
function formatAxisTons(kg: number): string {
  if (kg === 0) return '0';
  return `${(kg / 1000).toFixed(0)}t`;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * **TrajectoryChart** — A compact SVG area chart showing projected CO₂
 * emissions over 5 years.
 *
 * Displays the baseline trajectory as a colored line, and when a hypothetical
 * is provided, shows the fork divergence with a shaded delta region and a
 * numerical annotation of tons saved or added.
 *
 * Styled for Pulse's dark theme using CSS custom properties.
 *
 * @example
 * ```tsx
 * <TrajectoryChart
 *   baseline={baselineTrajectory}
 *   hypothetical={whatIfTrajectory}
 *   className="mt-4"
 * />
 * ```
 */
const TrajectoryChart = memo(function TrajectoryChart({
  baseline,
  hypothetical,
  className,
}: TrajectoryChartProps) {
  const hasHypothetical =
    hypothetical != null && hypothetical.points.length > 0;

  // ── Compute Y-axis max ──
  const maxKg = useMemo(() => {
    let max = 0;
    for (const p of baseline.points) {
      if (p.cumulativeCo2Kg > max) max = p.cumulativeCo2Kg;
    }
    if (hasHypothetical) {
      for (const p of hypothetical!.points) {
        if (p.cumulativeCo2Kg > max) max = p.cumulativeCo2Kg;
      }
    }
    // Add 15% headroom, round up to nearest 5000
    return Math.ceil((max * 1.15) / 5000) * 5000 || 50000;
  }, [baseline, hypothetical, hasHypothetical]);

  // ── Derive colors from final rates ──
  const baselineHue = useMemo(() => {
    const last = baseline.points[baseline.points.length - 1];
    return rateToHue(last?.rateKgPerMonth ?? 400);
  }, [baseline]);

  const hypoHue = useMemo(() => {
    if (!hasHypothetical) return baselineHue;
    const last = hypothetical!.points[hypothetical!.points.length - 1];
    return rateToHue(last?.rateKgPerMonth ?? 400);
  }, [hypothetical, hasHypothetical, baselineHue]);

  // ── Build SVG paths ──
  const baselinePath = useMemo(
    () => buildLinePath(baseline.points, maxKg),
    [baseline, maxKg],
  );

  const hypoPath = useMemo(
    () => (hasHypothetical ? buildLinePath(hypothetical!.points, maxKg) : ''),
    [hypothetical, hasHypothetical, maxKg],
  );

  const deltaAreaPath = useMemo(() => {
    if (!hasHypothetical) return '';
    return buildAreaPath(
      baseline.points,
      hypothetical!.points,
      hypothetical!.forkedFromMonth ?? 0,
      maxKg,
    );
  }, [baseline, hypothetical, hasHypothetical, maxKg]);

  // ── 5-year delta annotation ──
  const deltaInfo = useMemo(() => {
    if (!hasHypothetical) return null;

    const blEnd = baseline.points[baseline.points.length - 1];
    const hyEnd = hypothetical!.points[hypothetical!.points.length - 1];
    if (!blEnd || !hyEnd) return null;

    const deltaKg = hyEnd.cumulativeCo2Kg - blEnd.cumulativeCo2Kg;
    const saved = deltaKg < 0; // negative = saved CO₂

    // Position the label at the midpoint between the two end values
    const midKg = (blEnd.cumulativeCo2Kg + hyEnd.cumulativeCo2Kg) / 2;
    const x = monthToX(MAX_MONTHS) + 8;
    const y = kgToY(midKg, maxKg);

    return { deltaKg, saved, x, y, label: formatTons(deltaKg) };
  }, [baseline, hypothetical, hasHypothetical, maxKg]);

  // ── Current month marker ──
  const currentMonth = useMemo(() => {
    // Use the last point's month as "current"
    const pts = baseline.points;
    return pts.length > 0 ? pts[pts.length - 1].monthIndex : 0;
  }, [baseline]);

  const currentPoint = useMemo(() => {
    const p = baseline.points.find(pt => pt.monthIndex === currentMonth);
    if (!p) return null;
    return { x: monthToX(p.monthIndex), y: kgToY(p.cumulativeCo2Kg, maxKg) };
  }, [baseline, currentMonth, maxKg]);

  // ── Fork point marker ──
  const forkPoint = useMemo(() => {
    if (!hasHypothetical) return null;
    const fm = hypothetical!.forkedFromMonth ?? 0;
    const p = baseline.points.find(pt => pt.monthIndex === fm);
    if (!p) return null;
    return { x: monthToX(p.monthIndex), y: kgToY(p.cumulativeCo2Kg, maxKg) };
  }, [baseline, hypothetical, hasHypothetical, maxKg]);

  // ── Y-axis ticks ──
  const yTicks = useMemo(() => {
    const count = 4;
    return Array.from({ length: count + 1 }, (_, i) => {
      const kg = (maxKg / count) * i;
      return { kg, y: kgToY(kg, maxKg), label: formatAxisTons(kg) };
    });
  }, [maxKg]);

  return (
    <div
      className={`relative ${className ?? ''}`}
      role="img"
      aria-label="CO₂ trajectory chart showing projected emissions over 5 years"
    >
      <svg
        viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Delta area gradient */}
          {hasHypothetical && (
            <linearGradient id="delta-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={
                  deltaInfo?.saved
                    ? hueToFill(120, 0.35)
                    : hueToFill(0, 0.35)
                }
              />
              <stop
                offset="100%"
                stopColor={
                  deltaInfo?.saved
                    ? hueToFill(120, 0.05)
                    : hueToFill(0, 0.05)
                }
              />
            </linearGradient>
          )}
        </defs>

        {/* ── Grid lines ── */}
        <g>
          {/* Horizontal grid */}
          {yTicks.map(tick => (
            <line
              key={`grid-h-${tick.kg}`}
              x1={PADDING.left}
              y1={tick.y}
              x2={PADDING.left + CHART_W}
              y2={tick.y}
              stroke="var(--color-pulse-border, #1e2e25)"
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
          ))}
          {/* Vertical grid (year marks) */}
          {YEAR_TICKS.map(m => (
            <line
              key={`grid-v-${m}`}
              x1={monthToX(m)}
              y1={PADDING.top}
              x2={monthToX(m)}
              y2={PADDING.top + CHART_H}
              stroke="var(--color-pulse-border, #1e2e25)"
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
          ))}
        </g>

        {/* ── Axes labels ── */}
        <g>
          {/* Y-axis labels */}
          {yTicks.map(tick => (
            <text
              key={`y-${tick.kg}`}
              x={PADDING.left - 6}
              y={tick.y + 3}
              textAnchor="end"
              fill="var(--color-pulse-text-muted, #5a6e60)"
              fontSize="9"
              fontFamily="var(--font-mono, monospace)"
            >
              {tick.label}
            </text>
          ))}
          {/* X-axis labels (years) */}
          {YEAR_TICKS.map((m, i) => (
            <text
              key={`x-${m}`}
              x={monthToX(m)}
              y={PADDING.top + CHART_H + 16}
              textAnchor="middle"
              fill="var(--color-pulse-text-muted, #5a6e60)"
              fontSize="9"
              fontFamily="var(--font-mono, monospace)"
            >
              {i === 0 ? 'Now' : `Y${i}`}
            </text>
          ))}
        </g>

        {/* ── Delta area (shaded region between trajectories) ── */}
        {hasHypothetical && deltaAreaPath && (
          <motion.path
            d={deltaAreaPath}
            fill="url(#delta-gradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
        )}

        {/* ── Baseline line ── */}
        <motion.path
          d={baselinePath}
          fill="none"
          stroke={hueToStroke(baselineHue)}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />

        {/* ── Hypothetical line ── */}
        {hasHypothetical && hypoPath && (
          <motion.path
            d={hypoPath}
            fill="none"
            stroke={hueToStroke(hypoHue)}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 3"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          />
        )}

        {/* ── Current month dot ── */}
        {currentPoint && (
          <motion.circle
            cx={currentPoint.x}
            cy={currentPoint.y}
            r={4}
            fill={hueToStroke(baselineHue)}
            stroke="var(--color-pulse-bg, #0a0f0d)"
            strokeWidth={1.5}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, delay: 1.0 }}
          />
        )}

        {/* ── Fork point dot ── */}
        {forkPoint && (
          <motion.circle
            cx={forkPoint.x}
            cy={forkPoint.y}
            r={3.5}
            fill="var(--color-pulse-text-secondary, #94a89c)"
            stroke="var(--color-pulse-bg, #0a0f0d)"
            strokeWidth={1.5}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, delay: 0.8 }}
          />
        )}

        {/* ── Delta annotation ── */}
        {deltaInfo && (
          <motion.g
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
          >
            <text
              x={deltaInfo.x}
              y={deltaInfo.y - 2}
              fill={
                deltaInfo.saved
                  ? 'var(--color-twin-healthy, #22d3ee)'
                  : 'var(--color-twin-critical, #ef4444)'
              }
              fontSize="12"
              fontWeight="600"
              fontFamily="var(--font-mono, monospace)"
            >
              {deltaInfo.label}
            </text>
            <text
              x={deltaInfo.x}
              y={deltaInfo.y + 11}
              fill="var(--color-pulse-text-muted, #5a6e60)"
              fontSize="8"
              fontFamily="var(--font-sans, system-ui)"
            >
              {deltaInfo.saved ? 'saved' : 'added'}
            </text>
          </motion.g>
        )}

        {/* ── Legend ── */}
        {hasHypothetical && (
          <g>
            {/* Baseline legend */}
            <line
              x1={PADDING.left}
              y1={VB_HEIGHT - 6}
              x2={PADDING.left + 16}
              y2={VB_HEIGHT - 6}
              stroke={hueToStroke(baselineHue)}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <text
              x={PADDING.left + 20}
              y={VB_HEIGHT - 3}
              fill="var(--color-pulse-text-secondary, #94a89c)"
              fontSize="8"
              fontFamily="var(--font-sans, system-ui)"
            >
              {baseline.label || 'Current'}
            </text>

            {/* Hypothetical legend */}
            <line
              x1={PADDING.left + 90}
              y1={VB_HEIGHT - 6}
              x2={PADDING.left + 106}
              y2={VB_HEIGHT - 6}
              stroke={hueToStroke(hypoHue)}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="6 3"
            />
            <text
              x={PADDING.left + 110}
              y={VB_HEIGHT - 3}
              fill="var(--color-pulse-text-secondary, #94a89c)"
              fontSize="8"
              fontFamily="var(--font-sans, system-ui)"
            >
              {hypothetical!.label || 'What-if'}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
});

export default TrajectoryChart;
