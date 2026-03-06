/**
 * ShowMe Interaction Viewer - Reaction Progression System
 * 
 * This hook manages the dynamic emoji escalation based on tap frequency.
 * Each reaction type has its own progression and cooldown timer.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Reaction progression configurations
const REACTION_PROGRESSIONS = {
  laugh: {
    thresholds: [
      { max: 2, emoji: '😂' },
      { max: 4, emoji: '🤣' },
      { max: 6, emoji: '😭' },
      { max: 15, emoji: '💀' },
      { max: Infinity, emoji: '🪦' },
    ],
    default: '😂',
  },
  heart: {
    thresholds: [
      { max: 5, emoji: '❤️' },
      { max: Infinity, emoji: '❤️‍🔥' },
    ],
    default: '❤️',
  },
  fire: {
    thresholds: [
      { max: 4, emoji: '🔥' },
      { max: 9, emoji: '🔥🔥' },
      { max: 19, emoji: '🚀' },
      { max: Infinity, emoji: '🌋' },
    ],
    default: '🔥',
  },
  clap: {
    thresholds: [
      { max: 3, emoji: '👏' },
      { max: 7, emoji: '🙌' },
      { max: 14, emoji: '🎉' },
      { max: Infinity, emoji: '🏆' },
    ],
    default: '👏',
  },
};

// Cooldown period in milliseconds (60-120 seconds, using 90 as middle ground)
const COOLDOWN_MS = 90000;

export const useReactionProgression = () => {
  // Track tap counts for each reaction type
  const [tapCounts, setTapCounts] = useState({
    laugh: 0,
    heart: 0,
    fire: 0,
    clap: 0,
  });

  // Track last tap time for each reaction type
  const lastTapTimeRef = useRef({
    laugh: 0,
    heart: 0,
    fire: 0,
    clap: 0,
  });

  // Cooldown timer refs
  const cooldownTimersRef = useRef({
    laugh: null,
    heart: null,
    fire: null,
    clap: null,
  });

  // Get the current emoji for a reaction type based on tap count
  const getEmojiForType = useCallback((type, count) => {
    const progression = REACTION_PROGRESSIONS[type];
    if (!progression) return null;

    for (const threshold of progression.thresholds) {
      if (count <= threshold.max) {
        return threshold.emoji;
      }
    }
    return progression.default;
  }, []);

  // Reset a specific reaction type
  const resetReaction = useCallback((type) => {
    setTapCounts((prev) => ({
      ...prev,
      [type]: 0,
    }));
    lastTapTimeRef.current[type] = 0;
  }, []);

  // Start or restart cooldown timer for a reaction type
  const startCooldownTimer = useCallback((type) => {
    // Clear existing timer
    if (cooldownTimersRef.current[type]) {
      clearTimeout(cooldownTimersRef.current[type]);
    }

    // Set new cooldown timer
    cooldownTimersRef.current[type] = setTimeout(() => {
      resetReaction(type);
    }, COOLDOWN_MS);
  }, [resetReaction]);

  // Handle a reaction tap
  const handleReactionTap = useCallback((type) => {
    const now = Date.now();
    
    // Update tap count
    setTapCounts((prev) => {
      const newCount = prev[type] + 1;
      return {
        ...prev,
        [type]: newCount,
      };
    });

    // Update last tap time
    lastTapTimeRef.current[type] = now;

    // Restart cooldown timer
    startCooldownTimer(type);

    // Return the emoji that will be sent
    return getEmojiForType(type, tapCounts[type] + 1);
  }, [tapCounts, getEmojiForType, startCooldownTimer]);

  // Get current emoji for a reaction type (for display on button)
  const getCurrentEmoji = useCallback((type) => {
    return getEmojiForType(type, tapCounts[type]);
  }, [tapCounts, getEmojiForType]);

  // Get tap count for a reaction type
  const getTapCount = useCallback((type) => {
    return tapCounts[type];
  }, [tapCounts]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(cooldownTimersRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  return {
    handleReactionTap,
    getCurrentEmoji,
    getTapCount,
    resetReaction,
    tapCounts,
  };
};

// Map base emojis to reaction types
export const getReactionType = (emoji) => {
  if (['😂', '🤣', '😭', '💀', '🪦'].includes(emoji)) return 'laugh';
  if (['❤️', '❤️‍🔥'].includes(emoji)) return 'heart';
  if (['🔥', '🔥🔥', '🚀', '🌋'].includes(emoji)) return 'fire';
  if (['👏', '🙌', '🎉', '🏆'].includes(emoji)) return 'clap';
  return null;
};

// Get base emoji for display in buttons
export const BASE_REACTION_EMOJIS = {
  laugh: '😂',
  heart: '❤️',
  fire: '🔥',
  clap: '👏',
};

export default useReactionProgression;
