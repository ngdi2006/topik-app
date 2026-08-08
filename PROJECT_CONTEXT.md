# PROJECT_CONTEXT.md

This file summarizes the current state of the TOPIK app so a new Codex/chat session can continue without losing context.

## Project Overview

- Repo path: `E:\TOPIK-IBT\topik-app`
- App: TOPIK iBT learning/exam platform.
- Framework: Next.js `16.1.6`, React `19.2.3`, TypeScript.
- Data/auth: Supabase with `@supabase/ssr` and `@supabase/supabase-js`.
- Styling/UI: Tailwind CSS 4, local UI components, lucide-react icons, sonner toasts.
- Main app areas:
  - Learner: dashboard, exam attempts, history, milestones, AI chat, interview practice, vocabulary.
  - Admin: users, exams, question bank, lessons, milestones, payments, payment packages, settings, AI sync, SePay logs.
- Payment model:
  - `payment_packages`: packages such as 10/20/50 attempts.
  - `payment_transactions`: created when learner chooses a package.
  - `user_exam_credits`: stores total/used/remaining credits.
  - Credits are added via DB RPC `increment_user_credits`.

## Current Payment/SePay Context

The user reported a real bank transfer was received but the system did not auto-activate credits.

Observed bank/Sepay facts from the conversation:

- Correct bank account shown by the user:
  - Bank: VietinBank
  - Account number: `198801988888`
  - Account name: `NGAN THI NHUNG`
- A successful QR screen showed:
  - Bank: VietinBank
  - Account: `198801988888`
  - Account owner: `NGAN THI NHUNG`
  - Transfer content example: `SEVQR1784531043913TQVEC`
- Earlier issue:
  - An incorrect assumption temporarily set bank as `MB`, which produced QR `MB + 198801988888`.
  - Mobile bank app showed: account does not exist.
  - This was corrected to VietinBank.

Important root cause from investigation:

- The webhook auto-activation only works when transfer content contains a generated transaction code matching `/SEVQR.../` or `/TOPIK.../`.
- A real transfer on `20/07/2026 08:18` had content:
  - `441D607209DHNUUJ LE THI MY DUYEN CHUYEN KHOAN-200726-08:18:33 6201ASCB02JLL3LC`
- That content did not include a `SEVQR...` code, so the system could not match it safely to a pending `payment_transactions` row.
- Do not auto-match by amount alone because many users may buy the same package price, e.g. `99.000 VND`.

## Supabase Data Checked During Debugging

User checked:

- `Duyên Lê`
- Email: `myduyn1609@gmail.com`
- User ID: `91daae6b-c12c-41c3-9f6d-d32a42800049`
- Credit row at time of investigation:
  - `total_credits = 11`
  - `used_credits = 0`
  - `remaining_credits = 11`
  - Updated at `2026-07-20 08:54:47` Vietnam time, likely after manual credit addition.
- Pending payment transactions for this user included multiple `99.000 VND` transactions around `20/07/2026 08:15-08:28`.

A completed SePay transaction from the screenshot was found:

- Transaction code: `SEVQR17844751354319C4Z8`
- Amount: `99.000 VND`
- Status: `completed`
- Notes: `Auto-approved via SePay webhook. Transfer ID: 69024720`
- This belonged to a different user:
  - `Huy Quang`
  - Email: `qhuytk2f7@gmail.com`

## Files Changed In Current Worktree

As of the latest status, these files have intentional modifications/additions:

- `src/app/api/payment/create/route.ts`
  - Removed unsafe fallback bank/account values such as `MB`, `0123456789`, `KOREA LINK`.
  - Payment creation now requires valid SePay bank config.
  - Supports either:
    - `SEPAY_BANK_CODE`, or
    - `SEPAY_BANK_BIN`
  - Required:
    - `SEPAY_ACCOUNT_NUMBER`
    - `SEPAY_ACCOUNT_NAME`
  - Throws clear server error if config is missing/unsupported.

