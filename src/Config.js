/**
 * Centralized configuration for game parameters.
 */
export const Config = {
  // Player Physics & Dimensions
  player: {
    height: 1.6,
    radius: 0.4,
    gravity: 30.0,
    jumpHeight: 8.0,
    headHeightOffsetRatio: 0.4, // Eye level relative to center (height * ratio)
  },

  // Movement Speeds
  movement: {
    walkSpeed: 3.0,
    normalSpeed: 5.0,
    sprintSpeed: 8.0,
  },

  // Collision Detection
  collision: {
    stepHeight: 0.5,
    groundCheckOffset: 0.1,
    margin: 0.05,
  },

  // Vaulting System
  vaulting: {
    distance: 1.5,
    maxHeightDiff: 1.3, // Max height diff: object top vs player feet
    minHeightDiff: 0.2, // Min height diff: object top vs player feet
    duration: 0.4,
  },

  // Leaning
  leaning: {
    amountMultiplier: 0.5, // How much the camera offsets horizontally
    rollMultiplier: Math.PI / 12, // How much the camera rolls
    gunOffsetMultiplier: 0.5, // How much the gun offsets horizontally (relative to camera offset)
  },

  // Weapon Bobbing
  weaponBob: {
    intensity: 0.015,
    speedFactorWalk: 1.0,
    speedFactorNormal: 1.5,
    speedFactorSprint: 2.0,
  },

  // Add other shared constants here as needed
};
