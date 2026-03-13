# Product Polish & UX Friction Audit Report

**Report ID:** 31_PRODUCT_POLISH_REPORT_01
**Date:** 2026-03-13
**Application:** Conspiracy Board — "It's All Connected"
**Type:** Single-page AI comedy web app (React 19 + Netlify Functions + Claude API)
**Scope:** All user-facing flows, read-only static analysis

---

## 1. Executive Summary

**Overall Polish Level: FAIR**

The Conspiracy Board is a well-built single-purpose app with strong engineering fundamentals (295+ tests, multi-layer content safety, circuit breaker, structured logging). However, several UX friction points exist that degrade the experience — particularly around error communication, loading cancellation, accessibility gaps, and the absence of share/save functionality.

**Worst Friction:**
1. No way to cancel a slow API request — users are trapped for up to 15 seconds
2. All errors (network, timeout, API, crash) show identical random themed messages — no actionable information
3. No share/save/export — users lose their conspiracy board on page navigation
4. Animations don't consistently respect `prefers-reduced-motion`

**Journey Health:**
| Journey | Health |
|---------|--------|
| Landing → Submit → Board | Smooth |
| Example chip → Board | Smooth |
| Blocked content feedback | Some friction |
| Slow API / Timeout | Significant friction |
| Error → Retry | Some friction |
| Board interaction (flip/read) | Smooth |
| Board → New investigation | Smooth |
| Mobile experience | Some friction |
| Accessibility (keyboard/screen reader) | Some friction |
| Share/save results | Broken (missing) |

---

## 2. User Journey Map

### Entry Points

| Entry Point | Status | Notes |
|-------------|--------|-------|
| Direct URL visit | Smooth | Landing screen loads immediately, FOUT with `display=swap` on 12 Google Fonts (~0.5-2s font swap) |
| No signup/login | N/A | Fully anonymous, no auth |
| No deep links | Missing | Cannot link to a specific conspiracy result |
| No shared links | Missing | No URL-based sharing |
| No API/CLI | N/A | Not applicable for this app |

### Core Journey: Landing → Board

```
Landing Screen
  ├─ Type two concepts (50 char limit each)
  │   ├─ Empty → Button disabled (no message explaining why)
  │   ├─ Same concept → Button disabled (no message until submit attempt)
  │   ├─ Blocked content → Submit → Inline error (themed, vague)
  │   └─ Valid → Submit (button or Enter key)
  │
  ├─ OR click Example Chip → Instantly submits (bypasses button)
  │
  └─ Loading Screen (0-15s)
      ├─ 0-8s: Normal messages cycling every 1.5s
      ├─ 8-12s: "Slow" messages appear
      ├─ 12-15s: "Taking longer than expected..."
      ├─ 15s: Auto-abort → Error Screen
      │   └─ "Try Again" → Landing (inputs cleared)
      │
      └─ Success → Corkboard
          ├─ Cards reveal with stagger (~6s total animation)
          ├─ Click card to flip → Read briefing
          ├─ Click outside / Escape → Unflip
          ├─ "New Investigation" button (appears after reveal)
          │   └─ → Landing (inputs cleared)
          └─ NO: share, save, export, deep link
```

### Dead Ends Identified

1. **Board results are ephemeral** — navigating away or refreshing loses everything
2. **Error screen has no diagnostic info** — user cannot report issues meaningfully
3. **Rate limited user** — told to "wait" with no indication of when (15-minute window)
4. **Circuit breaker active** — immediate 503 with no countdown to retry

---

## 3. Critical Friction Points

