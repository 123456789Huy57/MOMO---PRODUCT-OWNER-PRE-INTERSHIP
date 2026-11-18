import { CATEGORIES, type ParsedItem } from './types';

/**
 * Gemini layer. It only turns a sentence into proposed transactions. It never computes the
 * daily allowance: that number always comes from the engine after the user confirms.
 * REST call without an SDK so the prototype keeps one fewer dependency.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
// Model names change over time. If the configured one is not found (HTTP 404),
// the client tries these aliases in order and remembers the first that answers.
const FALLBACK_MODELS = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
let workingModel: string | null = null;
export const currentModel = () => workingModel ?? GEMINI_MODEL;

const SYSTEM = `Bạn tách câu ghi chi tiêu tiếng Việt thành danh sách khoản chi.
Quy tắc:
- Mỗi khoản có: label (tên ngắn, giữ từ người dùng gõ), amount (số nguyên, đơn vị đồng), category, method.
- "k", "nghìn", "ngàn", "ng" = nghìn đồng. "tr", "triệu", "củ" = triệu. "1tr2" = 1.200.000. "rưỡi" = thêm một nửa đơn vị.
- Số trơn nhỏ hơn 1000 không kèm đơn vị là nghìn đồng ("phở 50" = 50.000).
- Số viết bằng chữ cũng là tiền ("năm chục" = 50.000, "hai trăm" = 200.000, "một lít" = 100.000, "một xị" = 100.000, "nửa triệu" = 500.000).
- "x2", "2 lần" nhân số tiền. "2 ly 70k" nghĩa là tổng 70.000, không nhân.
- method = "bank" nếu có chuyển khoản, ck, thẻ, ngân hàng; còn lại "cash".
- Không bịa khoản chi. Phần nào không có số tiền thì bỏ qua và ghi vào warnings.
- Khoản người dùng nói là được trả lại, hoàn tiền, cho mượn thì không phải chi tiêu: bỏ qua và ghi vào warnings.`;

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          amount: { type: 'INTEGER' },
          category: { type: 'STRING', enum: [...CATEGORIES] },
          method: { type: 'STRING', enum: ['cash', 'bank'] },
        },
        required: ['label', 'amount', 'category', 'method'],
      },
    },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['items', 'warnings'],
};

export class GeminiError extends Error {}

export async function parseWithGemini(text: string, opts: { apiKey?: string; model?: string; timeoutMs?: number } = {}):
  Promise<{ items: ParsedItem[]; warnings: string[]; model: string }> {
  const key = opts.apiKey ?? process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError('no_key');
  const candidates = opts.model ? [opts.model] : [...new Set([workingModel ?? GEMINI_MODEL, GEMINI_MODEL, ...FALLBACK_MODELS])];
  let last: GeminiError | null = null;
  for (const model of candidates) {
    try {
      const r = await callModel(model, key, text, opts.timeoutMs);
      workingModel = model;
      return { ...r, model };
    } catch (e) {
      last = e as GeminiError;
      if (!String(last.message).startsWith('http_404')) throw last;
    }
  }
  throw last ?? new GeminiError('no_model');
}

async function callModel(model: string, key: string, text: string, timeoutMs?: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs ?? 5000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new GeminiError(`http_${res.status}: ${body.slice(0, 300)}`);
    }
    const data = await res.json();
    const out = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof out !== 'string') throw new GeminiError('empty_response');
    const parsed = JSON.parse(out);
    return { items: Array.isArray(parsed.items) ? parsed.items : [], warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [] };
  } catch (e) {
    if (e instanceof GeminiError) throw e;
    throw new GeminiError((e as Error).name === 'AbortError' ? 'timeout' : `error: ${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}
