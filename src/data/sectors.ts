import { SectorConfig, GravityWell, DataShard, SeekerMine, GravityShearZone } from '../types/game';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 720;

export const CAMPAIGN_SECTORS: SectorConfig[] = [
  {
    id: 1,
    title: '01. Orbital Insertion',
    subtitle: 'Inverse-Square Slingshot Fundamentals',
    description:
      'Use the central Singularity Well to bend your trajectory. Skim the amber slingshot ring to build speed and collect all 3 Data Shards before docking at the Extraction Gate.',
    parTimeSeconds: 25,
    spawn: { x: 130, y: 360 },
    spawnAngle: 0,
    extractionGate: { x: 1070, y: 360, radius: 34 },
    wells: [
      {
        id: 'w1-1',
        x: 600,
        y: 360,
        mass: 2800,
        coreRadius: 36,
        influenceRadius: 310,
        type: 'ATTRACTOR',
      },
    ],
    shearZones: [],
    mines: [],
    shards: [
      { id: 's1-1', x: 600, y: 165, collected: false, pulsePhase: 0 },
      { id: 's1-2', x: 600, y: 555, collected: false, pulsePhase: 2.1 },
      { id: 's1-3', x: 830, y: 360, collected: false, pulsePhase: 4.2 },
    ],
    walls: [],
  },
  {
    id: 2,
    title: '02. Dipole Pinch',
    subtitle: 'Attractor & White Hole Repulsor',
    description:
      'Navigate the steep gravitational gradient between an upper Singularity Attractor and a lower White Hole Repulsor that violently deflects incoming mass.',
    parTimeSeconds: 32,
    spawn: { x: 120, y: 560 },
    spawnAngle: -0.35,
    extractionGate: { x: 1080, y: 170, radius: 34 },
    wells: [
      {
        id: 'w2-1',
        x: 440,
        y: 230,
        mass: 3100,
        coreRadius: 38,
        influenceRadius: 300,
        type: 'ATTRACTOR',
      },
      {
        id: 'w2-2',
        x: 760,
        y: 490,
        mass: -2900,
        coreRadius: 36,
        influenceRadius: 310,
        type: 'REPULSOR',
      },
    ],
    shearZones: [],
    mines: [
      {
        id: 'm2-1',
        x: 600,
        y: 360,
        vx: 0,
        vy: 0,
        radius: 13,
        detectionRadius: 185,
        active: false,
        destroyed: false,
      },
    ],
    shards: [
      { id: 's2-1', x: 440, y: 95, collected: false, pulsePhase: 0 },
      { id: 's2-2', x: 590, y: 270, collected: false, pulsePhase: 1.5 },
      { id: 's2-3', x: 760, y: 310, collected: false, pulsePhase: 3.0 },
      { id: 's2-4', x: 940, y: 420, collected: false, pulsePhase: 4.5 },
    ],
    walls: [
      { id: 'wl2-1', x1: 600, y1: 0, x2: 600, y2: 190, lethal: true },
      { id: 'wl2-2', x1: 600, y1: 530, x2: 600, y2: 720, lethal: true },
    ],
  },
  {
    id: 3,
    title: '03. Tidal Shear Conduit',
    subtitle: 'Directional Flux Corridors & Laser Barriers',
    description:
      'Cross two opposing lateral Gravity Shear conduits while timing your entry through a rotating orbital shield ring.',
    parTimeSeconds: 38,
    spawn: { x: 110, y: 360 },
    spawnAngle: 0,
    extractionGate: { x: 1090, y: 360, radius: 34 },
    wells: [
      {
        id: 'w3-1',
        x: 600,
        y: 360,
        mass: 2600,
        coreRadius: 34,
        influenceRadius: 275,
        type: 'ATTRACTOR',
        RotatingBarriers: {
          count: 3,
          radius: 115,
          angle: 0,
          angularVelocity: 0.018,
          arcLength: 1.15,
        },
      },
    ],
    shearZones: [
      {
        id: 'sz3-1',
        x: 240,
        y: 80,
        width: 150,
        height: 560,
        forceX: 0,
        forceY: -0.11,
        label: 'UPWARD FLUX 1.8G',
      },
      {
        id: 'sz3-2',
        x: 810,
        y: 80,
        width: 150,
        height: 560,
        forceX: 0,
        forceY: 0.11,
        label: 'DOWNWARD FLUX 1.8G',
      },
    ],
    mines: [],
    shards: [
      { id: 's3-1', x: 315, y: 200, collected: false, pulsePhase: 0 },
      { id: 's3-2', x: 600, y: 290, collected: false, pulsePhase: 1.8 },
      { id: 's3-3', x: 600, y: 430, collected: false, pulsePhase: 3.2 },
      { id: 's3-4', x: 885, y: 520, collected: false, pulsePhase: 4.9 },
    ],
    walls: [],
  },
  {
    id: 4,
    title: '04. Harmonic Pulsar Core',
    subtitle: 'Oscillating Polarity Wells & Seeker Drones',
    description:
      'Pulsar cores rhythmically invert between gravitational pull and repulsion. Lure Seeker Mines into the event horizon or use your Polarity Flip (Shift / Space) to break lock.',
    parTimeSeconds: 42,
    spawn: { x: 120, y: 140 },
    spawnAngle: 0.4,
    extractionGate: { x: 1080, y: 580, radius: 34 },
    wells: [
      {
        id: 'w4-1',
        x: 430,
        y: 360,
        mass: 3200,
        coreRadius: 36,
        influenceRadius: 290,
        type: 'PULSAR',
        pulsarPhase: 0,
        pulsarSpeed: 0.025,
      },
      {
        id: 'w4-2',
        x: 790,
        y: 360,
        mass: 3200,
        coreRadius: 36,
        influenceRadius: 290,
        type: 'PULSAR',
        pulsarPhase: Math.PI,
        pulsarSpeed: 0.025,
      },
    ],
    shearZones: [],
    mines: [
      {
        id: 'm4-1',
        x: 610,
        y: 190,
        vx: 0,
        vy: 0,
        radius: 13,
        detectionRadius: 210,
        active: false,
        destroyed: false,
      },
      {
        id: 'm4-2',
        x: 610,
        y: 530,
        vx: 0,
        vy: 0,
        radius: 13,
        detectionRadius: 210,
        active: false,
        destroyed: false,
      },
    ],
    shards: [
      { id: 's4-1', x: 430, y: 165, collected: false, pulsePhase: 0 },
      { id: 's4-2', x: 610, y: 360, collected: false, pulsePhase: 1.4 },
      { id: 's4-3', x: 790, y: 555, collected: false, pulsePhase: 2.8 },
      { id: 's4-4', x: 960, y: 260, collected: false, pulsePhase: 4.1 },
    ],
    walls: [],
  },
  {
    id: 5,
    title: '05. The Lagrange Labyrinth',
    subtitle: 'Three-Body Equilibrium Saddle',
    description:
      'Three supermassive singularities form a hazardous gravitational triangle. Thread the central L1 equilibrium point to harvest the core shards without exhausting fuel.',
    parTimeSeconds: 45,
    spawn: { x: 110, y: 600 },
    spawnAngle: -0.6,
    extractionGate: { x: 1080, y: 130, radius: 34 },
    wells: [
      {
        id: 'w5-1',
        x: 420,
        y: 210,
        mass: 3000,
        coreRadius: 36,
        influenceRadius: 280,
        type: 'ATTRACTOR',
      },
      {
        id: 'w5-2',
        x: 420,
        y: 530,
        mass: 3000,
        coreRadius: 36,
        influenceRadius: 280,
        type: 'ATTRACTOR',
      },
      {
        id: 'w5-3',
        x: 780,
        y: 370,
        mass: 3400,
        coreRadius: 40,
        influenceRadius: 310,
        type: 'ATTRACTOR',
        RotatingBarriers: {
          count: 2,
          radius: 110,
          angle: 0.5,
          angularVelocity: -0.02,
          arcLength: 1.3,
        },
      },
    ],
    shearZones: [],
    mines: [
      {
        id: 'm5-1',
        x: 620,
        y: 160,
        vx: 0,
        vy: 0,
        radius: 13,
        detectionRadius: 190,
        active: false,
        destroyed: false,
      },
    ],
    shards: [
      { id: 's5-1', x: 260, y: 370, collected: false, pulsePhase: 0 },
      { id: 's5-2', x: 545, y: 370, collected: false, pulsePhase: 1.2 },
      { id: 's5-3', x: 640, y: 250, collected: false, pulsePhase: 2.4 },
      { id: 's5-4', x: 640, y: 490, collected: false, pulsePhase: 3.6 },
      { id: 's5-5', x: 930, y: 370, collected: false, pulsePhase: 4.8 },
    ],
    walls: [
      { id: 'wl5-1', x1: 230, y1: 0, x2: 230, y2: 230, lethal: true },
      { id: 'wl5-2', x1: 930, y1: 500, x2: 930, y2: 720, lethal: true },
    ],
  },
  {
    id: 6,
    title: '06. Binary Waltz',
    subtitle: 'Co-Orbiting Singularities & Moving Shards',
    description:
      'An Attractor and a White Hole Repulsor revolve around a shared barycenter. Anticipate their orbital phase to slingshot through the shifting gravity corridor.',
    parTimeSeconds: 48,
    spawn: { x: 115, y: 360 },
    spawnAngle: 0,
    extractionGate: { x: 1085, y: 360, radius: 34 },
    wells: [
      {
        id: 'w6-1',
        x: 600,
        y: 200,
        mass: 3200,
        coreRadius: 36,
        influenceRadius: 290,
        type: 'ATTRACTOR',
        orbitCenter: { x: 600, y: 360 },
        orbitRadius: 165,
        orbitAngle: 0,
        orbitSpeed: 0.012,
      },
      {
        id: 'w6-2',
        x: 600,
        y: 520,
        mass: -2800,
        coreRadius: 34,
        influenceRadius: 280,
        type: 'REPULSOR',
        orbitCenter: { x: 600, y: 360 },
        orbitRadius: 165,
        orbitAngle: Math.PI,
        orbitSpeed: 0.012,
      },
    ],
    shearZones: [],
    mines: [
      {
        id: 'm6-1',
        x: 330,
        y: 200,
        vx: 0,
        vy: 0,
        radius: 13,
        detectionRadius: 190,
        active: false,
        destroyed: false,
      },
      {
        id: 'm6-2',
        x: 870,
        y: 520,
        vx: 0,
        vy: 0,
        radius: 13,
        detectionRadius: 190,
        active: false,
        destroyed: false,
      },
    ],
    shards: [
      { id: 's6-1', x: 600, y: 360, collected: false, pulsePhase: 0 },
      { id: 's6-2', x: 380, y: 480, collected: false, pulsePhase: 1.5 },
      { id: 's6-3', x: 820, y: 240, collected: false, pulsePhase: 3.0 },
      { id: 's6-4', x: 600, y: 100, collected: false, pulsePhase: 4.2 },
      { id: 's6-5', x: 600, y: 620, collected: false, pulsePhase: 5.4 },
    ],
    walls: [],
  },
  {
    id: 7,
    title: '07. Kessler Cascade',
    subtitle: 'High-Velocity Shear Jetstream',
    description:
      'A horizontal gravity jetstream accelerates everything across the central trench while twin barrier singularities guard the upper and lower alcoves.',
    parTimeSeconds: 50,
    spawn: { x: 110, y: 120 },
    spawnAngle: 0.2,
    extractionGate: { x: 1090, y: 600, radius: 34 },
    wells: [
      {
        id: 'w7-1',
        x: 420,
        y: 195,
        mass: 2900,
        coreRadius: 34,
        influenceRadius: 250,
        type: 'ATTRACTOR',
        RotatingBarriers: {
          count: 2,
          radius: 95,
          angle: 0,
          angularVelocity: 0.022,
          arcLength: 1.2,
        },
      },
      {
        id: 'w7-2',
        x: 780,
        y: 525,
        mass: 2900,
        coreRadius: 34,
        influenceRadius: 250,
        type: 'ATTRACTOR',
        RotatingBarriers: {
          count: 2,
          radius: 95,
          angle: 1.5,
          angularVelocity: -0.022,
          arcLength: 1.2,
        },
      },
    ],
    shearZones: [
      {
        id: 'sz7-1',
        x: 180,
        y: 310,
        width: 840,
        height: 100,
        forceX: 0.13,
        forceY: 0,
        label: 'JETSTREAM +2.2G EAST',
      },
    ],
    mines: [
      {
        id: 'm7-1',
        x: 780,
        y: 190,
        vx: 0,
        vy: 0,
        radius: 13,
        detectionRadius: 210,
        active: false,
        destroyed: false,
      },
      {
        id: 'm7-2',
        x: 420,
        y: 530,
        vx: 0,
        vy: 0,
        radius: 13,
        detectionRadius: 210,
        active: false,
        destroyed: false,
      },
    ],
    shards: [
      { id: 's7-1', x: 420, y: 115, collected: false, pulsePhase: 0 },
      { id: 's7-2', x: 320, y: 360, collected: false, pulsePhase: 1.2 },
      { id: 's7-3', x: 600, y: 360, collected: false, pulsePhase: 2.4 },
      { id: 's7-4', x: 880, y: 360, collected: false, pulsePhase: 3.6 },
      { id: 's7-5', x: 780, y: 605, collected: false, pulsePhase: 4.8 },
    ],
    walls: [
      { id: 'wl7-1', x1: 580, y1: 0, x2: 580, y2: 240, lethal: true },
      { id: 'wl7-2', x1: 620, y1: 480, x2: 620, y2: 720, lethal: true },
    ],
  },
  {
    id: 8,
    title: '08. Omega Singularity',
    subtitle: 'Final Gravitational Gauntlet',
    description:
      'Chain orbital slingshots across a shielded central Pulsar flanked by orbiting Attractor and Repulsor anomalies. Master polarity inversion to survive.',
    parTimeSeconds: 60,
    spawn: { x: 100, y: 360 },
    spawnAngle: 0,
    extractionGate: { x: 1100, y: 360, radius: 34 },
    wells: [
      {
        id: 'w8-1',
        x: 600,
        y: 360,
        mass: 3600,
        coreRadius: 40,
        influenceRadius: 320,
        type: 'PULSAR',
        pulsarPhase: 0,
        pulsarSpeed: 0.02,
        RotatingBarriers: {
          count: 3,
          radius: 125,
          angle: 0,
          angularVelocity: 0.019,
          arcLength: 1.05,
        },
      },
      {
        id: 'w8-2',
        x: 340,
        y: 185,
        mass: 2500,
        coreRadius: 30,
        influenceRadius: 230,
        type: 'ATTRACTOR',
      },
      {
        id: 'w8-3',
        x: 860,
        y: 535,
        mass: -2500,
        coreRadius: 30,
        influenceRadius: 230,
        type: 'REPULSOR',
      },
    ],
    shearZones: [
      {
        id: 'sz8-1',
        x: 280,
        y: 440,
        width: 160,
        height: 220,
        forceX: 0.09,
        forceY: -0.09,
        label: 'VECTOR LIFT',
      },
      {
        id: 'sz8-2',
        x: 760,
        y: 60,
        width: 160,
        height: 220,
        forceX: 0.09,
        forceY: 0.09,
        label: 'VECTOR DROP',
      },
    ],
    mines: [
      {
        id: 'm8-1',
        x: 460,
        y: 560,
        vx: 0,
        vy: 0,
        radius: 13,
        detectionRadius: 200,
        active: false,
        destroyed: false,
      },
      {
        id: 'm8-2',
        x: 740,
        y: 160,
        vx: 0,
        vy: 0,
        radius: 13,
        detectionRadius: 200,
        active: false,
        destroyed: false,
      },
    ],
    shards: [
      { id: 's8-1', x: 340, y: 85, collected: false, pulsePhase: 0 },
      { id: 's8-2', x: 355, y: 520, collected: false, pulsePhase: 1.1 },
      { id: 's8-3', x: 600, y: 270, collected: false, pulsePhase: 2.2 },
      { id: 's8-4', x: 600, y: 450, collected: false, pulsePhase: 3.3 },
      { id: 's8-5', x: 845, y: 180, collected: false, pulsePhase: 4.4 },
      { id: 's8-6', x: 860, y: 635, collected: false, pulsePhase: 5.5 },
    ],
    walls: [],
  },
];

