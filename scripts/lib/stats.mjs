import { performance } from 'node:perf_hooks';

/** The instant every profile runs at (10:00 IST on 22 November 2026), so runs are comparable. */
export const PLANNED_AT = new Date('2026-11-22T04:30:00Z');

/** The value at a percentile (0–100) of an ascending list of samples. */
export const percentile = (sorted, rank) =>
  sorted[Math.min(sorted.length - 1, Math.floor((rank / 100) * sorted.length))];

/** Latency percentiles and throughput of `operation`, after a JIT warm-up. */
export function measure(operation, iterations) {
  for (let warmUp = 0; warmUp < 200; warmUp += 1) operation();
  const samples = [];
  for (let run = 0; run < iterations; run += 1) {
    const start = performance.now();
    operation();
    samples.push(performance.now() - start);
  }
  samples.sort((first, second) => first - second);
  const microseconds = (milliseconds) => `${(milliseconds * 1000).toFixed(1)} µs`;
  return {
    p50: microseconds(percentile(samples, 50)),
    p95: microseconds(percentile(samples, 95)),
    p99: microseconds(percentile(samples, 99)),
    opsPerSec: Math.round(
      (iterations / samples.reduce((total, sample) => total + sample, 0)) * 1000,
    ),
  };
}
