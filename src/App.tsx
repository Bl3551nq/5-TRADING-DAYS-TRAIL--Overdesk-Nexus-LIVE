import React, { useState, useEffect, useRef } from 'react';
import overdeskLogo from './logo.svg';
import FxCalendar, { playSynthSound } from './components/FxCalendar';
import { MinimizedReminderView } from './components/MinimizedReminderView';
import { Glass } from './components/Glass';
import GooeyNav, { triggerGooeyParticles } from './components/GooeyNav';

import wallpaperGokuBack from './assets/images/goku_back_focus_1785507323174.jpg';
import wallpaperBullBear from './assets/images/bull_bear_chart_1785507336627.jpg';
import wallpaperNeonCandles from './assets/images/neon_candlesticks_1785507347931.jpg';
import wallpaperCyberTunnel from './assets/images/cyber_trading_tunnel_1785507362848.jpg';
import wallpaperAnimeDiscipline from './assets/images/anime_discipline_1785507376413.jpg';
import wallpaperGokuSilhouette from './assets/images/goku_silhouette_focus_1785507390062.jpg';
import wallpaperMoonTrader from './assets/images/moon_trader_candlesticks_1786274245256.jpg';

const PRESET_WALLPAPERS = [
  { id: 'goku_back_focus', name: 'Goku Focus Back', url: wallpaperGokuBack },
  { id: 'bull_bear_chart', name: 'Bull & Bear Market', url: wallpaperBullBear },
  { id: 'neon_candlesticks', name: 'Neon Candlesticks', url: wallpaperNeonCandles },
  { id: 'cyber_trading_tunnel', name: 'Cyber Trading Tunnel', url: wallpaperCyberTunnel },
  { id: 'anime_discipline', name: 'Discipline Pushups', url: wallpaperAnimeDiscipline },
  { id: 'goku_silhouette_focus', name: 'Goku Focus Front', url: wallpaperGokuSilhouette },
  { id: 'moon_trader_candlesticks', name: 'Moon Trader Charts', url: wallpaperMoonTrader },
];

// Declaration to access global Electron API from preload script
declare global {
  interface Window {
    electronAPI?: {
      checkLicense: (simDay?: number) => Promise<{
        ok: boolean;
        isTrial?: boolean;
        trialStarted?: boolean;
        trialUsed?: boolean;
        licenseValid?: boolean;
        trialExpired?: boolean;
        licenseExpired?: boolean;
        dayNumber?: number;
        daysLeft?: number;
        hoursLeft?: number;
        planType?: 'annual' | 'lifetime';
        variantName?: string;
        key?: string;
        expiresAt?: number | null;
        trialStartDate?: number;
        machineId?: string;
        ip?: string;
        error?: string;
      }>;
      validateLicense: (key: string) => Promise<{ ok: boolean; test?: boolean; error?: string; planType?: 'annual' | 'lifetime'; variantName?: string; expiresAt?: number | null }>;
      startTrial: () => Promise<{ ok: boolean; isTrial?: boolean; trialStarted?: boolean; trialUsed?: boolean; trialExpired?: boolean; dayNumber?: number; daysLeft?: number; hoursLeft?: number; trialStartDate?: number; error?: string }>;
      closeApp: () => void;
      setHeight: (height: number) => void;
      cardBounds: (bounds: { x: number; y: number; w: number; h: number; scale?: number }) => void;
      scaleStart: () => void;
      scaleEnd: (scale: number) => void;
      setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
      checkForUpdates?: () => void;
      installUpdate: () => void;
      onCheckingForUpdate?: (cb: () => void) => void;
      onUpdateAvailable?: (cb: (version: string) => void) => void;
      onUpdateNotAvailable?: (cb: (version: string) => void) => void;
      onDownloadProgress?: (cb: (percent: number) => void) => void;
      onUpdateDownloaded?: (cb: () => void) => void;
      onUpdateError?: (cb: (err: string) => void) => void;
    };
  }
}

// Icon Definitions Dictionary (Forex Trading Icons)
const ICON_LIBRARY: Record<string, { label: string; svg: React.ReactNode }> = {
  // --- 1. Market Analysis ---
  candlestick: {
    label: 'Candle',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="3" x2="6" y2="21" />
        <rect x="4" y="7" width="4" height="9" rx="1" fill="currentColor" fillOpacity="0.25" />
        <line x1="18" y1="3" x2="18" y2="21" />
        <rect x="16" y="5" width="4" height="8" rx="1" fill="currentColor" fillOpacity="0.25" />
      </svg>
    ),
  },
  bar_chart: {
    label: 'Bar Chart',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="3" x2="7" y2="21" />
        <line x1="4" y1="16" x2="7" y2="16" />
        <line x1="7" y1="7" x2="10" y2="7" />
        <line x1="17" y1="3" x2="17" y2="21" />
        <line x1="14" y1="18" x2="17" y2="18" />
        <line x1="17" y1="9" x2="20" y2="9" />
      </svg>
    ),
  },
  trendline: {
    label: 'Trend',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 17 9 11 13 15 21 7" />
        <polyline points="16 7 21 7 21 12" />
        <line x1="3" y1="20" x2="21" y2="20" />
      </svg>
    ),
  },
  fibonacci: {
    label: 'Fib',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="5" x2="21" y2="5" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="13" x2="21" y2="13" />
        <line x1="3" y1="19" x2="21" y2="19" />
        <circle cx="17" cy="9" r="1.5" fill="currentColor" />
        <circle cx="8" cy="13" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  technical_indicators: {
    label: 'Ind',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c2-4 5-4 7 0s5 4 7 0 5-4 6 0" />
        <path d="M2 16c3-2 6-2 8 0s5 2 8 0" />
        <line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
  economic_calendar: {
    label: 'Calendar',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M12 13v4" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" />
      </svg>
    ),
  },

  // --- 2. Risk Management ---
  risk_calc: {
    label: 'Pos Size',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <line x1="8" y1="7" x2="16" y2="7" />
        <circle cx="8" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="16" cy="12" r="1" fill="currentColor" />
        <circle cx="8" cy="16" r="1" fill="currentColor" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
        <circle cx="16" cy="16" r="1" fill="currentColor" />
      </svg>
    ),
  },
  stop_loss: {
    label: 'Stop Loss',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  take_profit: {
    label: 'Take Prof',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
        <line x1="12" y1="8" x2="16" y2="8" />
        <line x1="14" y1="6" x2="14" y2="10" />
      </svg>
    ),
  },
  risk_reward: {
    label: 'R:R',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18" />
        <path d="M5 8h14" />
        <path d="M3 13l2-5 2 5a2 2 0 0 1-4 0z" />
        <path d="M17 13l2-5 2 5a2 2 0 0 1-4 0z" />
        <path d="M8 21h8" />
      </svg>
    ),
  },
  drawdown_guard: {
    label: 'Drawdown',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
        <path d="M12 6v6l4 2" />
        <line x1="8" y1="16" x2="16" y2="8" />
      </svg>
    ),
  },

  // --- 3. Trading Psychology ---
  trading_mindset: {
    label: 'Mindset',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a5 5 0 0 0-5 5c0 2 1 3.5 2.5 4.5A5 5 0 0 0 7 17a5 5 0 0 0 10 0 5 5 0 0 0-2.5-5.5C16 10.5 17 9 17 7a5 5 0 0 0-5-5z" />
        <line x1="12" y1="8" x2="12" y2="12" />
      </svg>
    ),
  },
  discipline_lock: {
    label: 'Lock',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
    ),
  },
  fomo_guard: {
    label: 'FOMO',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
  },
  patience_clock: {
    label: 'Patience',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 22h14" />
        <path d="M5 2h14" />
        <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L13.414 13.414a2 2 0 0 1 0-2.828l3-3A2 2 0 0 0 17 6.172V2" />
        <path d="M7 22v-4.172a2 2 0 0 1 .586-1.414l3-3a2 2 0 0 0 0-2.828l-3-3A2 2 0 0 1 7 6.172V2" />
      </svg>
    ),
  },

  // --- 4. Trading Strategy ---
  breakout_pattern: {
    label: 'Breakout',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="8" x2="21" y2="8" strokeDasharray="3 3" />
        <polyline points="4 18 10 12 14 15 20 5" />
        <polyline points="15 5 20 5 20 10" />
      </svg>
    ),
  },
  support_resistance: {
    label: 'S/R',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="5" x2="21" y2="5" />
        <line x1="3" y1="19" x2="21" y2="19" />
        <polyline points="4 15 8 9 12 15 16 9 20 15" />
      </svg>
    ),
  },
  smart_money: {
    label: 'SMC',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17l6-6 4 4 8-8" />
        <polyline points="14 7 21 7 21 14" />
        <circle cx="9" cy="11" r="1.5" fill="currentColor" />
        <circle cx="13" cy="15" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  supply_demand: {
    label: 'Sup/Dem',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="5" rx="1" />
        <rect x="3" y="16" width="18" height="5" rx="1" />
        <polyline points="6 14 10 10 14 12 18 8" />
      </svg>
    ),
  },
  chart_pattern: {
    label: 'Pattern',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 18l4-6 3 3 3-9 3 9 3-3 4 6" />
        <line x1="2" y1="18" x2="22" y2="18" />
      </svg>
    ),
  },

  // --- 5. Trade Execution ---
  buy_order: {
    label: 'Buy',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <polyline points="8 12 12 8 16 12" />
        <line x1="12" y1="8" x2="12" y2="16" />
      </svg>
    ),
  },
  sell_order: {
    label: 'Sell',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <polyline points="8 12 12 16 16 12" />
        <line x1="12" y1="8" x2="12" y2="16" />
      </svg>
    ),
  },
  instant_execution: {
    label: 'Exec',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <polygon points="13 4 7 13 12 13 11 20 17 11 12 11 13 4" fill="currentColor" fillOpacity="0.2" />
      </svg>
    ),
  },
  pending_order: {
    label: 'Pending',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8" />
        <polyline points="12 8 12 12 15 14" />
        <line x1="2" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="22" y2="12" />
      </svg>
    ),
  },

  // --- 6. Trade Management ---
  breakeven: {
    label: 'BE',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="2" y1="12" x2="22" y2="12" />
        <rect x="9" y="8" width="6" height="8" rx="1" />
        <path d="M10 8V6a2 2 0 0 1 4 0v2" />
      </svg>
    ),
  },
  partial_close: {
    label: 'Partials',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" fill="currentColor" fillOpacity="0.2" />
      </svg>
    ),
  },
  trailing_stop: {
    label: 'Trail SL',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 17 8 17 8 12 13 12 13 7 18 7 18 2" />
        <polyline points="3 21 21 21" />
      </svg>
    ),
  },

  // --- 7. Trade Review & Journaling ---
  trade_journal: {
    label: 'Journal',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="9" y1="7" x2="15" y2="7" />
        <line x1="9" y1="11" x2="15" y2="11" />
      </svg>
    ),
  },
  win_rate_stats: {
    label: 'Win Rate',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
        <polyline points="2 20 22 20" />
      </svg>
    ),
  },
  trade_replay: {
    label: 'Replay',
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" fillOpacity="0.2" />
        <path d="M19 5v14" />
      </svg>
    ),
  },
};

// Colors Palettes
const COLOR_PRESETS = [
  { accent: 'rgba(215,25,75,0.9)', soft: 'rgba(255,40,100,0.16)', hex: '#d7194b' },
  { accent: 'rgba(140,0,225,0.9)', soft: 'rgba(170,0,255,0.16)', hex: '#8c00e1' },
  { accent: 'rgba(205,15,95,0.9)', soft: 'rgba(255,30,110,0.16)', hex: '#cd0f5f' },
  { accent: 'rgba(110,0,210,0.9)', soft: 'rgba(130,0,255,0.16)', hex: '#6e00d2' },
  { accent: 'rgba(0,180,155,0.9)', soft: 'rgba(0,210,180,0.18)', hex: '#00b49b' },
  { accent: 'rgba(220,100,0,0.9)', soft: 'rgba(255,140,0,0.18)', hex: '#dc6400' },
  { accent: 'rgba(30,140,255,0.9)', soft: 'rgba(60,170,255,0.18)', hex: '#1e8cff' },
  { accent: 'rgba(0,190,80,0.9)', soft: 'rgba(0,230,100,0.16)', hex: '#00be50' },
  { accent: 'rgba(200,170,0,0.9)', soft: 'rgba(255,220,0,0.16)', hex: '#c8aa00' },
];

function hexToAccent(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    accent: `rgba(${r},${g},${b},0.9)`,
    soft: `rgba(${r},${g},${b},0.18)`,
  };
}

interface ModeDetail {
  title: string;
  accent: string;
  soft: string;
  defaultAccent: string;
  defaultSoft: string;
  options: string[];
  baseOptions?: string[];
}

const isVideoUrl = (url: string): boolean => {
  if (!url) return false;
  if (url.startsWith('data:video/')) return true;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.ogg') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.m4v') ||
    cleanUrl.endsWith('.mkv') ||
    cleanUrl.endsWith('.avi')
  );
};

const DEFAULT_MODES: Record<string, ModeDetail> = {
  business: {
    title: 'Market Analysis',
    accent: 'rgba(30, 140, 255, 0.9)',
    soft: 'rgba(60, 170, 255, 0.18)',
    defaultAccent: 'rgba(30, 140, 255, 0.9)',
    defaultSoft: 'rgba(60, 170, 255, 0.18)',
    options: [
      'Analyze higher timeframe (D1/H4) trend',
      'Mark key Support & Resistance / Liquidity zones',
      'Check Economic Calendar for high-impact news',
      'Identify market structure (BOS / CHoCH)',
    ],
    baseOptions: [
      'Analyze higher timeframe (D1/H4) trend',
      'Mark key Support & Resistance / Liquidity zones',
      'Check Economic Calendar for high-impact news',
      'Identify market structure (BOS / CHoCH)',
    ],
  },
  life: {
    title: 'Risk Management',
    accent: 'rgba(0, 190, 80, 0.9)',
    soft: 'rgba(0, 230, 100, 0.16)',
    defaultAccent: 'rgba(0, 190, 80, 0.9)',
    defaultSoft: 'rgba(0, 230, 100, 0.16)',
    options: [
      'Calculate max risk per trade (1% - 2%)',
      'Set precise Stop Loss price before entry',
      'Verify Risk-to-Reward ratio (min 1:2)',
      'Confirm total account margin & lot size',
    ],
    baseOptions: [
      'Calculate max risk per trade (1% - 2%)',
      'Set precise Stop Loss price before entry',
      'Verify Risk-to-Reward ratio (min 1:2)',
      'Confirm total account margin & lot size',
    ],
  },
  pc: {
    title: 'Trading Strategy',
    accent: 'rgba(140, 0, 225, 0.9)',
    soft: 'rgba(170, 0, 255, 0.16)',
    defaultAccent: 'rgba(140, 0, 225, 0.9)',
    defaultSoft: 'rgba(170, 0, 255, 0.16)',
    options: [
      'Wait for clear setup at Key Zone / Order Block',
      'Confirm lower timeframe entry trigger (M15/M5)',
      'Check confluence indicators (RSI, MA, Volume)',
      'Avoid trading inside low-liquidity chop',
    ],
    baseOptions: [
      'Wait for clear setup at Key Zone / Order Block',
      'Confirm lower timeframe entry trigger (M15/M5)',
      'Check confluence indicators (RSI, MA, Volume)',
      'Avoid trading inside low-liquidity chop',
    ],
  },
  sync: {
    title: 'Trade Execution',
    accent: 'rgba(215, 25, 75, 0.9)',
    soft: 'rgba(255, 40, 100, 0.16)',
    defaultAccent: 'rgba(215, 25, 75, 0.9)',
    defaultSoft: 'rgba(255, 40, 100, 0.16)',
    options: [
      'Place Buy/Sell Order with preset SL & TP',
      'Move Stop Loss to Break-Even at 1:1 R:R',
      'Take partial profits at key target levels',
      'Let winning trade run to final Take Profit',
    ],
    baseOptions: [
      'Place Buy/Sell Order with preset SL & TP',
      'Move Stop Loss to Break-Even at 1:1 R:R',
      'Take partial profits at key target levels',
      'Let winning trade run to final Take Profit',
    ],
  },
  alerts: {
    title: 'Review & Journaling',
    accent: 'rgba(220, 100, 0, 0.9)',
    soft: 'rgba(255, 140, 0, 0.18)',
    defaultAccent: 'rgba(220, 100, 0, 0.9)',
    defaultSoft: 'rgba(255, 140, 0, 0.18)',
    options: [
      'Screenshot chart before and after trade',
      'Log entry, exit, lot size, and PnL in Journal',
      'Review trade execution against rules & mindset',
      'Rate psychological discipline (1 - 5 stars)',
    ],
    baseOptions: [
      'Screenshot chart before and after trade',
      'Log entry, exit, lot size, and PnL in Journal',
      'Review trade execution against rules & mindset',
      'Rate psychological discipline (1 - 5 stars)',
    ],
  },
};

