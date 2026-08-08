export interface FxEvent {
  title: string;
  country: string;
  date: string; // ISO format: e.g. 2026-06-17T19:00:00+01:00
  impact: 'High' | 'Medium' | 'Low' | 'Holiday' | 'Non-Econ';
  forecast: string;
  previous: string;
  actual: string;
}

import rawEvents from './ff_data.json';

export const FX_EVENTS = rawEvents as FxEvent[];