- `src/app/api/payment/webhook/route.ts`
  - Added webhook audit logging helper `writeWebhookLog`.
  - Logs received processing results into `sepay_webhook_logs`.
  - Logs cases:
    - `not_incoming`
    - `no_transaction_code`
    - `transaction_not_found`
    - `amount_mismatch`
    - `completed`
    - `error`
  - Payment processing still continues even if the log table has not been migrated yet.
  - Auto-credit logic remains conservative: only matching pending transaction code and matching amount can complete.

- `supabase/migrations/20260720_add_sepay_webhook_logs.sql`
  - Adds `public.sepay_webhook_logs`.
  - Adds indexes.
  - Enables RLS.
  - Adds admin/teacher read policy.
  - This SQL must be run in Supabase SQL Editor before Log SePay can show real logs.

- `src/app/api/admin/sepay-logs/route.ts`
  - New admin/teacher API route for reading SePay logs.
  - If table is missing, returns a friendly `migrationRequired` response instead of only a 500.

- `src/app/admin/sepay-logs/page.tsx`
  - New admin page `/admin/sepay-logs`.
  - Displays filters:
    - all
    - completed
    - no transaction code
    - transaction not found
    - amount mismatch
    - error
  - Shows a migration-required notice if the DB table is missing.

- `src/app/admin/layout.tsx`
  - Added sidebar link: `Log SePay`.

- `src/app/api/admin/payments/route.ts`
  - Fixed admin payments API.
  - Previous issue: direct Supabase join `payment_transactions -> profiles` caused 500 because there is no FK relationship to `profiles`.
  - New behavior:
    - Fetches transactions with `payment_packages`.
    - Fetches profiles separately by user IDs.
    - Fetches emails separately from Supabase Auth Admin.
    - Merges result before returning to UI.

- `src/app/admin/payments/page.tsx`
  - Fixed runtime crash:
    - `Cannot read properties of null (reading 'package_name')`
  - Cause: some transaction has `payment_packages = null`, likely because package was deleted or `package_id` no longer matches.
  - UI now uses fallback `Gói đã xóa`.
  - `payment_packages` type now allows `null`.

- `src/components/payment/PaymentModal.tsx`
  - Shows server error from `/api/payment/create` instead of generic "Không thể tạo giao dịch".
  - Adds warning telling user not to edit transfer content.

## Current Environment Config

Do not commit secrets from `.env.local`.

The required payment env variables are:

```env
SEPAY_BANK_CODE=VIETINBANK
SEPAY_ACCOUNT_NUMBER=198801988888
SEPAY_ACCOUNT_NAME=NGAN THI NHUNG
SEPAY_API_KEY=<configured in SePay and server env>
```

Alternative safer config:

```env
SEPAY_BANK_BIN=970415
SEPAY_ACCOUNT_NUMBER=198801988888
SEPAY_ACCOUNT_NAME=NGAN THI NHUNG
SEPAY_API_KEY=<configured in SePay and server env>
```

Notes:

- VietinBank BIN used by current bank map is `970415`.
- If running locally, restart `npm run dev` after changing `.env.local`.
- If deployed on Vercel, set the same env variables in Vercel Project Settings and redeploy.
- `.env.local` currently contains real API keys; be careful not to expose or commit it.

## Required Supabase Action

The SQL file is currently open in the IDE:

- `supabase/migrations/20260720_add_sepay_webhook_logs.sql`

Run it manually in Supabase Dashboard:

1. Open Supabase Dashboard.
2. Go to SQL Editor.
3. Paste the entire SQL file.
4. Run it.
5. Refresh `/admin/sepay-logs`.

Until this migration is run, the Log SePay page may show a notice saying the log table has not been created.

## Verification Already Done

These checks passed after recent fixes:

```powershell
npx.cmd tsc --noEmit
```

Specific ESLint checks passed on edited areas:

```powershell
npx.cmd eslint src\app\api\payment\create\route.ts src\components\payment\PaymentModal.tsx
npx.cmd eslint src\app\api\admin\payments\route.ts
npx.cmd eslint src\app\admin\payments\page.tsx src\app\api\admin\payments\route.ts
npx.cmd eslint src\app\api\admin\sepay-logs\route.ts src\app\admin\sepay-logs\page.tsx
```

