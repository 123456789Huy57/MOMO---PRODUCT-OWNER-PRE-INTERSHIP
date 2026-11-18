import { categorize, parseByRules } from './rules';
import { GeminiError, parseWithGemini } from './gemini';
import { CATEGORIES, MAX_AMOUNT, MAX_ITEMS, REVIEW_AMOUNT, type ParsedItem, type ParseResult } from './types';
import { vnd } from '../engine';

/** Guardrail applied to every parser output before the user sees it. */
export function validateItems(raw: unknown[], warnings: string[]): ParsedItem[] {
  const items: ParsedItem[] = [];
  for (const r of raw) {
    const o = r as Partial<ParsedItem>;
    const amount = typeof o.amount === 'number' ? Math.round(o.amount) : NaN;
    const label = typeof o.label === 'string' && o.label.trim() ? o.label.trim().slice(0, 60) : 'Khoản chi';
    if (!Number.isFinite(amount) || amount <= 0) { warnings.push(`Bỏ "${label}": số tiền không hợp lệ`); continue; }
    if (amount > MAX_AMOUNT) { warnings.push(`Bỏ "${label}": số tiền vượt ${vnd(MAX_AMOUNT)}`); continue; }
    if (amount >= REVIEW_AMOUNT) warnings.push(`Kiểm tra lại "${label}": ${vnd(amount)} là khoản lớn`);
    const category = CATEGORIES.includes(o.category as never) ? (o.category as ParsedItem['category']) : categorize(label);
    items.push({ label, amount, category, method: o.method === 'bank' ? 'bank' : 'cash' });
    if (items.length === MAX_ITEMS) { warnings.push(`Chỉ lấy ${MAX_ITEMS} khoản đầu tiên`); break; }
  }
  return items;
}

export async function parseSpending(text: string, mode: 'auto' | 'rules' = 'auto'): Promise<ParseResult> {
  const t0 = performance.now();
  const input = text.trim().slice(0, 500);
  let fallbackReason: string | undefined;
  if (mode === 'auto') {
    try {
      const g = await parseWithGemini(input);
      const warnings = [...g.warnings];
      return { items: validateItems(g.items, warnings), warnings, source: 'gemini', model: g.model, latencyMs: Math.round(performance.now() - t0) };
    } catch (e) {
      fallbackReason = e instanceof GeminiError ? e.message.slice(0, 160) : 'error';
    }
  } else fallbackReason = 'rules_requested';
  const r = parseByRules(input);
  const warnings = [...r.warnings];
  return { items: validateItems(r.items, warnings), warnings, source: 'rules', fallbackReason, latencyMs: Math.round(performance.now() - t0) };
}