| # | Flow | Location | Issue | Severity | Type |
|---|------|----------|-------|----------|------|
| 1 | Loading | `LoadingScreen.tsx` (entire) | No cancel button — user trapped for up to 15s | High | **Missing** |
| 2 | Error | `ErrorScreen.tsx:10-12`, `constants.ts:30-50` | Random themed error messages hide actual error cause (timeout vs API vs network) | High | **Confusing** |
| 3 | Board | `Corkboard.tsx:135-211` | No share, save, export, or screenshot functionality | High | **Missing** |
| 4 | Validation | `blocklist.ts:106` | Blocked content error is indistinguishable from other validation errors | Medium | **Confusing** |
| 5 | Input | `LandingScreen.tsx:85-117` | No character counter — user discovers 50-char limit by hitting the wall | Medium | **Missing** |
| 6 | Input | `LandingScreen.tsx:136-137` | Disabled submit button has no tooltip explaining why it's disabled | Medium | **Confusing** |
| 7 | Accessibility | `LoadingScreen.tsx`, `PolaroidCard.tsx`, `RedString.tsx`, `CaseFileStamp.tsx` | Framer Motion animations don't check `prefers-reduced-motion` | Medium | **Incomplete** |
| 8 | Cards | `PolaroidCard.tsx:74-76` | Title text has no `line-clamp` — 100-char titles overflow the title strip | Medium | **Broken** |
| 9 | Cards | `PolaroidCard.tsx:82` | 5000-char briefing on 210px mobile card requires excessive scrolling with no scroll indicator | Medium | **Confusing** |
| 10 | Rate limit | `generate.ts:285-290` | No `Retry-After` header or timing guidance — user told to "wait" with no duration | Medium | **Incomplete** |
| 11 | Error | `App.tsx:33-34` | Request ID logged to console but never shown to user — no way to report issues | Low | **Missing** |
| 12 | Accessibility | `ErrorScreen.tsx:33-41` | Flickering error animation (opacity cycling) could trigger photosensitive reactions | Low | **Confusing** |
| 13 | Navigation | Corkboard | No keyboard shortcut discoverability (Escape to unflip not communicated) | Low | **Missing** |
| 14 | Circuit breaker | `generate.ts:339-344` | User sees "temporarily unavailable" with no indication of 30s cooldown | Low | **Incomplete** |

---

## 4. First-Use & Onboarding

### Signup
N/A — No authentication. User lands directly on the input form. This is appropriate for the app's scope.

### First Experience

**What appears:** A dark-themed landing screen with:
- Title: "It's All Connected" with `Special Elite` font
- Subtitle: "Enter two seemingly unrelated subjects..."
- Two input fields with clear placeholders ("Penguins", "IKEA Furniture")
- Submit button: "CONNECT THE DOTS"
- Example chips below: clickable pairs for instant demo

**Assessment:** The first experience is **good**. Example chips serve as both onboarding and instant demo — clicking one immediately generates a result, providing the "aha moment" within seconds. The dark conspiracy theme is immediately clear.

**Gaps:**
- No explanation of what the app does beyond the subtitle
- No indication that results are AI-generated
- No indication that results are ephemeral (not saved)

### Empty States
The app has exactly one "list" — the conspiracy board. When empty (landing screen), it shows the input form. This is appropriate — no empty state issues.

---

## 5. Core Workflow

### Input Form Assessment

| Aspect | Status | Details |
|--------|--------|---------|
| Field count | Good | 2 fields — minimal |
| Required marking | Missing | No asterisk or "required" label; button disables silently |
| Character limit | Incomplete | `maxLength=50` prevents typing beyond limit but no counter shown |
| Placeholders | Good | "Penguins" and "IKEA Furniture" — inviting, on-brand |
| Validation timing | Incomplete | Submit-only validation; no real-time feedback as user types |
| Error display | Partial | Single inline error with `role="alert"` and animation — good |
| Error specificity | Poor | Blocked content, empty, identical, and length errors use different messages but blocked content message is vague |
| Input preservation on error | Good | Inputs retained on validation failure |
| Enter key submit | Good | Works from both fields (`onKeyDown` handler) |
| Tab order | Good | DOM-based: input A → input B → submit → chips |
| Focus management | Missing | No auto-focus on first input on page load |
| Touch targets | Good | 44px minimum on chips and button |

### Submit Flow

**Click count for core action:** 3 (type concept A, type concept B, click submit) or 1 (click example chip)

**Missing confirmations:** None needed — action is non-destructive.

**Unnecessary confirmations:** None — appropriate.

**Undo support:** None needed — can always start new investigation.

### Save Clarity
N/A — No data persistence. Results exist only during the current session. **This is not communicated to the user.**

### Forms Quality Summary
The form is minimal and well-designed for its purpose. Primary gaps are character counter absence and vague blocked-content messaging.

---

## 6. Edge Cases & Errors

### Destructive Actions
| Action | Confirmation? | Undo? | Cascade communicated? |
|--------|--------------|-------|----------------------|
| "New Investigation" (clears board) | No | No | No |
| "Try Again" from error | No | No | No |

**Assessment:** "New Investigation" destroys the current board with no confirmation. Since results can't be saved, this is a **data loss risk** for users who haven't finished reading their board. A simple "Start over? Your current board will be lost." confirmation would help.

### Error States

