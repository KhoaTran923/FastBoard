import { describe, it, expect } from 'vitest';
import { timeAgo } from '../lib/timeAgo';

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

describe('timeAgo', () => {
  it('formats recent times as "just now"', () => {
    expect(timeAgo(ago(10 * 1000))).toBe('just now');
  });

  it('formats minutes, hours, and days', () => {
    expect(timeAgo(ago(5 * 60 * 1000))).toBe('5m ago');
    expect(timeAgo(ago(3 * 3600 * 1000))).toBe('3h ago');
    expect(timeAgo(ago(2 * 24 * 3600 * 1000))).toBe('2d ago');
  });

  it('falls back to a date after a week', () => {
    const old = ago(10 * 24 * 3600 * 1000);
    expect(timeAgo(old)).toBe(new Date(old).toLocaleDateString());
  });
});
