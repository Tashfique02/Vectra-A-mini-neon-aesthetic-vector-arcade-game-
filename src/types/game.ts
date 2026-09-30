export type GameState =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'ROUND_SUMMARY'
  | 'GAME_OVER';

export type GameMode = 'CAMPAIGN' | 'ENDLESS' | 'EDITOR';

export type NavigationTab =
  | 'CAMPAIGN'
  | 'ENDLESS'
  | 'EDITOR'
  | 'MANUAL'
  | 'SCORES';

export interface Vector2D {
  x: number;
  y: number;
}

export type WellType = 'ATTRACTOR' | 'REPULSOR' | 'PULSAR';

export interface GravityWell {
  id: string;
  x: number;
  y: number;
  mass: number; // Positive for attractor, negative for repulsor
  coreRadius: number; // Lethal inner radius
  influenceRadius: number; // Max gravitational field radius
  type: WellType;
  pulsarPhase?: number; // For PULSAR wells that oscillate polarity
  pulsarSpeed?: number;
  orbitCenter?: Vector2D; // Optional orbital movement for binary wells
  orbitRadius?: number;
  orbitAngle?: number;
  orbitSpeed?: number;
  RotatingBarriers?: {
    count: number;
    radius: number;
    angle: number;
    angularVelocity: number;
    arcLength: number; // Radians of each barrier segment
  };
}

export interface GravityShearZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  forceX: number;
  forceY: number;
  label?: string;
}

export interface SeekerMine {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  detectionRadius: number;
  active: boolean;
  destroyed: boolean;
}

export interface DataShard {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  pulsePhase: number;
  orbitWellId?: string;
  orbitRadius?: number;
  orbitAngle?: number;
  orbitSpeed?: number;
}

export interface VectorWall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lethal: boolean;
}

export interface SectorConfig {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  parTimeSeconds: number;
  spawn: Vector2D;
  spawnAngle: number;
  extractionGate: {
    x: number;
    y: number;
    radius: number;
  };
  wells: GravityWell[];
  shearZones: GravityShearZone[];
  mines: SeekerMine[];
  shards: DataShard[];
  walls: VectorWall[];
}

export interface ShipState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hull: number;
  maxHull: number;
  fuel: number;
  maxFuel: number;
  pulseCharge: number; // 0 to 100 for Polarity Invert / Shockwave Pulse
  polarityInvertedFrames: number; // > 0 when local gravity polarity is inverted for the ship
  invulnerableFrames: number;
  thrusting: boolean;
  braking: boolean;
  trail: { x: number; y: number; alpha: number; inverted: boolean }[];
}

export interface VectorParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  isLine?: boolean;
  angle?: number;
  vAngle?: number;
}

export interface FloatingCallout {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface TelemetryHUD {
  score: number;
  comboMultiplier: number;
  slingshotCount: number;
  hull: number;
  fuel: number;
  pulseCharge: number;
  shardsCollected: number;
  shardsTotal: number;
  elapsedSeconds: number;
  netGravityG: number;
  velocityKps: number;
  gateUnlocked: boolean;
  polarityInverted: boolean;
  endlessWave: number;
}

export interface HighScoreRecord {
  id: string;
  mode: string;
  sectorTitle: string;
  score: number;
  slingshots: number;
  timeSeconds: number;
  date: string;
}

export type EditorTool =
  | 'ATTRACTOR'
  | 'REPULSOR'
  | 'PULSAR'
  | 'BARRIER_WELL'
  | 'SHEAR_RIGHT'
  | 'SHEAR_UP'
  | 'SHARD'
  | 'MINE'
  | 'WALL'
  | 'ERASE';
