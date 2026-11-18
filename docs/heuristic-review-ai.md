# Heuristic review by an AI assistant (18 November 2026)

Evaluator: Claude (AI assistant), one evaluator, reviewing screenshots and flows of the prototype against Nielsen's ten heuristics.
Reviewed by: Nguyen Quang Huy (author).
This review is NOT a substitute for the human evaluation sessions in docs/heuristic-evaluation.md. It is reported separately.

| # | Screen | Problem | Heuristic | Severity (0-4) | Status |
|---|---|---|---|---|---|
| 1 | Quick add (sentence) | When the items exceed what is left today, the line said "còn tiêu được 0đ" and hid how far over the user would go | 1 Visibility, 9 Recover from errors | 3 | Fixed: states the amount over and that it will be spread |
| 2 | Exhausted card | After the month's budget is used up the card offers no action for the rest of the month | 9 Recover from errors | 3 | Open: proposed BR14 (budget review offer) |
| 3 | Quick add (sentence) | Item name and amount are editable but look like plain text | 6 Recognition, 4 Consistency | 2 | Fixed: dashed underline, pink when focused |
| 4 | Set-up | The "Khác" goal chip started at 2,000,000đ, which is invalid for budgets under 4,000,000đ, so an error appeared before the user typed | 5 Error prevention | 2 | Fixed: starts at 10% of the budget |
| 5 | Calendar | Within and over the allowance were shown by dot colour only (NFR08) | 4 Standards (accessibility) | 2 | Fixed: different shape and a spoken label |
| 6 | Sunday estimate | "Bỏ qua tuần này" does not say that the reserve goes back to 0đ | 2 Match, 10 Help | 2 | Open |
| 7 | Quick add (sentence) | The badge "Đọc bằng luật" is system language users will not understand | 2 Match | 1 | Open |
| 8 | Settings | Budget changes only in 500,000đ steps, no direct entry | 7 Flexibility | 1 | Open |
| 9 | Payment success | The line "Đo trong prototype ... ms" is visible to users | 8 Minimalist design | 1 | Open: prototype-only, hide when DEMO_TOOLS=off |
