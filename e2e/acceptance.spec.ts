import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

// Each test starts from the seeded data: demo date 11/11/2026 08:00, personas Trang, Khoa, Hạnh.
async function reset(request: APIRequestContext) {
  expect((await request.post('/api/demo/clock', { data: { action: 'reset' } })).ok()).toBeTruthy();
}
async function as(page: Page, persona: 'trang' | 'khoa' | 'hanh') {
  await page.context().addCookies([{ name: 'uid', value: persona, url: 'http://localhost:3100' }]);
}
const money = (n: number) => n.toLocaleString('vi-VN') + 'đ';
async function state(page: Page) { return (await page.request.get('/api/state')).json(); }

test.beforeEach(async ({ request }) => { await reset(request); });

test('US01 suggested budget, editable', async ({ page }) => {
  await as(page, 'khoa');
  await page.goto('/setup');
  const budget = page.locator('#budget');
  await expect(budget).toHaveValue(money(3_100_000));
  await expect(page.getByText('Gợi ý từ mức chi giữa của 3 tháng gần nhất')).toBeVisible();
  await budget.fill('3500000');
  await expect(budget).toHaveValue(money(3_500_000));
});

test('US02 savings goal lowers the preview; above 50% refused', async ({ page }) => {
  await as(page, 'khoa');
  await page.goto('/setup');
  const preview = page.getByRole('region', { name: 'Xem trước' });
  await page.getByRole('button', { name: 'Không', exact: true }).click();
  const before = await preview.innerText();
  await page.getByRole('button', { name: money(500_000) }).click();
  await expect(preview).not.toHaveText(before);
  await page.getByRole('button', { name: 'Khác' }).click(); // starts at a valid 10% of the budget
  await expect(page.getByRole('button', { name: 'Bắt đầu' })).toBeEnabled();
  await page.getByLabel('Số tiền khác').fill('2000000'); // more than half of 3,100,000
  await expect(page.getByRole('button', { name: 'Bắt đầu' })).toBeDisabled();
});

test('US03 bills listed; unticking one raises the preview', async ({ page }) => {
  await as(page, 'khoa');
  await page.goto('/setup');
  await expect(page.getByText('Cước điện thoại')).toBeVisible();
  await expect(page.getByText('Ngày 15')).toBeVisible();
  const preview = page.getByRole('region', { name: 'Xem trước' });
  const read = async () => Number((await preview.innerText()).replace(/\D/g, ''));
  const a = await read();
  await page.getByRole('checkbox').first().uncheck();
  await expect.poll(read).toBeGreaterThan(a);
});

test('US04 card shows today within 1 second after set-up', async ({ page }) => {
  await as(page, 'khoa');
  await page.goto('/setup');
  await page.getByRole('button', { name: money(500_000) }).click();
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await page.waitForURL('/');
  const t0 = Date.now();
  await page.goto('/');
  await expect(page.getByText('Hôm nay bạn còn tiêu được')).toBeVisible();
  const ms = Date.now() - t0;
  test.info().annotations.push({ type: 'card_ms', description: String(ms) });
  expect(ms).toBeLessThan(1000);
});

test('US05 success screen shows remaining; hidden when the engine is late', async ({ page }) => {
  await as(page, 'trang');
  await page.goto('/pay');
  await page.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
  const line = page.getByRole('region', { name: 'Tiền tiêu hôm nay' });
  await expect(line).toContainText(money(45_000));
  await page.goto('/pay');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
  await expect(page.getByRole('img', { name: 'Thành công' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Tiền tiêu hôm nay' })).toHaveCount(0);
});

test('US06 never a negative number: used-up state and tomorrow estimate', async ({ page }) => {
  await as(page, 'trang');
  await page.request.post('/api/payments', { data: { merchant: 'Siêu thị mini', amount: 130_000, type: 'wallet' } });
  await page.goto('/');
  await expect(page.getByText('Bạn đã dùng hết phần hôm nay')).toBeVisible();
  await expect(page.getByText(`Ngày mai còn khoảng ${money(87_000)}`)).toBeVisible();
  await expect(page.locator('body')).not.toContainText('-40.000');
});

test('US07 explanation lists every term of the formula', async ({ page }) => {
  await as(page, 'trang');
  await page.goto('/explain');
  for (const t of ['Ngân sách tháng 11', 'Để dành trước', 'Đã chi đến hết hôm qua', 'Hóa đơn sắp tới', 'Số ngày còn lại', 'Dự phòng chi ngoài MoMo'])
    await expect(page.getByText(t, { exact: true })).toBeVisible();
  await expect(page.getByText(money(90_000)).first()).toBeVisible();
});

test('US08 quick add lowers today at once', async ({ page }) => {
  await as(page, 'trang');
  await page.goto('/quick-add');
  await page.getByRole('tab', { name: 'Nhập số tiền' }).click();
  await page.getByRole('button', { name: money(30_000) }).click();
  await page.getByRole('button', { name: 'Thêm khoản tiêu' }).click();
  await page.waitForURL('/');
  expect((await state(page)).card.remaining).toBe(60_000);
});

test('US09 Sunday sheet with four ranges sets E for the next 7 days', async ({ page }) => {
  await as(page, 'trang');
  await page.request.post('/api/demo/clock', { data: { action: 'sunday-evening' } });
  await page.goto('/sunday');
  await expect(page.getByRole('radio')).toHaveCount(4);
  await page.getByRole('radio', { name: /200\.000đ đến 500\.000đ/ }).click();
  await page.getByRole('button', { name: 'Lưu' }).click();
  await page.waitForURL('/');
  await page.request.post('/api/demo/clock', { data: { action: 'next-day' } });
  expect((await state(page)).card.E).toBe(50_000);
});

test('US10 actions are logged as events', async ({ page }) => {
  await as(page, 'trang');
  await page.goto('/');
  await page.waitForTimeout(1500); // card_viewed fires after 1 second on screen
  await page.goto('/explain');
  await expect(page.getByText('Số ngày còn lại', { exact: true })).toBeVisible();
  await page.waitForTimeout(500);
  await page.goto('/pay');
  await page.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
  await expect(page.getByRole('region', { name: 'Tiền tiêu hôm nay' })).toBeVisible();
  await page.waitForTimeout(500);
  const f = await (await page.request.get('/api/admin/funnel')).json();
  const rows: { name: string; events: number }[] = Array.isArray(f) ? f : f.rows ?? f.events;
  const n = (name: string) => rows.find((r) => r.name === name)?.events ?? 0;
  expect(n('allowance_card_viewed')).toBeGreaterThan(0);
  expect(n('allowance_explain_opened')).toBeGreaterThan(0);
  expect(n('allowance_success_line_viewed')).toBeGreaterThan(0);
});

test('AI quick add: sentence is proposed, edited and saved only after confirming', async ({ page }) => {
  await as(page, 'trang');
  await page.goto('/quick-add');
  await page.getByRole('textbox').fill('phở 50, gửi xe 5k');
  await page.getByRole('button', { name: 'Đọc giúp tôi' }).click();
  await expect(page.getByLabel('Số tiền')).toHaveCount(2);
  expect((await state(page)).card.remaining).toBe(90_000); // nothing saved yet
  await page.getByLabel('Số tiền').first().fill('45000');
  await page.getByRole('button', { name: /Thêm 2 khoản/ }).click();
  await page.waitForURL('/');
  expect((await state(page)).card.remaining).toBe(40_000);
});
