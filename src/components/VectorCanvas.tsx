import React, { useEffect, useRef, useCallback } from 'react';
import {
  GameState,
  SectorConfig,
  ShipState,
  VectorParticle,
  FloatingCallout,
  TelemetryHUD,
  EditorTool,
  GravityWell,
} from '../types/game';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../data/sectors';
import { soundEngine } from '../utils/sound';

interface VectorCanvasProps {
  gameState: GameState;
  sector: SectorConfig;
  isEditorActive: boolean;
  activeEditorTool: EditorTool;
  showTrajectory: boolean;
  showGridWarp: boolean;
  onUpdateTelemetry: (hud: TelemetryHUD) => void;
  onSectorVictory: (finalTelemetry: TelemetryHUD) => void;
  onGameOver: (reason: string, finalTelemetry: TelemetryHUD) => void;
  onModifySector?: (updated: SectorConfig) => void;
}

const G_CONSTANT = 0.42;

export const VectorCanvas: React.FC<VectorCanvasProps> = ({
  gameState,
  sector,
  isEditorActive,
  activeEditorTool,
  showTrajectory,
  showGridWarp,
  onUpdateTelemetry,
  onSectorVictory,
  onGameOver,
  onModifySector,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Mutable simulation state inside refs for 60fps zero-lag loop
  const shipRef = useRef<ShipState>({
    x: sector.spawn.x,
    y: sector.spawn.y,
    vx: 0,
    vy: 0,
    angle: sector.spawnAngle,
    hull: 100,
    maxHull: 100,
    fuel: 100,
    maxFuel: 100,
    pulseCharge: 100,
    polarityInvertedFrames: 0,
    invulnerableFrames: 0,
    thrusting: false,
    braking: false,
    trail: [],
  });

  const liveSectorRef = useRef<SectorConfig>(structuredClone(sector));
  const particlesRef = useRef<VectorParticle[]>([]);
  const calloutsRef = useRef<FloatingCallout[]>([]);
  const shockwavesRef = useRef<{ x: number; y: number; radius: number; maxRadius: number; color: string }[]>([]);

  const scoreRef = useRef<number>(0);
  const comboRef = useRef<number>(1);
  const slingshotCountRef = useRef<number>(0);
  const slingshotCooldownRef = useRef<Record<string, number>>({});
  const elapsedFramesRef = useRef<number>(0);
  const frameCounterRef = useRef<number>(0);

  const keysRef = useRef<Record<string, boolean>>({});
  const pointerRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });

  const spawnParticles = useCallback(
    (x: number, y: number, count: number, color: string, speed = 3.5, isLine = true) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = (0.3 + Math.random() * 0.9) * speed;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          life: 1,
          maxLife: 24 + Math.floor(Math.random() * 26),
          color,
          size: 2 + Math.random() * 4,
          isLine,
          angle: Math.random() * Math.PI * 2,
          vAngle: (Math.random() - 0.5) * 0.2,
        });
      }
    },
    []
  );

  const addCallout = useCallback((x: number, y: number, text: string, color: string) => {
    calloutsRef.current.push({
      id: `${performance.now()}-${Math.random()}`,
      x,
      y,
      text,
      color,
      life: 55,
    });
  }, []);

  // Reset simulation whenever sector changes or game enters PLAYING from menu/summary/over
  useEffect(() => {
    liveSectorRef.current = structuredClone(sector);
    shipRef.current = {
      x: sector.spawn.x,
      y: sector.spawn.y,
      vx: 0,
      vy: 0,
      angle: sector.spawnAngle,
      hull: 100,
      maxHull: 100,
      fuel: 100,
      maxFuel: 100,
      pulseCharge: 100,
      polarityInvertedFrames: 0,
      invulnerableFrames: 45,
      thrusting: false,
      braking: false,
      trail: [],
    };
    particlesRef.current = [];
    calloutsRef.current = [];
    shockwavesRef.current = [];
    slingshotCooldownRef.current = {};
    elapsedFramesRef.current = 0;
    comboRef.current = 1;
  }, [sector]);

  const triggerPolarityPulse = useCallback(() => {
    const ship = shipRef.current;
    if (ship.pulseCharge < 35) return;

    ship.pulseCharge = Math.max(0, ship.pulseCharge - 50);
    ship.polarityInvertedFrames = 190; // ~3.1 seconds of inverted gravity
    soundEngine.playPolarityPulse();

    shockwavesRef.current.push({
      x: ship.x,
      y: ship.y,
      radius: 14,
      maxRadius: 190,
      color: '#f59e0b',
    });

    addCallout(ship.x, ship.y - 28, 'POLARITY INVERTED', '#f59e0b');
    spawnParticles(ship.x, ship.y, 18, '#f59e0b', 4.2, true);

    // Push away nearby seeker mines
    liveSectorRef.current.mines.forEach((mine) => {
      if (mine.destroyed) return;
      const dx = mine.x - ship.x;
      const dy = mine.y - ship.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 200 && dist > 0.01) {
        const push = ((200 - dist) / 200) * 7.5;
        mine.vx += (dx / dist) * push;
        mine.vy += (dy / dist) * push;
      }
    });
  }, [addCallout, spawnParticles]);

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', ' '].includes(e.key)) {
        if (gameState === 'PLAYING') {
          e.preventDefault();
        }
      }
      keysRef.current[e.code] = true;

      if (
        gameState === 'PLAYING' &&
        (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE')
      ) {
        triggerPolarityPulse();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, triggerPolarityPulse]);

  // Helper to get effective mass of a well at a given frame
  const getEffectiveWellMass = (well: GravityWell): number => {
    if (well.type === 'PULSAR') {
      const phase = well.pulsarPhase ?? 0;
      return well.mass * Math.sin(phase);
    }
    return well.mass;
  };

  // Compute net gravitational acceleration at any point (x, y)
  const computeGravityAt = useCallback(
    (x: number, y: number, invertMultiplier: number = 1): { gx: number; gy: number } => {
      let gx = 0;
      let gy = 0;
      const currentSector = liveSectorRef.current;

      for (const well of currentSector.wells) {
        const dx = well.x - x;
        const dy = well.y - y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist < well.influenceRadius && dist > 8) {
          const clampedDistSq = Math.max(distSq, well.coreRadius * well.coreRadius * 0.65);
          const effectiveMass = getEffectiveWellMass(well) * invertMultiplier;
          const forceMag = (G_CONSTANT * effectiveMass) / clampedDistSq;
          // Smooth falloff near influence boundary
          const falloff = Math.min(1, (well.influenceRadius - dist) / 60);
          gx += (dx / dist) * forceMag * falloff;
          gy += (dy / dist) * forceMag * falloff;
        }
      }

      for (const sz of currentSector.shearZones) {
        if (x >= sz.x && x <= sz.x + sz.width && y >= sz.y && y <= sz.y + sz.height) {
          gx += sz.forceX * invertMultiplier;
          gy += sz.forceY * invertMultiplier;
        }
      }

      return { gx, gy };
    },
    []
  );

  // Distance from point (px, py) to segment (x1, y1)-(x2, y2)
  const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

  // Main 60fps physics & vector rendering loop
  useEffect(() => {
    let animationFrameId: number;

    const stepSimulation = () => {
      frameCounterRef.current += 1;
      const currentSector = liveSectorRef.current;
      const ship = shipRef.current;

      // Animate orbital wells & pulsar phases even on title preview so the canvas feels alive
      for (const well of currentSector.wells) {
        if (well.type === 'PULSAR' && well.pulsarSpeed) {
          well.pulsarPhase = (well.pulsarPhase ?? 0) + well.pulsarSpeed;
        }
        if (well.orbitCenter && well.orbitRadius && well.orbitSpeed) {
          well.orbitAngle = (well.orbitAngle ?? 0) + well.orbitSpeed;
          well.x = well.orbitCenter.x + Math.cos(well.orbitAngle) * well.orbitRadius;
          well.y = well.orbitCenter.y + Math.sin(well.orbitAngle) * well.orbitRadius;
        }
        if (well.RotatingBarriers) {
          well.RotatingBarriers.angle =
            (well.RotatingBarriers.angle + well.RotatingBarriers.angularVelocity) % (Math.PI * 2);
        }
      }

      for (const shard of currentSector.shards) {
        shard.pulsePhase += 0.06;
      }

      if (gameState === 'PLAYING' && !isEditorActive) {
        elapsedFramesRef.current += 1;
        const keys = keysRef.current;

        // 1. Steering & Thrust Input
        const turnSpeed = 0.068;
        if (keys['KeyA'] || keys['ArrowLeft']) {
          ship.angle -= turnSpeed;
        }
        if (keys['KeyD'] || keys['ArrowRight']) {
          ship.angle += turnSpeed;
        }

        // Pointer / touch steering assist
        if (pointerRef.current.active) {
          const targetAngle = Math.atan2(pointerRef.current.y - ship.y, pointerRef.current.x - ship.x);
          let diff = targetAngle - ship.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          ship.angle += diff * 0.18;
        }

        const wantThrust =
          keys['KeyW'] || keys['ArrowUp'] || pointerRef.current.active;
        const wantBrake = keys['KeyS'] || keys['ArrowDown'];

        ship.thrusting = false;
        ship.braking = false;

        if (wantThrust && ship.fuel > 0) {
          const thrustPower = 0.135;
          ship.vx += Math.cos(ship.angle) * thrustPower;
          ship.vy += Math.sin(ship.angle) * thrustPower;
          ship.fuel = Math.max(0, ship.fuel - 0.045);
          ship.thrusting = true;
          soundEngine.playThrustTick(ship.polarityInvertedFrames > 0);

          if (frameCounterRef.current % 2 === 0) {
            const tailX = ship.x - Math.cos(ship.angle) * 14;
            const tailY = ship.y - Math.sin(ship.angle) * 14;
            particlesRef.current.push({
              x: tailX,
              y: tailY,
              vx: -Math.cos(ship.angle) * (2.2 + Math.random() * 1.5) + (Math.random() - 0.5) * 0.8,
              vy: -Math.sin(ship.angle) * (2.2 + Math.random() * 1.5) + (Math.random() - 0.5) * 0.8,
              life: 1,
              maxLife: 16,
              color: ship.polarityInvertedFrames > 0 ? '#f59e0b' : '#22d3ee',
              size: 2.5,
              isLine: true,
            });
          }
        } else {
          // Slow passive solar-sail fuel trickle regeneration so player is never soft-locked
          ship.fuel = Math.min(ship.maxFuel, ship.fuel + 0.018);
        }

        if (wantBrake) {
          ship.vx *= 0.955;
          ship.vy *= 0.955;
          ship.braking = true;
        }

        // Recharge polarity pulse capacitor
        ship.pulseCharge = Math.min(100, ship.pulseCharge + 0.14);
        if (ship.polarityInvertedFrames > 0) {
          ship.polarityInvertedFrames -= 1;
        }
        if (ship.invulnerableFrames > 0) {
          ship.invulnerableFrames -= 1;
        }

        // 2. Apply Gravitational Acceleration
        const invertMult = ship.polarityInvertedFrames > 0 ? -1 : 1;
        const { gx, gy } = computeGravityAt(ship.x, ship.y, invertMult);
        ship.vx += gx;
        ship.vy += gy;

        // Subtle space drag to keep high-G slingshots controllable
        const speed = Math.hypot(ship.vx, ship.vy);
        const maxSpeed = 9.5;
        if (speed > maxSpeed) {
          ship.vx = (ship.vx / speed) * maxSpeed;
          ship.vy = (ship.vy / speed) * maxSpeed;
        } else {
          ship.vx *= 0.9975;
          ship.vy *= 0.9975;
        }

        ship.x += ship.vx;
        ship.y += ship.vy;

        // Record ship vector ribbon trail
        if (frameCounterRef.current % 2 === 0) {
          ship.trail.push({
            x: ship.x,
            y: ship.y,
            alpha: 1.0,
            inverted: ship.polarityInvertedFrames > 0,
          });
          if (ship.trail.length > 38) {
            ship.trail.shift();
          }
        }
        ship.trail.forEach((t) => {
          t.alpha *= 0.95;
        });

        // 3. Boundary containment (elastic vector shield bounce with slight damage if slamming hard)
        const margin = 16;
        if (ship.x < margin) {
          ship.x = margin;
          ship.vx = Math.abs(ship.vx) * 0.65;
        } else if (ship.x > CANVAS_WIDTH - margin) {
          ship.x = CANVAS_WIDTH - margin;
          ship.vx = -Math.abs(ship.vx) * 0.65;
        }
        if (ship.y < margin) {
          ship.y = margin;
          ship.vy = Math.abs(ship.vy) * 0.65;
        } else if (ship.y > CANVAS_HEIGHT - margin) {
          ship.y = CANVAS_HEIGHT - margin;
          ship.vy = -Math.abs(ship.vy) * 0.65;
        }

        // 4. Check Gravity Well Core Collisions, Rotating Barriers & Slingshot Assists
        for (const well of currentSector.wells) {
          const dx = ship.x - well.x;
          const dy = ship.y - well.y;
          const dist = Math.hypot(dx, dy);

          // Event Horizon Core Collision
          if (dist < well.coreRadius + 9) {
            if (ship.invulnerableFrames === 0) {
              ship.hull = Math.max(0, ship.hull - 38);
              ship.invulnerableFrames = 45;
              soundEngine.playHullHit();
              spawnParticles(ship.x, ship.y, 24, '#f43f5e', 5, true);
              addCallout(ship.x, ship.y - 20, 'HULL BREACH -38', '#f43f5e');
            }
            // Eject tangentially outside core
            const angleOut = Math.atan2(dy, dx);
            ship.x = well.x + Math.cos(angleOut) * (well.coreRadius + 14);
            ship.y = well.y + Math.sin(angleOut) * (well.coreRadius + 14);
            ship.vx = Math.cos(angleOut) * 4.2;
            ship.vy = Math.sin(angleOut) * 4.2;
          }

          // Slingshot Grazing Detection (between coreRadius + 12 and coreRadius * 2.35)
          const slingshotOuter = well.coreRadius * 2.35;
          const lastCooldown = slingshotCooldownRef.current[well.id] ?? 0;
          if (
            dist > well.coreRadius + 11 &&
            dist < slingshotOuter &&
            speed > 3.1 &&
            frameCounterRef.current - lastCooldown > 110
          ) {
            slingshotCooldownRef.current[well.id] = frameCounterRef.current;
            slingshotCountRef.current += 1;
            comboRef.current = Math.min(5, comboRef.current + 1);
            const bonus = 250 * comboRef.current;
            scoreRef.current += bonus;
            ship.fuel = Math.min(ship.maxFuel, ship.fuel + 18);
            ship.pulseCharge = Math.min(100, ship.pulseCharge + 28);
            soundEngine.playSlingshotBoost(comboRef.current);
            spawnParticles(ship.x, ship.y, 14, '#f59e0b', 3.8, true);
            addCallout(
              ship.x,
              ship.y - 24,
              `SLINGSHOT ${comboRef.current}X · +${bonus}`,
              '#f59e0b'
            );
          }

          // Rotating Laser Barrier Collision
          if (well.RotatingBarriers) {
            const rb = well.RotatingBarriers;
            if (Math.abs(dist - rb.radius) < 11) {
              let shipAngle = Math.atan2(dy, dx);
              if (shipAngle < 0) shipAngle += Math.PI * 2;

              for (let b = 0; b < rb.count; b++) {
                let startA = (rb.angle + (b * Math.PI * 2) / rb.count) % (Math.PI * 2);
                if (startA < 0) startA += Math.PI * 2;
                const endA = startA + rb.arcLength;

                const inArc =
                  shipAngle >= startA && shipAngle <= endA
                    ? true
                    : endA > Math.PI * 2 && shipAngle <= endA - Math.PI * 2;

                if (inArc && ship.invulnerableFrames === 0) {
                  ship.hull = Math.max(0, ship.hull - 34);
                  ship.invulnerableFrames = 42;
                  ship.vx = -ship.vx * 0.8;
                  ship.vy = -ship.vy * 0.8;
                  soundEngine.playHullHit();
                  spawnParticles(ship.x, ship.y, 20, '#f43f5e', 4.5, true);
                  addCallout(ship.x, ship.y - 20, 'LASER BARRIER -34', '#f43f5e');
                  break;
                }
              }
            }
          }
        }

        // 5. Vector Wall Collisions
        for (const wall of currentSector.walls) {
          const d = distToSegment(ship.x, ship.y, wall.x1, wall.y1, wall.x2, wall.y2);
          if (d < 12) {
            ship.vx = -ship.vx * 0.75;
            ship.vy = -ship.vy * 0.75;
            ship.x += ship.vx * 2;
            ship.y += ship.vy * 2;
            if (wall.lethal && ship.invulnerableFrames === 0) {
              ship.hull = Math.max(0, ship.hull - 28);
              ship.invulnerableFrames = 38;
              soundEngine.playHullHit();
              spawnParticles(ship.x, ship.y, 18, '#f43f5e', 4, true);
              addCallout(ship.x, ship.y - 18, 'WALL IMPACT -28', '#f43f5e');
            }
          }
        }

        // 6. Seeker Mines AI & Gravity Interactions
        for (const mine of currentSector.mines) {
          if (mine.destroyed) continue;

          const dxShip = ship.x - mine.x;
          const dyShip = ship.y - mine.y;
          const distShip = Math.hypot(dxShip, dyShip);

          if (distShip < mine.detectionRadius) {
            mine.active = true;
          }

          if (mine.active) {
            const seekAccel = 0.055;
            mine.vx += (dxShip / Math.max(1, distShip)) * seekAccel;
            mine.vy += (dyShip / Math.max(1, distShip)) * seekAccel;
          }

          // Mines also experience gravity from wells (can be lured into singularities!)
          const mineG = computeGravityAt(mine.x, mine.y, 1);
          mine.vx += mineG.gx * 0.75;
          mine.vy += mineG.gy * 0.75;
          mine.vx *= 0.985;
          mine.vy *= 0.985;
          mine.x += mine.vx;
          mine.y += mine.vy;

          // Check if mine crashed into a singularity core
          for (const well of currentSector.wells) {
            if (Math.hypot(mine.x - well.x, mine.y - well.y) < well.coreRadius + 6) {
              mine.destroyed = true;
              scoreRef.current += 300;
              soundEngine.playHullHit();
              spawnParticles(mine.x, mine.y, 20, '#f59e0b', 4.2, true);
              addCallout(mine.x, mine.y - 16, 'MINE CRUSHED +300', '#10b981');
            }
          }

          // Check if mine hit player ship
          if (!mine.destroyed && distShip < mine.radius + 11) {
            mine.destroyed = true;
            spawnParticles(mine.x, mine.y, 26, '#f43f5e', 5, true);
            if (ship.invulnerableFrames === 0) {
              ship.hull = Math.max(0, ship.hull - 40);
              ship.invulnerableFrames = 45;
              soundEngine.playHullHit();
              addCallout(ship.x, ship.y - 24, 'SEEKER DETONATION -40', '#f43f5e');
            }
          }
        }

        // 7. Data Shard Collection
        let collectedCount = 0;
        for (const shard of currentSector.shards) {
          if (shard.collected) {
            collectedCount += 1;
            continue;
          }
          const dShard = Math.hypot(ship.x - shard.x, ship.y - shard.y);
          if (dShard < 24) {
            shard.collected = true;
            collectedCount += 1;
            const pts = 500 * comboRef.current;
            scoreRef.current += pts;
            ship.fuel = Math.min(ship.maxFuel, ship.fuel + 22);
            ship.pulseCharge = Math.min(100, ship.pulseCharge + 35);
            soundEngine.playShardCollect(comboRef.current);
            spawnParticles(shard.x, shard.y, 18, '#10b981', 3.6, true);
            addCallout(shard.x, shard.y - 20, `DATA SHARD +${pts}`, '#10b981');
          }
        }

        const totalShards = currentSector.shards.length;
        const gateUnlocked = collectedCount >= totalShards;

        // 8. Check Extraction Gate Arrival
        const gateDist = Math.hypot(
          ship.x - currentSector.extractionGate.x,
          ship.y - currentSector.extractionGate.y
        );

        const netG = Math.hypot(gx, gy) * 14.5;
        const currentTelemetry: TelemetryHUD = {
          score: scoreRef.current,
          comboMultiplier: comboRef.current,
          slingshotCount: slingshotCountRef.current,
          hull: Math.round(ship.hull),
          fuel: Math.round(ship.fuel),
          pulseCharge: Math.round(ship.pulseCharge),
          shardsCollected: collectedCount,
          shardsTotal: totalShards,
          elapsedSeconds: +(elapsedFramesRef.current / 60).toFixed(1),
          netGravityG: +netG.toFixed(2),
          velocityKps: +(speed * 18.4).toFixed(1),
          gateUnlocked,
          polarityInverted: ship.polarityInvertedFrames > 0,
          endlessWave: currentSector.id > 100 ? currentSector.id - 100 : 1,
        };

        if (frameCounterRef.current % 4 === 0) {
          onUpdateTelemetry(currentTelemetry);
        }

        if (ship.hull <= 0) {
          soundEngine.playShipShatter();
          spawnParticles(ship.x, ship.y, 45, '#f43f5e', 6.5, true);
          onUpdateTelemetry({ ...currentTelemetry, hull: 0 });
          onGameOver('Vessel hull crushed by extreme gravitational shear.', {
            ...currentTelemetry,
            hull: 0,
          });
          return;
        }

        if (gateUnlocked && gateDist < currentSector.extractionGate.radius + 10) {
          const timeBonus = Math.max(
            0,
            Math.round((currentSector.parTimeSeconds - currentTelemetry.elapsedSeconds) * 40)
          );
          const finalScore = scoreRef.current + 1000 + timeBonus;
          scoreRef.current = finalScore;
          soundEngine.playSectorComplete();
          spawnParticles(
            currentSector.extractionGate.x,
            currentSector.extractionGate.y,
            36,
            '#22d3ee',
            5.5,
            true
          );
          const victoryTelemetry = { ...currentTelemetry, score: finalScore };
          onUpdateTelemetry(victoryTelemetry);
          onSectorVictory(victoryTelemetry);
          return;
        }
      }

      // Step particles & shockwaves
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        if (p.angle !== undefined && p.vAngle !== undefined) {
          p.angle += p.vAngle;
        }
        p.life += 1;
        return p.life < p.maxLife;
      });

      shockwavesRef.current = shockwavesRef.current.filter((sw) => {
        sw.radius += 7.5;
        return sw.radius < sw.maxRadius;
      });

      calloutsRef.current = calloutsRef.current.filter((c) => {
        c.y -= 0.55;
        c.life -= 1;
        return c.life > 0;
      });
    };

    const renderVectorScene = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const currentSector = liveSectorRef.current;
      const ship = shipRef.current;

      // 1. Deep Obsidian Vector CRT Background
      ctx.fillStyle = '#060913';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 2. Warped Space-Time Coordinate Grid
      const gridStep = 48;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.52)';

      const displaceGridPoint = (gx: number, gy: number) => {
        if (!showGridWarp) return { x: gx, y: gy };
        let dxTotal = 0;
        let dyTotal = 0;
        for (const well of currentSector.wells) {
          const dx = well.x - gx;
          const dy = well.y - gy;
          const dist = Math.hypot(dx, dy);
          if (dist < well.influenceRadius && dist > 6) {
            const effMass = getEffectiveWellMass(well);
            const sign = effMass >= 0 ? 1 : -1;
            const factor =
              sign *
              Math.pow(1 - dist / well.influenceRadius, 1.7) *
              Math.min(26, Math.abs(effMass) / 115);
            dxTotal += (dx / dist) * factor;
            dyTotal += (dy / dist) * factor;
          }
        }
        return { x: gx + dxTotal, y: gy + dyTotal };
      };

      // Vertical warped grid lines
      for (let x = 0; x <= CANVAS_WIDTH; x += gridStep) {
        ctx.beginPath();
        for (let y = 0; y <= CANVAS_HEIGHT; y += 24) {
          const pt = displaceGridPoint(x, y);
          if (y === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }
      // Horizontal warped grid lines
      for (let y = 0; y <= CANVAS_HEIGHT; y += gridStep) {
        ctx.beginPath();
        for (let x = 0; x <= CANVAS_WIDTH; x += 24) {
          const pt = displaceGridPoint(x, y);
          if (x === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
      }

      // 3. Render Gravity Shear Conduits
      for (const sz of currentSector.shearZones) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.fillStyle = 'rgba(14, 116, 144, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(sz.x, sz.y, sz.width, sz.height);
        ctx.fillRect(sz.x, sz.y, sz.width, sz.height);
        ctx.setLineDash([]);

        // Animated directional vector chevrons inside shear zone
        const flowAngle = Math.atan2(sz.forceY, sz.forceX);
        const offset = (frameCounterRef.current * 1.4) % 44;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.42)';
        ctx.lineWidth = 1.5;

        const cols = Math.max(1, Math.floor(sz.width / 64));
        const rows = Math.max(1, Math.floor(sz.height / 64));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const cx =
              sz.x +
              ((c + 0.5) * sz.width) / cols +
              Math.cos(flowAngle) * (offset - 22);
            const cy =
              sz.y +
              ((r + 0.5) * sz.height) / rows +
              Math.sin(flowAngle) * (offset - 22);

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(flowAngle);
            ctx.beginPath();
            ctx.moveTo(-6, -7);
            ctx.lineTo(5, 0);
            ctx.lineTo(-6, 7);
            ctx.stroke();
            ctx.restore();
          }
        }

        if (sz.label) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.75)';
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillText(sz.label, sz.x + 8, sz.y + 16);
        }
        ctx.restore();
      }

      // 4. Render Gravity Wells (Attractors, White Hole Repulsors, Pulsars & Rotating Shields)
      for (const well of currentSector.wells) {
        const effMass = getEffectiveWellMass(well);
        const isRepulsor = effMass < 0;
        const primaryColor =
          well.type === 'PULSAR'
            ? isRepulsor
              ? '#10b981'
              : '#f59e0b'
            : isRepulsor
            ? '#10b981'
            : '#f43f5e';

        ctx.save();

        // Outer influence boundary ring
        ctx.beginPath();
        ctx.arc(well.x, well.y, well.influenceRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isRepulsor
          ? 'rgba(16, 185, 129, 0.16)'
          : 'rgba(244, 63, 94, 0.16)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Slingshot sweet-spot ring (coreRadius * 2.1)
        ctx.beginPath();
        ctx.arc(well.x, well.y, well.coreRadius * 2.1, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Animated inward/outward gravitational field rings
        const ringPulse = (frameCounterRef.current * 0.65) % 45;
        for (let r = 0; r < 3; r++) {
          const rawR = isRepulsor
            ? well.coreRadius + ((ringPulse + r * 45) % 135)
            : well.coreRadius + 135 - ((ringPulse + r * 45) % 135);
          const alpha = Math.max(0, (1 - (rawR - well.coreRadius) / 140) * 0.35);
          ctx.beginPath();
          ctx.arc(well.x, well.y, rawR, 0, Math.PI * 2);
          ctx.strokeStyle = isRepulsor
            ? `rgba(16, 185, 129, ${alpha})`
            : `rgba(244, 63, 94, ${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Rotating geometric vector core
        ctx.save();
        ctx.translate(well.x, well.y);
        ctx.rotate(
          frameCounterRef.current * (isRepulsor ? -0.02 : 0.02)
        );
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 14;
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;

        // Draw 8-pointed vector star / polygon core
        const vertices = 8;
        ctx.beginPath();
        for (let i = 0; i <= vertices * 2; i++) {
          const rad =
            i % 2 === 0 ? well.coreRadius : well.coreRadius * 0.62;
          const a = (i * Math.PI) / vertices;
          const vx = Math.cos(a) * rad;
          const vy = Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(vx, vy);
          else ctx.lineTo(vx, vy);
        }
        ctx.closePath();
        ctx.fillStyle = '#060913';
        ctx.fill();
        ctx.stroke();

        // Inner singularity horizon circle
        ctx.beginPath();
        ctx.arc(0, 0, well.coreRadius * 0.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Well telemetry label
        ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        const typeTag =
          well.type === 'PULSAR'
            ? isRepulsor
              ? 'PULSAR [REPEL]'
              : 'PULSAR [PULL]'
            : isRepulsor
            ? 'WHITE HOLE'
            : 'SINGULARITY';
        ctx.fillText(typeTag, well.x, well.y + well.coreRadius + 18);

        // Rotating Laser Barriers
        if (well.RotatingBarriers) {
          const rb = well.RotatingBarriers;
          ctx.save();
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 12;
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 3.5;

          for (let b = 0; b < rb.count; b++) {
            const startA = rb.angle + (b * Math.PI * 2) / rb.count;
            const endA = startA + rb.arcLength;
            ctx.beginPath();
            ctx.arc(well.x, well.y, rb.radius, startA, endA);
            ctx.stroke();

            // End-cap nodes on barrier arcs
            [startA, endA].forEach((capAngle) => {
              const cx = well.x + Math.cos(capAngle) * rb.radius;
              const cy = well.y + Math.sin(capAngle) * rb.radius;
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(cx, cy, 3, 0, Math.PI * 2);
              ctx.fill();
            });
          }
          ctx.restore();
        }

        ctx.restore();
      }

      // 5. Render Lethal Vector Walls
      for (const wall of currentSector.walls) {
        ctx.save();
        ctx.shadowColor = wall.lethal ? '#f43f5e' : '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = wall.lethal ? '#f43f5e' : '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(wall.x1, wall.y1);
        ctx.lineTo(wall.x2, wall.y2);
        ctx.stroke();

        // Anchor nodes
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(wall.x1, wall.y1, 3.5, 0, Math.PI * 2);
        ctx.arc(wall.x2, wall.y2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 6. Render Collectible Data Shards
      let allShardsCollected = true;
      for (const shard of currentSector.shards) {
        if (shard.collected) continue;
        allShardsCollected = false;

        ctx.save();
        ctx.translate(shard.x, shard.y);
        ctx.rotate(shard.pulsePhase * 0.6);
        const scale = 1 + Math.sin(shard.pulsePhase * 2) * 0.14;
        ctx.scale(scale, scale);

        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;

        // Diamond vector crystal
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(10, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ecfdf5';
        ctx.fill();
        ctx.restore();
      }

      // 7. Render Extraction Gate
      const gate = currentSector.extractionGate;
      ctx.save();
      ctx.translate(gate.x, gate.y);
      const gateColor = allShardsCollected ? '#22d3ee' : '#64748b';
      ctx.shadowColor = gateColor;
      ctx.shadowBlur = allShardsCollected ? 18 : 4;
      ctx.strokeStyle = gateColor;
      ctx.lineWidth = 2.2;

      // Rotating hexagonal vector portal
      ctx.save();
      ctx.rotate(frameCounterRef.current * (allShardsCollected ? 0.025 : 0.006));
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const gx = Math.cos(a) * gate.radius;
        const gy = Math.sin(a) * gate.radius;
        if (i === 0) ctx.moveTo(gx, gy);
        else ctx.lineTo(gx, gy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Inner lock/open ring
      ctx.beginPath();
      ctx.arc(0, 0, gate.radius * 0.58, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = allShardsCollected ? '#22d3ee' : '#94a3b8';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        allShardsCollected ? 'EXTRACTION OPEN' : 'LOCKED [SHARDS]',
        0,
        gate.radius + 18
      );
      ctx.restore();

      // 8. Render Seeker Mines
      for (const mine of currentSector.mines) {
        if (mine.destroyed) continue;
        ctx.save();
        ctx.translate(mine.x, mine.y);

        // Detection perimeter
        ctx.beginPath();
        ctx.arc(0, 0, mine.detectionRadius, 0, Math.PI * 2);
        ctx.strokeStyle = mine.active
          ? 'rgba(244, 63, 94, 0.22)'
          : 'rgba(148, 163, 184, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.rotate(frameCounterRef.current * (mine.active ? 0.08 : 0.02));
        ctx.shadowColor = mine.active ? '#f43f5e' : '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = mine.active ? '#f43f5e' : '#f59e0b';
        ctx.lineWidth = 2;

        // Spiked vector octahedron
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? mine.radius : mine.radius * 0.45;
          const a = (i * Math.PI) / 4;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // 9. Real-Time Orbital Trajectory Predictor Line
      if (showTrajectory && (gameState === 'PLAYING' || isEditorActive)) {
        ctx.save();
        let simX = ship.x;
        let simY = ship.y;
        let simVx = ship.vx;
        let simVy = ship.vy;
        const invertMult = ship.polarityInvertedFrames > 0 ? -1 : 1;

        ctx.beginPath();
        ctx.moveTo(simX, simY);

        let impactPoint: { x: number; y: number } | null = null;

        for (let step = 0; step < 85; step++) {
          const { gx, gy } = computeGravityAt(simX, simY, invertMult);
          simVx = (simVx + gx) * 0.9975;
          simVy = (simVy + gy) * 0.9975;
          simX += simVx;
          simY += simVy;

          ctx.lineTo(simX, simY);

          // Check if trajectory hits a well core
          let collided = false;
          for (const well of currentSector.wells) {
            if (Math.hypot(simX - well.x, simY - well.y) < well.coreRadius + 6) {
              impactPoint = { x: simX, y: simY };
              collided = true;
              break;
            }
          }
          if (collided) break;
        }

        ctx.strokeStyle = impactPoint
          ? 'rgba(244, 63, 94, 0.52)'
          : ship.polarityInvertedFrames > 0
          ? 'rgba(245, 158, 11, 0.48)'
          : 'rgba(34, 211, 238, 0.42)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        if (impactPoint) {
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(impactPoint.x - 6, impactPoint.y - 6);
          ctx.lineTo(impactPoint.x + 6, impactPoint.y + 6);
          ctx.moveTo(impactPoint.x + 6, impactPoint.y - 6);
          ctx.lineTo(impactPoint.x - 6, impactPoint.y + 6);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 10. Render Ship Vector Ribbon Trail
      if (ship.trail.length > 1) {
        ctx.save();
        for (let i = 1; i < ship.trail.length; i++) {
          const prev = ship.trail[i - 1];
          const curr = ship.trail[i];
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.strokeStyle = curr.inverted
            ? `rgba(245, 158, 11, ${curr.alpha * 0.65})`
            : `rgba(34, 211, 238, ${curr.alpha * 0.65})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
      }

      // 11. Render Player Craft (The Vector Dart)
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.angle);

      const shipColor =
        ship.invulnerableFrames % 6 > 3
          ? '#f43f5e'
          : ship.polarityInvertedFrames > 0
          ? '#f59e0b'
          : '#22d3ee';

      ctx.shadowColor = shipColor;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = shipColor;
      ctx.lineWidth = 2.2;

      // Sleek geometric vector needle-wing craft
      ctx.beginPath();
      ctx.moveTo(16, 0); // Nose
      ctx.lineTo(-12, -11); // Left wingtip
      ctx.lineTo(-7, -3); // Left inner notch
      ctx.lineTo(-10, 0); // Center engine exhaust
      ctx.lineTo(-7, 3); // Right inner notch
      ctx.lineTo(-12, 11); // Right wingtip
      ctx.closePath();
      ctx.fillStyle = '#060913';
      ctx.fill();
      ctx.stroke();

      // Cockpit vector line
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, 0);
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Thruster flame cone when thrusting
      if (ship.thrusting) {
        ctx.beginPath();
        ctx.moveTo(-10, -4);
        ctx.lineTo(-22 - Math.random() * 9, 0);
        ctx.lineTo(-10, 4);
        ctx.strokeStyle = ship.polarityInvertedFrames > 0 ? '#fde047' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

      // Polarity aura ring around ship when inverted
      if (ship.polarityInvertedFrames > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(ship.x, ship.y, 22, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();
      }

      // 12. Render Shockwaves & Vector Line Particles
      for (const sw of shockwavesRef.current) {
        ctx.save();
        const alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      for (const p of particlesRef.current) {
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;

        if (p.isLine) {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle ?? Math.atan2(p.vy, p.vx));
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(-p.size * 1.5, 0);
          ctx.lineTo(p.size * 1.5, 0);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 13. Render Floating Vector Telemetry Callouts
      for (const c of calloutsRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, c.life / 20);
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillStyle = c.color;
        ctx.textAlign = 'center';
        ctx.fillText(c.text, c.x, c.y);
        ctx.restore();
      }
    };

    const loop = () => {
      stepSimulation();
      renderVectorScene();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    gameState,
    isEditorActive,
    showTrajectory,
    showGridWarp,
    computeGravityAt,
    onUpdateTelemetry,
    onSectorVictory,
    onGameOver,
    spawnParticles,
    addCallout,
  ]);

  // Translate mouse/pointer events to internal 1200x720 coordinate space
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    // Level Editor placement handler
    if (isEditorActive && onModifySector) {
      const updated = structuredClone(liveSectorRef.current);
      const idSuffix = `${Date.now()}`;

      if (activeEditorTool === 'ERASE') {
        updated.wells = updated.wells.filter((w) => Math.hypot(w.x - coords.x, w.y - coords.y) > 48);
        updated.shards = updated.shards.filter((s) => Math.hypot(s.x - coords.x, s.y - coords.y) > 32);
        updated.mines = updated.mines.filter((m) => Math.hypot(m.x - coords.x, m.y - coords.y) > 32);
        updated.shearZones = updated.shearZones.filter(
          (sz) =>
            !(
              coords.x >= sz.x &&
              coords.x <= sz.x + sz.width &&
              coords.y >= sz.y &&
              coords.y <= sz.y + sz.height
            )
        );
      } else if (activeEditorTool === 'ATTRACTOR') {
        updated.wells.push({
          id: `custom-w-${idSuffix}`,
          x: Math.round(coords.x),
          y: Math.round(coords.y),
          mass: 2900,
          coreRadius: 35,
          influenceRadius: 280,
          type: 'ATTRACTOR',
        });
      } else if (activeEditorTool === 'REPULSOR') {
        updated.wells.push({
          id: `custom-w-${idSuffix}`,
          x: Math.round(coords.x),
          y: Math.round(coords.y),
          mass: -2800,
          coreRadius: 35,
          influenceRadius: 280,
          type: 'REPULSOR',
        });
      } else if (activeEditorTool === 'PULSAR') {
        updated.wells.push({
          id: `custom-w-${idSuffix}`,
          x: Math.round(coords.x),
          y: Math.round(coords.y),
          mass: 3100,
          coreRadius: 36,
          influenceRadius: 290,
          type: 'PULSAR',
          pulsarPhase: 0,
          pulsarSpeed: 0.024,
        });
      } else if (activeEditorTool === 'BARRIER_WELL') {
        updated.wells.push({
          id: `custom-w-${idSuffix}`,
          x: Math.round(coords.x),
          y: Math.round(coords.y),
          mass: 2800,
          coreRadius: 34,
          influenceRadius: 270,
          type: 'ATTRACTOR',
          RotatingBarriers: {
            count: 2,
            radius: 105,
            angle: 0,
            angularVelocity: 0.02,
            arcLength: 1.15,
          },
        });
      } else if (activeEditorTool === 'SHARD') {
        updated.shards.push({
          id: `custom-s-${idSuffix}`,
          x: Math.round(coords.x),
          y: Math.round(coords.y),
          collected: false,
          pulsePhase: 0,
        });
      } else if (activeEditorTool === 'MINE') {
        updated.mines.push({
          id: `custom-m-${idSuffix}`,
          x: Math.round(coords.x),
          y: Math.round(coords.y),
          vx: 0,
          vy: 0,
          radius: 13,
          detectionRadius: 195,
          active: false,
          destroyed: false,
        });
      } else if (activeEditorTool === 'SHEAR_RIGHT') {
        updated.shearZones.push({
          id: `custom-sz-${idSuffix}`,
          x: Math.round(coords.x - 90),
          y: Math.round(coords.y - 70),
          width: 180,
          height: 140,
          forceX: 0.12,
          forceY: 0,
          label: 'EAST SHEAR +2.0G',
        });
      } else if (activeEditorTool === 'SHEAR_UP') {
        updated.shearZones.push({
          id: `custom-sz-${idSuffix}`,
          x: Math.round(coords.x - 70),
          y: Math.round(coords.y - 110),
          width: 140,
          height: 220,
          forceX: 0,
          forceY: -0.12,
          label: 'NORTH SHEAR +2.0G',
        });
      }

      liveSectorRef.current = updated;
      onModifySector(updated);
      return;
    }

    if (gameState === 'PLAYING') {
      if (e.button === 2) {
        triggerPolarityPulse();
      } else {
        pointerRef.current = { active: true, x: coords.x, y: coords.y };
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointerRef.current.active) return;
    const coords = getCanvasCoords(e);
    pointerRef.current.x = coords.x;
    pointerRef.current.y = coords.y;
  };

  const handlePointerUp = () => {
    pointerRef.current.active = false;
  };

  return (
    <div className="relative w-full aspect-[5/3] max-h-[74vh] bg-[#060913] border border-slate-800/90 rounded-lg overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        className={`w-full h-full block ${
          isEditorActive ? 'cursor-crosshair' : 'cursor-default'
        }`}
      />
    </div>
  );
};
