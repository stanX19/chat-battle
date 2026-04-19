export const WORLD_WIDTH = 2500;
export const WORLD_HEIGHT = 2000;
export const CELL_SIZE = 125;
export const HERO_MAX_SPEED = 3;
export const HERO_SPEED_ATTACK = 0.4;
export const HERO_INERTIA_DRAG = 3.5;
export const HERO_STEER_FORCE = 0.2;
export const ENEMY_SPEED = 1.2;
export const GLITCH_THRESHOLD = 100;
export const SHAKE_DECAY = 0.88;
export const DRIFT_LERP = 0.12;

// WASD & SIDEKICK MODES
export const STABILITY_THRESHOLD = 5000; // Distance to switch mode
export const CHAT_DURATION_MS = 40000; 
export const WASD_ACCELERATION = 0.8;
export const SPACE_ATTACK_CD = 40;

export const SIDEKICK_SPEED = 2.5;
export const SIDEKICK_FOLLOW_DIST = 80; // ~1.5 - 2 tiles
export const SIDEKICK_SCAVENGE_RANGE = 350; // ~3 tiles

export const DEATH_CAUSES = {
  PROJECTILE: 'PROJECTILE_TRAUMA',
  KINETIC: 'KINETIC_DISSIPATION',
  NEURAL: 'NEURAL_REJECTION',
  CORE: 'CORE_OVERHEAT'
};

export const SHOP_ITEMS = [
  {
    id: 'HP_STABILIZE',
    label: 'HP_STABILIZE',
    cost: 200,
    description: 'Restore 30% system health.'
  },
  {
    id: 'SYNAPTIC_SPEED',
    label: 'SYNAPTIC_SPEED',
    cost: 260,
    description: 'Increase movement speed by 6%.'
  },
  {
    id: 'MATERIAL_FORGE',
    label: 'MATERIAL_FORGE',
    cost: 180,
    description: 'Forge one orbiting blade material.'
  }
];

export const ARCHETYPES = {
  MELEE: {
    type: 'MELEE',
    hp: 30,
    speed: 1.5,
    radius: 12,
    vision: 250
  },
  RANGED: {
    type: 'RANGED',
    hp: 25,
    speed: 1.1,
    radius: 15,
    vision: 450
  },
  SNIPER: {
    type: 'SNIPER',
    hp: 40,
    speed: 0.8,
    radius: 18,
    vision: 800
  },
  GUARD: {
    type: 'GUARD',
    hp: 60,
    speed: 1.2,
    radius: 16,
    vision: 300
  },
  BOSS: {
    type: 'BOSS',
    hp: 1000,
    speed: 0.7,
    radius: 40,
    vision: 1200
  }
};
