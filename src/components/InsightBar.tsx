import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Leaf, Activity } from 'lucide-react';
import { usePulseStore } from '../store/store';

export function InsightBar() {
  const { baselineTrajectory, activityEvents } = usePulseStore();

  const insights = useMemo(() => {
    const currentRate = baselineTrajectory.points.length > 0 ? baselineTrajectory.points[0].rateKgPerMonth : 0;
    const yearlyEstimate = currentRate * 12 / 1000; // tons
    const fiveYearEstimate = baselineTrajectory.points.length > 0 ? baselineTrajectory.points[baselineTrajectory.points.length - 1].cumulativeCo2Kg / 1000 : 0;

    let status: 'excellent' | 'good' | 'moderate' | 'high' | 'critical';
    let statusIcon: typeof Leaf;
    let statusColor: string;
    let statusLabel: string;

    if (currentRate < 200) {
      status = 'excellent';
      statusIcon = Leaf;
      statusColor = 'var(--color-twin-healthy)';
      statusLabel = 'Excellent';
    } else if (currentRate < 400) {
      status = 'good';
      statusIcon = Leaf;
      statusColor = 'var(--color-twin-good)';
      statusLabel = 'Good';
    } else if (currentRate < 600) {
      status = 'moderate';
      statusIcon = Activity;
      statusColor = 'var(--color-twin-warning)';
      statusLabel = 'Moderate';
    } else if (currentRate < 800) {
      status = 'high';
      statusIcon = TrendingUp;
      statusColor = 'var(--color-twin-danger)';
      statusLabel = 'High';
    } else {
      status = 'critical';
      statusIcon = TrendingUp;
      statusColor = 'var(--color-twin-critical)';
      statusLabel = 'Critical';
    }

    let insightText: string;
    if (activityEvents.length === 0) {
      insightText = 'Start logging activities to see your personalized carbon trajectory.';
    } else if (currentRate < 300) {
      insightText = 'Your carbon footprint is well below average. Keep up the great habits!';
    } else if (currentRate < 500) {
      insightText = 'Your footprint is near the global average. Small changes can make a big difference.';
    } else {
      insightText = 'Your footprint is above average. Try exploring "What If?" scenarios to find impactful changes.';
    }

    return {
      currentRate,
      yearlyEstimate,
      fiveYearEstimate,
      status,
      StatusIcon: statusIcon,
      statusColor,
      statusLabel,
      insightText,
    };
  }, [baselineTrajectory, activityEvents.length]);

  return (
    <div className="glass-card border border-base-300 p-4 rounded-xl shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center bg-base-200"
          style={{ color: insights.statusColor }}
        >
          <insights.StatusIcon size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: `${insights.statusColor}20`,
                color: insights.statusColor,
              }}
            >
              {insights.statusLabel}
            </span>
          </div>
          <p className="text-xs mt-0.5 text-base-content/60">
            Carbon Twin Health
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <MetricCard
          label="Monthly"
          value={`${Math.round(insights.currentRate)}`}
          unit="kg CO₂"
          color={insights.statusColor}
        />
        <MetricCard
          label="Yearly Est."
          value={insights.yearlyEstimate.toFixed(1)}
          unit="tons"
          color={insights.statusColor}
        />
        <MetricCard
          label="5-Year"
          value={insights.fiveYearEstimate.toFixed(1)}
          unit="tons"
          color={insights.statusColor}
        />
      </div>

      <motion.p
        key={insights.insightText}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs leading-relaxed text-base-content/70"
      >
        {insights.insightText}
      </motion.p>

      {activityEvents.length > 0 && (
        <div className="mt-3 pt-3 flex items-center gap-2 border-t border-base-200 text-base-content/50">
          <Activity size={12} />
          <span className="text-[11px]">
            {activityEvents.length} activit{activityEvents.length === 1 ? 'y' : 'ies'} logged
          </span>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div className="p-2 rounded-lg text-center bg-base-200">
      <p className="text-[10px] mb-1 text-base-content/60">
        {label}
      </p>
      <p className="text-base font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-[10px] text-base-content/60">
        {unit}
      </p>
    </div>
  );
}
