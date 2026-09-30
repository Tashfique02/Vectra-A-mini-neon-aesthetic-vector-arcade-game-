import React, { useState, useCallback, useEffect } from 'react';
import {
  GameState,
  GameMode,
  NavigationTab,
  SectorConfig,
  TelemetryHUD,
  HighScoreRecord,
  EditorTool,
} from './types/game';
import { CAMPAIGN_SECTORS, generateEndlessSector } from './data/sectors';
import { VectorCanvas } from './components/VectorCanvas';
import { soundEngine } from './utils/sound';

const INITIAL_TELEMETRY: TelemetryHUD = {
  score: 0,
  comboMultiplier: 1,
  slingshotCount: 0,
  hull: 100,
  fuel: 100,
  pulseCharge: 100,
  shardsCollected: 0,
  shardsTotal: 3,
  elapsedSeconds: 0,
  netGravityG: 0,
  velocityKps: 0,
  gateUnlocked: false,
  polarityInverted: false,
  endlessWave: 1,
};

const STORAGE_KEY_SCORES = 'vectra_gravity_high_scores_v1';
const STORAGE_KEY_UNLOCKED = 'vectra_unlocked_sector_v1';

const DEFAULT_SCORES: HighScoreRecord[] = [
  {
    id: 'seed-1',
    mode: 'Campaign',
    sectorTitle: '08. Omega Singularity',
    score: 8450,
    slingshots: 7,
    timeSeconds: 41.2,
    date: '2026-09-28',
  },
  {
    id: 'seed-2',
    mode: 'Endless Well',
    sectorTitle: 'Endless Wave 06',
    score: 6920,
    slingshots: 6,
    timeSeconds: 34.8,
    date: '2026-09-29',
  },
  {
    id: 'seed-3',
    mode: 'Campaign',
    sectorTitle: '05. The Lagrange Labyrinth',
    score: 5180,
    slingshots: 4,
    timeSeconds: 29.4,
    date: '2026-09-30',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('CAMPAIGN');
  const [gameMode, setGameMode] = useState<GameMode>('CAMPAIGN');
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');

  const [selectedSectorIndex, setSelectedSectorIndex] = useState<number>(0);
  const [unlockedSectorIndex, setUnlockedSectorIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_UNLOCKED);
      return saved ? Math.min(CAMPAIGN_SECTORS.length - 1, Math.max(0, parseInt(saved, 10))) : 2;
    } catch {
      return 2;
    }
  });

  const [endlessWave, setEndlessWave] = useState<number>(1);
  const [customSector, setCustomSector] = useState<SectorConfig>(() => ({
    ...structuredClone(CAMPAIGN_SECTORS[0]),
    id: 999,
    title: 'Custom Gravity Sandbox',
    subtitle: 'User-Engineered Singularity Course',
    description:
      'Click on the vector grid to place Singularity Attractors, White Hole Repulsors, Pulsars, Shear Conduits, and Data Shards, then test-fly your course.',
  }));

  const [activeSector, setActiveSector] = useState<SectorConfig>(() =>
    structuredClone(CAMPAIGN_SECTORS[0])
  );
  const [runRevision, setRunRevision] = useState<number>(0);

  const [telemetry, setTelemetry] = useState<TelemetryHUD>(INITIAL_TELEMETRY);
  const [failureReason, setFailureReason] = useState<string>('');
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [showTrajectory, setShowTrajectory] = useState<boolean>(true);
  const [showGridWarp, setShowGridWarp] = useState<boolean>(true);
  const [activeEditorTool, setActiveEditorTool] = useState<EditorTool>('ATTRACTOR');

  const [highScores, setHighScores] = useState<HighScoreRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SCORES);
      return raw ? JSON.parse(raw) : DEFAULT_SCORES;
    } catch {
      return DEFAULT_SCORES;
    }
  });

  const recordHighScore = useCallback(
    (finalTelemetry: TelemetryHUD, modeLabel: string, sectorName: string) => {
      const newEntry: HighScoreRecord = {
        id: `${Date.now()}`,
        mode: modeLabel,
        sectorTitle: sectorName,
        score: finalTelemetry.score,
        slingshots: finalTelemetry.slingshotCount,
        timeSeconds: finalTelemetry.elapsedSeconds,
        date: new Date().toISOString().slice(0, 10),
      };
      setHighScores((prev) => {
        const updated = [...prev, newEntry]
          .sort((a, b) => b.score - a.score)
          .slice(0, 12);
        try {
          localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(updated));
        } catch {
          // ignore storage errors
        }
        return updated;
      });
    },
    []
  );

  // Launch or restart the current sector
  const launchSector = useCallback(
    (targetConfig?: SectorConfig, targetMode?: GameMode) => {
      const modeToUse = targetMode ?? gameMode;
      let configToUse: SectorConfig;

      if (targetConfig) {
        configToUse = structuredClone(targetConfig);
      } else if (modeToUse === 'CAMPAIGN') {
        configToUse = structuredClone(CAMPAIGN_SECTORS[selectedSectorIndex]);
      } else if (modeToUse === 'ENDLESS') {
        configToUse = generateEndlessSector(endlessWave);
      } else {
        configToUse = structuredClone(customSector);
      }

      setActiveSector(configToUse);
      setRunRevision((r) => r + 1);
      setTelemetry({
        ...INITIAL_TELEMETRY,
        shardsTotal: configToUse.shards.length,
        endlessWave,
      });
      setFailureReason('');
      setGameState('PLAYING');
    },
    [gameMode, selectedSectorIndex, endlessWave, customSector]
  );

  // Switch navigation tabs cleanly
  const handleSelectTab = (tab: NavigationTab) => {
    setActiveTab(tab);
    if (tab === 'CAMPAIGN') {
      setGameMode('CAMPAIGN');
      const sec = structuredClone(CAMPAIGN_SECTORS[selectedSectorIndex]);
      setActiveSector(sec);
      setGameState('TITLE_MENU');
    } else if (tab === 'ENDLESS') {
      setGameMode('ENDLESS');
      setEndlessWave(1);
      const sec = generateEndlessSector(1);
      setActiveSector(sec);
      setGameState('TITLE_MENU');
    } else if (tab === 'EDITOR') {
      setGameMode('EDITOR');
      setActiveSector(structuredClone(customSector));
      setGameState('TITLE_MENU');
    }
  };

  // Select a specific Campaign Sector
  const handlePickCampaignSector = (index: number) => {
    setSelectedSectorIndex(index);
    setGameMode('CAMPAIGN');
    const sec = structuredClone(CAMPAIGN_SECTORS[index]);
    setActiveSector(sec);
    setTelemetry({
      ...INITIAL_TELEMETRY,
      shardsTotal: sec.shards.length,
    });
    setGameState('TITLE_MENU');
  };

  const handleSectorVictory = useCallback(
    (finalTelemetry: TelemetryHUD) => {
      setGameState('ROUND_SUMMARY');
      const modeLabel =
        gameMode === 'CAMPAIGN'
          ? 'Campaign'
          : gameMode === 'ENDLESS'
          ? 'Endless Well'
          : 'Custom Sector';
      recordHighScore(finalTelemetry, modeLabel, activeSector.title);

      if (gameMode === 'CAMPAIGN' && selectedSectorIndex >= unlockedSectorIndex) {
        const nextUnlock = Math.min(CAMPAIGN_SECTORS.length - 1, selectedSectorIndex + 1);
        setUnlockedSectorIndex(nextUnlock);
        try {
          localStorage.setItem(STORAGE_KEY_UNLOCKED, String(nextUnlock));
        } catch {
          // ignore
        }
      }
    },
    [gameMode, activeSector.title, selectedSectorIndex, unlockedSectorIndex, recordHighScore]
  );

  const handleGameOver = useCallback(
    (reason: string, finalTelemetry: TelemetryHUD) => {
      setFailureReason(reason);
      setGameState('GAME_OVER');
      if (finalTelemetry.score > 0) {
        const modeLabel =
          gameMode === 'CAMPAIGN'
            ? 'Campaign'
            : gameMode === 'ENDLESS'
            ? 'Endless Well'
            : 'Custom Sector';
        recordHighScore(finalTelemetry, modeLabel, activeSector.title);
      }
    },
    [gameMode, activeSector.title, recordHighScore]
  );

  const handleNextSectorOrWave = () => {
    if (gameMode === 'CAMPAIGN') {
      const nextIdx = (selectedSectorIndex + 1) % CAMPAIGN_SECTORS.length;
      setSelectedSectorIndex(nextIdx);
      const nextSec = structuredClone(CAMPAIGN_SECTORS[nextIdx]);
      launchSector(nextSec, 'CAMPAIGN');
    } else if (gameMode === 'ENDLESS') {
      const nextWave = endlessWave + 1;
      setEndlessWave(nextWave);
      const nextSec = generateEndlessSector(nextWave);
      launchSector(nextSec, 'ENDLESS');
    } else {
      launchSector(customSector, 'EDITOR');
    }
  };

  const toggleAudio = () => {
    const nextMuted = !audioMuted;
    setAudioMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  // Keyboard shortcut for Pause (P or Escape) and Quick Retry (R)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        setGameState((prev) =>
          prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev
        );
      } else if (e.code === 'KeyR' && (gameState === 'PLAYING' || gameState === 'GAME_OVER')) {
        launchSector();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, launchSector]);

  const hullStatusText =
    telemetry.hull > 65 ? 'Nominal' : telemetry.hull > 30 ? 'Stressed' : 'Critical';
  const isEditorPlacementMode = activeTab === 'EDITOR' && gameState !== 'PLAYING';

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800/80 bg-[#060913]/95 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleSelectTab('CAMPAIGN');
          }}
          className="font-display text-xl font-bold tracking-tight text-slate-100 hover:text-cyan-400 transition-colors whitespace-nowrap"
        >
          Vectra
        </a>

        {/* Zone 2: 5 single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
          {(
            [
              { id: 'CAMPAIGN', label: 'Campaign' },
              { id: 'ENDLESS', label: 'Endless Well' },
              { id: 'EDITOR', label: 'Sector Builder' },
              { id: 'MANUAL', label: 'Flight Manual' },
              { id: 'SCORES', label: 'High Scores' },
            ] as { id: NavigationTab; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                activeTab === item.id
                  ? 'text-cyan-400 border-cyan-400'
                  : 'text-slate-400 border-transparent hover:text-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 2 primary actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAudio}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-300 border border-slate-700/80 rounded-md hover:border-slate-500 hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            {audioMuted ? 'Audio: Muted' : 'Audio: On'}
          </button>
          <button
            onClick={() => {
              if (activeTab === 'MANUAL' || activeTab === 'SCORES') {
                setActiveTab('CAMPAIGN');
              }
              launchSector();
            }}
            className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors whitespace-nowrap shrink-0"
          >
            {gameState === 'PLAYING' ? 'Restart Sector' : 'Launch Sector'}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar for viewports < md */}
      <div className="flex md:hidden items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-950/80 overflow-x-auto gap-4">
        {(
          [
            { id: 'CAMPAIGN', label: 'Campaign' },
            { id: 'ENDLESS', label: 'Endless' },
            { id: 'EDITOR', label: 'Builder' },
            { id: 'MANUAL', label: 'Manual' },
            { id: 'SCORES', label: 'Scores' },
          ] as { id: NavigationTab; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            onClick={() => handleSelectTab(item.id)}
            className={`text-xs font-medium py-1 whitespace-nowrap shrink-0 ${
              activeTab === item.id ? 'text-cyan-400 underline underline-offset-4' : 'text-slate-400'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Content Container (1440px desktop baseline) */}
      <main className="flex-1 w-full max-w-[1380px] mx-auto px-4 sm:px-6 py-5 flex flex-col gap-5">
        {activeTab === 'MANUAL' ? (
          /* Flight Manual View */
          <section className="max-w-4xl mx-auto w-full py-4 space-y-8">
            <div className="border-b border-slate-800 pb-5">
              <p className="text-xs font-mono text-cyan-400 mb-2">
                Orbital Mechanics · Vector Navigation · Tactical Reference
              </p>
              <h1 className="font-display text-3xl font-bold text-slate-100">
                Vectra Flight Manual & Gravitational Field Guide
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
                Your needle-wing craft operates inside high-gradient inverse-square gravity fields.
                Fighting a singularity head-on drains fuel rapidly; skimming its orbital slingshot
                ring multiplies velocity and recharges onboard capacitors.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h2 className="font-display text-lg font-semibold text-slate-100">
                  01. Flight Controls & Polarity Inversion
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Fly using either keyboard thrusters or direct cursor guidance:
                </p>
                <ul className="space-y-2 text-sm text-slate-300 font-mono">
                  <li>W / Up Arrow / Left-Click — Main Forward Thruster</li>
                  <li>A, D / Left, Right Arrows — Yaw Rotation</li>
                  <li>S / Down Arrow — Inertial Retro-Dampener</li>
                  <li>Space / Shift / Right-Click — Polarity Flip & Shockwave</li>
                  <li>P / Escape — Pause Simulation · R — Quick Retry</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h2 className="font-display text-lg font-semibold text-slate-100">
                  02. Orbital Slingshot Assists
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Each gravity well displays an inner amber orbital ring. Grazing this ring at high
                  tangential speed triggers a Slingshot Assist:
                </p>
                <ul className="space-y-2 text-sm text-slate-300 font-mono">
                  <li>Combo Multiplier — Increases up to 5x (+250 to +1250 pts)</li>
                  <li>Capacitor Recovery — Restores +18% Fuel and +28% Polarity Charge</li>
                  <li>Trajectory Line — Dotted vector curve predicts 85 frames ahead</li>
                </ul>
              </div>

              <div className="space-y-3 border-t border-slate-800/80 pt-6">
                <h2 className="font-display text-lg font-semibold text-slate-100">
                  03. Gravitational Anomalies
                </h2>
                <div className="space-y-2.5 text-sm text-slate-400">
                  <p>
                    <strong className="text-rose-400 font-semibold">Singularity Attractor:</strong>{' '}
                    Pulls your vessel inward with inverse-square force. Crossing the crimson event
                    horizon shears 38 hull points.
                  </p>
                  <p>
                    <strong className="text-emerald-400 font-semibold">White Hole Repulsor:</strong>{' '}
                    Pushes mass outward, deflecting approaches and creating high-shear pinch zones.
                  </p>
                  <p>
                    <strong className="text-amber-400 font-semibold">Harmonic Pulsar:</strong>{' '}
                    Oscillates sinusoidally between attraction and repulsion. Watch the core label
                    before committing to an orbit.
                  </p>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-800/80 pt-6">
                <h2 className="font-display text-lg font-semibold text-slate-100">
                  04. Tactical Hazards & Extraction
                </h2>
                <div className="space-y-2.5 text-sm text-slate-400">
                  <p>
                    <strong className="text-cyan-400 font-semibold">Gravity Shear Conduits:</strong>{' '}
                    Rectangular flux corridors that apply +1.8G to +2.2G lateral acceleration.
                  </p>
                  <p>
                    <strong className="text-amber-400 font-semibold">Seeker Mines:</strong>{' '}
                    Autonomous octahedrons affected by gravity. Lure them into a Singularity core
                    for a +300 pt crush bonus.
                  </p>
                  <p>
                    <strong className="text-emerald-400 font-semibold">Data Shards & Gate:</strong>{' '}
                    Collect all emerald Data Shards in the sector to unlock the hexagonal Extraction
                    Gate.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                Physics Engine: 60Hz Symplectic Euler · Inverse-Square Field
              </span>
              <button
                onClick={() => {
                  setActiveTab('CAMPAIGN');
                  launchSector();
                }}
                className="px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors whitespace-nowrap"
              >
                Return to Flight Deck
              </button>
            </div>
          </section>
        ) : activeTab === 'SCORES' ? (
          /* High Scores Leaderboard View */
          <section className="max-w-4xl mx-auto w-full py-4 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <p className="text-xs font-mono text-cyan-400 mb-1">
                  Flight Recorder · Verified Sector Telemetry
                </p>
                <h1 className="font-display text-3xl font-bold text-slate-100">
                  Orbital High Scores
                </h1>
              </div>
              <button
                onClick={() => {
                  setHighScores(DEFAULT_SCORES);
                  try {
                    localStorage.setItem(STORAGE_KEY_SCORES, JSON.stringify(DEFAULT_SCORES));
                  } catch {
                    // ignore
                  }
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-400 border border-slate-800 rounded-md hover:text-slate-200 hover:border-slate-700 transition-colors self-start sm:self-auto whitespace-nowrap"
              >
                Reset Flight Log
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-800/90 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-mono text-slate-400 bg-slate-900/50">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Sector / Wave</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4 text-right">Slingshots</th>
                    <th className="py-3 px-4 text-right">Flight Time</th>
                    <th className="py-3 px-4 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm font-mono tabular-nums">
                  {highScores.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 text-slate-400">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-100">
                        {entry.sectorTitle}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{entry.mode}</td>
                      <td className="py-3 px-4 text-right text-amber-400">{entry.slingshots}</td>
                      <td className="py-3 px-4 text-right text-slate-300">
                        {entry.timeSeconds.toFixed(1)}s
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-cyan-400">
                        {entry.score.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          /* Active Game Arena + Unobtrusive HUD + Sector Selector / Level Editor */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left / Center Primary Arena Column (9 cols on desktop) */}
            <div className="lg:col-span-9 flex flex-col gap-3">
              {/* Unobtrusive Top Telemetry Bar (Zero-Pill Unboxed Metadata with · separators) */}
              <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 py-2.5 bg-slate-900/60 border border-slate-800/90 rounded-lg font-mono text-xs tabular-nums">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-slate-100 font-semibold">
                    Score: {telemetry.score.toLocaleString()}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-amber-400">
                    Combo: {telemetry.comboMultiplier}x ({telemetry.slingshotCount} Slingshots)
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span
                    className={
                      telemetry.gateUnlocked ? 'text-cyan-400 font-semibold' : 'text-emerald-400'
                    }
                  >
                    Shards: {telemetry.shardsCollected}/{telemetry.shardsTotal}{' '}
                    {telemetry.gateUnlocked ? '(Gate Open)' : '(Gate Locked)'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span
                    className={
                      telemetry.hull > 65
                        ? 'text-slate-200'
                        : telemetry.hull > 30
                        ? 'text-amber-400'
                        : 'text-rose-400 font-semibold'
                    }
                  >
                    Hull: {telemetry.hull}/100 ({hullStatusText})
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-cyan-300">Fuel: {telemetry.fuel}%</span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span
                    className={
                      telemetry.polarityInverted
                        ? 'text-amber-400 font-semibold'
                        : 'text-slate-300'
                    }
                  >
                    Polarity: {telemetry.polarityInverted ? 'Inverted' : `${telemetry.pulseCharge}%`}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-slate-400">
                    Field: {telemetry.netGravityG.toFixed(2)}G
                  </span>
                </div>
              </div>

              {/* Vector Canvas Stage + State Machine Overlays */}
              <div className="relative">
                <VectorCanvas
                  key={`${activeSector.id}-${runRevision}`}
                  gameState={gameState}
                  sector={activeSector}
                  isEditorActive={isEditorPlacementMode}
                  activeEditorTool={activeEditorTool}
                  showTrajectory={showTrajectory}
                  showGridWarp={showGridWarp}
                  onUpdateTelemetry={setTelemetry}
                  onSectorVictory={handleSectorVictory}
                  onGameOver={handleGameOver}
                  onModifySector={(updated) => {
                    setCustomSector(updated);
                    setActiveSector(updated);
                  }}
                />

                {/* Overlay 1: TITLE_MENU */}
                {gameState === 'TITLE_MENU' && !isEditorPlacementMode && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] flex items-center justify-center p-6 rounded-lg">
                    <div className="max-w-lg w-full bg-[#090e1c] border border-slate-800 p-7 rounded-lg space-y-5">
                      <div className="space-y-1.5">
                        <p className="text-xs font-mono text-cyan-400">
                          {gameMode === 'CAMPAIGN'
                            ? `Campaign Sector · Par Time ${activeSector.parTimeSeconds}s`
                            : gameMode === 'ENDLESS'
                            ? `Endless Well · Wave ${endlessWave}`
                            : 'Custom Sandbox Sector'}
                        </p>
                        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-100">
                          {activeSector.title}
                        </h1>
                        <p className="text-xs font-mono text-slate-400">
                          {activeSector.subtitle}
                        </p>
                      </div>

                      <p className="text-sm text-slate-300 leading-relaxed">
                        {activeSector.description}
                      </p>

                      <div className="border-t border-b border-slate-800/80 py-3 text-xs font-mono text-slate-400 space-y-1">
                        <div>
                          Thrust: W / Up / Left-Click · Steer: A, D / Arrows / Cursor
                        </div>
                        <div>
                          Brake: S / Down · Polarity Flip: Space / Shift / Right-Click
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          onClick={() => launchSector()}
                          className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors whitespace-nowrap"
                        >
                          Launch Sector
                        </button>
                        <button
                          onClick={() => handleSelectTab('ENDLESS')}
                          className="px-4 py-2.5 text-xs font-medium text-slate-200 border border-slate-700 rounded-md hover:border-slate-500 transition-colors whitespace-nowrap"
                        >
                          Enter Endless Well
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Overlay 2: PAUSED */}
                {gameState === 'PAUSED' && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex items-center justify-center p-6 rounded-lg">
                    <div className="max-w-md w-full bg-[#090e1c] border border-slate-800 p-7 rounded-lg space-y-5 text-center">
                      <p className="text-xs font-mono text-amber-400">
                        Simulation Suspended · Orbital Vectors Locked
                      </p>
                      <h2 className="font-display text-2xl font-bold text-slate-100">
                        Flight Paused
                      </h2>
                      <p className="text-sm text-slate-400">
                        {activeSector.title} · Current Score: {telemetry.score.toLocaleString()}
                      </p>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          onClick={() => setGameState('PLAYING')}
                          className="px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors whitespace-nowrap"
                        >
                          Resume Flight
                        </button>
                        <button
                          onClick={() => launchSector()}
                          className="px-4 py-2 text-xs font-medium text-slate-300 border border-slate-700 rounded-md hover:border-slate-500 transition-colors whitespace-nowrap"
                        >
                          Restart Sector
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Overlay 3: ROUND_SUMMARY (Sector Cleared) */}
                {gameState === 'ROUND_SUMMARY' && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex items-center justify-center p-6 rounded-lg">
                    <div className="max-w-md w-full bg-[#090e1c] border border-slate-800 p-7 rounded-lg space-y-5">
                      <div>
                        <p className="text-xs font-mono text-emerald-400">
                          Extraction Complete · All Data Shards Recovered
                        </p>
                        <h2 className="font-display text-2xl font-bold text-slate-100 mt-1">
                          {activeSector.title} Cleared
                        </h2>
                      </div>

                      <div className="space-y-2 border-t border-b border-slate-800 py-3.5 text-xs font-mono tabular-nums">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Final Sector Score</span>
                          <span className="text-cyan-400 font-semibold">
                            {telemetry.score.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Flight Duration</span>
                          <span className="text-slate-200">
                            {telemetry.elapsedSeconds.toFixed(1)}s (Par {activeSector.parTimeSeconds}s)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Slingshot Assists</span>
                          <span className="text-amber-400">{telemetry.slingshotCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Hull Integrity Remaining</span>
                          <span className="text-emerald-400">{telemetry.hull}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleNextSectorOrWave}
                          className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors whitespace-nowrap"
                        >
                          {gameMode === 'ENDLESS' ? 'Next Gravity Wave' : 'Next Sector'}
                        </button>
                        <button
                          onClick={() => launchSector()}
                          className="px-4 py-2.5 text-xs font-medium text-slate-300 border border-slate-700 rounded-md hover:border-slate-500 transition-colors whitespace-nowrap"
                        >
                          Replay Sector
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Overlay 4: GAME_OVER */}
                {gameState === 'GAME_OVER' && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex items-center justify-center p-6 rounded-lg">
                    <div className="max-w-md w-full bg-[#090e1c] border border-rose-900/60 p-7 rounded-lg space-y-5">
                      <div>
                        <p className="text-xs font-mono text-rose-400">
                          Signal Lost · Vessel Destroyed
                        </p>
                        <h2 className="font-display text-2xl font-bold text-slate-100 mt-1">
                          Gravitational Collapse
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">{failureReason}</p>
                      </div>

                      <div className="space-y-2 border-t border-b border-slate-800 py-3.5 text-xs font-mono tabular-nums">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Score Recorded</span>
                          <span className="text-cyan-400 font-semibold">
                            {telemetry.score.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Shards Recovered</span>
                          <span className="text-emerald-400">
                            {telemetry.shardsCollected}/{telemetry.shardsTotal}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Slingshot Assists</span>
                          <span className="text-amber-400">{telemetry.slingshotCount}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => launchSector()}
                          className="px-5 py-2.5 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors whitespace-nowrap"
                        >
                          Play Again
                        </button>
                        <button
                          onClick={() => setGameState('TITLE_MENU')}
                          className="px-4 py-2.5 text-xs font-medium text-slate-300 border border-slate-700 rounded-md hover:border-slate-500 transition-colors whitespace-nowrap"
                        >
                          Sector Briefing
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Tactical Flight Deck Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/40 border border-slate-800/80 rounded-lg text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() =>
                      setGameState((prev) =>
                        prev === 'PLAYING' ? 'PAUSED' : prev === 'PAUSED' ? 'PLAYING' : prev
                      )
                    }
                    disabled={gameState !== 'PLAYING' && gameState !== 'PAUSED'}
                    className="px-3 py-1.5 font-medium text-slate-200 bg-slate-800/90 rounded hover:bg-slate-700 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    {gameState === 'PAUSED' ? 'Resume (P)' : 'Pause (P)'}
                  </button>
                  <button
                    onClick={() => launchSector()}
                    className="px-3 py-1.5 font-medium text-slate-200 bg-slate-800/90 rounded hover:bg-slate-700 transition-colors whitespace-nowrap"
                  >
                    Reset Run (R)
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowTrajectory((v) => !v)}
                    className={`px-3 py-1.5 font-mono rounded border transition-colors whitespace-nowrap ${
                      showTrajectory
                        ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300'
                        : 'border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Trajectory Predictor: {showTrajectory ? 'On' : 'Off'}
                  </button>
                  <button
                    onClick={() => setShowGridWarp((v) => !v)}
                    className={`px-3 py-1.5 font-mono rounded border transition-colors whitespace-nowrap ${
                      showGridWarp
                        ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300'
                        : 'border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Space-Time Grid: {showGridWarp ? 'Warped' : 'Flat'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Sidebar Column (3 cols on desktop): Sector Select or Level Editor Controls */}
            <aside className="lg:col-span-3 flex flex-col gap-4">
              {activeTab === 'EDITOR' ? (
                <div className="bg-slate-900/50 border border-slate-800/90 rounded-lg p-5 space-y-5">
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-cyan-400">
                      Sandbox Architect
                    </p>
                    <h2 className="font-display text-lg font-bold text-slate-100">
                      Sector Builder
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Select an anomaly below and click directly on the vector grid to place or
                      erase objects.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {(
                      [
                        { id: 'ATTRACTOR', label: 'Place Singularity (Pull)' },
                        { id: 'REPULSOR', label: 'Place White Hole (Repel)' },
                        { id: 'PULSAR', label: 'Place Harmonic Pulsar' },
                        { id: 'BARRIER_WELL', label: 'Place Shielded Core' },
                        { id: 'SHEAR_RIGHT', label: 'Place East Shear Zone' },
                        { id: 'SHEAR_UP', label: 'Place North Shear Zone' },
                        { id: 'SHARD', label: 'Place Data Shard' },
                        { id: 'MINE', label: 'Place Seeker Mine' },
                        { id: 'ERASE', label: 'Eraser Tool (Click Object)' },
                      ] as { id: EditorTool; label: string }[]
                    ).map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => {
                          setActiveEditorTool(tool.id);
                          if (gameState === 'PLAYING') {
                            setGameState('TITLE_MENU');
                          }
                        }}
                        className={`px-3 py-2 text-left text-xs font-mono rounded-md border transition-colors whitespace-nowrap truncate ${
                          activeEditorTool === tool.id && isEditorPlacementMode
                            ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 font-semibold'
                            : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {tool.label}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <button
                      onClick={() => {
                        if (gameState === 'PLAYING') {
                          setGameState('TITLE_MENU');
                        } else {
                          launchSector(customSector, 'EDITOR');
                        }
                      }}
                      className="w-full py-2.5 px-4 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors whitespace-nowrap"
                    >
                      {gameState === 'PLAYING' ? 'Return to Placement Mode' : 'Test-Fly Custom Sector'}
                    </button>
                    <button
                      onClick={() => {
                        const cleared: SectorConfig = {
                          ...customSector,
                          wells: [],
                          shearZones: [],
                          mines: [],
                          shards: [
                            { id: 'cs-1', x: 600, y: 360, collected: false, pulsePhase: 0 },
                          ],
                          walls: [],
                        };
                        setCustomSector(cleared);
                        setActiveSector(cleared);
                        setGameState('TITLE_MENU');
                      }}
                      className="w-full py-2 px-4 text-xs font-medium text-slate-400 border border-slate-800 rounded-md hover:text-slate-200 hover:border-slate-700 transition-colors whitespace-nowrap"
                    >
                      Clear All Obstacles
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/50 border border-slate-800/90 rounded-lg p-5 space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-cyan-400">
                      {gameMode === 'ENDLESS' ? 'Survival Protocol' : '8 Gravitational Courses'}
                    </p>
                    <h2 className="font-display text-lg font-bold text-slate-100">
                      {gameMode === 'ENDLESS' ? 'Endless Gravity Well' : 'Campaign Sectors'}
                    </h2>
                  </div>

                  {gameMode === 'ENDLESS' ? (
                    <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                      <p>
                        Each completed wave generates a denser configuration of Singularities,
                        White Holes, Pulsars, and Seeker Mines.
                      </p>
                      <div className="font-mono text-slate-400 space-y-1 border-t border-b border-slate-800 py-3 tabular-nums">
                        <div>Active Wave: {String(endlessWave).padStart(2, '0')}</div>
                        <div>Gravity Wells: {activeSector.wells.length}</div>
                        <div>Data Shards: {activeSector.shards.length}</div>
                        <div>Seeker Mines: {activeSector.mines.length}</div>
                      </div>
                      <button
                        onClick={() => {
                          setEndlessWave(1);
                          const wave1 = generateEndlessSector(1);
                          launchSector(wave1, 'ENDLESS');
                        }}
                        className="w-full py-2.5 px-4 text-xs font-semibold text-slate-950 bg-cyan-400 rounded-md hover:bg-cyan-300 transition-colors whitespace-nowrap"
                      >
                        Start Wave 01 Run
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {CAMPAIGN_SECTORS.map((sec, idx) => {
                        const isSelected = selectedSectorIndex === idx && gameMode === 'CAMPAIGN';
                        return (
                          <button
                            key={sec.id}
                            onClick={() => handlePickCampaignSector(idx)}
                            className={`w-full text-left px-3.5 py-2.5 rounded-md border transition-colors ${
                              isSelected
                                ? 'bg-cyan-950/50 border-cyan-400/80 text-slate-100'
                                : 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold truncate whitespace-nowrap">
                                {sec.title}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400 shrink-0 tabular-nums">
                                {sec.wells.length}G · {sec.shards.length}S
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {sec.subtitle}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Field Legend */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs font-mono text-slate-400">
                    <div className="text-slate-200 font-sans font-semibold">
                      Vector Anomaly Legend
                    </div>
                    <div>Crimson Star · Singularity (Pull)</div>
                    <div>Emerald Star · White Hole (Repel)</div>
                    <div>Amber Ring · Orbital Slingshot Zone</div>
                    <div>Emerald Diamond · Data Shard</div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
