import type { Category, ParsedItem } from './types';

/**
 * Baseline parser with fixed rules. It needs no network and is the fallback when Gemini is
 * unavailable. It reads the amount formats Vietnamese users type most often:
 * 30k, 30, 30 nghìn, 30.000, 30000đ, 1tr2, 1.5tr, 15 nghìn rưỡi, x2.
 * It does not read amounts written in words ("năm chục"): that gap is what the AI layer is for.
 */

const AMOUNT = /(\d+(?:[.,]\d+)*)\s*(triệu|trieu|tr|củ|cu|nghìn|nghin|ngàn|ngan|ng|k|đồng|dong|đ|d|vnd)?(\d{1,3})?(\s*rưỡi|\s*ruoi)?(\s*[x×*]\s*(\d+))?(?![\p{L}\d])/giu;

const KEYWORDS: [Category, RegExp][] = [
  ['Di lai', /xăng|xang|gửi xe|gui xe|giữ xe|grab|be |xanh sm|xe ôm|xe om|taxi|vé xe|ve xe|bus|buýt|rửa xe|vá xe|sửa xe|đổ xăng/iu],
  ['Cho va tap hoa', /chợ|cho |rau|thịt|thit|cá |trứng|trung|gạo|gao|siêu thị|sieu thi|tạp hóa|tap hoa|bách hóa|bach hoa|winmart|co\.?op|trái cây|trai cay|sữa tắm|dầu gội|giấy vệ sinh/iu],
  ['An uong', /phở|pho|bún|bun|cơm|com|cf|cà phê|ca phe|cafe|coffee|trà|tra |trà sữa|tra sua|bánh|banh|ăn|an sang|ăn sáng|ăn trưa|ăn tối|nước|nuoc|nhậu|nhau|lẩu|lau|hủ tiếu|mì|mi |xôi|xoi|chè|sinh tố|highlands|starbucks|phúc long|bia/iu],
  ['Mua sam', /áo|ao |quần|quan |giày|giay|dép|túi|mỹ phẩm|son |shopee|lazada|tiki|sách|sach/iu],
];

export function categorize(label: string): Category {
  const l = ` ${label.toLowerCase()} `;
  for (const [c, re] of KEYWORDS) if (re.test(l)) return c;
  return 'Khac';
}

function toAmount(m: RegExpExecArray): number | null {
  const [, numRaw, unitRaw, tail, half, , times] = m;
  const unit = (unitRaw ?? '').toLowerCase();
  let n: number;
  if (/^\d{1,3}([.,]\d{3})+$/.test(numRaw)) n = Number(numRaw.replace(/[.,]/g, '')); // 30.000 or 1,200,000
  else n = Number(numRaw.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  let v: number;
  if (/^(triệu|trieu|tr|củ|cu)$/.test(unit)) {
    v = n * 1_000_000;
    if (tail) v += Number(tail) * 10 ** (6 - tail.length); // 1tr2 = 1,200,000; 1tr25 = 1,250,000
    if (half) v += 500_000;
  } else if (/^(nghìn|nghin|ngàn|ngan|ng|k)$/.test(unit)) {
    v = n * 1000;
    if (tail) v += Number(tail) * 10 ** (3 - tail.length); // 2k5 = 2,500
    if (half) v += 500;
  } else {
    if (tail) return null;
    v = n < 1000 ? n * 1000 : n; // a bare "35" means 35,000 in everyday Vietnamese notes
    if (half) v += n < 1000 ? 500 : 0;
  }
  if (times) v *= Number(times);
  v = Math.round(v);
  return v > 0 ? v : null;
}

const QUANTITY = /^\s*(ly|cái|cai|chai|hộp|hop|gói|goi|kg|lon|phần|phan|suất|suat|tô|to|đĩa|dia|người|nguoi|lít|lit|l|bó|bo|quả|qua|trái|trai|cuốn|vé|ve)(?![\p{L}])/iu;

const SEPARATORS = /[,;\n+]|\s(?:và|va|với|voi|rồi|roi|thêm|them)\s/giu;

function clean(s: string) {
  return s.replace(SEPARATORS, ' ').replace(/[:\-–()]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseByRules(text: string): { items: ParsedItem[]; warnings: string[] } {
  const items: ParsedItem[] = [];
  const warnings: string[] = [];
  const bank = /\b(ck|chuyển khoản|chuyen khoan|thẻ|the |banking|ngân hàng)\b/iu;
  // Work segment by segment so "phở 50, xăng 80" and "phở 50 xăng 80" both split correctly.
  const segments = text.split(/[,;\n+]|\s(?:và|với|rồi)\s/iu).map((s) => s.trim()).filter(Boolean);
  for (const seg of segments) {
    const matches: { start: number; end: number; amount: number }[] = [];
    AMOUNT.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = AMOUNT.exec(seg))) {
      // "2 ly 70k": a count followed by a unit is a quantity, not money.
      if (!m[2] && QUANTITY.test(seg.slice(m.index + m[0].length))) continue;
      const amount = toAmount(m);
      if (amount !== null) matches.push({ start: m.index, end: m.index + m[0].length, amount });
    }
    if (matches.length === 0) {
      if (/\p{L}/u.test(seg)) warnings.push(`Không thấy số tiền trong "${seg}"`);
      continue;
    }
    const labelFirst = clean(seg.slice(0, matches[0].start)).length > 0;
    matches.forEach((mt, i) => {
      const label = labelFirst
        ? clean(seg.slice(i === 0 ? 0 : matches[i - 1].end, mt.start))
        : clean(seg.slice(mt.end, i + 1 < matches.length ? matches[i + 1].start : seg.length));
      const name = label.replace(/\b(ck|chuyển khoản|chuyen khoan|bằng thẻ|qua thẻ)\b/giu, '').replace(/\s+/g, ' ').trim() || 'Khoản chi';
      items.push({ label: name, amount: mt.amount, category: categorize(name), method: bank.test(` ${seg} `) ? 'bank' : 'cash' });
    });
  }
  return { items, warnings };
}
