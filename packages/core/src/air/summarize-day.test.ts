import { describe, expect, it } from 'vitest';
import { makeSnapshot } from '../test-utils/fixtures.js';
import { selectDay } from './select-day.js';
import { findCleanWindow, mean, roundTo1, summarizeDay } from './summarize-day.js';

describe('summarizeDay', () => {
  const day = selectDay(makeSnapshot('2026-11-21', 150), '2026-11-21');
  const summary = summarizeDay(day);

  it('computes the AQI from daily means', () => {
    expect(summary.meanPm25).toBe(150);
    expect(summary.aqi.category).toBe('very-poor');
    expect(summary.whoMultiple).toBe(10);
  });

  it('finds the peak and the cleanest daylight window', () => {
    expect(summary.peak.hour).toBe(2);
    expect(summary.cleanWindow.hours).toEqual([13, 14]);
    expect(summary.cleanWindow.meanPm25).toBeLessThan(summary.meanPm25);
    expect(summary.hourly).toHaveLength(24);
    expect(summary.hourly[2]?.category).toBe('very-poor');
  });
});

describe('helpers', () => {
  it('averages and rounds', () => {
    expect(mean([])).toBe(0);
    expect(mean([1, 2, 3])).toBe(2);
    expect(roundTo1(1.26)).toBe(1.3);
  });

  it('treats missing hours as zero when windowing', () => {
    expect(findCleanWindow([], 2).hours).toEqual([7, 8]);
  });
});
