# Workbook account permissions

| Role | Workbook access | Layout review/edit | Standard answer update/approval | Transcript | Bottom audio player |
| --- | --- | --- | --- | --- | --- |
| Admin | Automatic | Yes | Yes | Yes | Yes |
| Teacher | Automatic | Yes | No | Yes | Yes |
| Learner / other roles | Admin activation required | No | No | No | No |

Learners retain image answer interactions, group listening buttons, section submission/grading and a centered previous/lesson/next footer. Teachers retain teaching/grading tools; the textbook admin permission is included for the teacher role. Only admin can enable/disable a learner's workbook access.

In **Admin → Users**, open an account's details and use **Sách bài tập EPS → Kích hoạt có thời hạn / Gia hạn**. The table also has a management icon. The dialog supports 7/30/90/365-day presets, custom days (1–3650), an exact expiry date and immediate revocation. Active access extends from the existing expiry; expired, revoked or never-granted access starts from the current server time. Exact dates expire at 23:59:59 Vietnam time (UTC+07:00).

This stores `workbook_access` and `workbook_access_expires_at` in protected Auth `app_metadata`, not user-editable metadata. Book/page/audio/workbook APIs check current server-side account data and current time; access ends at the expiry boundary without a cron task or refreshed JWT. Legacy flags without a valid expiry no longer grant indefinite access and need admin to set a duration. Admin/teacher role-based access remains automatic. No learner duration was chosen or changed automatically by this implementation.

The management API accepts `extend` with `days`, `set_expiry` with an offset-aware ISO `expires_at`, or `revoke`. The old bare `{enabled:true}` payload is rejected. Changes record the action, duration, previous expiry and resulting expiry in the existing admin audit trail.

The two workbooks now use `metadata.access_mode = workbook_activation`. Their raw book rows and 60 audio-resource rows remain unpublished so existing published-row RLS cannot expose standard answer metadata or transcripts directly. The authorized API still lists the workbooks and serves them to admin, teacher and activated learners; unactivated learners see a locked card. Main course books remain published. The textbook admin publication action maintains this private mode. The old bulk-publication script refuses to make activation-managed books public. No schema migration was required.

Admin alone sees **Đáp án chuẩn**. A teacher's layout PATCH must preserve existing keys, approval state and keyed question/option semantics, so removing a key/field or redefining an option cannot bypass the restriction. Learner transcript text and answer guides are removed from the audio API payload as well as hidden in the UI.

Live private-access verification and a backup of the preceding flags are recorded in `reports/workbook-account-access.json`. No page, audio contents, standard answers or existing learner answers were overwritten.

Checks: role/access activation tests (including current metadata, automatic expiration, activation/revocation, invalid/past dates, main-book access), expiry boundary/extension/reactivation/timezone tests, teacher key protection tests, transcript payload tests, admin duration/editor UI tests, locked library cards, and real reader UI at 320/390/768/1440px. Learner group audio still plays, footer navigation is centered and transcript/layout controls are absent. TypeScript and ESLint pass.
