# Buzzer Admin Console

The admin console for Buzzer's sports platform, built with Angular 21 on the Buzzer backend's REST API and Socket.IO server.

**Live:** https://console-sports-management.vercel.app

## What it does

- **Sign in** with a Buzzer account. The session survives a refresh and ends when the token expires or the tab closes.
- **Sports** (Match Management): the sports catalogue with totals, search, sorting and paging; add, edit, delete and bulk import (CSV or JSON). Drill down from a sport to its governing bodies, organisations and participants, and manage each organisation's squad and staff.
- **Matches** (Match Management): matches by status (All, Scheduled, Live, Finished, Cancelled), venue search, paging and sorting; schedule, edit and delete. A match's page has its score, status buttons that follow the backend's rules, the event timeline and per-team stats. While a match is live, events can be added, and every open window updates in real time over Socket.IO.
- **Payments** (Finance): totals per status and gross revenue, the transactions with status and currency filters, search and paging (all kept in the address, so a reload keeps them), a detail popup and status changes.
- **Roles:** each account sees only the pages and actions it can use (see below). A refused request (403) or the rate limit (429) is explained once: by the page or popup that made it, or otherwise by a notice above the page. If the account's permissions can't be loaded, changes stay hidden and a notice offers to load them again.

The other sidebar items are placeholders for later work.

## Run it locally

You need Node 24 (see `.nvmrc`) and npm.

```bash
npm ci          # install the exact versions in package-lock.json
npm start       # http://localhost:4200, rebuilds on save
npm run lint    # ESLint
npm test -- --watch=false   # unit tests (Vitest)
npm run build   # production build in dist/buzzer-admin-console/browser
```

The backend allows requests from `localhost:4200`. Its first request after a quiet spell can take a while (free hosting).

## Environment

Angular reads its settings from environment files, not from `.env`. There are no secrets in them; the access and refresh tokens come from signing in and stay in the browser's `sessionStorage`.

| File                                          | Used by                      | Setting      |
| --------------------------------------------- | ---------------------------- | ------------ |
| `src/environments/environment.ts`             | `npm run build` (production) | `apiBaseUrl` |
| `src/environments/environment.development.ts` | `npm start`                  | `apiBaseUrl` |

- `apiBaseUrl`: the REST API, `https://backend-3ofw.onrender.com/api` in both files.
- The Socket.IO server is the same address without `/api` (default `/socket.io` path); the console works it out from `apiBaseUrl`.

## Deployment

Every push to `main` is checked and deployed:

- **GitHub Actions** (`.github/workflows/ci.yml`) runs the Prettier check, ESLint, the unit tests and the production build.
- **Vercel** builds and deploys `main` to the live address (`vercel.json`). All paths serve `index.html`, so a refresh on any page works.

## Demo accounts: who sees what

Use the demo accounts from the project brief (their passwords are there, not in this repo). Don't create new accounts.

| Account               | Role     | Can change                                                                                                                                                                                              | Everything else                                |
| --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `admin@buzzer.dev`    | ADMIN    | Sports catalogue (add, edit, delete, import, and add governing bodies, organisations and participants); squad and staff of any club; matches (schedule, edit, delete, status, events); payment statuses | –                                              |
| `operator@buzzer.dev` | OPERATOR | Sports catalogue; matches; payment statuses                                                                                                                                                             | Squad and staff are read-only                  |
| `viewer@buzzer.dev`   | VIEWER   | Nothing                                                                                                                                                                                                 | Everything is read-only                        |
| `org@buzzer.dev`      | ORG      | Squad and staff of its own club only (the club the backend links the account to)                                                                                                                        | No Payments page; everything else is read-only |

How the console decides: each page or action has a rule in `src/app/auth/constants/access.constants.ts` naming the roles the backend route lets through and, where the permission list (`GET /users/:id/permissions`, the same table as `GET /users/roles`) agrees with the route, the permission the account must also have. The sidebar, the page guard and the buttons all read these rules. The role comes from `GET /auth/me` (after signing in and on every page load), and an ORG account's club from `GET /organization`. Three places where the permission list and the backend differ, checked on the live backend:

- OPERATOR has no `payments:write` in its list, but the backend lets it change payment statuses (as the brief says), so the console shows it the status change.
- OPERATOR has `organizations:write`, but the backend refuses its squad and staff changes, so the console doesn't show them.
- ORG has no `payments:read` in its list, although the backend answers its payment reads, so the console hides the Payments page from it (an ORG account that opens `/payments` lands on the dashboard).

The demo ORG account is linked to the club "Premier League" (governing body FIFA), whose sport, Football, has been deleted on the backend. The Sports pages therefore never lead to that club; its squad and staff controls show at `/sports/1c9932b6-d22d-4fbb-9412-e8e62b3de4a3/governing-bodies/c296ee24-24b8-4897-a7f1-bb5dcea9eb5b/organisations/55ff4047-bae5-48c4-9b5d-23ab04372427`.

## Project structure

```
src/app/
  auth/          login page, auth and access constants and models
  core/          session (AuthService, guards, interceptors, access check), page titles, 403/429 interceptor
  common/        design system components, shell, sidebar, header, shared styles and utilities
  sports/        sports catalogue, drill-down pages, import, squad and staff
  matches/       matches list, match detail, live updates (Socket.IO)
  payments/      payments summary, transactions, status changes
  design-system/ preview page of the design system components
```

## Conventions

- Angular 21 standalone components with `OnPush`, signals and `input()`/`output()`; services return Observables, read in components through `toSignal()` or small helpers.
- Commits follow Conventional Commits, checked by commitlint. Husky runs Prettier and ESLint on staged files before every commit; don't bypass the hooks.
- Prettier: single quotes, ES5 trailing commas, 120-character lines. ESLint: no `console` calls.
