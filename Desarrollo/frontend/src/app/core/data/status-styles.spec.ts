import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPORT_SERIES, STATUS_ORDER, STATUS_STYLES } from './status-styles';
import { AppointmentStatus } from '../models';

const ALL: readonly AppointmentStatus[] = [
  'Pendiente',
  'Confirmada',
  'Reprogramada',
  'Atendida',
  'No asistió',
  'Cancelada',
];

const ROOT = resolve(process.cwd());

describe('appointment status canon', () => {
  it('covers every status', () => {
    expect(Object.keys(STATUS_STYLES).sort()).toEqual([...ALL].sort());
  });

  it('gives every status visible Spanish copy and a badge/block style', () => {
    for (const status of ALL) {
      const style = STATUS_STYLES[status];
      expect(style.label.trim(), `${status} label`).not.toBe('');
      expect(style.badge.trim(), `${status} badge`).not.toBe('');
      expect(style.block.trim(), `${status} block`).not.toBe('');
    }
  });

  it('assigns a unique, contiguous order', () => {
    const orders = ALL.map((status) => STATUS_STYLES[status].order).sort((a, b) => a - b);
    expect(orders).toEqual([0, 1, 2, 3, 4, 5]);
    expect(STATUS_ORDER).toEqual([...STATUS_ORDER].sort((a, b) => STATUS_STYLES[a].order - STATUS_STYLES[b].order));
  });

  it('keeps legend and chart on one order', () => {
    expect(REPORT_SERIES.map((series) => series.status)).toEqual([...STATUS_ORDER]);
  });

  it('takes chart labels and colours from the canon', () => {
    for (const series of REPORT_SERIES) {
      expect(series.label).toBe(STATUS_STYLES[series.status].label);
      expect(series.color).toBe(STATUS_STYLES[series.status].series);
      expect(series.pattern).toBe(STATUS_STYLES[series.status].seriesPattern);
    }
  });

  it('gives every bar a distinguishable colour', () => {
    const colors = REPORT_SERIES.map((series) => series.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('encodes the chart series without relying on colour alone', () => {
    // WCAG 1.4.1: a colour-blind reader must still tell the stacked segments apart.
    const patterned = REPORT_SERIES.filter((series) => series.pattern !== null);
    expect(patterned.length).toBeGreaterThanOrEqual(REPORT_SERIES.length - 1);
    for (const series of patterned) {
      expect(series.pattern).toContain('repeating-linear-gradient');
      expect(series.pattern).toContain('var(--chart-pattern-ink)');
    }
  });

  it('never prints the raw enum: status text goes through the canon', () => {
    // Guard against the two divergent maps coming back.
    const chart = readFileSync(resolve(ROOT, 'src/app/features/staff/components/report-chart.ts'), 'utf8');
    expect(chart).toContain("from '../../../core/data/status-styles'");
    expect(chart).not.toMatch(/REPORT_SERIES\s*[:=]/);
  });
});
