# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
EventHub is a full-stack event ticket booking platform built for QA training. Users browse events, book tickets, manage bookings, and create events. Each user operates in an isolated sandbox (own dynamic events/bookings; seeded "static" events are shared and immutable).

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript (some `.jsx` files mixed in), Tailwind CSS, React Query v5
- **Backend**: Express.js, Prisma ORM, MySQL 8+
- **Auth**: JWT (7-day expiry), bcryptjs
- **Testing**: Playwright E2E (Chromium only)

## Commands
```bash
npm run setup        # Install deps in both /backend and /frontend
npm run dev           # Start frontend (3000) + backend (3001) concurrently
npm run db:push       # Push Prisma schema to DB (non-interactive)
npm run migrate        # prisma migrate dev (interactive, creates migration files)
npm run seed           # Seed 10 static events
npm run build           # Build the Next.js frontend
npm run lint             # Lint frontend

npm run test              # Run all Playwright tests
npm run test:ui            # Playwright UI mode
npm run test:report         # Open last HTML report
npx playwright test tests/<file>.spec.js --reporter=line   # Single test file
```
Backend-only scripts (run from `backend/`): `npm run prisma:studio`, `npm run prisma:generate`.

## Architecture
Backend is a strict layered architecture — respect the boundaries when adding features:
```
Routes (backend/src/routes) → Controllers (controllers) → Services (services) → Repositories (repositories) → Prisma → MySQL
```
- `validators/` — express-validator request validation, called from routes before controllers
- `middleware/authMiddleware.js` — verifies JWT, attaches `req.user`
- `middleware/errorHandler.js` — central error handler; maps custom errors in `utils/errors.js` (`NotFoundError`, `ForbiddenError`, `ValidationError`, `InsufficientSeatsError`) and known Prisma error codes (P2002/P2025/P2003) to HTTP responses. Throw these typed errors from services rather than crafting responses in controllers.

Data model (`backend/prisma/schema.prisma`): `User` 1—N `Event` (nullable `userId`; static/seeded events have `userId = null`), `User`/`Event` 1—N `Booking`. Deleting a user or event cascades to bookings.

Frontend: pages under `frontend/app/` (App Router), shared UI in `frontend/components/`, API clients + React Query hooks in `frontend/lib/`. Note: `frontend/lib/api/` has some duplicate `.js`/`.ts` versions of the same modules (e.g. `eventsApi.js` and `events.ts`) — check which one is actually imported before editing.

## Testing Conventions
- **Playwright's `baseURL` in `playwright.config.ts` points at the deployed training site (`https://eventhub.rahulshettyacademy.com`), not `localhost`.** Tests run against that live environment, not the local dev servers started by `npm run dev`.
- Test files go in `tests/` as `<feature-name>.spec.js`
- Follow `.claude/skills/playwright-best-practices/SKILL.md`
- Locator priority: data-testid > role > label/placeholder > ID > CSS class
- No `page.waitForTimeout()` — use `expect().toBeVisible()`
- Tests must be self-contained (login → action → assert)
- Use test account: `rahulshetty1@gmail.com` / `Magiclife1!`

## Key Business Rules
Full detail in `.claude/skills/eventhub-domain/business-rules.md`. Highlights:
- Max 6 user-created events per account; max 9 bookings per user — both FIFO-pruned (oldest deleted first) on overflow
- Booking reference format `[FIRST_LETTER]-[6_RANDOM_ALPHANUMERIC]`, where the letter is the event title's first character uppercased
- Seat count: static events store `availableSeats` directly; dynamic events compute it as `totalSeats - sum(that user's booking quantities)`, so different users can each book the same dynamic event independently
- Refund eligibility is frontend-only logic: 1 ticket = eligible, >1 ticket = not eligible (no backend endpoint)
- Cross-user booking access returns 403 "Access Denied"
- Static (seeded) events cannot be edited or deleted

## Skills (`.claude/skills/`)
- `eventhub-domain` — domain reference (API endpoints, business rules, UI selectors, user flows); auto-loaded context, not user-invocable
- `playwright-best-practices` — Playwright standards; auto-loaded context
- `/generate-tests <feature>` — writes and validates Playwright tests against a real browser
- `/review-tests <file>` — reviews test code quality
- `/create-scenarios <area>` — produces test scenario documents
- `/test-strategy <scenarios>` — assigns scenarios to test pyramid layers

## CI/CD (`.github/workflows/`)
- `ci.yml` — PR gate on `main`: backend checks (Prisma validate/format/generate), a schema-drift check (SSH into production, `prisma migrate diff`, read-only), and frontend checks (typecheck + build). Also callable as a reusable workflow.
- `playwright.yml` — runs the full E2E suite against the live production site on every push to `main`.
- `deploy.yml` — on push to `main`: runs `ci.yml` as a pre-deploy gate, then SSHes into the production server, writes env files, pulls, builds, and `pm2 reload`s. **Prisma migrations are not run automatically** — apply them manually on the server before deploying schema changes.

## Code Style
- Backend: JavaScript with JSDoc, Express patterns
- Frontend: TypeScript, React hooks, Tailwind utility classes
- Tests: JavaScript with Playwright test runner
- Use meaningful variable names, add step comments in tests
- Keep functions focused and single-responsibility
