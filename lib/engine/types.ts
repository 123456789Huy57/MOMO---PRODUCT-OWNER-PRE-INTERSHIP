export type TxType =
  | 'payment' // MoMo payment to a merchant
  | 'paylater' // payment made with Ví Trả Sau
  | 'transfer_out' // transfer to another person
  | 'transfer_own' // transfer between the user's own accounts
  | 'topup' // top-up into the wallet
  | 'withdraw' // withdrawal to a bank account
  | 'refund' // money returned for an earlier payment
  | 'manual'; // off-MoMo spending added by the user (cash, bank card)

export type TxSource = 'momo' | 'manual';

export interface Transaction {
  id: string;
  amount: number; // positive dong; refunds are positive too, their effect is negative
  type: TxType;
  source: TxSource;
  occurredAt: string; // ISO instant
  notSpending?: boolean; // user marked a transfer as not spending (BR03)
  billId?: string | null; // set when the payment settles a recurring bill (BR05)
}

export interface PlannedBill {
  billId: string;
  name: string;
  dueDay: number; // 1..31
  amount: number;
  kept: boolean; // user kept it in set-up (FR04)
}

export interface Plan {
  month: string; // YYYY-MM
  budget: number; // B
  goal: number; // G
  bills: PlannedBill[];
}

export interface WeeklyEstimate {
  answeredOn: string; // YYYY-MM-DD (a Sunday)
  range: EstimateRange;
}

export type EstimateRange = 'none' | 'under200' | '200to500' | '500to1000';

export type CardState = 'notsetup' | 'normal' | 'low' | 'usedup' | 'exhausted';

export interface DayResult {
  date: string;
  B: number;
  G: number;
  S: number; // counted spending from day 1 until yesterday, bills paid included
  R: number; // kept bills not yet paid this month
  D: number; // days left including today
  E: number; // daily reserve for off-MoMo spending
  left: number; // B - G - S - R
  allowance: number; // A, rounded down to 1,000đ, never negative
  spentToday: number; // counted day-to-day spending today (bill payments excluded)
  remaining: number; // allowance - spentToday (may be negative internally)
  state: CardState;
}