Full repo lint currently fails because of many pre-existing lint issues in root scripts, `scratch/`, and unrelated modules. This is not caused by the SePay/admin payment changes.

PowerShell note:

- `npm run lint` and `npx tsc` may fail through `.ps1` wrappers due to execution policy.
- Use `npm.cmd` and `npx.cmd` on this Windows environment.

## Known Dirty/Untracked Files

Current `git status --short` included:

```text
 M src/app/admin/layout.tsx
 M src/app/admin/payments/page.tsx
 M src/app/api/admin/payments/route.ts
 M src/app/api/payment/create/route.ts
 M src/app/api/payment/webhook/route.ts
 M src/components/payment/PaymentModal.tsx
?? public/audio/tts/be46bbef3023effbd968807815cee18db64b1d0b77a87bd068cc2d308cf76ee7.mp3
?? public/audio/tts/c6cae5d55c6d16ee1fec725d4270338337f672eb4b2346752a443ad0629a69ea.mp3
?? PROJECT_CONTEXT.md
?? src/app/admin/sepay-logs/
?? src/app/api/admin/sepay-logs/
?? supabase/migrations/20260720_add_sepay_webhook_logs.sql
```

The two `public/audio/tts/*.mp3` files were untracked before this payment work and were not part of the SePay changes.

`.env.local` is ignored by git, so it may not appear in `git status`. It was updated locally with the VietinBank payment configuration during this debugging session.

## Recent Bugs And Fixes

### 1. QR showed wrong bank account

Symptom:

- Mobile banking app reported `Tài khoản không tồn tại` for account `198801988888`.

Cause:

- The app had fallback logic in `payment/create` that could use guessed/default values if env vars were missing.
- A bad temporary local assumption used `MB` for an account that belongs to VietinBank.

Fix:

- Removed unsafe fallback behavior.
- Confirmed correct bank from user screenshot: VietinBank, `198801988888`, `NGAN THI NHUNG`.

### 2. Admin payments endpoint returned 500

Symptom:

- Browser console:
  - `/api/admin/payments?status=pending` 500

Cause:

- API tried to join `profiles:user_id` from `payment_transactions`.
- DB schema does not define that FK relationship.

Fix:

- Query transactions, profiles, and auth emails separately, then merge.

### 3. Admin payments page crashed on `package_name`

Symptom:

- Runtime error:
  - `Cannot read properties of null (reading 'package_name')`

Cause:

- `tx.payment_packages` can be `null`.

Fix:

- Allow `payment_packages: null`.
- Fallback display: `Gói đã xóa`.

### 4. Log SePay page failed to fetch

Symptom:

- Page showed:
  - `Failed to fetch SePay logs`

Likely cause:

- `sepay_webhook_logs` table not yet created in Supabase.

Fix:

- API now handles missing table with a friendly migration-required response.
- UI shows a notice instead of a generic red error.

## Recommended Next Steps

1. Run `supabase/migrations/20260720_add_sepay_webhook_logs.sql` in Supabase SQL Editor.
2. Restart local dev server if `.env.local` was changed.
3. If using Vercel/production, add payment env variables there and redeploy.
4. Test buying a 10-credit package:
   - Confirm QR displays VietinBank.
   - Confirm account `198801988888`.
   - Confirm account name `NGAN THI NHUNG`.
   - Confirm transfer content starts with `SEVQR`.
5. Send a small real or test webhook from SePay.
6. Check `/admin/sepay-logs` for the webhook log.
7. Check `/admin/payments` for pending/completed status.
8. Ensure credits appear in `user_exam_credits`.

## Important Principle For Future Work

Do not add automatic credit matching by amount alone. Auto-credit must require:

- incoming transfer,
- recognizable transaction code (`SEVQR...` or `TOPIK...`),
- a pending matching `payment_transactions.transaction_code`,
- amount within allowed tolerance.

For transfers missing transaction code, use SePay logs/admin reconciliation instead of automatic crediting.
