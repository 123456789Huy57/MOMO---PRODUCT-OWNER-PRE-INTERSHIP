-- Physical schema of the Today's Allowance prototype.
-- Follows the conceptual ERD in Part 2 (Figure 6.10). Money is BIGINT dong.

CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  display_name      TEXT NOT NULL,
  persona_note      TEXT NOT NULL DEFAULT '',
  consent_at        TIMESTAMPTZ,
  goodnews_opt_out  BOOLEAN NOT NULL DEFAULT FALSE,
  sunday_opt_out    BOOLEAN NOT NULL DEFAULT FALSE,
  demo_now          TIMESTAMPTZ               -- demo clock; NULL = real time
);

CREATE TABLE IF NOT EXISTS allowance_plans (
  id        SERIAL PRIMARY KEY,
  user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month     CHAR(7) NOT NULL,                  -- YYYY-MM
  budget_b  BIGINT NOT NULL CHECK (budget_b > 0),
  goal_g    BIGINT NOT NULL CHECK (goal_g >= 0 AND goal_g * 2 <= budget_b),  -- BR13
  status    TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'off')),
  UNIQUE (user_id, month)
);

CREATE TABLE IF NOT EXISTS recurring_bills (
  id       TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payee    TEXT NOT NULL,
  due_day  INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  amount   BIGINT NOT NULL CHECK (amount > 0)
);

CREATE TABLE IF NOT EXISTS planned_bills (
  plan_id  INT NOT NULL REFERENCES allowance_plans(id) ON DELETE CASCADE,
  bill_id  TEXT NOT NULL REFERENCES recurring_bills(id) ON DELETE CASCADE,
  amount   BIGINT NOT NULL,
  kept     BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (plan_id, bill_id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount        BIGINT NOT NULL CHECK (amount > 0),
  type          TEXT NOT NULL CHECK (type IN ('payment','paylater','transfer_out','transfer_own','topup','withdraw','refund','manual')),
  source        TEXT NOT NULL CHECK (source IN ('momo','manual')),
  merchant      TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT '',
  not_spending  BOOLEAN NOT NULL DEFAULT FALSE,                -- BR03
  bill_id       TEXT REFERENCES recurring_bills(id),          -- BR05
  occurred_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS transactions_user_time ON transactions (user_id, occurred_at);

CREATE TABLE IF NOT EXISTS daily_allowances (
  plan_id      INT NOT NULL REFERENCES allowance_plans(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  allowance_a  BIGINT NOT NULL CHECK (allowance_a >= 0),        -- BR06
  remaining    BIGINT NOT NULL,
  state        TEXT NOT NULL CHECK (state IN ('normal','low','usedup','exhausted')),
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, date)
);

CREATE TABLE IF NOT EXISTS weekly_estimates (
  id           SERIAL PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answered_on  DATE NOT NULL,
  range        TEXT NOT NULL CHECK (range IN ('none','under200','200to500','500to1000')),
  reserve_e    BIGINT NOT NULL,                                 -- BR11
  UNIQUE (user_id, answered_on)
);

CREATE TABLE IF NOT EXISTS events (
  id       BIGSERIAL PRIMARY KEY,
  user_id  TEXT NOT NULL,
  name     TEXT NOT NULL CHECK (name IN (
    'allowance_setup_viewed','allowance_setup_completed','allowance_card_viewed',
    'allowance_calendar_viewed','allowance_success_line_viewed','allowance_explain_opened',
    'allowance_quick_add','allowance_not_spending','allowance_estimate_answered',
    'allowance_goodnews_sent','allowance_goodnews_opened','allowance_settings_changed',
    'allowance_ai_parsed','allowance_ai_confirmed')),
  props    JSONB NOT NULL DEFAULT '{}',
  at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_name ON events (name, at);
-- Phase 2 events: widen the check on databases created before the AI quick-add existed
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_name_check;
ALTER TABLE events ADD CONSTRAINT events_name_check CHECK (name IN (
    'allowance_setup_viewed','allowance_setup_completed','allowance_card_viewed',
    'allowance_calendar_viewed','allowance_success_line_viewed','allowance_explain_opened',
    'allowance_quick_add','allowance_not_spending','allowance_estimate_answered',
    'allowance_goodnews_sent','allowance_goodnews_opened','allowance_settings_changed',
    'allowance_ai_parsed','allowance_ai_confirmed'));
