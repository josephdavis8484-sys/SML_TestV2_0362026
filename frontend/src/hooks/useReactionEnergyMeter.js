/**
 * ShowMeLive Reaction Energy Meter
 * 
 * Tracks reaction volume in a rolling 5-second window and determines
 * crowd energy state for creator-only visual effects.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

// Energy state types
export const ENERGY_STATES = {
  NORMAL: 'normal',
  HYPE: 'hype',
  SURGE: 'surge',
  CROWD_WAVE: 'crowd_wave',
  CREATOR_MOMENT: 'creator_moment',
};

// Energy thresholds
export const ENERGY_THRESHOLDS = [
  { min: 0, max: 20, state: ENERGY_STATES.NORMAL },
  { min: 21, max: 50, state: ENERGY_STATES.HYPE },
  { min: 51, max: 120, state: ENERGY_STATES.SURGE },
  { min: 121, max: 250, state: ENERGY_STATES.CROWD_WAVE },
  { min: 251, max: Number.POSITIVE_INFINITY, state: ENERGY_STATES.CREATOR_MOMENT },
];

// Animation configuration for each energy state
export const ENERGY_ANIMATION_CONFIG = {
  normal: {
    speedMultiplier: 1.0,
    glow: 0,
    scaleBoost: 1.0,
    densityMultiplier: 1.0,
    pathStyle: 'float',
    burstEnabled: false,
  },
  hype: {
    speedMultiplier: 1.1,
    glow: 0.15,
    scaleBoost: 1.05,
    densityMultiplier: 1.1,
    pathStyle: 'float',
    burstEnabled: false,
  },
  surge: {
    speedMultiplier: 1.25,
    glow: 0.2,
    scaleBoost: 1.1,
    densityMultiplier: 1.25,
    pathStyle: 'float_spread',
    burstEnabled: false,
  },
  crowd_wave: {
    speedMultiplier: 1.35,
    glow: 0.25,
    scaleBoost: 1.12,
    densityMultiplier: 1.4,
    pathStyle: 'swirl_wave',
    burstEnabled: false,
  },
  creator_moment: {
    speedMultiplier: 1.5,
    glow: 0.35,
    scaleBoost: 1.2,
    densityMultiplier: 1.8,
    pathStyle: 'burst_wave',
    burstEnabled: true,
  },
};

// Constants
const WINDOW_MS = 5000; // 5-second rolling window
const CREATOR_MOMENT_COOLDOWN_MS = 8000; // Cooldown between creator moments
const UPDATE_INTERVAL_MS = 200; // How often to update energy state

/**
 * ReactionEnergyMeter class for tracking reaction volume
 */
class ReactionEnergyMeter {
  constructor() {
    this.events = [];
    this.lastCreatorMomentAt = 0;
  }

  addReaction(event) {
    this.events.push(event);
    this.prune(event.timestamp);
  }

  getReactionCount(now) {
    this.prune(now);
    return this.events.length;
  }

  getEnergyState(now) {
    const count = this.getReactionCount(now);

    if (count >= 251) {
      const canTriggerCreatorMoment =
        now - this.lastCreatorMomentAt >= CREATOR_MOMENT_COOLDOWN_MS;

      if (canTriggerCreatorMoment) {
        this.lastCreatorMomentAt = now;
        return ENERGY_STATES.CREATOR_MOMENT;
      }

      return ENERGY_STATES.CROWD_WAVE;
    }

    if (count >= 121) return ENERGY_STATES.CROWD_WAVE;
    if (count >= 51) return ENERGY_STATES.SURGE;
    if (count >= 21) return ENERGY_STATES.HYPE;
    return ENERGY_STATES.NORMAL;
  }

  prune(now) {
    const cutoff = now - WINDOW_MS;
    while (this.events.length && this.events[0].timestamp < cutoff) {
      this.events.shift();
    }
  }

  reset() {
    this.events = [];
    this.lastCreatorMomentAt = 0;
  }
}

/**
 * Hook to manage Reaction Energy Meter state
 */
export const useReactionEnergyMeter = (isCreator = false) => {
  const meterRef = useRef(new ReactionEnergyMeter());
  const [energyState, setEnergyState] = useState(ENERGY_STATES.NORMAL);
  const [reactionCount, setReactionCount] = useState(0);
  const [isCreatorMomentActive, setIsCreatorMomentActive] = useState(false);

  // Update energy state periodically
  useEffect(() => {
    if (!isCreator) return; // Only track for creators

    const interval = setInterval(() => {
      const now = Date.now();
      const count = meterRef.current.getReactionCount(now);
      const state = meterRef.current.getEnergyState(now);

      setReactionCount(count);
      
      // Handle creator moment burst
      if (state === ENERGY_STATES.CREATOR_MOMENT && energyState !== ENERGY_STATES.CREATOR_MOMENT) {
        setIsCreatorMomentActive(true);
        // Auto-deactivate after 2 seconds
        setTimeout(() => setIsCreatorMomentActive(false), 2000);
      }
      
      setEnergyState(state);
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isCreator, energyState]);

  // Add a reaction event
  const addReaction = useCallback((reaction) => {
    if (!isCreator) return;
    
    meterRef.current.addReaction({
      ...reaction,
      timestamp: reaction.timestamp || Date.now(),
    });
  }, [isCreator]);

  // Get animation config for current state
  const animationConfig = useMemo(() => {
    return ENERGY_ANIMATION_CONFIG[energyState] || ENERGY_ANIMATION_CONFIG.normal;
  }, [energyState]);

  // Get spawn style for reactions
  const getSpawnStyle = useCallback(() => {
    const config = ENERGY_ANIMATION_CONFIG[energyState];
    return {
      speedMultiplier: config.speedMultiplier,
      glow: config.glow,
      scaleBoost: config.scaleBoost,
      densityMultiplier: config.densityMultiplier,
      pathStyle: config.pathStyle,
      burstEnabled: config.burstEnabled,
    };
  }, [energyState]);

  // Reset meter (e.g., when stream ends)
  const resetMeter = useCallback(() => {
    meterRef.current.reset();
    setEnergyState(ENERGY_STATES.NORMAL);
    setReactionCount(0);
    setIsCreatorMomentActive(false);
  }, []);

  return {
    energyState,
    reactionCount,
    isCreatorMomentActive,
    addReaction,
    animationConfig,
    getSpawnStyle,
    resetMeter,
  };
};

/**
 * Get CSS classes for energy state animations
 */
export const getEnergyStateClasses = (state) => {
  const baseClasses = 'transition-all duration-300';
  
  switch (state) {
    case ENERGY_STATES.HYPE:
      return `${baseClasses} energy-hype`;
    case ENERGY_STATES.SURGE:
      return `${baseClasses} energy-surge`;
    case ENERGY_STATES.CROWD_WAVE:
      return `${baseClasses} energy-crowd-wave`;
    case ENERGY_STATES.CREATOR_MOMENT:
      return `${baseClasses} energy-creator-moment`;
    default:
      return `${baseClasses} energy-normal`;
  }
};

export default useReactionEnergyMeter;
