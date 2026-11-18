export const CATEGORIES = ['An uong', 'Di lai', 'Cho va tap hoa', 'Mua sam', 'Khac'] as const;
export type Category = (typeof CATEGORIES)[number];
export const CATEGORY_LABEL: Record<Category, string> = {
  'An uong': 'Ăn uống',
  'Di lai': 'Đi lại',
  'Cho va tap hoa': 'Chợ và tạp hóa',
  'Mua sam': 'Mua sắm',
  Khac: 'Khác',
};

export interface ParsedItem {
  label: string;
  amount: number; // VND, integer
  category: Category;
  method: 'cash' | 'bank';
}

export interface ParseResult {
  items: ParsedItem[];
  warnings: string[];
  source: 'gemini' | 'rules';
  /** Why Gemini was not used, when source is 'rules'. */
  fallbackReason?: string;
  latencyMs: number;
}

export const MAX_ITEMS = 10;
export const MAX_AMOUNT = 50_000_000;
/** Amounts at or above this get a "check again" warning before saving. */
export const REVIEW_AMOUNT = 5_000_000;