export function generateEndlessSector(wave: number): SectorConfig {
  const wellCount = Math.min(1 + Math.floor((wave + 1) / 2), 4);
  const wells: GravityWell[] = [];
  const shards: DataShard[] = [];
  const mines: SeekerMine[] = [];
  const shearZones: GravityShearZone[] = [];

  for (let i = 0; i < wellCount; i++) {
    const x = 340 + ((i + 0.5) * 560) / wellCount + (Math.sin(wave * 1.7 + i) * 55);
    const y = 190 + ((i % 2 === 0 ? 0.35 : 0.65) * 340) + (Math.cos(wave * 2.3 + i) * 45);
    const types: ('ATTRACTOR' | 'REPULSOR' | 'PULSAR')[] = ['ATTRACTOR', 'REPULSOR', 'PULSAR'];
    const type = wave === 1 ? 'ATTRACTOR' : types[(wave + i) % types.length];
    const massMag = 2500 + Math.min(wave * 140, 1200);

    const hasBarrier = wave >= 2 && (i + wave) % 2 === 0;

    wells.push({
      id: `ew-${wave}-${i}`,
      x,
      y,
      mass: type === 'REPULSOR' ? -massMag : massMag,
      coreRadius: 34,
      influenceRadius: 270,
      type,
      pulsarPhase: i * 1.5,
      pulsarSpeed: 0.022,
      RotatingBarriers: hasBarrier
        ? {
            count: Math.min(2 + Math.floor(wave / 4), 3),
            radius: 105,
            angle: i,
            angularVelocity: (i % 2 === 0 ? 1 : -1) * (0.015 + Math.min(wave * 0.002, 0.012)),
            arcLength: 1.05,
          }
        : undefined,
    });
  }

  const shardCount = Math.min(3 + Math.floor(wave / 2), 7);
  for (let s = 0; s < shardCount; s++) {
    const targetWell = wells[s % wells.length];
    const angle = (s * Math.PI * 2) / shardCount + wave * 0.5;
    const dist = 135 + (s % 2) * 35;
    const sx = Math.max(160, Math.min(1040, targetWell.x + Math.cos(angle) * dist));
    const sy = Math.max(90, Math.min(630, targetWell.y + Math.sin(angle) * dist));
    shards.push({
      id: `es-${wave}-${s}`,
      x: sx,
      y: sy,
      collected: false,
      pulsePhase: s * 1.1,
    });
  }

  const mineCount = Math.min(Math.floor(wave / 2), 4);
  for (let m = 0; m < mineCount; m++) {
    mines.push({
      id: `em-${wave}-${m}`,
      x: 420 + m * 160,
      y: m % 2 === 0 ? 120 : 600,
      vx: 0,
      vy: 0,
      radius: 13,
      detectionRadius: 195,
      active: false,
      destroyed: false,
    });
  }

  if (wave >= 3 && wave % 2 === 1) {
    shearZones.push({
      id: `esz-${wave}`,
      x: 520,
      y: 110,
      width: 160,
      height: 500,
      forceX: 0,
      forceY: wave % 4 === 1 ? -0.1 : 0.1,
      label: 'GRAVITY SHEAR',
    });
  }

  return {
    id: 100 + wave,
    title: `Endless Wave ${String(wave).padStart(2, '0')}`,
    subtitle: 'Procedural Singularity Field',
    description: 'Collect all Data Shards and reach the Extraction Gate to warp to the next gravitational wave.',
    parTimeSeconds: 35 + wave * 4,
    spawn: { x: 110, y: 360 },
    spawnAngle: 0,
    extractionGate: { x: 1090, y: 360, radius: 34 },
    wells,
    shearZones,
    mines,
    shards,
    walls: [],
  };
}
