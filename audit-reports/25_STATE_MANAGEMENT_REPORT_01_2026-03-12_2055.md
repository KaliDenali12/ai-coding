# State Management Audit Report

**Run**: 01
**Date**: 2026-03-12
**Time**: 20:55 (local)
**Branch**: `state-audit-2026-03-12`
**Baseline tests**: 279/279 passing
**Post-fix tests**: 279/279 passing

---

## 1. Executive Summary

**Health Rating: SOLID**

This is a small, ephemeral SPA with 11 useState hooks, 0 global stores, 0 persistent storage, and 0 server cache. State architecture is appropriately minimal for the app's scope. Two real bugs found and fixed; no duplicated state; no stale state visible to users.

| Category | Findings | Fixes Applied |
|----------|----------|---------------|
| Duplicated State | 0 | 0 |
| Stale State Bugs | 1 (low) | 1 |
| Missing UI States | 0 | 0 |
| Lifecycle Bugs | 1 (high) | 1 |
| Re-render Hot Spots | 0 | 0 |
| Architecture Issues | 0 (document only) | 0 |
| Edge Cases | 2 (documented) | 0 |

---

## 2. State Source Map

### State Inventory

| Data | Location | Type | Canonical Source | Lifecycle | Survives Refresh? | Should Survive? |
|------|----------|------|-----------------|-----------|-------------------|-----------------|
| `screen` (AppScreen) | App.tsx:13 | useState | App.tsx | Session | No | No |
| `boardData` (ConspiracyChain) | App.tsx:14 | useState | App.tsx (from API) | Session | No | No |
| `lastInputs` ({a, b}) | App.tsx:15 | useState | App.tsx | Session | No | No* |
| `abortControllerRef` | App.tsx:16 | useRef | App.tsx | Transient | No | No |
| `conceptA` | LandingScreen.tsx:13 | useState | LandingScreen | Page | No | No |
| `conceptB` | LandingScreen.tsx:14 | useState | LandingScreen | Page | No | No |
| `error` (validation) | LandingScreen.tsx:15 | useState | LandingScreen | Transient | No | No |
| `flippedIndex` | Corkboard.tsx:35 | useState | Corkboard | Page | No | No |
| `revealComplete` | Corkboard.tsx:36 | useState | Corkboard | Page | No | No |
| `viewportSize` | Corkboard.tsx:37 | useState | window (via resize) | Session | No | No |
| `resizeTimerRef` | Corkboard.tsx:42 | useRef | Corkboard | Transient | No | No |
| `messageIndex` | LoadingScreen.tsx:18 | useState | LoadingScreen | Transient | No | No |
| `showStamp` | LoadingScreen.tsx:19 | useState | LoadingScreen | Transient | No | No |
| `phase` | LoadingScreen.tsx:20 | useState | LoadingScreen | Transient | No | No |
| `startTimeRef` | LoadingScreen.tsx:21 | useRef | LoadingScreen | Transient | No | No |
| `onTimeoutRef` | LoadingScreen.tsx:22 | useRef | Props | Transient | No | No |
| `errorVariant` | ErrorScreen.tsx:10 | useMemo | Random | Page | No | No |
| `hasError` | ErrorBoundary.tsx:16 | class state | ErrorBoundary | Session | No | No |
| `recoveryCount` | ErrorBoundary.tsx:16 | class state | ErrorBoundary | Session | No | No |
| `pathLength` | RedString.tsx:17 | useState | SVG DOM | Page | No | No |
| `isVisible` | RedString.tsx:18 | useState | RedString | Page | No | No |

*\*lastInputs: could be URL-encoded for shareability, but app is designed as fully ephemeral per PRD.*

### What's NOT used (and shouldn't be for this app)

- **Global stores** (Redux, Zustand, Context, etc.) -- not needed; prop drilling is 1 level deep
- **Server cache** (React Query, SWR) -- single non-cacheable API call per session
- **URL state** -- no routing, single-page state machine
- **Browser storage** (localStorage, sessionStorage) -- ephemeral by design
- **Form libraries** -- two inputs, simple validation

---

## 3. Duplicated State

**No duplicated state found.**

- `lastInputs` (App) and `conceptA`/`conceptB` (LandingScreen) are related but not duplicates: `lastInputs` stores the last *submitted* values for retry pre-fill; LandingScreen manages its own controlled input state. Since LandingScreen unmounts/remounts between screens, `useState(initialA)` correctly picks up the pre-fill value on mount.
- `viewportSize` mirrors `window.innerWidth/innerHeight` -- this is a standard derived-state pattern with a resize listener, not a duplication concern.

---

## 4. Stale State Bugs

### BUG-STATE-01: boardData not cleared on error retry [LOW] -- FIXED

**Trigger**: User generates a board successfully, then starts a new generation that fails.
**Before fix**: `handleRetry` set `screen='landing'` but left `boardData` containing the previous board's data. Not visible (gated by `screen === 'board'`), but stale data persisted in memory.
**After fix**: `handleRetry` now calls `setBoardData(null)` before navigating to landing.
**Impact**: Minimal (no user-visible bug). Hygiene improvement.

### No other stale state vectors identified

