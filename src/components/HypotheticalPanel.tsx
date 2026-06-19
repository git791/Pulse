import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitFork, Check, X, ChevronRight, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { usePulseStore } from '../store/store';
import { HYPOTHETICAL_SCENARIOS } from '../engine/defaults';
import type { HypotheticalScenario } from '../engine/types';

export function HypotheticalPanel() {
  const {
    baselineTrajectory,
    hypotheticalTrajectory,
    activeScenario,
    forkHypothetical,
    commitHypothetical,
    discardHypothetical,
  } = usePulseStore();

  const [isExpanded, setIsExpanded] = useState(false);

  const co2Delta = (() => {
    if (!hypotheticalTrajectory || !baselineTrajectory) return null;
    const baselineEnd = baselineTrajectory.points[baselineTrajectory.points.length - 1];
    const hypotheticalEnd = hypotheticalTrajectory.points[hypotheticalTrajectory.points.length - 1];
    if (!baselineEnd || !hypotheticalEnd) return null;
    return (hypotheticalEnd.cumulativeCo2Kg - baselineEnd.cumulativeCo2Kg) / 1000;
  })();

  const handleSelectScenario = (scenario: HypotheticalScenario) => {
    forkHypothetical(scenario);
  };

  return (
    <div className="glass-card border border-base-300 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-base-200 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-secondary/20 text-secondary">
            <GitFork size={20} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-sm text-base-content">
              What If?
            </h3>
            <p className="text-xs text-base-content/60">
              {activeScenario ? activeScenario.title : 'Explore hypothetical changes'}
            </p>
          </div>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight size={18} className="text-base-content/50" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            {activeScenario && co2Delta !== null && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mx-4 mb-3 p-3 rounded-lg border ${
                  co2Delta < 0
                    ? 'bg-success/10 border-success/30'
                    : 'bg-error/10 border-error/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className={co2Delta < 0 ? 'text-success' : 'text-error'} />
                  <span className="text-xs font-medium text-base-content/70">
                    5-Year Impact
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {co2Delta < 0 ? (
                    <TrendingDown size={20} className="text-success" />
                  ) : (
                    <TrendingUp size={20} className="text-error" />
                  )}
                  <span className={`text-xl font-bold ${co2Delta < 0 ? 'text-success' : 'text-error'}`}>
                    {co2Delta < 0 ? '' : '+'}{co2Delta.toFixed(1)}t CO₂
                  </span>
                </div>
                <p className="text-xs mt-1 text-base-content/60">
                  {co2Delta < 0
                    ? `Saves ${Math.abs(co2Delta).toFixed(1)} tons of CO₂ over 5 years`
                    : `Adds ${co2Delta.toFixed(1)} tons of CO₂ over 5 years`}
                </p>

                <div className="flex gap-2 mt-3">
                  <button onClick={commitHypothetical} className="btn btn-primary btn-sm flex-1">
                    <Check size={14} /> Commit Change
                  </button>
                  <button onClick={discardHypothetical} className="btn btn-ghost btn-sm">
                    <X size={14} /> Discard
                  </button>
                </div>
              </motion.div>
            )}

            <div className="p-4 pt-1">
              <p className="text-xs font-medium mb-3 text-base-content/50">
                Choose a scenario
              </p>
              <div className="grid grid-cols-2 gap-2">
                {HYPOTHETICAL_SCENARIOS.map((scenario) => (
                  <motion.button
                    key={scenario.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectScenario(scenario)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      activeScenario?.id === scenario.id
                        ? 'bg-secondary/10 border-secondary'
                        : 'bg-base-200 border-base-300 hover:border-base-content/30'
                    }`}
                  >
                    <span className="text-lg mb-1 block">{scenario.icon}</span>
                    <span className="text-xs font-medium block text-base-content">
                      {scenario.title}
                    </span>
                    <span className="text-[10px] block mt-0.5 text-base-content/60">
                      {scenario.description}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
