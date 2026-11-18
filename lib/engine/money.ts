// Money is always an integer number of dong (NFR04).

/** Round down to the nearest 1,000đ for display (BR07). */
export function floor1000(v: number): number {
  return Math.floor(v / 1000) * 1000;
}

/** 90000 -> "90.000đ" (Vietnamese thousands separator). */
export function vnd(v: number): string {
  const sign = v < 0 ? '−' : '';
  return sign + Math.abs(Math.round(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

/** 90000 -> "90K" for compact calendar cells. */
export function vndShort(v: number): string {
  return Math.round(v / 1000) + 'K';
}