- **Concurrent requests**: AbortController properly cancels in-flight requests before starting new ones (App.tsx:23-24).
- **React 18 batching**: `setBoardData(data)` and `setScreen('board')` are batched in the async handler, preventing flash of empty board.
- **onTimeout callback staleness**: LoadingScreen uses the `useRef` latest-ref pattern (line 22-23) to avoid stale closure in the phase-tracking interval.

---

## 5. Missing UI States

All async operations have proper loading/error/success handling:

| Operation | Loading | Error | Empty | Timeout |
|-----------|---------|-------|-------|---------|
| generateConspiracy | LoadingScreen (3-phase: normal/slow/timeout) | ErrorScreen (3 random themed variants) | N/A (always 7 nodes or error) | 15s client hard timeout via LoadingScreen phase tracking |

- Loading has a grace period (300ms before stamp appears).
- Loading messages cycle every 1.5s with phase-appropriate messages.
- Error screen has retry button that returns to landing.
- AbortError is silently ignored (correct -- user didn't trigger it via UI).
- No "empty state" needed -- API always returns exactly 7 nodes or throws.

**No missing UI states found.**

---

## 6. Lifecycle Bugs

### BUG-STATE-02: ErrorBoundary recovery creates infinite crash loop [HIGH] -- FIXED

**Trigger**:
1. API returns malformed data that passes validation but crashes during render (e.g., unexpected property types)
2. Corkboard crashes during render
3. ErrorBoundary catches, shows ErrorScreen
4. User clicks "Try Again"
5. `hasError` set to false, App re-renders with same crash-causing `boardData`
6. Corkboard crashes again -- infinite loop

**Before fix**: `handleRetry` set `hasError: false`. React re-rendered the same App instance with all useState hooks preserved (including `screen: 'board'` and corrupted `boardData`).

**After fix**: Added `recoveryCount` to ErrorBoundary state. Used `<Fragment key={recoveryCount}>` to wrap children, forcing a full unmount/remount of the App subtree on retry. This resets all useState hooks to initial values, breaking the loop.

**Severity**: High -- makes the app unrecoverable after a render crash without a page refresh.

### No other lifecycle bugs found

- **Screen transitions**: AnimatePresence `mode="wait"` ensures clean unmount/remount between screens. All component state resets on remount.
- **Cleanup**: All 5 useEffects with timers/listeners have proper cleanup functions.
- **Resize debounce**: 150ms debounce prevents layout thrashing during resize.

---

## 7. Hydration Mismatches

**N/A** -- This is a client-only Vite SPA with no SSR.

The `typeof window !== 'undefined'` guards in Corkboard.tsx:38-39 are defensive but harmless. If SSR were added, these would cause hydration mismatches (server: 1280x720 vs client: actual dimensions).

---

## 8. Edge Cases

### Multi-tab behavior

No shared state across tabs. No auth, no user data, no localStorage. Each tab operates independently. **No issues.**

### Network interruption

- **Mid-request offline**: `fetch` rejects with TypeError, caught in App.tsx catch block, shows ErrorScreen. Correct.
- **Abort race**: AbortController handles concurrent request cancellation. Abort errors are silently ignored. Correct.

### Missing: No cancel button during loading

Users cannot cancel a request in progress. They must wait for the 15s timeout. This is a UX gap (not a state bug) that could be addressed with a "Cancel" button on LoadingScreen that aborts the controller.

---

## 9. Re-render Hot Spots

**None found.**

- `positions` and `stringPaths` in Corkboard are properly memoized with `useMemo`.
- `viewportSize` changes are debounced (150ms).
- All `handleX` callbacks in App.tsx are stable (`useCallback` with minimal/empty deps).
- `canSubmit` in LandingScreen is computed inline (not memoized) but is trivial computation (two string trims + compare). Not worth memoizing.
- No context providers that could cause unnecessary re-renders.
- No inline object/array props except where components unmount between renders anyway.

---

## 10. Architecture Assessment

### State proximity: Excellent

All state is colocated where it's used. App.tsx manages the 4-state machine and passes data down one level. No prop drilling beyond parent-to-child. No over-globalized state.

### Server vs client state separation: N/A

No server state management. Single API call returns data that's held in client useState. No caching needed -- each generation is unique and ephemeral.

### Overall assessment

The state architecture is appropriate for this app's scope:
- 4-screen state machine in App.tsx
- Component-local state for UI concerns (flip, reveal, viewport, loading phases)
- No persistent storage (by design -- ephemeral app)
- No shared state (single user, single page)

No architectural changes recommended.

---

## 11. Fixes Applied

| # | File | Issue | Fix | Tests Pass | Commit |
|---|------|-------|-----|------------|--------|
| 1 | `src/components/ErrorBoundary.tsx` | Recovery loop: retry re-rendered crash-causing state | Added `recoveryCount` + Fragment key to force subtree remount | 279/279 | `033cb4b` |
| 2 | `src/App.tsx` | Stale boardData not cleared on error retry | Added `setBoardData(null)` to `handleRetry` | 279/279 | `1c33c09` |

---

## 12. Recommendations

| # | Recommendation | Impact | Risk if Ignored | Worth Doing? |
|---|---|---|---|---|
| 1 | Add cancel button to LoadingScreen | Users can abort long requests instead of waiting 15s | Low -- users just wait or refresh | Nice-to-have, not urgent |
| 2 | Remove SSR guards in Corkboard.tsx:38-39 | Cleaner code, no dead defensive code | None -- app is SPA-only | Marginal -- leave as-is |