| Error | User Message | Actionable? | Quality |
|-------|-------------|-------------|---------|
| Empty input | "Both fields are required." | Yes | Good |
| Same concept | "You can't investigate yourself... or can you? (Enter two different subjects.)" | Yes | Good — on-brand and clear |
| Blocked content | "This subject is classified beyond our clearance level. Try something else." | Partial | Vague — doesn't say which input or why |
| Network offline | Random themed error | No | Poor — no offline detection |
| Session expired | N/A | N/A | No sessions |
| Rate limited (client) | Random themed error | No | Poor — no timing guidance |
| Rate limited (server, 429) | "Too many investigations in progress. Please wait before starting another." | Partial | Missing duration |
| API timeout (15s client) | Random themed error | No | Poor — indistinguishable from other errors |
| API timeout (25s server) | "Our sources are currently unreachable." (504) | Partial | No retry guidance |
| Maintenance mode (503) | "Our intelligence network is undergoing scheduled maintenance." | Yes | Good |
| Circuit breaker (503) | "Our sources are temporarily unavailable. Please try again in a moment." | Partial | No cooldown info |
| Auth failure (401) | Generic 500 message | No | Silent critical failure |
| Malformed AI response (502) | "Our sources indicate this investigation has been shut down." | Partial | Misleading |
| React crash | Random themed error via ErrorBoundary | No | Indistinguishable from API error |

### Concurrency
N/A — Single-user, no shared state, no multi-tab concerns. AbortController properly cancels in-flight requests when starting new ones.

### Boundaries

| Boundary | Behavior | Issue? |
|----------|----------|--------|
| Long title (100 chars) | No `line-clamp` on card title | **Yes** — text overflows title strip |
| Long teaser (500 chars) | `line-clamp-2` | No — safely clamped |
| Long briefing (5000 chars) | `overflow-y-auto` on card back | **Partial** — no scroll indicator on mobile |
| Special characters / emoji | Rendered normally | No |
| RTL text | Not tested (verify in running app) | Unknown |
| Unicode / confusables | Normalized by blocklist | No — handled well |
| Very narrow viewport (<320px) | Cards may squeeze | Verify in running app |

---

## 7. Settings & Account

### Settings
**None exist.** The app has no settings, preferences, or configuration UI.

**Missing settings users might expect:**
- Reduce motion toggle (beyond OS-level `prefers-reduced-motion`)
- Theme toggle (dark only currently)
- Number of conspiracy nodes (fixed at 7)
- AI creativity/tone control

**Assessment:** For a single-purpose comedy app, the absence of settings is acceptable. The only notable gap is the lack of a reduce-motion toggle for users who want motion in their OS but not in this specific app.

### Account Management
N/A — No accounts. Appropriate for the app's scope.

---

## 8. Notifications

### Inventory
**Zero notifications of any kind.** No emails, no push, no in-app notifications, no webhooks.

**Assessment:** Appropriate for a stateless, anonymous, single-use app. No notifications needed.

### Missing Notifications That Could Help
- **Rate limit approaching** — "You've used X of 20 investigations this period" (nice-to-have, low priority)

---

## 9. Accessibility Notes

### Keyboard Navigation
| Flow | Keyboard-only? | Notes |
|------|----------------|-------|
| Fill form + submit | Yes | Tab between fields, Enter to submit |
| Click example chip | Yes | Tab to chip, Enter/Space to activate (min 44px touch target) |
| Cancel loading | **No** | No cancel button exists |
| Flip card | Yes | Tab to card, Enter/Space to flip |
| Unflip card | Yes | Escape key works |
| Start new investigation | Yes | Tab to button, Enter/Space |
| Retry from error | Yes | Tab to button, Enter/Space |

### Color-Only Information
- **Error messages** use red text (`text-red-400`) — verify if sufficient contrast; no icon accompaniment
- **Blocked content error** — same red text, no distinct visual pattern

### Screen Reader Labels
| Element | Label | Quality |
|---------|-------|---------|
| Input A | `aria-label="First concept"` | Good |
| Input B | `aria-label="Second concept"` | Good |
| Error message | `role="alert"` | Good — announced automatically |
| Card | `aria-label="${title} - click to read briefing"` | Good — dynamic |
| Decorative "+" | `aria-hidden="true"` | Good |
| Case file stamp | `aria-hidden="true"` | Good |
| Red strings | No label | **Missing** — decorative, should have `aria-hidden="true"` |
| Loading screen | No live region | **Missing** — cycling messages not announced |

