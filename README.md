# Tiền tiêu hôm nay (prototype học thuật)

Demo: https://momopo.vercel.app

Prototype cho Part 3 báo cáo kiến tập, vị trí Product Owner, case Quản lý chi tiêu của MoMo Talent 2026.
Đây không phải sản phẩm của MoMo. Toàn bộ người dùng, giao dịch và câu test là **dữ liệu tổng hợp (synthetic)**, trừ những câu bạn tự thêm vào `data/ai-eval/real.json`.

## Chạy trên máy

Cần Node.js 20 trở lên.

```bash
npm install
cp .env.example .env.local   # điền GEMINI_API_KEY nếu muốn dùng AI, để trống vẫn chạy được
npm run dev                  # http://localhost:3000, dữ liệu ở ./.pglite, tự seed lần đầu
```

Nút đồng hồ màu xám ở mép phải là công cụ demo: đổi persona (Trang, Khoa, Hạnh), sang ngày mới, nhảy tới 19:00 Chủ nhật, thanh toán thử, xem event, đặt lại dữ liệu. Ngày demo bắt đầu là 11/11/2026 08:00 giờ Việt Nam.

## Các lệnh kiểm chứng

| Lệnh | Kết quả |
|---|---|
| `npm test` | Test engine (ví dụ Part 2, Phụ lục 2, BR01–BR13) và test parser |
| `npm run sim` | 3 persona × 30 ngày → `sim/out/simulation.csv`, `summary.csv` |
| `npm run bench` | Engine cho 420.000 kế hoạch → `sim/out/bench-engine.json` |
| `npm run eval:ai` | Chấm parser luật và Gemini trên bộ câu có đáp án → `sim/out/ai-eval.json` và CSV từng câu |

## AI ghi nhanh khoản tiêu ngoài MoMo

Người dùng gõ một câu như "phở 50, gửi xe 5k, chợ 120 nghìn". App đề xuất từng khoản, người dùng sửa hoặc xóa rồi xác nhận thì mới ghi.

- `lib/ai/rules.ts`: parser bằng luật, không cần mạng. Là mốc so sánh và là đường lùi khi Gemini lỗi.
- `lib/ai/gemini.ts`: gọi Gemini bằng REST, trả JSON theo schema, nhiệt độ 0, hết 5 giây thì bỏ.
- `lib/ai/parse.ts`: chọn lớp, rồi kiểm tra mọi kết quả (số tiền hợp lệ, tối đa 10 khoản, khoản từ 5 triệu bị cảnh báo).
- AI không bao giờ tính tiền tiêu hôm nay. Con số đó luôn do engine tính sau khi người dùng xác nhận.
- Event `allowance_ai_parsed` (nguồn, độ trễ) và `allowance_ai_confirmed` (số dòng phải sửa hoặc xóa).

### Chạy bộ đánh giá AI

1. Vào https://aistudio.google.com, đăng nhập, chọn **Get API key**, tạo khóa.
2. Dán vào `.env.local`: `GEMINI_API_KEY=...`. Nếu AI Studio không có model `gemini-3.1-flash-lite`, đổi `GEMINI_MODEL` sang tên Flash-Lite đang có.
3. (Nên làm) Nhờ vài người gõ câu ghi chi tiêu theo thói quen, thêm vào `data/ai-eval/real.json` kèm số tiền đúng.
4. `npm run eval:ai`. 100 câu mất khoảng 8 phút vì mỗi lần gọi cách nhau 4,5 giây để nằm trong hạn mức miễn phí.

Gói miễn phí của Gemini cho phép Google dùng nội dung gửi lên để cải thiện sản phẩm. Chỉ gửi câu test, không gửi dữ liệu cá nhân thật.

## Deploy (Vercel + Neon)

1. Đẩy thư mục này lên một repo GitHub (không đẩy `.env.local`).
2. Vào https://neon.tech, tạo project, sao chép chuỗi kết nối (bắt đầu bằng `postgresql://`).
3. Vào https://vercel.com, **Add New → Project**, chọn repo, rồi thêm Environment Variables:
   - `DATABASE_URL`: chuỗi Neon.
   - `GEMINI_API_KEY`, `GEMINI_MODEL`: như trên.
   - `CRON_SECRET`: một chuỗi ngẫu nhiên. Vercel Cron gọi `/api/jobs/recompute` lúc 17:00 UTC (00:00 giờ Việt Nam).
   - `DEMO_TOOLS`: để trống khi demo cho thầy hoặc mentor, đặt `off` nếu không muốn người khác đổi dữ liệu.
4. Bấm Deploy. Bảng tự tạo và dữ liệu tự seed ở lần truy cập đầu.

## Màn hình

| Đường dẫn | Nội dung |
|---|---|
| `/` | Tổng quan với thẻ Tiền tiêu hôm nay, tuần, tháng, giao dịch |
| `/setup` | Thiết lập: ngân sách gợi ý, để dành, hóa đơn giữ tiền |
| `/explain` | Vì sao là con số này |
| `/pay` | Thanh toán giả lập và dòng "hôm nay còn tiêu được" (timeout 300 ms) |
| `/calendar` | Lịch tháng |
| `/quick-add` | Gõ nhanh bằng câu (AI) hoặc nhập số tiền |
| `/sunday` | Ước lượng Chủ nhật |
| `/settings` | Cài đặt, tắt tính năng |
| `/admin/funnel` | Bảng event của prototype |

## Tài liệu kèm theo

- `docs/heuristic-evaluation.md`: phiếu đánh giá theo 10 nguyên tắc của Nielsen, in ra đưa người đánh giá.
- `data/ai-eval/`: bộ câu test có đáp án.
