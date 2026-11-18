import { describe, expect, it } from 'vitest';
import { parseByRules } from '../../lib/ai/rules';
import { parseSpending, validateItems } from '../../lib/ai/parse';

const amounts = (s: string) => parseByRules(s).items.map((i) => i.amount);

describe('rule parser (baseline and fallback)', () => {
  it('reads common amount formats', () => {
    expect(amounts('phở 50 xăng 80')).toEqual([50_000, 80_000]);
    expect(amounts('cf 30k, gửi xe 5k')).toEqual([30_000, 5_000]);
    expect(amounts('bánh mì 25.000đ và nước 10000')).toEqual([25_000, 10_000]);
    expect(amounts('1tr2 tiền điện')).toEqual([1_200_000]);
    expect(amounts('mua rau 15 nghìn rưỡi')).toEqual([15_500]);
    expect(amounts('2k5 trà đá')).toEqual([2_500]);
    expect(amounts('cf 25k x2')).toEqual([50_000]);
  });
  it('treats "2 ly" as a quantity, not money', () => {
    expect(amounts('trà sữa 2 ly 70k')).toEqual([70_000]);
  });
  it('detects bank payments and strips the method from the label', () => {
    const [i] = parseByRules('tiền điện 400k ck').items;
    expect(i.method).toBe('bank');
    expect(i.label).toBe('tiền điện');
  });
  it('does not read amounts written in words (known gap the AI layer covers)', () => {
    expect(amounts('đổ xăng năm chục')).toEqual([]);
  });
});

describe('guardrail on every parser output', () => {
  it('drops invalid and oversized amounts, flags large ones, caps the list', () => {
    const w: string[] = [];
    const out = validateItems([
      { label: 'a', amount: 0 }, { label: 'b', amount: 60_000_000 }, { label: 'c', amount: 6_000_000 },
      { label: 'd', amount: 30_000.4, category: 'not-a-category' },
    ], w);
    expect(out.map((i) => i.amount)).toEqual([6_000_000, 30_000]);
    expect(out[1].category).toBe('Khac');
    expect(w.length).toBe(3);
    const many = validateItems(Array.from({ length: 12 }, () => ({ label: 'x', amount: 1000 })), []);
    expect(many.length).toBe(10);
  });
  it('falls back to rules when there is no Gemini key', async () => {
    const old = process.env.GEMINI_API_KEY; delete process.env.GEMINI_API_KEY;
    const r = await parseSpending('phở 50');
    expect(r.source).toBe('rules');
    expect(r.fallbackReason).toBe('no_key');
    expect(r.items[0].amount).toBe(50_000);
    if (old) process.env.GEMINI_API_KEY = old;
  });
});