### Motion & Animation
| Component | Respects `prefers-reduced-motion`? |
|-----------|-------------------------------------|
| Corkboard card reveal | **Yes** — sets `revealComplete` immediately |
| LoadingScreen animations | **No** — stamp, redacted lines, cursor all animate regardless |
| PolaroidCard entrance | **Partial** — receives flag from parent but doesn't always use it |
| RedString stroke animation | **No** — no motion check |
| CaseFileStamp spring | **No** — no motion check |
| ErrorScreen flickering | **No** — opacity cycling at 2s, potential photosensitivity trigger |

### Mobile Responsiveness
- Layout adapts (flex-col on mobile, flex-row on desktop) — Good
- Card sizes scale (150x210 mobile, 200x280 desktop) — Good
- Board scrolls vertically on mobile — Good
- Minimum board height calculated for 7 cards — Good
- Desktop overflow-x hidden — cards at edges could clip on narrow desktops

---

## 10. Recommendations

### Quick Fixes (Hours)

| # | Fix | Location | Impact |
|---|-----|----------|--------|
| 1 | Add `line-clamp-1` or `truncate` to card title | `PolaroidCard.tsx:74-76` | Prevents layout break on long titles |
| 2 | Add `aria-hidden="true"` to RedString SVG | `RedString.tsx` | Screen readers skip decorative element |
| 3 | Add character counter below inputs ("12/50") | `LandingScreen.tsx:85-117` | Users know limit before hitting wall |
| 4 | Add cancel button to LoadingScreen | `LoadingScreen.tsx` | Users can abort slow requests |
| 5 | Add `Retry-After` header to 429 responses | `generate.ts:285-290` | Rate-limited users know when to retry |
| 6 | Add `role="status"` or `aria-live` to loading messages | `LoadingScreen.tsx` | Screen readers announce loading progress |

### Medium Effort (Days)

| # | Fix | Location | Impact |
|---|-----|----------|--------|
| 7 | Differentiate error types in ErrorScreen (show timeout vs API error vs rate limit with appropriate messaging) | `ErrorScreen.tsx`, `App.tsx` | Users get actionable error context |
| 8 | Add `prefers-reduced-motion` checks to all Framer Motion animations | `LoadingScreen.tsx`, `PolaroidCard.tsx`, `RedString.tsx`, `CaseFileStamp.tsx`, `ErrorScreen.tsx` | Full motion accessibility compliance |
| 9 | Add confirmation dialog to "New Investigation" when board is showing | `Corkboard.tsx` | Prevents accidental result loss |
| 10 | Show request ID in error screen footer (small, copyable) | `ErrorScreen.tsx`, `App.tsx` | Users can report issues with tracking context |
| 11 | Add auto-focus to first input on landing screen load | `LandingScreen.tsx` | Reduces one interaction step |

### Larger Effort (Weeks)

| # | Fix | Location | Impact |
|---|-----|----------|--------|
| 12 | Add share functionality (generate shareable URL or image export) | New feature — URL state or canvas export | Users can share discoveries; viral growth |
| 13 | Add deep linking with URL-encoded board state | Routing + state serialization | Shareability, bookmarkability |
| 14 | Add offline detection with specific messaging | `api.ts`, new component | Users understand connectivity issues |

---

## Appendix: Component File Index

| Component | File | Purpose |
|-----------|------|---------|
| App (state machine) | `src/App.tsx` | Root: landing → loading → board/error |
| LandingScreen | `src/components/LandingScreen.tsx` | Input form with example chips |
| LoadingScreen | `src/components/LoadingScreen.tsx` | CLASSIFIED-themed loading animation |
| Corkboard | `src/components/Corkboard.tsx` | Board container + layout orchestration |
| PolaroidCard | `src/components/PolaroidCard.tsx` | 3D flip card with front/back |
| RedString | `src/components/RedString.tsx` | SVG animated connection lines |
| CaseFileStamp | `src/components/CaseFileStamp.tsx` | Classification stamp overlay |
| ErrorScreen | `src/components/ErrorScreen.tsx` | Themed error display + retry |
| ErrorBoundary | `src/components/ErrorBoundary.tsx` | React crash recovery |
| API client | `src/lib/api.ts` | Fetch + validation |
| Blocklist | `src/lib/blocklist.ts` | Content filtering |
| Constants | `src/lib/constants.ts` | Messages, timings, config |
| Layout | `src/lib/layout.ts` | Card positioning algorithm |
| Fonts | `src/lib/fonts.ts` | Font category mapping |
| Generate (backend) | `netlify/functions/generate.ts` | Claude API proxy + validation |
| Health (backend) | `netlify/functions/health.ts` | Health check endpoints |

---

*Generated by Claude Code — Product Polish & UX Friction Audit*
