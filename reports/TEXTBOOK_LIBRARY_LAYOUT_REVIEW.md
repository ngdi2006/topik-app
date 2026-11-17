# EPS textbook library layout

Reorganized `/textbooks` into edition/volume sections. Each volume consistently places its course book before its workbook. Compact horizontal cards retain existing cover assets, stored reading progress and resume URLs. Course/workbook accents and labels distinguish knowledge from practice. Counts exclude introductory units from lesson totals.

Added All / Course books / Workbooks filtering, a clear library heading, loading placeholders, empty states and a retry action for failed requests. The surrounding learner navigation and book access rules remain unchanged. No book content, publication status, saved answers or reading progress was changed.

Verification: `node scripts/test-textbook-library-layout.mjs` passed at widths 320, 390, 768, 1024, 1440 and 1920. Checks cover volume/book order from shuffled input, paired desktop cards, compact card height, no horizontal overflow, 44px reading links, preserved last-page URLs, 30-lesson counts, filter behavior and loading/error/empty states. Screenshots use real local cover assets with fixture progress. TypeScript and ESLint passed.

Screenshots: `textbook-library-1440.png`, `textbook-library-390.png`.