// Play the high-quality Princess Bell MP3 chime repeated 3 times with 3-second intervals
const playModernChime = () => {
  try {
    let playCount = 0;
    const playNext = () => {
      if (playCount >= 3) return;
      const audio = new Audio("https://raw.githubusercontent.com/Bl3551nq/bell-sound/main/princess_bell.mp3");
      audio.volume = 0.8;
      audio.addEventListener('ended', () => {
        playCount++;
        if (playCount < 3) {
          setTimeout(playNext, 3000);
        }
      });
      audio.play().catch((err) => {
        console.warn("Audio play failed or was blocked by browser autoplay restrictions:", err);
      });
    };
    playNext();
  } catch (e) {
    console.error('Failed to play bell audio:', e);
  }
};

const formatTime = (secs: number): string => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function App() {
  const [activeApp, setActiveApp] = useState<'checklist' | 'calendar'>('checklist');
  const [calendarSettingsOpen, setCalendarSettingsOpen] = useState<boolean>(false);
  // ── State ──
  const [currentMode, setCurrentMode] = useState<string>('business');
  const [editMode, setEditMode] = useState<boolean>(false);
  const [isLight, setIsLight] = useState<boolean>(false);
  const [minimized, setMinimized] = useState<boolean>(false);

  // Countdown Timer State
  const [showCountdown, setShowCountdown] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fm_show_countdown');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [countdownDuration, setCountdownDuration] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fm_countdown_duration');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed > 0) return parsed;
      }
    } catch (e) {}
    return 300; // defaults to 5 minutes
  });

  const [countdownTimeLeft, setCountdownTimeLeft] = useState<number>(countdownDuration);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isEditingTimer, setIsEditingTimer] = useState<boolean>(false);
  const [editHH, setEditHH] = useState<string>('00');
  const [editMM, setEditMM] = useState<string>('00');
  const [editSS, setEditSS] = useState<string>('00');

  const [alarmEnabled, setAlarmEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fm_alarm_enabled');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [animateMinimizedText, setAnimateMinimizedText] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fm_animate_minimized_text');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [moveCheckedToBottom, setMoveCheckedToBottom] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fm_move_checked_bottom');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [isChecklistScrolling, setIsChecklistScrolling] = useState(false);
  const checklistScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChecklistScroll = () => {
    setIsChecklistScrolling(true);
    if (checklistScrollTimeoutRef.current) {
      clearTimeout(checklistScrollTimeoutRef.current);
    }
    checklistScrollTimeoutRef.current = setTimeout(() => {
      setIsChecklistScrolling(false);
    }, 800);
  };

  const handleShowCountdownChange = (val: boolean) => {
    setShowCountdown(val);
    localStorage.setItem('fm_show_countdown', String(val));
  };

  const handleCountdownDurationChange = (val: number) => {
    setCountdownDuration(val);
    setCountdownTimeLeft(val);
    setIsTimerRunning(false);
    localStorage.setItem('fm_countdown_duration', String(val));
  };

  const handleAlarmEnabledChange = (val: boolean) => {
    setAlarmEnabled(val);
    localStorage.setItem('fm_alarm_enabled', String(val));
  };

  const handleAnimateMinimizedTextChange = (val: boolean) => {
    setAnimateMinimizedText(val);
    localStorage.setItem('fm_animate_minimized_text', String(val));
  };

  const handleMoveCheckedToBottomChange = (val: boolean) => {
    setMoveCheckedToBottom(val);
    localStorage.setItem('fm_move_checked_bottom', String(val));
  };

  const [autoResetDaily, setAutoResetDaily] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fm_auto_reset_daily');
      return saved === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleAutoResetDailyChange = (val: boolean) => {
    setAutoResetDaily(val);
    localStorage.setItem('fm_auto_reset_daily', String(val));
    if (val) {
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!localStorage.getItem('fm_last_auto_reset_date')) {
        localStorage.setItem('fm_last_auto_reset_date', todayStr);
      }
    }
  };

  // Auto-reset daily midnight checker
  useEffect(() => {
    if (!autoResetDaily) return;

    const checkMidnightReset = () => {
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const lastResetStr = localStorage.getItem('fm_last_auto_reset_date');

      if (!lastResetStr) {
        localStorage.setItem('fm_last_auto_reset_date', todayStr);
      } else if (lastResetStr !== todayStr) {
        // Local midnight has passed -> Clear all checked items across all modes
        const emptyChecklists: Record<string, number[]> = {};

        setModes((prevModes) => {
          const resetModes: Record<string, ModeDetail> = {};
          Object.keys(prevModes).forEach((m) => {
            emptyChecklists[m] = [];
            localStorage.setItem('fm_sel_' + m, JSON.stringify([]));

            const base = prevModes[m]?.baseOptions || DEFAULT_MODES[m]?.options || prevModes[m]?.options || [];
            resetModes[m] = {
              ...prevModes[m],
              options: [...base],
              baseOptions: [...base],
            };
          });
          localStorage.setItem('fm_modes', JSON.stringify(resetModes));
          localStorage.setItem('fm_state_ver', '5.0');
          return resetModes;
        });

        setSelections(emptyChecklists);
        localStorage.setItem('fm_last_auto_reset_date', todayStr);
      }
    };

    checkMidnightReset();
    const interval = setInterval(checkMidnightReset, 10000);
    return () => clearInterval(interval);
  }, [autoResetDaily]);

  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('fm_animations_enabled');
      return saved !== 'false';
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    if (!animationsEnabled) {
      document.body.classList.add('animations-disabled');
    } else {
      document.body.classList.remove('animations-disabled');
    }
  }, [animationsEnabled]);

  const handleAnimationsEnabledChange = (val: boolean) => {
    setAnimationsEnabled(val);
    localStorage.setItem('fm_animations_enabled', String(val));
  };

  // Wallpaper Background State & Handlers
  const [wallpaperUrl, setWallpaperUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('fm_wallpaper_url');
      return saved !== null ? saved : wallpaperGokuBack;
    } catch (e) {
      return wallpaperGokuBack;
    }
  });

  const [customWallpapers, setCustomWallpapers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fm_custom_wallpapers');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // If there's an existing saved custom wallpaperUrl not in PRESET_WALLPAPERS, populate it
    const initialUrl = localStorage.getItem('fm_wallpaper_url');
    if (initialUrl && !PRESET_WALLPAPERS.some((wp) => wp.url === initialUrl)) {
      return [initialUrl];
    }
    return [];
  });

  const [wallpaperOpacity, setWallpaperOpacity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fm_wallpaper_opacity');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed;
      }
    } catch (e) {}
    return 60;
  });

  const wallpaperFileInputRef = useRef<HTMLInputElement>(null);

  const handleWallpaperUrlChange = (url: string) => {
    setWallpaperUrl(url);
    localStorage.setItem('fm_wallpaper_url', url);
  };

  const handleWallpaperOpacityChange = (val: number) => {
    setWallpaperOpacity(val);
    localStorage.setItem('fm_wallpaper_opacity', String(val));
  };

  const MAX_WALLPAPER_SIZE = 3 * 1024 * 1024; // 3MB

  const handleCustomWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_WALLPAPER_SIZE) {
      setImportStatus({
        type: 'error',
        message: `File size exceeds 3MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB). Please choose a file under 3MB.`,
      });
      setTimeout(() => setImportStatus(null), 4500);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomWallpapers((prev) => {
          const updated = [result, ...prev.filter((url) => url !== result)].slice(0, 8);
          try {
            localStorage.setItem('fm_custom_wallpapers', JSON.stringify(updated));
          } catch (err) {
            console.warn('LocalStorage quota reached for custom wallpapers', err);
          }
          return updated;
        });
        handleWallpaperUrlChange(result);
        const isVid = file.type.startsWith('video/') || isVideoUrl(result);
        setImportStatus({
          type: 'success',
          message: isVid ? 'Video wallpaper applied! ✓' : 'Wallpaper image applied! ✓',
        });
        setTimeout(() => setImportStatus(null), 3500);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeleteCustomWallpaper = (e: React.MouseEvent, urlToDelete: string) => {
    e.stopPropagation();
    setCustomWallpapers((prev) => {
      const updated = prev.filter((url) => url !== urlToDelete);
      try {
        localStorage.setItem('fm_custom_wallpapers', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
    if (wallpaperUrl === urlToDelete) {
      handleWallpaperUrlChange(wallpaperGokuBack);
    }
  };

  // Import & Export Checklist State & Handlers
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleExportChecklist = () => {
    try {
      let txtContent = ``;

      Object.entries(modes).forEach(([_, mVal]) => {
        const detail = mVal as ModeDetail;
        txtContent += `[${detail.title}]\n`;
        detail.options.forEach((opt) => {
          txtContent += `- ${opt}\n`;
        });
        txtContent += `\n`;
      });

      const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(txtContent.trim());
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `overdesk_checklist_${new Date().toISOString().slice(0, 10)}.txt`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setImportStatus({ type: 'success', message: 'Exported checklist to .txt successfully!' });
      setTimeout(() => setImportStatus(null), 3500);
    } catch (err) {
      setImportStatus({ type: 'error', message: 'Export failed.' });
    }
  };

  const generateChecklistTemplate = () => {
    try {
      const templateTxt = `[Work & Office]
- Review client proposals
- Team sync & project status
- Approve pending invoices
- Quarterly goal check-in

[Everyday Life]
- Morning coffee & planning
- Grocery list & errands
- 30 min workout or walk
- Evening downtime & book

[PC & Workstation]
- Clean desktop & downloads
- System & security updates
- Backup important files
- Organize workspace tabs

[Focus & DND]
- Deep work block
- Mute phone & chat alerts
- Close distraction tabs
- Single-task until finished

[Daily Schedule]
- Check today's calendar
- Review top 3 priorities
- Follow up on key emails
- End-of-day summary
`;

      const dataStr = 'data:text/plain;charset=utf-8,' + encodeURIComponent(templateTxt.trim());
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'checklist_template.txt');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setImportStatus({ type: 'success', message: 'Standard 5-mode template downloaded! Edit & import anytime.' });
      setTimeout(() => setImportStatus(null), 3500);
    } catch (err) {
      setImportStatus({ type: 'error', message: 'Failed to download template.' });
    }
  };

  const handleImportChecklistFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = (event.target?.result as string) || '';

        const itemsToProcess: Array<{
          id: string;
          heading: string;
          items: string[];
          accent?: string;
          soft?: string;
          icon?: string;
        }> = [];

        // Check if content looks like JSON
        let isJson = false;
        try {
          const trimmed = content.trim();
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            const parsed = JSON.parse(content);
            isJson = true;

            if (Array.isArray(parsed.checklists)) {
              parsed.checklists.forEach((item: any, idx: number) => {
                if (!item || typeof item !== 'object') return;
                const id = item.id || item.key || `mode_${idx + 1}`;
                const rawHeading = String(item.heading || item.title || item.name || `Checklist ${idx + 1}`).trim();
                const heading = rawHeading.slice(0, 30) || `Checklist ${idx + 1}`;
                const rawItems = item.items || item.options || item.tasks || [];
                const items = Array.isArray(rawItems)
                  ? rawItems.map((opt: any) => String(opt || '').trim().slice(0, 100)).filter(Boolean)
                  : [];
                itemsToProcess.push({
                  id,
                  heading,
                  items: items.length > 0 ? items : ['New task item'],
                  accent: item.accent,
                  soft: item.soft,
                  icon: item.icon,
                });
              });
            } else if (parsed.modes && typeof parsed.modes === 'object') {
              Object.entries(parsed.modes).forEach(([mKey, mVal]: [string, any]) => {
                if (!mVal || typeof mVal !== 'object') return;
                const rawHeading = String(mVal.title || mVal.heading || mVal.name || 'Custom Mode').trim();
                const heading = rawHeading.slice(0, 30) || 'Custom Mode';
                const rawItems = mVal.options || mVal.items || mVal.tasks || [];
                const items = Array.isArray(rawItems)
                  ? rawItems.map((opt: any) => String(opt || '').trim().slice(0, 100)).filter(Boolean)
                  : [];
                itemsToProcess.push({
                  id: mKey,
                  heading,
                  items: items.length > 0 ? items : ['New task item'],
                  accent: mVal.accent,
                  soft: mVal.soft,
                  icon: mVal.icon || (parsed.iconAssignments ? parsed.iconAssignments[mKey] : undefined),
                });
              });
            } else if (Array.isArray(parsed)) {
              if (parsed.every((x) => typeof x === 'string')) {
                itemsToProcess.push({
                  id: 'imported',
                  heading: 'Imported Checklist',
                  items: parsed.map((s) => String(s).trim().slice(0, 100)).filter(Boolean),
                });
              } else {
                parsed.forEach((item: any, idx: number) => {
                  if (!item || typeof item !== 'object') return;
                  const id = item.id || item.key || `mode_${idx + 1}`;
                  const rawHeading = String(item.heading || item.title || item.name || `Checklist ${idx + 1}`).trim();
                  const heading = rawHeading.slice(0, 30) || `Checklist ${idx + 1}`;
                  const rawItems = item.items || item.options || item.tasks || [];
                  const items = Array.isArray(rawItems)
                    ? rawItems.map((opt: any) => String(opt || '').trim().slice(0, 100)).filter(Boolean)
                    : [];
                  itemsToProcess.push({
                    id,
                    heading,
                    items: items.length > 0 ? items : ['New task item'],
                    accent: item.accent,
                    soft: item.soft,
                    icon: item.icon,
                  });
                });
              }
            }
          }
        } catch {
          isJson = false;
        }

        // If not JSON or JSON produced no items, parse as plain .txt format!
        if (!isJson || itemsToProcess.length === 0) {
          const lines = content.split(/\r?\n/);
          let currentHeading = 'Imported Checklist';
          let currentId = 'imported';
          let currentItems: string[] = [];
          let modeCount = 0;

          const flushCurrent = () => {
            if (currentItems.length > 0 || modeCount > 0) {
              const cleanHeading = currentHeading.replace(/^\[+|\]+$/g, '').trim().slice(0, 30) || 'Checklist';
              itemsToProcess.push({
                id: currentId,
                heading: cleanHeading,
                items: currentItems.length > 0 ? currentItems : ['New task item'],
              });
            }
          };

          lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // Strict comment line filter: Ignore ANY line starting with #, //, or --
            if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('--')) {
              return;
            }

            // Heading match 1: [Heading Name]
            const bracketMatch = trimmed.match(/^\[([^\]]+)\]$/);
            // Heading match 2: Colon heading like "Work & Projects:" (short, under 32 chars)
            const colonMatch = trimmed.length <= 32 ? trimmed.match(/^([A-Za-z0-9\s&'-]{2,32}):$/) : null;
            // Heading match 3: MODE: Heading Name
            const modePrefixMatch = trimmed.match(/^(?:MODE|LIST|CHECKLIST)\s*:\s*(.+)$/i);

            const matchedHeading = bracketMatch
              ? bracketMatch[1].trim()
              : (colonMatch
                  ? colonMatch[1].trim()
                  : (modePrefixMatch
                      ? modePrefixMatch[1].trim()
                      : null));

            if (matchedHeading) {
              if (currentItems.length > 0 || modeCount > 0) {
                flushCurrent();
              }
              modeCount++;
              const cleanH = matchedHeading.replace(/^\[+|\]+$/g, '').trim().slice(0, 30);
              currentHeading = cleanH || `Checklist ${modeCount}`;
              currentId = cleanH.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `mode_${modeCount}`;
              currentItems = [];
            } else {
              // Regular item line - clean leading bullet formatting (- *, •, 1., [ ], [x], etc.)
              let cleanItem = trimmed.replace(/^([-*•+]|\[[ xX]?\]|\d+[\.\)])\s*/, '').trim();
              if (cleanItem) {
                currentItems.push(cleanItem.slice(0, 100));
              }
            }
          });

          if (currentItems.length > 0 || (modeCount > 0 && itemsToProcess.length === 0)) {
            flushCurrent();
          }
        }

        // Strict 5 mode requirement check
        if (itemsToProcess.length !== 5) {
          setImportStatus({
            type: 'error',
            message: `Import failed: Standard 5 modes required (found ${itemsToProcess.length}). Files with fewer or more modes cannot be imported.`,
          });
          return;
        }

        const standardKeys = ['work', 'life', 'pc', 'sync', 'alerts'];
        const importedModes: Record<string, ModeDetail> = {};
        const importedSelections: Record<string, number[]> = {};
        const importedIcons: Record<string, string> = { ...iconAssignments };

        itemsToProcess.forEach((item, index) => {
          const mKey = standardKeys[index] || `mode_${index + 1}`;
          const existingModeData = modes[mKey];
          const defaultAccentList = [
            'rgba(30, 140, 255, 0.9)',
            'rgba(0, 190, 80, 0.9)',
            'rgba(140, 0, 225, 0.9)',
            'rgba(215, 25, 75, 0.9)',
            'rgba(220, 100, 0, 0.9)',
          ];
          const defaultSoftList = [
            'rgba(60, 170, 255, 0.18)',
            'rgba(0, 230, 100, 0.16)',
            'rgba(170, 0, 255, 0.16)',
            'rgba(255, 40, 100, 0.16)',
            'rgba(255, 140, 0, 0.18)',
          ];
          const defaultIcons = ['briefcase', 'home', 'laptop', 'shield', 'calendar'];

          const accent = item.accent || existingModeData?.accent || defaultAccentList[index % defaultAccentList.length];
          const soft = item.soft || existingModeData?.soft || defaultSoftList[index % defaultSoftList.length];

          importedModes[mKey] = {
            title: item.heading,
            accent,
            soft,
            defaultAccent: existingModeData?.defaultAccent || accent,
            defaultSoft: existingModeData?.defaultSoft || soft,
            options: item.items,
            baseOptions: [...item.items],
          };

          importedSelections[mKey] = [];

          if (item.icon) {
            importedIcons[mKey] = item.icon;
          } else if (iconAssignments[mKey]) {
            importedIcons[mKey] = iconAssignments[mKey];
          } else {
            importedIcons[mKey] = defaultIcons[index % defaultIcons.length];
          }
        });

        setModes(importedModes);
        setSelections(importedSelections);
        setIconAssignments(importedIcons);

        localStorage.setItem('fm_modes', JSON.stringify(importedModes));
        localStorage.setItem('fm_icons', JSON.stringify(importedIcons));
        Object.keys(importedModes).forEach((k) => {
          localStorage.setItem('fm_sel_' + k, JSON.stringify(importedSelections[k] || []));
        });

        const firstKey = standardKeys[0];
        if (firstKey) {
          setCurrentMode(firstKey);
        }

        playSoundChime('complete');
        setImportStatus({
          type: 'success',
          message: `Imported standard 5-mode checklist successfully! ✓`,
        });
        setTimeout(() => setImportStatus(null), 4000);
      } catch (err) {
        setImportStatus({ type: 'error', message: 'Failed to parse text file.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset App logic (Double click to confirm)
  const [resetConfirming, setResetConfirming] = useState<boolean>(false);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performAppReset = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }

    setModes(JSON.parse(JSON.stringify(DEFAULT_MODES)));
    setIconAssignments({
      business: 'candlestick',
      life: 'stop_loss',
      pc: 'smart_money',
      sync: 'instant_execution',
      alerts: 'trade_journal',
    });
    setCustomIcons({});
    setCurrentMode('business');
    setEditMode(false);
    setIsLight(false);
    setMinimized(false);
    setScale(1);
    setShowCountdown(true);
    setCountdownDuration(300);
    setCountdownTimeLeft(300);
    setIsTimerRunning(false);
    setAlarmEnabled(true);
    setAnimateMinimizedText(true);
    setAnimationsEnabled(true);
    setMoveCheckedToBottom(true);
    setAutoResetDaily(false);
    setWallpaperUrl(wallpaperGokuBack);
    setCustomWallpapers([]);
    setWallpaperOpacity(60);
    setResetConfirming(false);
    setImportStatus({ type: 'success', message: 'App reset to default settings successfully! ✓' });
    setTimeout(() => setImportStatus(null), 3500);
  };

  const handleResetAppClick = () => {
    if (resetConfirming) {
      performAppReset();
    } else {
      setResetConfirming(true);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => {
        setResetConfirming(false);
      }, 3500);
    }
  };

  const handleResetAppDoubleClick = () => {
    performAppReset();
  };

  // Everyday Reminder State (Minimized Mode - Max 16 words & 100 chars)
  const clampWords = (text: string, maxWords: number = 16, maxChars: number = 100) => {
    let trimmed = text.trim();
    if (trimmed.length > maxChars) {
      trimmed = trimmed.slice(0, maxChars);
    }
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length > maxWords) {
      return words.slice(0, maxWords).join(' ');
    }
    return trimmed;
  };

  const [reminderText, setReminderText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('fm_reminder_text');
      const text = saved || 'Focus on what matters today. 💡';
      return clampWords(text, 16);
    } catch (e) {
      return 'Focus on what matters today. 💡';
    }
  });
  const [isEditingReminder, setIsEditingReminder] = useState<boolean>(false);
  const [tempReminderText, setTempReminderText] = useState<string>('');

  const handleSaveReminder = () => {
    const trimmed = tempReminderText.trim() || 'Focus on what matters today. 💡';
    const clamped = clampWords(trimmed, 16);
    setReminderText(clamped);
    setIsEditingReminder(false);
    localStorage.setItem('fm_reminder_text', clamped);
  };

  const getReminderFontSize = (textStr: string) => {
    const len = textStr.length;
    if (len > 60) return '14px';
    if (len > 30) return '17px';
    return '21px';
  };

  // License & 5-Day Persistent Trial State
  const [licenseActive, setLicenseActiveState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fm_license_active') === '1';
    } catch {
      return false;
    }
  });

  const setLicenseActive = (active: boolean) => {
    setLicenseActiveState(active);
    try {
      localStorage.setItem('fm_license_active', active ? '1' : '0');
    } catch {}
  };
  const [isTrial, setIsTrial] = useState<boolean>(false);
  const [trialStarted, setTrialStarted] = useState<boolean>(false);
  const [trialUsed, setTrialUsed] = useState<boolean>(false);
  const [trialExpired, setTrialExpired] = useState<boolean>(false);
  const [licenseExpired, setLicenseExpired] = useState<boolean>(false);
  const [trialDayNumber, setTrialDayNumber] = useState<number>(1);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number>(5);
  const [trialHoursLeft, setTrialHoursLeft] = useState<number>(120);
  const [activePlanType, setActivePlanType] = useState<'annual' | 'lifetime'>('lifetime');
  const [activeVariantName, setActiveVariantName] = useState<string>('Lifetime Access');
  const [simulatedDayOverride, setSimulatedDayOverride] = useState<number | null>(null);
  const [licenseInput, setLicenseInput] = useState<string>('');
  const [licenseError, setLicenseError] = useState<boolean>(false);
  const [licenseAPIErrorText, setLicenseAPIErrorText] = useState<string>('');

  // Drag reorder states
  const isDraggingModeRef = useRef<boolean>(false);
  const [modeDragState, setModeDragState] = useState<{
    activeKey: string;
    fromIdx: number;
    currentIdx: number;
    startX: number;
    currentX: number;
  } | null>(null);
  const draggedModeIdxRef = useRef<number | null>(null);
  const [draggedModeIdx, setDraggedModeIdx] = useState<number | null>(null);
  const [dragOverModeIdx, setDragOverModeIdx] = useState<number | null>(null);
  const [draggedOptionIdx, setDraggedOptionIdx] = useState<number | null>(null);

  // Modular Modes Storage
  const [modes, setModes] = useState<Record<string, ModeDetail>>(() => {
    try {
      const saved = localStorage.getItem('fm_modes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          const mergedObj: Record<string, ModeDetail> = {};
          Object.keys(parsed).forEach((k) => {
            const def = DEFAULT_MODES[k];
            const opts = Array.isArray(parsed[k]?.options) ? parsed[k].options : (def?.options || []);
            const baseOpts = Array.isArray(parsed[k]?.baseOptions) && parsed[k].baseOptions.length > 0
              ? parsed[k].baseOptions
              : (def?.baseOptions || [...opts]);

            mergedObj[k] = {
              title: parsed[k]?.title || def?.title || k,
              accent: parsed[k]?.accent || def?.accent || 'rgba(30, 140, 255, 0.9)',
              soft: parsed[k]?.soft || def?.soft || 'rgba(60, 170, 255, 0.18)',
              defaultAccent: parsed[k]?.defaultAccent || def?.defaultAccent || 'rgba(30, 140, 255, 0.9)',
              defaultSoft: parsed[k]?.defaultSoft || def?.defaultSoft || 'rgba(60, 170, 255, 0.18)',
              options: opts,
              baseOptions: baseOpts,
            };
          });
          if (Object.keys(mergedObj).length > 0) return mergedObj;
        }
      }
    } catch (e) {}
    return DEFAULT_MODES;
  });

  // Current selections for each mode
  const [selections, setSelections] = useState<Record<string, number[]>>(() => {
    const defaultSels: Record<string, number[]> = {};
    try {
      const savedModesStr = localStorage.getItem('fm_modes');
      let modeKeys = Object.keys(DEFAULT_MODES);
      if (savedModesStr) {
        try {
          const parsed = JSON.parse(savedModesStr);
          if (parsed && typeof parsed === 'object') {
            modeKeys = Array.from(new Set([...modeKeys, ...Object.keys(parsed)]));
          }
        } catch (e) {}
      }
      modeKeys.forEach((m) => {
        try {
          const savedS = localStorage.getItem('fm_sel_' + m);
          if (savedS) {
            defaultSels[m] = JSON.parse(savedS);
          } else {
            defaultSels[m] = [];
          }
        } catch (e) {
          defaultSels[m] = [];
        }
      });
    } catch (e) {
      Object.keys(DEFAULT_MODES).forEach((m) => {
        defaultSels[m] = [];
      });
    }
    return defaultSels;
  });

  // Mode customizer icons assignment
  const [iconAssignments, setIconAssignments] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('fm_icons');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      business: 'candlestick',
      life: 'stop_loss',
      pc: 'smart_money',
      sync: 'instant_execution',
      alerts: 'trade_journal',
    };
  });

  // Custom uploaded icons state
  const iconFileInputRef = useRef<HTMLInputElement>(null);
  const [customIcons, setCustomIcons] = useState<Record<string, { label: string; src: string; format: 'svg' | 'png' }>>(() => {
    try {
      const saved = localStorage.getItem('fm_custom_icons');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {};
  });

  // Scale tracking (from localStorage)
  const [scale, setScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fm_scale');
      if (saved) {
        const parsed = parseFloat(saved);
        if (parsed >= 0.4 && parsed <= 2.2) return parsed;
      }
    } catch (e) {}
    return 1.0;
  });

  // Height Extension tracking (App 1 expanded & App 2 minimized)
  const [expandedExtraHeight, setExpandedExtraHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fm_exp_extra_h');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch (e) {}
    return 0;
  });

  const [minimizedExtraHeight, setMinimizedExtraHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fm_min_extra_h');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
    } catch (e) {}
    return 0;
  });

  const [isResizingHeight, setIsResizingHeight] = useState<boolean>(false);
  const checklistScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('fm_exp_extra_h', expandedExtraHeight.toString());
  }, [expandedExtraHeight]);

  useEffect(() => {
    localStorage.setItem('fm_min_extra_h', minimizedExtraHeight.toString());
  }, [minimizedExtraHeight]);

  // Customizer picker state
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);
  const [pickerTargetMode, setPickerTargetMode] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // Title focus, item editing tracking
  const [editingTitle, setEditingTitle] = useState<boolean>(false);
  const [titleInputValue, setTitleInputValue] = useState<string>('');
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editingItemValue, setEditingItemValue] = useState<string>('');

  // Mode completion water splash state
  const [completedSplashMode, setCompletedSplashMode] = useState<string | null>(null);
  const splashTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerCompletedSplash = (modeKey: string) => {
    if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
    setCompletedSplashMode(modeKey);
    splashTimerRef.current = setTimeout(() => {
      setCompletedSplashMode(null);
    }, 3000);
  };

  // Auto Updater State
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [updateStatusText, setUpdateStatusText] = useState<string>('');
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [updateVersion, setUpdateVersion] = useState<string>('');
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState<boolean>(false);
  const [updateInstalling, setUpdateInstalling] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Card Draggability (pointer-based with long press) State
  const [translate, setTranslate] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      return { x: 0, y: 0 };
    }
    try {
      const saved = localStorage.getItem('fm_translate');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return { x: 0, y: 0 };
  });
  const [isGripped, setIsGripped] = useState<boolean>(false);

  const dragPointerRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    startTX: number;
    startTY: number;
    timer: NodeJS.Timeout | null;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    startTX: 0,
    startTY: 0,
    timer: null,
  });

  const justDraggedRef = useRef<boolean>(false);

  // Refs
  const cardRef = useRef<HTMLDivElement>(null);
  const lastMinimizedRef = useRef<boolean>(minimized);
  const lastUnminimizedHeightRef = useRef<number>(480);
  const transitionTimerRef = useRef<any>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const listInputRef = useRef<HTMLInputElement>(null);

  const isDraggable = (target: HTMLElement): boolean => {
    let curr: HTMLElement | null = target;
    while (curr && curr !== cardRef.current) {
      if (
        curr.classList?.contains('no-drag') ||
        ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(curr.tagName) ||
        curr.closest('button') ||
        curr.closest('input') ||
        curr.closest('.icon-btn') ||
        curr.closest('.icon-wrap') ||
        curr.closest('.mode-drag-handle') ||
        curr.closest('.edit-toggle') ||
        curr.closest('.settings-toggle') ||
        curr.closest('.settings-body') ||
        curr.closest('.setting-section') ||
        curr.closest('.wallpaper-opacity-slider') ||
        curr.closest('.countdown-timer') ||
        curr.closest('.countdown-timer-edit') ||
        curr.closest('#countdown-timer-widget') ||
        curr.closest('.close-btn') ||
        curr.closest('.add-btn') ||
        curr.closest('.theme-switch') ||
        curr.closest('.minimize-pill') ||
        curr.closest('.minimize-bar') ||
        curr.closest('.resize-handle') ||
        curr.closest('.bottom-resize-handle') ||
        curr.closest('.reset-wrap') ||
        curr.closest('.color-swatch') ||
        curr.closest('.color-custom-wrap') ||
        curr.closest('.picker-grid') ||
        curr.closest('.check-box') ||
        curr.closest('.del-btn')
      ) {
        return false;
      }
      curr = curr.parentElement;
    }
    return true;
  };

  const handleModePointerDown = (e: React.PointerEvent, mKey: string, mIdx: number) => {
    if (!editMode) return;
    if (e.button !== 0) return;
    e.stopPropagation();

    const startX = e.clientX;
    isDraggingModeRef.current = false;

    setModeDragState({
      activeKey: mKey,
      fromIdx: mIdx,
      currentIdx: mIdx,
      startX,
      currentX: startX,
    });

    const modeKeys = Object.keys(modes);
    const totalCount = modeKeys.length;
    const itemWidth = 58; // 50px icon width + 8px gap

    const onPointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - startX;
      if (Math.abs(deltaX) > 4) {
        isDraggingModeRef.current = true;
      }

      const rawStep = Math.round(deltaX / itemWidth);
      const targetIdx = Math.max(0, Math.min(totalCount - 1, mIdx + rawStep));

      setModeDragState({
        activeKey: mKey,
        fromIdx: mIdx,
        currentIdx: targetIdx,
        startX,
        currentX: moveEv.clientX,
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      setModeDragState((prev) => {
        if (prev) {
          if (prev.currentIdx !== prev.fromIdx) {
            moveMode(prev.fromIdx, prev.currentIdx);
          }
          setEditingTitle(false);
          setEditingItemIdx(null);
          setCurrentMode(prev.activeKey);
        }
        return null;
      });

      setTimeout(() => {
        isDraggingModeRef.current = false;
      }, 100);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.electronAPI) return; // Native -webkit-app-region: drag handles physical layout movement in Electron
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (!isDraggable(target)) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startTX = translate.x;
    const startTY = translate.y;

    if (dragPointerRef.current.timer) {
      clearTimeout(dragPointerRef.current.timer);
    }

    let isDraggingActive = false;

    const onPointerMove = (moveEv: PointerEvent) => {
      const dx = moveEv.clientX - startX;
      const dy = moveEv.clientY - startY;

      if (!isDraggingActive) {
        if (Math.hypot(dx, dy) >= 3) {
          isDraggingActive = true;
          setIsGripped(true);
          dragPointerRef.current.dragging = true;
        } else {
          return;
        }
      }

      setTranslate({
        x: startTX + dx,
        y: startTY + dy,
      });
    };

    const onPointerUp = () => {
      if (isDraggingActive) {
        isDraggingActive = false;
        setIsGripped(false);
        dragPointerRef.current.dragging = false;
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 80);
      }

      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true });
  };

  const handleCardPointerMove = () => {
    // Handled globally at window level for complete robustness
  };

  const handleCardPointerUp = () => {
    // Handled globally at window level for complete robustness
  };

  // ── Audio Tone Synthesizer Chimes ──
  const playSoundChime = (type: 'check' | 'complete' | 'reset') => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'complete') {
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === 'check') {
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } else if (type === 'reset') {
        osc.frequency.setValueAtTime(330, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {}
  };

  // ── Sync states on load ──
  useEffect(() => {
    // Determine stored Theme
    const isLightStored = localStorage.getItem('fm_theme') === '1';
    setIsLight(isLightStored);

    // Evaluate 5-day persistent trial & license status
    evaluateLicenseAndTrialStatus();

    if (window.electronAPI) {
      document.body.classList.add('electron');

      // Hook up Electron automatic updater listeners
      if (window.electronAPI.onCheckingForUpdate) {
        window.electronAPI.onCheckingForUpdate(() => {
          setCheckingUpdate(true);
          setUpdateStatusText('Checking for updates...');
        });
      }

      if (window.electronAPI.onUpdateAvailable) {
        window.electronAPI.onUpdateAvailable((version) => {
          setCheckingUpdate(false);
          setUpdateVersion(version);
          setUpdateAvailable(true);
          setUpdateDownloaded(false);
          setUpdateError(null);
          setUpdateStatusText(`Update v${version} available!`);
        });
      }

      if (window.electronAPI.onUpdateNotAvailable) {
        window.electronAPI.onUpdateNotAvailable((version) => {
          setCheckingUpdate(false);
          setUpdateAvailable(false);
          setUpdateStatusText(`You are on the latest version (v${version || '1.2.9'})`);
          setTimeout(() => setUpdateStatusText(''), 5000);
        });
      }

      if (window.electronAPI.onDownloadProgress) {
        window.electronAPI.onDownloadProgress((percent) => {
          setUpdateProgress(percent);
          setUpdateStatusText(`Downloading update... ${percent}%`);
        });
      }

      if (window.electronAPI.onUpdateDownloaded) {
        window.electronAPI.onUpdateDownloaded(() => {
          setUpdateDownloaded(true);
          setUpdateProgress(100);
          setUpdateStatusText('Update downloaded! Ready to install.');
        });
      }

      if (window.electronAPI.onUpdateError) {
        window.electronAPI.onUpdateError((err) => {
          setCheckingUpdate(false);
          setUpdateError(err);
          setUpdateInstalling(false);
          setUpdateStatusText(err || 'Update check failed.');
          setTimeout(() => setUpdateStatusText(''), 6000);
        });
      }

      // Automatically trigger update check on app load
      if (window.electronAPI.checkForUpdates) {
        window.electronAPI.checkForUpdates();
      }
    }
  }, []);

  // Set card accent variables dynamically on change
  useEffect(() => {
    if (cardRef.current) {
      const modeData = modes[currentMode];
      if (modeData) {
        cardRef.current.style.setProperty('--accent', modeData.accent);
        cardRef.current.style.setProperty('--accent-soft', modeData.soft);
      }
    }
  }, [currentMode, modes]);

  // Persist items & configuration on updates
  useEffect(() => {
    localStorage.setItem('fm_modes', JSON.stringify(modes));
  }, [modes]);

  useEffect(() => {
    Object.keys(selections).forEach((m) => {
      localStorage.setItem('fm_sel_' + m, JSON.stringify(selections[m] || []));
    });
  }, [selections]);

  useEffect(() => {
    localStorage.setItem('fm_theme', isLight ? '1' : '0');
  }, [isLight]);

  useEffect(() => {
    localStorage.setItem('fm_icons', JSON.stringify(iconAssignments));
  }, [iconAssignments]);

  useEffect(() => {
    localStorage.setItem('fm_custom_icons', JSON.stringify(customIcons));
  }, [customIcons]);

  useEffect(() => {
    localStorage.setItem('fm_scale', scale.toString());
  }, [scale]);

  useEffect(() => {
    localStorage.setItem('fm_translate', JSON.stringify(translate));
  }, [translate]);

  useEffect(() => {
    document.body.classList.toggle('editing', editMode);
    return () => {
      document.body.classList.remove('editing');
    };
  }, [editMode]);

  // Countdown Timer ticking loop
  useEffect(() => {
    if (!isTimerRunning) return;

    const timer = setInterval(() => {
      setCountdownTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          if (alarmEnabled) {
            playModernChime();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, alarmEnabled]);

  // Dynamic custom high-resolution system-tray & window icon canvas render pipeline
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = overdeskLogo;
        img.onload = () => {
          const imgW = img.naturalWidth || img.width || 256;
          const imgH = img.naturalHeight || img.height || 256;

          // Render raw image to temporary canvas to inspect alpha pixels & trim empty padding
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = imgW;
          tempCanvas.height = imgH;
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) return;

          tempCtx.drawImage(img, 0, 0);
          const imgData = tempCtx.getImageData(0, 0, imgW, imgH);
          const data = imgData.data;

          let minX = imgW, minY = imgH, maxX = 0, maxY = 0;
          let found = false;

          for (let y = 0; y < imgH; y += 2) {
            for (let x = 0; x < imgW; x += 2) {
              const alpha = data[(y * imgW + x) * 4 + 3];
              if (alpha > 10) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                found = true;
              }
            }
          }

          const cropX = found ? minX : 0;
          const cropY = found ? minY : 0;
          const cropW = found ? Math.max(1, maxX - minX + 1) : imgW;
          const cropH = found ? Math.max(1, maxY - minY + 1) : imgH;

          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, 256, 256);

            // Scale trimmed artwork proportionally so it fills the 256x256 icon canvas at max size
            const scale = Math.min(256 / cropW, 256 / cropH);
            const drawW = cropW * scale;
            const drawH = cropH * scale;
            const offsetX = (256 - drawW) / 2;
            const offsetY = (256 - drawH) / 2;

            ctx.drawImage(tempCanvas, cropX, cropY, cropW, cropH, offsetX, offsetY, drawW, drawH);
            const dataUrl = canvas.toDataURL('image/png');
            (window as any).electronAPI.saveIcon(dataUrl);
          }
        };
        img.onerror = (err) => {
          console.error('Failed to load SVG logo for dynamic tray icon:', err);
        };
      } catch (err) {
        console.error('Error auto-generating and saving dynamic logo:', err);
      }
    }
  }, []);

  // Global Keyboard Shortcut: Ctrl + N (or Cmd + N) to switch to next app / toggle back and forth
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setActiveApp((prev) => (prev === 'checklist' ? 'calendar' : 'checklist'));
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Handle reporting dynamic visual bounding box to Electron to prevent clipping with ResizeObserver
  useEffect(() => {
    if (!cardRef.current) return;

    const reportBounds = (forceHeight?: number) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const h = forceHeight !== undefined ? forceHeight : cardRef.current.offsetHeight;

      // Update our saved unminimized height ref if we are currently expanded
      if (!minimized && cardRef.current.offsetHeight > 100) {
        lastUnminimizedHeightRef.current = cardRef.current.offsetHeight;
      }

      if (window.electronAPI) {
        window.electronAPI.cardBounds({
          x: rect.left,
          y: rect.top,
          w: 320, // Standard exact card width constant
          h,
          scale,
        });
      }
    };

    const isMinimizedTransition = lastMinimizedRef.current !== minimized;
    lastMinimizedRef.current = minimized;

    if (isMinimizedTransition) {
      isTransitioningRef.current = true;
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

      if (!minimized) {
        // Expanding (Unminimizing): Instantly expand Electron window to target tall unminimized size
        reportBounds(lastUnminimizedHeightRef.current);
        transitionTimerRef.current = setTimeout(() => {
          isTransitioningRef.current = false;
          reportBounds();
        }, 360);
      } else {
        // Collapsing (Minimizing): Keep window size as is during collapse visual, then shrink after transition
        transitionTimerRef.current = setTimeout(() => {
          isTransitioningRef.current = false;
          reportBounds();
        }, 365);
      }
    }

    const observer = new ResizeObserver(() => {
      // Ignore intermediate size shifts during active minimize/unminimize CSS transitions
      if (isTransitioningRef.current) return;
      
      // Checklist edits, list item additions, theme changes, or dynamic height changes report instantly
      reportBounds();
    });

    observer.observe(cardRef.current);

    // If not transitioning, adjust immediately
    if (!isTransitioningRef.current) {
      reportBounds();
    }

    return () => {
      observer.disconnect();
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [scale, minimized, expandedExtraHeight, minimizedExtraHeight]);

  // ── Bottom Height Drag Extension Handler ──
  const handleBottomResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cardRef.current || minimized) return;

    const startY = e.clientY;
    const isMin = minimized;
    const currentExtra = isMin ? minimizedExtraHeight : expandedExtraHeight;
    const currentCardH = cardRef.current.offsetHeight;
    const baseH = Math.max(80, currentCardH - currentExtra);
    const maxExtra = 1500; // Allow extending height significantly beyond previous max limits

    setIsResizingHeight(true);

    const handlePointerMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const dy = (moveEv.clientY - startY) / scale;
      const nextExtra = Math.max(0, Math.min(maxExtra, Math.round(currentExtra + dy)));
      if (isMin) {
        setMinimizedExtraHeight(nextExtra);
      } else {
        setExpandedExtraHeight(nextExtra);
      }
    };

    const handlePointerUp = () => {
      setIsResizingHeight(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // ── Programmatic Scaling Configurations ──
  const sizingRef = useRef({ dragging: false, startX: 0, startScale: 1.0 });
  const handleSizingMouseDown = () => {};

  const handleScaleChange = (val: number) => {
    setScale(val);
    if (window.electronAPI) {
      window.electronAPI.scaleStart();
      setTimeout(() => {
        window.electronAPI?.scaleEnd(val);
      }, 50);
    }
  };

  // Handle click-through transparency for regions outside the Visual Card element
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const padding = 6; // micro-padding buffer
      const isInsideRect =
        e.clientX >= rect.left - padding &&
        e.clientX <= rect.right + padding &&
        e.clientY >= rect.top - padding &&
        e.clientY <= rect.bottom + padding;

      const isOverCard = isInsideRect || cardRef.current.contains(e.target as Node);
      
      // If we are actively resizing, dragging, we must capture mouse events absolutely
      const forceCapture = isGripped || sizingRef.current?.dragging;

      if (isOverCard || forceCapture) {
        window.electronAPI.setIgnoreMouseEvents(false);
      } else {
        window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      if (window.electronAPI) {
        window.electronAPI.setIgnoreMouseEvents(false);
      }
    };
  }, [isGripped]);

  // ── 5-Day Persistent Trial Evaluator & Gumroad License Verification ──
  const evaluateLicenseAndTrialStatus = async (simDayOverride?: number) => {
    if (window.electronAPI) {
      document.body.classList.add('electron');
      const res = await window.electronAPI.checkLicense(simDayOverride);
      if (res.licenseValid && res.isTrial === false) {
        setLicenseActive(true);
        setIsTrial(false);
        setTrialExpired(false);
        setLicenseExpired(false);
        setActivePlanType(res.planType || 'lifetime');
        setActiveVariantName(res.variantName || 'Lifetime Access');
      } else if (res.licenseExpired) {
        setLicenseActive(false);
        setIsTrial(false);
        setLicenseExpired(true);
        setActivePlanType(res.planType || 'annual');
        setLicenseAPIErrorText('Your license subscription has expired. Please enter a valid license key or purchase a new one at overdesk.store.');
      } else {
        // Trial evaluation
        setIsTrial(true);
        setTrialStarted(Boolean(res.trialStarted));
        setTrialUsed(Boolean(res.trialUsed));

        const dayNum = res.dayNumber || 1;
        setTrialDayNumber(dayNum);
        setTrialDaysLeft(res.daysLeft !== undefined ? res.daysLeft : 5);
        setTrialHoursLeft(res.hoursLeft !== undefined ? res.hoursLeft : 120);

        if (!res.trialStarted) {
          // Default opening screen is License Page
          setLicenseActive(false);
          setTrialExpired(false);
        } else if (res.trialExpired || dayNum >= 6) {
          setTrialExpired(true);
          setLicenseActive(false);
        } else {
          setTrialExpired(false);
          setLicenseActive(true);
        }
      }
    } else {
      // Standard Web Browser Preview Fallback & Trial Engine
      const isLicenseValid = localStorage.getItem('fm_license_valid') === '1';
      const storedPlanType = (localStorage.getItem('fm_plan_type') as 'annual' | 'lifetime') || 'lifetime';
      const storedVariant = localStorage.getItem('fm_variant_name') || 'Lifetime Access';
      const expiresAtStr = localStorage.getItem('fm_license_expires_at');
      const activatedAtStr = localStorage.getItem('fm_license_activated_at');

      if (isLicenseValid) {
        if (storedPlanType === 'lifetime' || storedVariant.toLowerCase().includes('lifetime')) {
          setLicenseActive(true);
          setIsTrial(false);
          setTrialExpired(false);
          setLicenseExpired(false);
          setActivePlanType('lifetime');
          setActiveVariantName(storedVariant);
          return;
        }

        let expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : 0;
        if (!expiresAt && activatedAtStr) {
          const activatedAt = parseInt(activatedAtStr, 10);
          if (activatedAt > 0) {
            expiresAt = activatedAt + (365 * 24 * 60 * 60 * 1000);
          }
        }

        if (expiresAt > 0 && Date.now() >= expiresAt) {
          setLicenseActive(false);
          setIsTrial(false);
          setLicenseExpired(true);
          setActivePlanType(storedPlanType);
          setLicenseAPIErrorText('Your license subscription has expired. Please enter a valid license key or purchase a new one at overdesk.store.');
          return;
        }

        setLicenseActive(true);
        setIsTrial(false);
        setTrialExpired(false);
        setLicenseExpired(false);
        setActivePlanType(storedPlanType);
        setActiveVariantName(storedVariant);
        return;
      }

      const isStarted = localStorage.getItem('fm_trial_started') === '1';
      const isUsed = localStorage.getItem('fm_trial_used') === '1' || isStarted;
      setTrialStarted(isStarted);
      setTrialUsed(isUsed);

      if (!isStarted) {
        setLicenseActive(false);
        setTrialExpired(false);
        return;
      }

      let startTime = parseInt(localStorage.getItem('fm_trial_start_time') || '0', 10);
      if (!startTime || isNaN(startTime)) {
        setLicenseActive(false);
        return;
      }

      let now = Date.now();
      if (typeof simDayOverride === 'number' && simDayOverride >= 1) {
        now = startTime + (simDayOverride - 1) * 24 * 60 * 60 * 1000 + 1000;
      }

      const elapsedMs = Math.max(0, now - startTime);
      const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
      const isExpired = elapsedDays >= 5;

      const dayNum = isExpired ? 6 : Math.min(5, Math.floor(elapsedDays) + 1);
      const daysLeft = isExpired ? 0 : Math.max(0, Math.ceil(5 - elapsedDays));
      const hoursLeft = isExpired ? 0 : Math.max(0, Math.ceil((5 * 24) - (elapsedMs / (1000 * 60 * 60))));

      setIsTrial(true);
      setTrialDayNumber(dayNum);
      setTrialDaysLeft(daysLeft);
      setTrialHoursLeft(hoursLeft);

      if (isExpired) {
        setTrialExpired(true);
        setLicenseActive(false);
        localStorage.setItem('fm_trial_used', '1');
      } else {
        setTrialExpired(false);
        setLicenseActive(true);
      }
    }
  };

  const handleLicenseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLicenseInput(e.target.value);
  };

  const handleStartTrial = async () => {
    if (trialUsed || trialExpired) {
      setLicenseError(true);
      setLicenseAPIErrorText('Your free trial has already been used. Please purchase a license to continue.');
      setTimeout(() => setLicenseError(false), 2500);
      return;
    }

    setLicenseAPIErrorText('Starting 5-day free trial...');
    if (window.electronAPI?.startTrial) {
      const res = await window.electronAPI.startTrial();
      if (res.ok) {
        setLicenseActive(true);
        setIsTrial(true);
        setTrialStarted(true);
        setTrialUsed(true);
        setTrialExpired(false);
        setTrialDayNumber(res.dayNumber || 1);
        setTrialDaysLeft(res.daysLeft !== undefined ? res.daysLeft : 5);
        setTrialHoursLeft(res.hoursLeft !== undefined ? res.hoursLeft : 120);
        setLicenseAPIErrorText('');
        playSoundChime('complete');
      } else {
        setLicenseError(true);
        setTrialUsed(true);
        setLicenseAPIErrorText(res.error || 'Your free trial has already been used. Please purchase a license to continue.');
      }
    } else {
      const now = Date.now();
      localStorage.setItem('fm_trial_started', '1');
      localStorage.setItem('fm_trial_used', '1');
      localStorage.setItem('fm_trial_start_time', now.toString());

      setLicenseActive(true);
      setIsTrial(true);
      setTrialStarted(true);
      setTrialUsed(true);
      setTrialExpired(false);
      setTrialDayNumber(1);
      setTrialDaysLeft(5);
      setTrialHoursLeft(120);
      setLicenseAPIErrorText('');
      playSoundChime('complete');
    }
  };

  const attemptActivation = async () => {
    const cleaned = licenseInput.trim();
    if (cleaned.length < 4) {
      setLicenseError(true);
      setLicenseAPIErrorText('Please enter a valid license key.');
      setTimeout(() => setLicenseError(false), 1200);
      return;
    }

    setLicenseAPIErrorText('Verifying license key with Gumroad API...');
    if (window.electronAPI) {
      const resp = await window.electronAPI.validateLicense(cleaned);
      if (resp.ok) {
        setLicenseActive(true);
        setIsTrial(false);
        setTrialExpired(false);
        setLicenseExpired(false);
        const plan = resp.planType || (cleaned.toUpperCase().includes('ANNUAL') ? 'annual' : 'lifetime');
        const variant = resp.variantName || (plan === 'annual' ? 'Annual Subscription (1 Year)' : 'Lifetime Access');
        setActivePlanType(plan);
        setActiveVariantName(variant);
        setLicenseAPIErrorText('');
        playSoundChime('complete');
      } else {
        setLicenseError(true);
        const err = resp.error || '';
        if (err.includes('refunded')) {
          setLicenseAPIErrorText('This license has been refunded and is no longer valid.');
        } else if (err.includes('already activated') || err.includes('another device')) {
          setLicenseAPIErrorText('This license key is already activated on another device. Contact support to transfer.');
        } else if (err.includes('trial license key has already been used')) {
          setLicenseAPIErrorText('Your free trial has already been used. Please purchase a license to continue.');
        } else {
          setLicenseAPIErrorText('Invalid Key, get key from Gumroad');
        }
      }
    } else {
      // Fallback bypass mode on standard web preview
      const isAnnual = cleaned.toUpperCase().includes('ANNUAL');
      const plan = isAnnual ? 'annual' : 'lifetime';
      const variant = isAnnual ? 'Annual Subscription (1 Year)' : 'Lifetime Access';
      const now = Date.now();
      const expiresAt = isAnnual ? now + (365 * 24 * 60 * 60 * 1000) : null;

      localStorage.setItem('fm_license_valid', '1');
      localStorage.setItem('fm_plan_type', plan);
      localStorage.setItem('fm_variant_name', variant);
      localStorage.setItem('fm_license_activated_at', now.toString());
      if (expiresAt) {
        localStorage.setItem('fm_license_expires_at', expiresAt.toString());
      } else {
        localStorage.removeItem('fm_license_expires_at');
      }

      setLicenseActive(true);
      setIsTrial(false);
      setTrialExpired(false);
      setLicenseExpired(false);
      setActivePlanType(plan);
      setActiveVariantName(variant);
      setLicenseAPIErrorText('');
      playSoundChime('complete');
    }
  };

  // ── Switch Active Tab Tab Modes ──
  const handleModeIconClick = (mode: string) => {
    setEditingTitle(false);
    setEditingItemIdx(null);
    setCurrentMode(mode);
    if (editMode) {
      // Toggle mode visual configuration overlay
      setPickerTargetMode(mode);
      setPickerOpen(true);
    }
  };

  // ── Selection checklist Toggling ──
  const handleOptionToggle = (idx: number) => {
    if (justDraggedRef.current) {
      return;
    }

    if (editMode) {
      // Item editing trigger
      setEditingItemIdx(idx);
      setEditingItemValue(modes[currentMode].options[idx]);
      setTimeout(() => listInputRef.current?.focus(), 60);
      return;
    }

    const currentOptions = [...(modes[currentMode]?.options || [])];
    const activeList = [...(selections[currentMode] || [])];
    const isCurrentlyChecked = activeList.includes(idx);

    let updatedSelections: number[];
    let updatedOptions = currentOptions;

    if (isCurrentlyChecked) {
      // Unchecking item
      playSoundChime('check');

      if (moveCheckedToBottom) {
        const itemText = updatedOptions[idx];
        updatedOptions.splice(idx, 1);

        const remainingCheckedIndices = activeList.filter((v) => v !== idx);
        const uncheckedCount = updatedOptions.length - remainingCheckedIndices.length;
        const insertIdx = Math.max(0, uncheckedCount);

        updatedOptions.splice(insertIdx, 0, itemText);

        updatedSelections = remainingCheckedIndices.map((oldSel) => {
          let pos = oldSel > idx ? oldSel - 1 : oldSel;
          if (pos >= insertIdx) pos += 1;
          return pos;
        });
      } else {
        updatedSelections = activeList.filter((v) => v !== idx);
      }
    } else {
      // Checking item
      playSoundChime('check');

      if (moveCheckedToBottom) {
        const itemText = updatedOptions[idx];
        updatedOptions.splice(idx, 1);
        updatedOptions.push(itemText);
        const newIndex = updatedOptions.length - 1;

        updatedSelections = activeList.map((oldSel) => (oldSel > idx ? oldSel - 1 : oldSel));
        updatedSelections.push(newIndex);
      } else {
        updatedSelections = [...activeList, idx];
      }

      const totalOptionsCount = updatedOptions.length;
      if (updatedSelections.length === totalOptionsCount && totalOptionsCount > 0) {
        setTimeout(() => playSoundChime('complete'), 150);
        triggerCompletedSplash(currentMode);
      }
    }

    if (moveCheckedToBottom) {
      if (updatedSelections.length === 0) {
        // Restoring options to original base order when no items remain checked
        const base = modes[currentMode]?.baseOptions || DEFAULT_MODES[currentMode]?.options || updatedOptions;
        updatedOptions = [...base];
      }

      setModes((prev) => ({
        ...prev,
        [currentMode]: {
          ...prev[currentMode],
          options: updatedOptions,
        },
      }));
    }

    const nextSelections = { ...selections, [currentMode]: updatedSelections };
    setSelections(nextSelections);
    localStorage.setItem('fm_sel_' + currentMode, JSON.stringify(updatedSelections));
  };

  // ── Reset entire checklist indices ──
  const triggerResetChecklist = () => {
    if (editMode) {
      // In edit mode (Reset all columns) - reset checkboxes and re-arrange options of ALL modes to original order
      const emptyChecklists: Record<string, number[]> = {};
      const resetModes: Record<string, ModeDetail> = {};

      Object.keys(modes).forEach((m) => {
        emptyChecklists[m] = [];
        localStorage.setItem('fm_sel_' + m, JSON.stringify([]));

        const base = modes[m]?.baseOptions || DEFAULT_MODES[m]?.options || modes[m]?.options || [];
        resetModes[m] = {
          ...modes[m],
          options: [...base],
          baseOptions: [...base],
        };
      });

      setSelections(emptyChecklists);
      setModes(resetModes);
      localStorage.setItem('fm_modes', JSON.stringify(resetModes));
      localStorage.setItem('fm_state_ver', '5.0');
    } else {
      // Reset active column - reset checkboxes and re-arrange options of ONLY current mode to original order
      const nextSelections = { ...selections, [currentMode]: [] };
      setSelections(nextSelections);
      localStorage.setItem('fm_sel_' + currentMode, JSON.stringify([]));

      const base = modes[currentMode]?.baseOptions || DEFAULT_MODES[currentMode]?.options || modes[currentMode]?.options || [];
      const updatedModes = {
        ...modes,
        [currentMode]: {
          ...modes[currentMode],
          options: [...base],
          baseOptions: [...base],
        },
      };
      setModes(updatedModes);
      localStorage.setItem('fm_modes', JSON.stringify(updatedModes));
      localStorage.setItem('fm_state_ver', '5.0');
    }
    playSoundChime('reset');
  };

  // ── Edit operations: Rename mode titles ──
  const startEditingTitle = () => {
    if (!editMode) return;
    setTitleInputValue(modes[currentMode].title);
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 60);
  };

  const commitTitleEditing = () => {
    if (!editingTitle) return;
    const nextVal = titleInputValue.trim() || modes[currentMode].title;
    setModes((prev) => ({
      ...prev,
      [currentMode]: {
        ...prev[currentMode],
        title: nextVal,
      },
    }));
    setEditingTitle(false);
  };

  // ── Edit operations: Rename items ──
  const commitItemEditing = (idx: number) => {
    if (editingItemIdx === null) return;
    const listCopy = [...modes[currentMode].options];
    const oldVal = listCopy[idx];
    const finalVal = editingItemValue.trim() || oldVal;
    listCopy[idx] = finalVal;

    const baseCopy = [...(modes[currentMode].baseOptions || modes[currentMode].options)];
    const baseIdx = baseCopy.indexOf(oldVal);
    if (baseIdx !== -1) {
      baseCopy[baseIdx] = finalVal;
    } else if (baseCopy[idx] !== undefined) {
      baseCopy[idx] = finalVal;
    }

    setModes((prev) => ({
      ...prev,
      [currentMode]: {
        ...prev[currentMode],
        options: listCopy,
        baseOptions: baseCopy,
      },
    }));
    setEditingItemIdx(null);
  };

  // ── Delete item ──
  const deleteItemOption = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (modes[currentMode].options.length <= 1) return; // cannot delete of size 1

    const deletedItem = modes[currentMode].options[idx];
    const updatedOptions = modes[currentMode].options.filter((_, i) => i !== idx);
    const updatedBaseOptions = (modes[currentMode].baseOptions || modes[currentMode].options).filter(
      (opt, i) => opt !== deletedItem && i !== idx
    );

    setModes((prev) => ({
      ...prev,
      [currentMode]: {
        ...prev[currentMode],
        options: updatedOptions,
        baseOptions: updatedBaseOptions,
      },
    }));

    // Re-adjust check offset mappings on item deletion
    const currentChecked = selections[currentMode] || [];
    const reassignedChecked = currentChecked
      .map((oldIdx) => {
        if (oldIdx === idx) return -1;
        if (oldIdx > idx) return oldIdx - 1;
        return oldIdx;
      })
      .filter((v) => v !== -1);

    setSelections((prev) => ({ ...prev, [currentMode]: reassignedChecked }));
    localStorage.setItem('fm_sel_' + currentMode, JSON.stringify(reassignedChecked));
  };

  // ── Add dynamic item option checklist ──
  const addNewItemOption = () => {
    const listCopy = [...modes[currentMode].options, 'New option'];
    const baseCopy = [...(modes[currentMode].baseOptions || modes[currentMode].options), 'New option'];
    setModes((prev) => ({
      ...prev,
      [currentMode]: {
        ...prev[currentMode],
        options: listCopy,
        baseOptions: baseCopy,
      },
    }));

    const nextIdx = listCopy.length - 1;
    setEditingItemIdx(nextIdx);
    setEditingItemValue('New option');
    setTimeout(() => {
      listInputRef.current?.focus();
      listInputRef.current?.select();
    }, 60);
  };

  // ── Re-order modes sequence ──
  const moveMode = (fromIdx: number, toIdx: number) => {
    const keys = Object.keys(modes);
    if (fromIdx < 0 || fromIdx >= keys.length || toIdx < 0 || toIdx >= keys.length || fromIdx === toIdx) return;

    const newKeys = [...keys];
    const [movedKey] = newKeys.splice(fromIdx, 1);
    newKeys.splice(toIdx, 0, movedKey);

    const updatedModes: Record<string, ModeDetail> = {};
    newKeys.forEach((k) => {
      updatedModes[k] = modes[k];
    });

    setModes(updatedModes);
    localStorage.setItem('fm_modes', JSON.stringify(updatedModes));
    localStorage.setItem('fm_state_ver', '5.0');
  };

  // ── Re-order checklist options within active mode ──
  const moveOption = (fromIdx: number, toIdx: number) => {
    if (!currentMode || !modes[currentMode]) return;
    const oldOptions = [...modes[currentMode].options];
    if (fromIdx < 0 || fromIdx >= oldOptions.length || toIdx < 0 || toIdx >= oldOptions.length || fromIdx === toIdx) return;

    const newOptions = [...oldOptions];
    const [movedItem] = newOptions.splice(fromIdx, 1);
    newOptions.splice(toIdx, 0, movedItem);

    const oldBase = [...(modes[currentMode].baseOptions || modes[currentMode].options)];
    const itemToMove = oldOptions[fromIdx];
    const baseFromIdx = oldBase.indexOf(itemToMove);
    const targetItem = oldOptions[toIdx];
    const baseToIdx = oldBase.indexOf(targetItem);

    let newBaseOptions = oldBase;
    if (baseFromIdx !== -1 && baseToIdx !== -1) {
      newBaseOptions = [...oldBase];
      const [movedBase] = newBaseOptions.splice(baseFromIdx, 1);
      newBaseOptions.splice(baseToIdx, 0, movedBase);
    } else {
      newBaseOptions = [...newOptions];
    }

    const updatedModes = {
      ...modes,
      [currentMode]: {
        ...modes[currentMode],
        options: newOptions,
        baseOptions: newBaseOptions,
      },
    };
    setModes(updatedModes);
    localStorage.setItem('fm_modes', JSON.stringify(updatedModes));
    localStorage.setItem('fm_state_ver', '5.0');

    // Remap selections array for current mode so checked state stays with item text
    const oldSel = selections[currentMode] || [];
    const newSel: number[] = [];

    oldSel.forEach((idx) => {
      if (idx === fromIdx) {
        newSel.push(toIdx);
      } else if (fromIdx < toIdx && idx > fromIdx && idx <= toIdx) {
        newSel.push(idx - 1);
      } else if (fromIdx > toIdx && idx >= toIdx && idx < fromIdx) {
        newSel.push(idx + 1);
      } else {
        newSel.push(idx);
      }
    });

    const updatedSelections = {
      ...selections,
      [currentMode]: newSel,
    };
    setSelections(updatedSelections);
    localStorage.setItem('fm_sel_' + currentMode, JSON.stringify(newSel));
  };

  // ── Mode customized color-picker operations ──
  const assignModeColor = (targetMode: string, accent: string, soft: string) => {
    setModes((prev) => ({
      ...prev,
      [targetMode]: {
        ...prev[targetMode],
        accent,
        soft,
      },
    }));
  };

  const resetModeColorToDefault = (targetMode: string) => {
    const defaults = DEFAULT_MODES[targetMode];
    assignModeColor(targetMode, defaults.defaultAccent, defaults.defaultSoft);
  };

  const assignModeIcon = (targetMode: string, iconKey: string) => {
    setIconAssignments((prev) => ({
      ...prev,
      [targetMode]: iconKey,
    }));
    setPickerOpen(false);
    setPickerTargetMode(null);
  };

  // Custom Icon File Upload Handler
  const handleCustomIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    const labelName = file.name.replace(/\.[^/.]+$/, '').slice(0, 10) || 'Custom';
    const reader = new FileReader();

    if (isSvg) {
      reader.readAsText(file);
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        if (content && content.includes('<svg')) {
          const customKey = 'custom_' + Date.now();
          setCustomIcons((prev) => ({
            ...prev,
            [customKey]: {
              label: labelName,
              src: content,
              format: 'svg',
            },
          }));
          if (pickerTargetMode) {
            assignModeIcon(pickerTargetMode, customKey);
          }
          playSoundChime('check');
        } else {
          // Fallback to Data URL
          const urlReader = new FileReader();
          urlReader.readAsDataURL(file);
          urlReader.onload = (dataEvt) => {
            const dataUrl = dataEvt.target?.result as string;
            if (dataUrl) {
              const customKey = 'custom_' + Date.now();
              setCustomIcons((prev) => ({
                ...prev,
                [customKey]: {
                  label: labelName,
                  src: dataUrl,
                  format: 'png',
                },
              }));
              if (pickerTargetMode) {
                assignModeIcon(pickerTargetMode, customKey);
              }
              playSoundChime('check');
            }
          };
        }
      };
    } else {
      reader.readAsDataURL(file);
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        if (dataUrl) {
          const customKey = 'custom_' + Date.now();
          setCustomIcons((prev) => ({
            ...prev,
            [customKey]: {
              label: labelName,
              src: dataUrl,
              format: 'png',
            },
          }));
          if (pickerTargetMode) {
            assignModeIcon(pickerTargetMode, customKey);
          }
          playSoundChime('check');
        }
      };
    }

    if (e.target) {
      e.target.value = '';
    }
  };

  const deleteCustomIcon = (e: React.MouseEvent, customKey: string) => {
    e.stopPropagation();
    setCustomIcons((prev) => {
      const updated = { ...prev };
      delete updated[customKey];
      return updated;
    });
    setIconAssignments((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((mKey) => {
        if (updated[mKey] === customKey) {
          updated[mKey] = mKey === 'business' ? 'briefcase' : 'home';
        }
      });
      return updated;
    });
    playSoundChime('reset');
  };

  // Helper renderer for built-in or custom icons
  const renderIcon = (iconKey: string) => {
    if (iconKey && customIcons[iconKey]) {
      const item = customIcons[iconKey];
      if (item.format === 'svg' && item.src.trim().startsWith('<svg')) {
        return (
          <span
            className="custom-svg-icon"
            style={{ display: 'inline-flex', width: '22px', height: '22px', alignItems: 'center', justifyContent: 'center' }}
            dangerouslySetInnerHTML={{ __html: item.src }}
          />
        );
      }
      return (
        <img
          src={item.src}
          alt={item.label || 'Custom'}
          style={{ width: '22px', height: '22px', objectFit: 'contain', display: 'block' }}
        />
      );
    }
    if (iconKey && ICON_LIBRARY[iconKey]?.svg) {
      return ICON_LIBRARY[iconKey].svg;
    }
    return ICON_LIBRARY.candlestick?.svg || ICON_LIBRARY.stop_loss?.svg;
  };

  const triggerAppShutdown = () => {
    if (window.electronAPI) {
      window.electronAPI.closeApp();
    } else {
      // Direct Web hide emulation
      if (cardRef.current) {
        cardRef.current.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
        cardRef.current.style.opacity = '0';
        cardRef.current.style.transform = 'scale(0.88)';
        setTimeout(() => {
          if (cardRef.current) cardRef.current.style.display = 'none';
        }, 290);
      }
    }
  };

  // Auto Updater triggers
  const executeUpdateInstall = () => {
    setUpdateInstalling(true);
    if (window.electronAPI) {
      window.electronAPI.installUpdate();
    }
  };

  // ── Render Helpers: Liquid Wave Path Calculation ──
  const compileLiquidWaveData = (modeKey: string) => {
    const totalOptions = modes[modeKey]?.options.length || 0;
    const checkedOptions = selections[modeKey]?.length || 0;
    const pct = totalOptions > 0 ? checkedOptions / totalOptions : 0;

    const accentRaw = modes[modeKey]?.accent || 'rgba(110,0,210,0.9)';
    const m = accentRaw.match(/[\d.]+/g) || ['110', '0', '210'];
    const r = parseInt(m[0]),
      g = parseInt(m[1]),
      b = parseInt(m[2]);

    const baseColor = `rgba(${r},${g},${b},0.5)`;
    const gradientHigh = `rgba(${Math.min(r + 80, 255)},${Math.min(g + 60, 255)},${Math.min(b + 80, 255)},0.75)`;

    const size = 50;
    const waterY = size * (1 - pct);
    const amp = pct > 0.02 && pct < 0.98 ? 3.5 : 0;

    const waveWidth = size + 30; // 80px wide
    const startX = -15;
    const steps = 60;
    const pts = [];

    for (let i = 0; i <= steps; i++) {
      const x = startX + (waveWidth / steps) * i;
      const y = waterY + amp * Math.sin((i / steps) * Math.PI * 4);
      pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
    }

    const wavePath = pts.join(' ') + ` L${startX + waveWidth},50 L${startX},50 Z`;

    return {
      pct,
      baseColor,
      gradientHigh,
      waterY,
      wavePath,
    };
  };

  // Calculations for current selected Mode items totals
  const totalModeOptions = modes[currentMode]?.options.length || 0;
  const totalModeChecked = selections[currentMode]?.length || 0;

  return (
    <div
      className="app-container"
      style={{
        width: '440px',
        height: '100%',
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '30px 60px 60px 60px',
        background: 'transparent',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Main checklist canvas card widget */}
      <div
        className={`card ${isLight ? 'light' : ''} ${minimized ? 'minimized' : ''} ${isGripped ? 'gripped' : ''} ${!licenseActive ? 'license-mode' : ''}`}
        id="card"
        ref={cardRef}
        onPointerDown={handleCardPointerDown}
        onPointerMove={handleCardPointerMove}
        onPointerUp={handleCardPointerUp}
        onPointerCancel={handleCardPointerUp}
        onDragStart={(e) => e.preventDefault()}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${isGripped ? 1.035 : 1})`,
          boxShadow: !licenseActive ? 'none' : (isGripped ? `0 20px 50px -5px ${modes[currentMode]?.soft || 'var(--accent-soft)'}, 0 8px 24px -2px rgba(0, 0, 0, 0.45)` : undefined),
          transition: (isGripped || isResizingHeight) ? 'transform 0s, box-shadow 0.2s ease' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, padding 0.35s cubic-bezier(0.4, 0, 0.2, 1), min-height 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          cursor: isGripped ? 'grabbing' : undefined,
          minHeight: !minimized ? (activeApp === 'calendar' ? `${340 + expandedExtraHeight}px` : (settingsOpen ? `${420 + expandedExtraHeight}px` : undefined)) : undefined,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Wallpaper Background Layer */}
        {wallpaperUrl && (
          <div
            className="wallpaper-layer"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '28px',
              overflow: 'hidden',
              opacity: !licenseActive ? Math.min((wallpaperOpacity / 100) * 0.75, 0.6) : (wallpaperOpacity / 100),
              zIndex: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.25s ease',
            }}
          >
            {isVideoUrl(wallpaperUrl) ? (
              <>
                <video
                  src={wallpaperUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    position: 'absolute',
                    inset: 0,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: isLight
                      ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.58) 100%)'
                      : 'linear-gradient(180deg, rgba(0, 0, 0, 0.32) 0%, rgba(0, 0, 0, 0.55) 100%)',
                  }}
                />
              </>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: `linear-gradient(180deg, ${isLight ? 'rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.58) 100%' : 'rgba(0, 0, 0, 0.32) 0%, rgba(0, 0, 0, 0.55) 100%'}), url("${wallpaperUrl}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            )}
          </div>
        )}

        {!licenseActive ? (
          <div className="license-card-inner">
            <img 
              className="license-logo" 
              src={overdeskLogo} 
              alt="Overdesk Nexus Logo" 
              style={{ width: '115px', height: '115px', objectFit: 'contain', marginBottom: '2px' }}
              referrerPolicy="no-referrer"
            />
            {trialExpired || trialUsed ? (
              <div style={{
                background: 'rgba(239, 68, 68, 0.16)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#f87171',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '10px',
                fontWeight: '800',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                🔒 FREE TRIAL ALREADY USED
              </div>
            ) : licenseExpired ? (
              <div style={{
                background: 'rgba(245, 158, 11, 0.16)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#fbbf24',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '10px',
                fontWeight: '800',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                ⏰ LICENSE SUBSCRIPTION EXPIRED
              </div>
            ) : null}

            <div className="license-title">Overdesk Nexus</div>

            <div className="license-sub" style={{ textAlign: 'center', maxWidth: '290px', margin: '0 auto 6px', lineHeight: '1.45' }}>
              {trialExpired || trialUsed ? (
                <span style={{ color: '#f87171', fontWeight: 700 }}>
                  Your free trial has already been used. Please purchase a license to continue.
                </span>
              ) : licenseExpired ? (
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                  Your annual subscription has expired. Please enter a valid license key or purchase a renewal.
                </span>
              ) : (
                <>
                  Activate your license key or start a 5-day free trial.
                </>
              )}
            </div>

            <input
              className={`license-input ${licenseError ? 'error' : ''}`}
              id="license-input"
              type="text"
              placeholder="Enter Gumroad License Key"
              maxLength={100}
              value={licenseInput}
              onChange={handleLicenseInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') attemptActivation();
              }}
            />

            {licenseAPIErrorText && (
              <div 
                className="license-api-feedback"
                style={{
                  fontSize: '11.5px',
                  fontWeight: '600',
                  color: licenseError ? '#ff4d4d' : (isLight ? '#0284c7' : '#38bdf8'),
                  textAlign: 'center',
                  marginTop: '-4px',
                  marginBottom: '4px',
                  padding: '0 8px',
                  wordBreak: 'break-word',
                  lineHeight: '1.3'
                }}
              >
                {licenseAPIErrorText}
              </div>
            )}

            <button className="license-btn" onClick={attemptActivation}>
              {trialExpired || trialUsed || licenseExpired ? 'Unlock Access with Key' : 'Activate License'}
            </button>

            {!trialUsed && !trialExpired && !licenseExpired && (
              <div style={{ width: '100%', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <div style={{ fontSize: '10px', color: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold' }}>— OR —</div>
                <button 
                  className="license-btn trial-btn" 
                  onClick={handleStartTrial}
                >
                  Start 5-Day Free Trial
                </button>
              </div>
            )}
            
            <div className="license-hint" style={{ marginTop: '10px' }}>
              <a 
                href="https://overdesk.store" 
                target="_blank" 
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  color: '#38bdf8',
                  fontWeight: '700',
                  textDecoration: 'none',
                  fontSize: '12px'
                }}
              >
                🛒 Purchase License at overdesk.store →
              </a>
            </div>
          </div>
        ) : (
          <>
        {/* Automatic updates banner notifier */}
        <div className={`update-banner ${updateAvailable ? 'show' : ''}`} id="update-banner">
          <div className="update-banner-text">
            {updateError ? (
              <span style={{ color: '#f87171' }}>
                {typeof updateError === 'string' && (updateError.includes('404') || updateError.includes('github') || updateError.includes('http') || updateError.includes('releases/download'))
                  ? 'Update package file not found on GitHub release (404).'
                  : updateError}
              </span>
            ) : updateDownloaded ? (
              <>
                Update ready <span id="update-version">v{updateVersion}</span>
              </>
            ) : (
              <>
                Downloading update <span id="update-version">v{updateVersion}</span>
                {updateProgress !== null && ` (${updateProgress}%)`}
              </>
            )}
          </div>
          <button className="update-install-btn" id="update-install-btn" onClick={executeUpdateInstall}>
            {updateInstalling
              ? updateDownloaded
                ? 'Restarting...'
                : 'Installing when ready...'
              : updateDownloaded
              ? 'Restart & Install'
              : 'Install Update'}
          </button>
        </div>

        {/* Top Header Controls row */}
        <div className="top-bar" id="top-bar">
          {/* Left Theme toggle button */}
          <div
            className="theme-switch"
            id="theme-switch"
            onClick={() => {
              setIsLight(!isLight);
              localStorage.setItem('fm_theme', !isLight ? '1' : '0');
            }}
          >
            <div
              className="theme-switch-knob"
              id="theme-knob"
              style={{
                transform: isLight ? 'translateX(18px)' : 'translateX(0px)',
              }}
            >
              {isLight ? (
                // Moon Icon
                <svg id="theme-icon" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                // Sun Icon
                <svg id="theme-icon" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </div>
          </div>

          {/* Center Minimize Pill */}
          <div
            className="minimize-bar"
            onClick={() => {
              const nextMinimized = !minimized;
              setMinimized(nextMinimized);
              if (nextMinimized) {
                if (editMode) setEditMode(false);
                if (settingsOpen) setSettingsOpen(false);
                if (pickerOpen) setPickerOpen(false);
              }
            }}
          >
            <div className="minimize-pill"></div>
          </div>

          {/* Right toggle configurations */}
          <div className="top-bar-right">
          {activeApp === 'checklist' && (
            <>
              <button
                onClick={() => {
                  if (minimized) setMinimized(false);
                  setActiveApp('calendar');
                }}
                style={{
                  background: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: isLight ? '#4f46e5' : '#818cf8',
                  transition: 'all 0.15s ease-in-out',
                  padding: 0,
                  margin: 0,
                }}
                title="Switch to FX Economic Calendar"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.0" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6H8a5 5 0 0 0-5 5v2a5 5 0 0 0 5 5h4" />
                  <line x1="7" y1="12" x2="21" y2="12" />
                  <polyline points="16 7 21 12 16 17" />
                </svg>
              </button>

              <button className="close-btn" id="close-btn" onClick={triggerAppShutdown} title="Shutdown App">
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <button
                className={`edit-toggle ${(minimized ? isEditingReminder : editMode) ? 'on' : ''}`}
                id="edit-toggle"
                onClick={() => {
                  if (minimized) {
                    if (isEditingReminder) {
                      setIsEditingReminder(false);
                    } else {
                      setTempReminderText(reminderText);
                      setIsEditingReminder(true);
                    }
                  } else {
                    setEditMode(!editMode);
                    setSettingsOpen(false);
                    setEditingTitle(false);
                    setEditingItemIdx(null);
                  }
                }}
                title={minimized ? (isEditingReminder ? "Close Reminder Editor" : "Edit Reminder") : "Edit List Configurations"}
              >
                {editMode ? (
                  <svg viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                )}
              </button>
            </>
          )}

          {activeApp === 'calendar' && (
            <>
              <button
                onClick={() => setActiveApp('checklist')}
                style={{
                  background: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: isLight ? '#1a1a2e' : '#ffffff',
                  transition: 'all 0.15s ease-in-out',
                  padding: 0,
                  margin: 0,
                }}
                title="Switch back to Checklist"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.0" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6h4a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5h-4" />
                  <line x1="17" y1="12" x2="3" y2="12" />
                  <polyline points="8 7 3 12 8 17" />
                </svg>
              </button>

              <button
                onClick={() => setCalendarSettingsOpen(!calendarSettingsOpen)}
                style={{
                  background: calendarSettingsOpen 
                    ? (isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.22)') 
                    : (isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)'),
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: calendarSettingsOpen ? '#0082ff' : (isLight ? '#1a1a2e' : '#ffffff'),
                  transition: 'all 0.15s ease-in-out',
                  padding: 0,
                  margin: 0,
                }}
                title={calendarSettingsOpen ? "Close Simulator Panel" : "Open Simulator & Advanced Settings"}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{
                  transform: calendarSettingsOpen ? 'scale(1.08)' : 'none',
                  transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}>
                  <line x1="4" y1="21" x2="4" y2="14" fill="none"></line>
                  <line x1="4" y1="10" x2="4" y2="3" fill="none"></line>
                  <line x1="12" y1="21" x2="12" y2="12" fill="none"></line>
                  <line x1="12" y1="8" x2="12" y2="3" fill="none"></line>
                  <line x1="20" y1="21" x2="20" y2="16" fill="none"></line>
                  <line x1="20" y1="12" x2="20" y2="3" fill="none"></line>
                  <line x1="2" y1="14" x2="6" y2="14" fill="none"></line>
                  <line x1="10" y1="8" x2="14" y2="8" fill="none"></line>
                  <line x1="18" y1="16" x2="22" y2="16" fill="none"></line>
                </svg>
              </button>

              <button className="close-btn" id="close-btn" onClick={triggerAppShutdown} title="Shutdown App">
                <svg viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </>
          )}
        </div>
        </div>
        <div style={{ display: activeApp === 'checklist' ? 'contents' : 'none' }}>


        {/* Render Minimized Reminder View when minimized, or full Checklist View when expanded */}
        {minimized ? (
          <MinimizedReminderView
            reminderText={reminderText}
            isEditingReminder={isEditingReminder}
            tempReminderText={tempReminderText}
            isLight={isLight}
            accentSoft={modes[currentMode]?.soft}
            animateText={animateMinimizedText}
            extraHeight={minimizedExtraHeight}
            setTempReminderText={setTempReminderText}
            setIsEditingReminder={setIsEditingReminder}
            handleSaveReminder={handleSaveReminder}
            getReminderFontSize={getReminderFontSize}
          />
        ) : (
          <>
            {/* Tab mode selection icons row */}
            <div
              className="icons"
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                alignItems: 'center',
                marginBottom: '16px',
                flexShrink: 0,
                width: '100%',
                position: 'relative',
                zIndex: 5,
                padding: 0,
                margin: 0,
              }}
            >
              {Object.keys(modes).map((mKey, mIdx) => {
                const hasLiquidFill = selections[mKey]?.length > 0;
                const isSelected = mKey === currentMode;
                const waveParams = compileLiquidWaveData(mKey);
                const modeAccent = modes[mKey]?.accent || 'var(--accent)';

                let translateX = 0;
                let isBeingDragged = false;

                if (modeDragState) {
                  if (modeDragState.activeKey === mKey) {
                    isBeingDragged = true;
                    translateX = modeDragState.currentX - modeDragState.startX;
                  } else {
                    const from = modeDragState.fromIdx;
                    const current = modeDragState.currentIdx;
                    if (mIdx > from && mIdx <= current) {
                      translateX = -58;
                    } else if (mIdx < from && mIdx >= current) {
                      translateX = 58;
                    }
                  }
                }

                return (
                  <div
                    key={mKey}
                    className={`icon-wrap ${completedSplashMode === mKey ? 'splash-active' : ''} ${isSelected ? 'active-mode' : 'inactive-mode'}`}
                    style={{
                      '--splash-color': modeAccent,
                      position: 'relative',
                      zIndex: isBeingDragged ? 20 : (isSelected ? 6 : 5),
                      cursor: editMode ? 'grab' : 'pointer',
                      opacity: 1,
                      transform: `translateX(${translateX}px)`,
                      transition: isBeingDragged ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0, 0, 1)',
                      userSelect: 'none',
                      touchAction: 'none',
                    } as React.CSSProperties}
                    onPointerDown={(e) => handleModePointerDown(e, mKey, mIdx)}
                  >
                    {/* Re-order Mode Drag Handle in Edit Mode (Grip Dots Only) */}
                    {editMode && (
                      <div
                        className="mode-drag-handle"
                        title="Drag to reorder mode"
                        style={{
                          position: 'absolute',
                          top: '-11px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(15, 23, 42, 0.96)',
                          backdropFilter: 'blur(8px)',
                          borderRadius: '999px',
                          padding: '3px 7px',
                          zIndex: 12,
                          border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.25)'),
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          color: isLight ? '#0f172a' : '#ffffff',
                          cursor: 'grab',
                          userSelect: 'none',
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                          <circle cx="9" cy="6" r="1.5" />
                          <circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" />
                          <circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" />
                          <circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </div>
                    )}
                    <Glass
                      isLight={isLight}
                      className="mode-icon-glass"
                      borderRadius={25}
                      width={50}
                      height={50}
                      variant={isSelected ? "default" : "subtle"}
                      backgroundOpacity={isSelected ? (isLight ? 0.35 : 0.18) : (isLight ? 0.15 : 0.08)}
                      style={{
                        borderRadius: '50%',
                        transform: 'scale(1.0)',
                        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
                        boxShadow: isSelected 
                          ? `0 0 0 2px ${modeAccent}` 
                          : '0 0 0 0px transparent',
                        position: 'relative',
                      }}
                    >
                      {hasLiquidFill && (
                        <div className="liquid-container">
                          <svg viewBox="0 0 50 50">
                            <defs>
                              <clipPath id={`lc-clip-${mKey}`}>
                                <circle cx="25" cy="25" r="24.5" />
                              </clipPath>
                              <linearGradient id={`lc-grad-${mKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={waveParams.gradientHigh} />
                                <stop offset="100%" stopColor={waveParams.baseColor} />
                              </linearGradient>
                            </defs>
                            <g clipPath={`url(#lc-clip-${mKey})`}>
                              {/* Underlay color rectangle */}
                              <rect x="-15" y={waveParams.waterY} width="80" height={52 - waveParams.waterY} fill={waveParams.baseColor} />
                              {/* Floating wave overlay using CSS math slosh animation */}
                              <g style={{ animation: 'liquidBob 3.2s ease-in-out infinite' }}>
                                <path
                                  style={{
                                    animation: 'liquidSlosh 3.8s ease-in-out infinite',
                                    transformOrigin: 'center center',
                                  }}
                                  d={waveParams.wavePath}
                                  fill={`url(#lc-grad-${mKey})`}
                                />
                              </g>
                            </g>
                          </svg>
                        </div>
                      )}
                      {completedSplashMode === mKey && (
                        <div className="icon-splash-droplets">
                          <span className="i-drop d1" style={{ backgroundColor: waveParams.gradientHigh }} />
                          <span className="i-drop d2" style={{ backgroundColor: '#ffffff' }} />
                          <span className="i-drop d3" style={{ backgroundColor: waveParams.gradientHigh }} />
                          <span className="i-drop d4" style={{ backgroundColor: '#ffffff' }} />
                          <span className="i-drop d5" style={{ backgroundColor: waveParams.gradientHigh }} />
                        </div>
                      )}
                      <button
                        className={`icon-btn ${isSelected ? 'active' : ''} ${hasLiquidFill ? 'has-liquid' : ''}`}
                        data-mode={mKey}
                        onClick={() => {
                          if (!isDraggingModeRef.current) {
                            handleModeIconClick(mKey);
                          }
                        }}
                        style={{
                          backgroundColor: !hasLiquidFill
                            ? (isSelected ? (modes[mKey]?.accent || 'var(--accent)') : 'transparent')
                            : 'transparent',
                          border: 'none',
                          boxShadow: 'none',
                          width: '100%',
                          height: '100%',
                          transform: 'none',
                        }}
                      >
                        {renderIcon(iconAssignments[mKey])}
                      </button>
                    </Glass>
                  </div>
                );
              })}
            </div>

        {/* Tab Mode configuration Picker overlay */}
        {pickerOpen && pickerTargetMode && (
          <div className={`icon-picker open`} id="icon-picker">
            <div className="picker-header">
              <span className="picker-title">Config Mode</span>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button
                  className="picker-done"
                  onClick={() => {
                    setPickerOpen(false);
                    setPickerTargetMode(null);
                  }}
                  title="Done"
                >
                  <svg viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Done
                </button>
                <button
                  className="picker-close"
                  onClick={() => {
                    setPickerOpen(false);
                    setPickerTargetMode(null);
                  }}
                >
                  <svg viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Accent selection row */}
            <div className="color-row">
              {/* Reset to base accent button */}
              <div
                className="color-swatch color-reset"
                title="Reset default color"
                style={{ background: DEFAULT_MODES[pickerTargetMode]?.accent }}
                onClick={() => resetModeColorToDefault(pickerTargetMode)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
                </svg>
              </div>

              {/* presets */}
              {COLOR_PRESETS.map((colorObj, idx) => (
                <div
                  className={`color-swatch ${modes[pickerTargetMode]?.accent === colorObj.accent ? 'active' : ''}`}
                  key={idx}
                  style={{ background: colorObj.accent }}
                  onClick={() => assignModeColor(pickerTargetMode, colorObj.accent, colorObj.soft)}
                ></div>
              ))}

              {/* Custom input color element */}
              <div className="color-custom-wrap" title="Custom hex color">
                <svg viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <input
                  className="color-custom-input"
                  type="color"
                  defaultValue="#6e00d2"
                  onChange={(e) => {
                    const parsed = hexToAccent(e.target.value);
                    assignModeColor(pickerTargetMode, parsed.accent, parsed.soft);
                  }}
                />
              </div>
            </div>

            {/* Hidden File Input for Custom SVG / PNG Upload */}
            <input
              type="file"
              ref={iconFileInputRef}
              accept=".svg, .png, .jpg, .jpeg, .webp, image/svg+xml, image/png"
              onChange={handleCustomIconUpload}
              style={{ display: 'none' }}
            />

            {/* Icon grid options list selector */}
            <div className="picker-grid">
              {/* Custom Icon Upload Tile */}
              <div
                className="picker-item picker-upload"
                title="Upload custom SVG or PNG icon file"
                onClick={(e) => {
                  triggerGooeyParticles(e.currentTarget, modes[pickerTargetMode]?.accent);
                  iconFileInputRef.current?.click();
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Upload SVG/PNG</span>
              </div>

              {/* Custom uploaded icons */}
              {Object.entries(customIcons).map(([cKey, cDef]) => {
                const item = cDef as { label: string; src: string; format: string };
                return (
                  <div
                    className={`picker-item custom-picker-item ${iconAssignments[pickerTargetMode] === cKey ? 'current' : ''}`}
                    key={cKey}
                    onClick={(e) => {
                      triggerGooeyParticles(e.currentTarget, modes[pickerTargetMode]?.accent);
                      assignModeIcon(pickerTargetMode, cKey);
                    }}
                    style={{ position: 'relative' }}
                  >
                    <button
                      className="picker-item-delete"
                      title="Delete custom icon"
                      onClick={(e) => deleteCustomIcon(e, cKey)}
                    >
                      ×
                    </button>
                    {renderIcon(cKey)}
                    <span>{item.label}</span>
                  </div>
                );
              })}

              {/* Built-in icons */}
              {Object.entries(ICON_LIBRARY).map(([libKey, def]) => (
                <div
                  className={`picker-item ${iconAssignments[pickerTargetMode] === libKey ? 'current' : ''}`}
                  key={libKey}
                  onClick={(e) => {
                    triggerGooeyParticles(e.currentTarget, modes[pickerTargetMode]?.accent);
                    assignModeIcon(pickerTargetMode, libKey);
                  }}
                >
                  {def.svg}
                  <span>{def.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Global Settings Panel overlay */}
        {settingsOpen && (
          <div
            className="icon-picker open"
            id="settings-panel"
          >
            <div className="picker-header" style={{ flexDirection: 'column', alignItems: 'center', marginBottom: '4px', gap: '4px', cursor: 'grab' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <button
                  className="picker-done"
                  onClick={() => setSettingsOpen(false)}
                  title="Done"
                  style={{ display: 'flex', alignItems: 'center' }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <svg viewBox="0 0 24 24" style={{ width: '13px', height: '13px', marginRight: '4px' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Done
                </button>
              </div>
              <span className="picker-title" style={{ textAlign: 'center', fontSize: '11px', letterSpacing: '0.14em', fontWeight: 700 }}>Settings</span>
            </div>

            <div
              className="settings-body"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '6px 4px 16px', flex: 1, minHeight: 0 }}
            >
              {/* License Status Section (Only shown when activated) */}
              {!isTrial && (
                <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--divider)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>
                      License Status
                    </span>
                    <span style={{ fontSize: '9.5px', fontWeight: '700', color: activePlanType === 'annual' ? '#38bdf8' : '#00e676', background: activePlanType === 'annual' ? 'rgba(56,189,248,0.14)' : 'rgba(0,230,118,0.14)', padding: '2px 7px', borderRadius: '999px', border: activePlanType === 'annual' ? '1px solid rgba(56,189,248,0.35)' : '1px solid rgba(0,230,118,0.3)' }}>
                      {activePlanType === 'annual' ? '📅 ANNUAL PLAN' : '✓ LIFETIME UNLOCKED'}
                    </span>
                  </div>

                  <div style={{ background: isLight ? (activePlanType === 'annual' ? 'rgba(56,189,248,0.06)' : 'rgba(0,230,118,0.06)') : (activePlanType === 'annual' ? 'rgba(56,189,248,0.08)' : 'rgba(0,230,118,0.08)'), borderRadius: '12px', padding: '10px 12px', border: '1px solid ' + (isLight ? (activePlanType === 'annual' ? 'rgba(56,189,248,0.25)' : 'rgba(0,230,118,0.2)') : (activePlanType === 'annual' ? 'rgba(56,189,248,0.3)' : 'rgba(0,230,118,0.25)')), display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: activePlanType === 'annual' ? 'rgba(56,189,248,0.2)' : 'rgba(0,230,118,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: activePlanType === 'annual' ? '#38bdf8' : '#00e676', fontWeight: 'bold', fontSize: '13px' }}>
                      {activePlanType === 'annual' ? '📅' : '✓'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: isLight ? '#0f172a' : '#ffffff' }}>
                        Overdesk Nexus Pro ({activePlanType === 'annual' ? 'Annual Subscription' : 'Lifetime Plan'})
                      </span>
                      <span style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }}>
                        {activePlanType === 'annual' ? 'Active 1-Year subscription. Trial sticker permanently hidden.' : 'Lifetime access active. Trial sticker permanently hidden.'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Window Scale</span>
                <GooeyNav
                  items={[
                    { label: 'x2', onClick: () => handleScaleChange(2) },
                    { label: 'x1.5', onClick: () => handleScaleChange(1.5) },
                    { label: 'x1.2', onClick: () => handleScaleChange(1.2) },
                    { label: 'x1', onClick: () => handleScaleChange(1) },
                    { label: 'x0.7', onClick: () => handleScaleChange(0.7) },
                    { label: 'x0.5', onClick: () => handleScaleChange(0.5) },
                  ]}
                  activeIndex={[2, 1.5, 1.2, 1, 0.7, 0.5].findIndex((v) => Math.abs(scale - v) < 0.01)}
                  particleCount={12}
                  animationTime={450}
                />
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Countdown Display</span>
                <GooeyNav
                  items={[
                    { label: 'Shown', onClick: () => handleShowCountdownChange(true) },
                    { label: 'Hidden', onClick: () => handleShowCountdownChange(false) },
                  ]}
                  activeIndex={showCountdown ? 0 : 1}
                  particleCount={12}
                  animationTime={450}
                />
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Completion Alarm</span>
                <GooeyNav
                  items={[
                    { label: 'Alarm On', onClick: () => handleAlarmEnabledChange(true) },
                    { label: 'Alarm Off', onClick: () => handleAlarmEnabledChange(false) },
                  ]}
                  activeIndex={alarmEnabled ? 0 : 1}
                  particleCount={12}
                  animationTime={450}
                />
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>App Animations</span>
                <GooeyNav
                  items={[
                    { label: 'Enabled', onClick: () => handleAnimationsEnabledChange(true) },
                    { label: 'Disabled', onClick: () => handleAnimationsEnabledChange(false) },
                  ]}
                  activeIndex={animationsEnabled ? 0 : 1}
                  particleCount={animationsEnabled ? 12 : 0}
                  animationTime={450}
                />
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Move Checked to Bottom</span>
                <GooeyNav
                  items={[
                    { label: 'Enabled', onClick: () => handleMoveCheckedToBottomChange(true) },
                    { label: 'Disabled', onClick: () => handleMoveCheckedToBottomChange(false) },
                  ]}
                  activeIndex={moveCheckedToBottom ? 0 : 1}
                  particleCount={12}
                  animationTime={450}
                />
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Auto-reset Daily</span>
                <GooeyNav
                  items={[
                    { label: 'Enabled', onClick: () => handleAutoResetDailyChange(true) },
                    { label: 'Disabled', onClick: () => handleAutoResetDailyChange(false) },
                  ]}
                  activeIndex={autoResetDaily ? 0 : 1}
                  particleCount={12}
                  animationTime={450}
                />
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>Minimized Text Animation</span>
                <GooeyNav
                  items={[
                    { label: 'Animated', onClick: () => handleAnimateMinimizedTextChange(true) },
                    { label: 'Static', onClick: () => handleAnimateMinimizedTextChange(false) },
                  ]}
                  activeIndex={animateMinimizedText ? 0 : 1}
                  particleCount={12}
                  animationTime={450}
                />
              </div>

              {/* Wallpaper Background Settings */}
              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>
                    Wallpaper Background
                  </span>
                  {wallpaperUrl && (
                    <button
                      onClick={() => handleWallpaperUrlChange('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ff5252',
                        fontSize: '10px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      title="Remove background wallpaper"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Wallpaper Gallery (Presets + Custom Uploads) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', width: '100%', maxHeight: '120px', overflowY: 'auto', paddingRight: '2px' }}>
                  {(() => {
                    const galleryWallpapers = [
                      ...PRESET_WALLPAPERS.map((wp) => ({ ...wp, isCustom: false })),
                      ...customWallpapers.map((url, idx) => ({
                        id: `custom_wp_${idx}`,
                        name: `Uploaded ${idx + 1}`,
                        url,
                        isCustom: true,
                      })),
                    ];

                    if (wallpaperUrl && !galleryWallpapers.some((wp) => wp.url === wallpaperUrl)) {
                      galleryWallpapers.push({
                        id: 'active_custom_wp',
                        name: 'Uploaded',
                        url: wallpaperUrl,
                        isCustom: true,
                      });
                    }

                    return galleryWallpapers.map((wp) => {
                      const isSelected = wallpaperUrl === wp.url;
                      return (
                        <div key={wp.id} style={{ position: 'relative' }}>
                          <button
                            onClick={() => handleWallpaperUrlChange(wp.url)}
                            style={{
                              position: 'relative',
                              width: '100%',
                              height: '52px',
                              borderRadius: '10px',
                              overflow: 'hidden',
                              border: isSelected ? '2px solid var(--accent)' : '1px solid ' + (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)'),
                              padding: 0,
                              cursor: 'pointer',
                              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                              boxShadow: isSelected ? '0 0 12px ' + (modes[currentMode]?.soft || 'rgba(0,180,255,0.4)') : 'none',
                              display: 'block',
                            }}
                            title={wp.name}
                          >
                            {isVideoUrl(wp.url) ? (
                              <video
                                src={wp.url}
                                autoPlay
                                loop
                                muted
                                playsInline
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <img
                                src={wp.url}
                                alt={wp.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                referrerPolicy="no-referrer"
                              />
                            )}
                            {isVideoUrl(wp.url) && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '3px',
                                  left: '3px',
                                  background: 'rgba(0,0,0,0.75)',
                                  borderRadius: '4px',
                                  padding: '1px 4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  zIndex: 5,
                                }}
                                title="Video Wallpaper"
                              >
                                <svg viewBox="0 0 24 24" width="7" height="7" fill="#fff">
                                  <polygon points="5,3 19,12 5,21" />
                                </svg>
                                <span style={{ fontSize: '6px', color: '#fff', fontWeight: 'bold', letterSpacing: '0.04em' }}>VID</span>
                              </div>
                            )}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 70%)',
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'center',
                                padding: '2px 3px',
                              }}
                            >
                              <span style={{ fontSize: '7.5px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                {wp.name}
                              </span>
                            </div>
                          </button>

                          {wp.isCustom && (
                            <button
                              onClick={(e) => handleDeleteCustomWallpaper(e, wp.url)}
                              style={{
                                position: 'absolute',
                                top: '2px',
                                right: '2px',
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: 'rgba(235, 45, 45, 0.88)',
                                color: '#fff',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                lineHeight: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 10,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                              }}
                              title="Remove uploaded wallpaper"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Custom Wallpaper Upload Button */}
                <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                  <button
                    onClick={() => wallpaperFileInputRef.current?.click()}
                    style={{
                      flex: 1,
                      padding: '7px 8px',
                      borderRadius: '10px',
                      background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                      border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'),
                      color: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)',
                      fontWeight: '600',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    title="Upload custom wallpaper image or video file (Max 3MB)"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Upload Image/Video (≤3MB)
                  </button>
                  <input
                    ref={wallpaperFileInputRef}
                    type="file"
                    accept="image/*,video/*,.mp4,.webm,.ogg,.mov,.m4v,.mkv,.avi"
                    style={{ display: 'none' }}
                    onChange={handleCustomWallpaperUpload}
                  />
                </div>

                {/* Wallpaper Opacity Slider */}
                {wallpaperUrl && (
                  <div
                    className="no-drag wallpaper-opacity-slider"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px', background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)', padding: '8px 10px', borderRadius: '10px', border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)') }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                        Wallpaper Opacity
                      </span>
                      <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--accent)' }}>
                        {wallpaperOpacity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      className="no-drag"
                      min="1"
                      max="100"
                      value={wallpaperOpacity}
                      onChange={(e) => handleWallpaperOpacityChange(parseInt(e.target.value, 10))}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        accentColor: 'var(--accent)',
                        cursor: 'pointer',
                        height: '4px',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>
                  Checklist Data & Template
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                    <button
                      onClick={handleExportChecklist}
                      style={{
                        flex: 1,
                        padding: '6px 2px',
                        borderRadius: '10px',
                        background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                        border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'),
                        color: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)',
                        fontWeight: '600',
                        fontSize: '10.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      title="Export current checklist as .txt file"
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      Export .TXT
                    </button>

                    <button
                      onClick={generateChecklistTemplate}
                      style={{
                        flex: 1,
                        padding: '6px 2px',
                        borderRadius: '10px',
                        background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                        border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'),
                        color: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.9)',
                        fontWeight: '600',
                        fontSize: '10.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      title="Download editable .txt template"
                    >
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="12" y1="18" x2="12" y2="12" />
                        <polyline points="9 15 12 18 15 15" />
                      </svg>
                      Template .TXT
                    </button>
                  </div>

                  <button
                    onClick={() => importFileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      padding: '7px 2px',
                      borderRadius: '10px',
                      background: 'var(--accent)',
                      border: '1px solid var(--accent)',
                      color: '#fff',
                      fontWeight: '600',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    title="Upload and import checklist .txt file"
                  >
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Import Checklist (.txt)
                  </button>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".txt,.json,text/plain,application/json"
                    style={{ display: 'none' }}
                    onChange={handleImportChecklistFile}
                  />

                  {importStatus && (
                    <div
                      style={{
                        fontSize: '9.5px',
                        fontWeight: '600',
                        textAlign: 'center',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        color: importStatus.type === 'success' ? '#00e676' : '#ff5252',
                        background: importStatus.type === 'success' ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255, 82, 82, 0.12)',
                        border: '1px solid ' + (importStatus.type === 'success' ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255, 82, 82, 0.25)'),
                      }}
                    >
                      {importStatus.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Reset App Section */}
              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>
                  Reset App & Local Data
                </span>
                <button
                  onClick={handleResetAppClick}
                  onDoubleClick={handleResetAppDoubleClick}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    background: resetConfirming ? 'rgba(255, 50, 50, 0.22)' : (isLight ? 'rgba(255, 50, 50, 0.08)' : 'rgba(255, 70, 70, 0.12)'),
                    border: '1px solid ' + (resetConfirming ? 'rgba(255, 50, 50, 0.8)' : 'rgba(255, 70, 70, 0.3)'),
                    color: resetConfirming ? '#ff3333' : '#ff5252',
                    fontWeight: '700',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  title="Double click to reset all app settings and data back to factory defaults"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  {resetConfirming ? '⚠️ Click again or Double-Click to Reset' : 'Double-Click to Reset App'}
                </button>
              </div>

              {/* Software Update Section */}
              <div className="setting-section" style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--divider)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="setting-label" style={{ fontSize: '9.5px', color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', textAlign: 'left' }}>
                    Software Update
                  </span>
                  <span style={{ fontSize: '9.5px', fontWeight: '700', color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.65)' }}>
                    v1.2.9
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (window.electronAPI?.checkForUpdates) {
                      setCheckingUpdate(true);
                      setUpdateStatusText('Checking for updates...');
                      window.electronAPI.checkForUpdates();
                    } else {
                      setCheckingUpdate(true);
                      setUpdateStatusText('Checking for updates...');
                      setTimeout(() => {
                        setCheckingUpdate(false);
                        setUpdateStatusText('You are running the latest version (v1.2.9)');
                        setTimeout(() => setUpdateStatusText(''), 4000);
                      }, 1000);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '7px 12px',
                    borderRadius: '10px',
                    background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)',
                    border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.15)'),
                    color: isLight ? '#0f172a' : '#ffffff',
                    fontWeight: '600',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  title="Check GitHub Releases for app updates"
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: checkingUpdate ? 'spin 1s linear infinite' : 'none' }}>
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                  {checkingUpdate ? 'Checking for Updates...' : 'Check for Updates'}
                </button>

                {updateStatusText && (
                  <div style={{ fontSize: '9.5px', fontWeight: '600', textAlign: 'center', color: updateError ? '#ff5252' : (updateAvailable ? '#00e676' : (isLight ? '#0284c7' : '#38bdf8')), padding: '2px 4px' }}>
                    {updateStatusText}
                  </div>
                )}
              </div>

              {/* Version Footer */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--divider)', opacity: 0.5, fontSize: '9px', fontWeight: '600', color: isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)' }}>
                Overdesk Nexus v1.2.9
              </div>
            </div>
          </div>
        )}

        {/* Text Header Mode Descriptions */}
        <div className="mode-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <p className="mode-label" style={{ margin: 0 }}>Mode</p>
            <button
              className={`settings-toggle ${settingsOpen ? 'on' : ''}`}
              id="settings-toggle"
              onClick={() => {
                if (minimized) setMinimized(false);
                setSettingsOpen(!settingsOpen);
                setPickerOpen(false);
                setEditMode(false);
              }}
              title="Checklist Settings"
              style={{
                background: settingsOpen
                  ? (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)')
                  : 'transparent',
                border: 'none',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                padding: 0,
                margin: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: settingsOpen
                  ? (isLight ? '#0284c7' : '#38bdf8')
                  : (isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'),
                transition: 'all 0.15s ease-in-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = isLight ? '#0284c7' : '#38bdf8';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = settingsOpen
                  ? (isLight ? '#0284c7' : '#38bdf8')
                  : (isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)');
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
          {showCountdown && (
            isEditingTimer ? (
              <div
                className="countdown-timer-edit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
                  background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  border: 'none',
                  userSelect: 'none',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  maxLength={2}
                  value={editHH}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setEditHH(val);
                  }}
                  onBlur={() => {
                    setEditHH((prev) => prev.padStart(2, '0'));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const finalH = parseInt(editHH, 10) || 0;
                      const finalM = parseInt(editMM, 10) || 0;
                      const finalS = parseInt(editSS, 10) || 0;
                      const totalSecs = (finalH * 3600) + (finalM * 60) + finalS;
                      if (totalSecs > 0) {
                        setCountdownDuration(totalSecs);
                        setCountdownTimeLeft(totalSecs);
                        localStorage.setItem('fm_countdown_duration', String(totalSecs));
                      }
                      setIsEditingTimer(false);
                    }
                  }}
                  style={{
                    width: '22px',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: 0,
                    textAlign: 'center',
                    outline: 'none',
                    margin: 0,
                  }}
                  title="Hours"
                  onFocus={(e) => e.target.select()}
                />
                <span style={{ opacity: 0.5 }}>:</span>
                <input
                  type="text"
                  maxLength={2}
                  value={editMM}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setEditMM(val);
                  }}
                  onBlur={() => {
                    setEditMM((prev) => prev.padStart(2, '0'));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const finalH = parseInt(editHH, 10) || 0;
                      const finalM = parseInt(editMM, 10) || 0;
                      const finalS = parseInt(editSS, 10) || 0;
                      const totalSecs = (finalH * 3600) + (finalM * 60) + finalS;
                      if (totalSecs > 0) {
                        setCountdownDuration(totalSecs);
                        setCountdownTimeLeft(totalSecs);
                        localStorage.setItem('fm_countdown_duration', String(totalSecs));
                      }
                      setIsEditingTimer(false);
                    }
                  }}
                  style={{
                    width: '22px',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: 0,
                    textAlign: 'center',
                    outline: 'none',
                    margin: 0,
                  }}
                  title="Minutes"
                  onFocus={(e) => e.target.select()}
                />
                <span style={{ opacity: 0.5 }}>:</span>
                <input
                  type="text"
                  maxLength={2}
                  value={editSS}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
                    setEditSS(val);
                  }}
                  onBlur={() => {
                    setEditSS((prev) => prev.padStart(2, '0'));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const finalH = parseInt(editHH, 10) || 0;
                      const finalM = parseInt(editMM, 10) || 0;
                      const finalS = parseInt(editSS, 10) || 0;
                      const totalSecs = (finalH * 3600) + (finalM * 60) + finalS;
                      if (totalSecs > 0) {
                        setCountdownDuration(totalSecs);
                        setCountdownTimeLeft(totalSecs);
                        localStorage.setItem('fm_countdown_duration', String(totalSecs));
                      }
                      setIsEditingTimer(false);
                    }
                  }}
                  style={{
                    width: '22px',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: 0,
                    textAlign: 'center',
                    outline: 'none',
                    margin: 0,
                  }}
                  title="Seconds"
                  onFocus={(e) => e.target.select()}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px', borderLeft: '1px solid ' + (isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)'), paddingLeft: '6px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const finalH = parseInt(editHH, 10) || 0;
                      const finalM = parseInt(editMM, 10) || 0;
                      const finalS = parseInt(editSS, 10) || 0;
                      const totalSecs = (finalH * 3600) + (finalM * 60) + finalS;
                      if (totalSecs > 0) {
                        setCountdownDuration(totalSecs);
                        setCountdownTimeLeft(totalSecs);
                        localStorage.setItem('fm_countdown_duration', String(totalSecs));
                      }
                      setIsEditingTimer(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isLight ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)',
                      opacity: 0.9,
                      transition: 'opacity 0.15s',
                    }}
                    title="Save"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingTimer(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isLight ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.45)',
                      opacity: 0.8,
                      transition: 'opacity 0.15s',
                    }}
                    title="Cancel"
                  >
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`countdown-timer ${isTimerRunning ? 'running' : 'paused'}`}
                id="countdown-timer-widget"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: isLight ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)',
                  background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  border: 'none',
                  userSelect: 'none',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                  cursor: 'pointer',
                }}
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                title={isTimerRunning ? "Pause timer" : "Start timer"}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono), monospace',
                    letterSpacing: '0.04em',
                  }}
                >
                  {formatTime(countdownTimeLeft)}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTimerRunning(!isTimerRunning);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'inherit',
                      opacity: 0.8,
                      transition: 'opacity 0.15s',
                    }}
                    title={isTimerRunning ? "Pause Timer" : "Start Timer"}
                  >
                    {isTimerRunning ? (
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                        <rect x="5" y="4" width="4" height="16" rx="1" />
                        <rect x="15" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTimerRunning(false);
                      setCountdownTimeLeft(countdownDuration);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'inherit',
                      opacity: 0.5,
                      transition: 'opacity 0.15s',
                    }}
                    title="Reset Timer"
                  >
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTimerRunning(false);
                      const h = Math.floor(countdownDuration / 3600);
                      const m = Math.floor((countdownDuration % 3600) / 60);
                      const s = countdownDuration % 60;
                      setEditHH(String(h).padStart(2, '0'));
                      setEditMM(String(m).padStart(2, '0'));
                      setEditSS(String(s).padStart(2, '0'));
                      setIsEditingTimer(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'inherit',
                      opacity: 0.5,
                      transition: 'opacity 0.15s',
                    }}
                    title="Edit Duration"
                  >
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          )}
        </div>
        <div className="title-wrap">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              className="title-input"
              style={{
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: titleInputValue.length > 22 ? '18px' : titleInputValue.length > 15 ? '21px' : '25px',
                width: '100%',
                flex: 1,
                minWidth: 0,
                boxSizing: 'border-box',
              }}
              type="text"
              value={titleInputValue}
              onChange={(e) => setTitleInputValue(e.target.value)}
              onBlur={commitTitleEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitleEditing();
              }}
            />
          ) : (
            <div className={`title-container-editable ${editMode ? 'can-edit' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
              {(() => {
                const titleStr = modes[currentMode]?.title || 'Precision';
                const dynamicFontSize = titleStr.length > 22 ? '18px' : titleStr.length > 15 ? '21px' : '25px';
                return (
                  <h1
                    className={`title ${editMode ? 'editable' : ''}`}
                    id="mode-title"
                    onClick={startEditingTitle}
                    onMouseDown={(e) => {
                      if (editMode) {
                        e.stopPropagation();
                        startEditingTitle();
                      }
                    }}
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                      lineHeight: '1.2',
                      paddingBottom: '2px',
                      display: 'block',
                      fontSize: dynamicFontSize,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {titleStr}
                  </h1>
                );
              })()}
              {editMode && (
                <button
                  className="edit-title-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditingTitle();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startEditingTitle();
                  }}
                  title="Rename Mode"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.6,
                    color: 'var(--text)',
                    transition: 'opacity 0.2s',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              )}
            </div>
          )}
          <span className="mode-counter" id="mode-counter">
            {totalModeChecked}/{totalModeOptions}
          </span>
        </div>

        <div className="divider"></div>

        {/* Dynamic Items list area */}
        <div className="card-body">
          {(() => {
            const activeScrollAreaHeight = 176 + expandedExtraHeight;

            return (
              <div
                className={`scroll-area ${isChecklistScrolling ? 'is-scrolling' : ''}`}
                onScroll={handleChecklistScroll}
                ref={checklistScrollRef}
                style={{
                  height: `${activeScrollAreaHeight}px`,
                  maxHeight: `${activeScrollAreaHeight}px`,
                }}
              >
                <ul className="options" id="options-list">
              {modes[currentMode]?.options.map((itemText, optionIdx) => {
                const isItemChecked = (selections[currentMode] || []).includes(optionIdx);
                const isEditingItem = editingItemIdx === optionIdx;
                const totalOptionsCount = modes[currentMode]?.options.length || 0;

                return (
                  <li
                    className={`option ${isItemChecked ? 'selected' : ''} ${draggedOptionIdx === optionIdx ? 'dragging-option' : ''}`}
                    key={optionIdx}
                    onClick={() => handleOptionToggle(optionIdx)}
                    draggable={editMode}
                    onDragStart={(e) => {
                      if (!editMode) return;
                      setDraggedOptionIdx(optionIdx);
                      e.dataTransfer.setData('text/plain', String(optionIdx));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      if (!editMode) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      if (!editMode) return;
                      e.preventDefault();
                      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                      if (!isNaN(fromIdx) && fromIdx !== optionIdx) {
                        moveOption(fromIdx, optionIdx);
                      }
                      setDraggedOptionIdx(null);
                    }}
                    onDragEnd={() => setDraggedOptionIdx(null)}
                    style={{ cursor: editMode ? 'grab' : 'pointer' }}
                  >
                    {/* Drag handle icon in edit mode */}
                    {editMode && (
                      <span
                        className="drag-handle-icon"
                        title="Drag or use arrows to reorder item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          color: isLight ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)',
                          cursor: 'grab',
                          marginRight: '2px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                          <circle cx="9" cy="6" r="1.5" />
                          <circle cx="15" cy="6" r="1.5" />
                          <circle cx="9" cy="12" r="1.5" />
                          <circle cx="15" cy="12" r="1.5" />
                          <circle cx="9" cy="18" r="1.5" />
                          <circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </span>
                    )}

                    {/* Tick box checkbox circle */}
                    <span className="check-box">
                      <svg viewBox="0 0 16 16">
                        <polyline points="2,8 6,12 14,4" />
                      </svg>
                    </span>

                    {isEditingItem ? (
                      <input
                        ref={listInputRef}
                        className="opt-input"
                        style={{ display: 'block' }}
                        type="text"
                        value={editingItemValue}
                        onChange={(e) => setEditingItemValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => commitItemEditing(optionIdx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitItemEditing(optionIdx);
                        }}
                      />
                    ) : (
                      <span className="opt-text">{itemText}</span>
                    )}

                    {/* Action reorder & delete buttons in edit mode */}
                    {editMode && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          marginLeft: 'auto',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="reorder-item-btn"
                          disabled={optionIdx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveOption(optionIdx, optionIdx - 1);
                          }}
                          style={{
                            background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                            border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'),
                            color: isLight ? '#0f172a' : '#ffffff',
                            opacity: optionIdx === 0 ? 0.25 : 0.85,
                            cursor: optionIdx === 0 ? 'default' : 'pointer',
                            padding: '2px 5px',
                            borderRadius: '5px',
                            fontSize: '9px',
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Move item up"
                        >
                          ▲
                        </button>
                        <button
                          className="reorder-item-btn"
                          disabled={optionIdx === totalOptionsCount - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveOption(optionIdx, optionIdx + 1);
                          }}
                          style={{
                            background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                            border: '1px solid ' + (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)'),
                            color: isLight ? '#0f172a' : '#ffffff',
                            opacity: optionIdx === totalOptionsCount - 1 ? 0.25 : 0.85,
                            cursor: optionIdx === totalOptionsCount - 1 ? 'default' : 'pointer',
                            padding: '2px 5px',
                            borderRadius: '5px',
                            fontSize: '9px',
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Move item down"
                        >
                          ▼
                        </button>
                        <button className="del-btn animate-fade-in" style={{ display: 'flex' }} onClick={(e) => deleteItemOption(e, optionIdx)} title="Delete option">
                          ×
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {editMode && (
              <button className="add-btn" style={{ display: 'flex' }} onClick={addNewItemOption}>
                <svg viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add option
              </button>
            )}
          </div>
          );
        })()}

          {/* Reset tab-checkboxes trigger */}
          <div className="reset-wrap font-sans" onClick={triggerResetChecklist} style={{ userSelect: 'none' }}>
            <button className="reset-btn" tabIndex={-1}>
              <svg viewBox="0 0 24 24">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
              </svg>
              <span id="reset-label">{editMode ? 'Reset all columns' : 'Reset active column'}</span>
            </button>
          </div>
        </div>
          </>
        )}
        </div>

        <div style={{ display: activeApp === 'calendar' ? 'contents' : 'none' }}>
          <FxCalendar
            isLight={isLight}
            minimized={minimized}
            onBackToChecklist={() => setActiveApp('checklist')}
            settingsPanelOpen={calendarSettingsOpen}
            setSettingsPanelOpen={setCalendarSettingsOpen}
            extraHeight={expandedExtraHeight}
          />
        </div>
          </>
        )}

        {/* Bottom Height Resize Handle */}
        {!minimized && (
          <div
            className="bottom-resize-handle no-drag"
            onPointerDown={handleBottomResizeDown}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setExpandedExtraHeight(0);
            }}
            title="Drag down to extend height (Double click to reset)"
            style={{
              position: 'absolute',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '70px',
              height: '16px',
              cursor: 'ns-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 90,
              WebkitAppRegion: 'no-drag' as any,
            }}
          >
            <div
              className="bottom-handle-bar"
              style={{
                width: '32px',
                height: '3.5px',
                borderRadius: '99px',
                background: isLight ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.3)',
                transition: 'background 0.2s, width 0.2s, height 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
