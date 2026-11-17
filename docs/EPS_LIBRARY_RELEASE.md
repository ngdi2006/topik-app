# EPS library release

Current workbook access supersedes the initial public release below: both workbooks now use private, per-account activation. Admin and teacher access is automatic; learners require an admin grant. Main course books stay published. See `WORKBOOK_ACCOUNT_PERMISSIONS.md` and `reports/workbook-account-access.json` for the current policy.

The textbook library and reader at `/textbooks` are now released for authenticated learners independently of the unfinished learning cluster. The shared library menu links directly to `/textbooks`, remains visible and bright, and has an active state for library/reader routes. Both the dashboard's own menus and the shared desktop/mobile sidebar use it. E-Learning and the separate vocabulary/grammar learning tools remain development-locked.

The separate EPS curriculum management module keeps its existing access/release controls; the learner library menu no longer routes administrators into that module.

`/campus` appears only for role `admin`. The campus page and its read/write/exam-options API handlers also check the trusted role; teacher/supporter/student accounts cannot use these HTTP entry points. Hidden links stay absent while the client role is unknown.

Publication was explicitly requested and applied with `node scripts/release_eps_textbooks.mjs --apply`. The preflight verified all four imported books have their full page counts and 30 numbered lessons each. The installer backed up publication flags, published the units and audio before the books, and reloaded all records to verify the result: four books, 123 units including introductory material, and 60 existing audio resources. The report is `reports/eps-textbook-release.json`; the flag backup remains in the ignored local backup directory. No audio, page content, answer keys or learner work was changed.

Verification: `test-eps-release-access.cjs` checks real feature flags plus campus page/API guards for anonymous, student, teacher, supporter and admin roles. `test-textbook-preview-access.cjs` verifies the released reader and remaining learning locks through middleware. `test-learning-menu-ui.mjs` verifies desktop/mobile links, reader active state and admin-only campus visibility. TypeScript and ESLint pass.
