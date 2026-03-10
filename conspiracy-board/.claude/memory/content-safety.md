# Content Safety

## 3-Layer System

### Layer 1: Client Blocklist (src/lib/blocklist.ts)
- `checkInputs()`: validates non-empty, ≤50 chars, different concepts, not blocklisted
- `isBlocked()`: normalizes input via multi-step pipeline, checks against `BLOCKED_TERMS`
- Normalization pipeline (in order): strip zero-width chars → NFKD normalize → strip combining marks → lowercase → Cyrillic/Greek confusable mapping → leet-speak substitution → strip separators → collapse whitespace
- Leet-speak substitution map: `@ → a`, `0 → o`, `1 → i`, `3 → e`, `$ → s`, `5 → s`, `7 → t`, `! → i`, `+ → t`
- Confusables map: 30 Cyrillic/Greek chars → Latin equivalents (е→e, а→a, о→o, і→i, etc.)
- Returns themed error: "This subject is classified beyond our clearance level."

### Layer 2: Server Blocklist (netlify/functions/generate.ts)
- **Duplicated** from client — same `BLOCKED_TERMS` array and `normalizeInput()`
- Server-side validation: non-empty, ≤50 chars, different, not blocklisted
- Returns 400 with themed error message

### Layer 3: System Prompt (netlify/functions/generate.ts)
Claude's system prompt includes explicit safety rules:
- Never reference real political figures (current or historical)
- Never include slurs, hate speech, or derogatory language
- Never reference real tragedies, attacks, shootings, genocides
- Never mock religion or religious figures
- Never include sexual content or violence against people
- Never create content mistakable for real misinformation
- Keep everything in "fun absurdist comedy" territory

## Blocked Categories
| Category | Examples |
|----------|---------|
| Slurs/hate speech | Racial, homophobic, ableist terms |
| Violence | Mass shootings, terrorism, genocide |
| Real tragedies | Sandy Hook, Columbine, 9/11, etc. |
| Political figures | Trump, Biden, Obama, Clinton, Putin, Hitler, etc. |
| Explicit content | Pornography, sexual assault |

## Critical Rule: Blocklist Sync
Client and server blocklists are **separate copies** of the same list.
When updating blocked terms:
1. Edit `BLOCKED_TERMS` in `src/lib/blocklist.ts`
2. Edit `BLOCKED_TERMS` in `netlify/functions/generate.ts`
3. Keep them identical

## Input Validation Flow
```
User types → client checkInputs() → if blocked, show error
                                   → if valid, POST to server
Server receives → validate fields → server isBlocked() → if blocked, return 400
                                                        → if valid, call Claude
```

## BUG-001: Separator Bypass (FIXED 2026-03-10)
Fixed by splitting `normalizeInput()` regex into two steps:
1. Strip non-space separators: `normalized.replace(/[\-_.]+/g, '')` — catches `h.i.t.l.e.r`
2. Collapse whitespace: `normalized.replace(/\s+/g, ' ')` — preserves multi-word matching like `sandy hook`

**Important**: A naive "replace all separators with empty string" breaks multi-word blocked terms.
Applied to BOTH `blocklist.ts` and `generate.ts`. Separator bypass test re-enabled.

## BUG-003: Unicode Blocklist Bypass (FIXED 2026-03-10)

Fixed in security audit. `normalizeInput()` now handles:
- **Zero-width chars**: stripped via `[\u200B-\u200F\u2028-\u202F\u2060\uFEFF]` regex
- **Fullwidth chars**: NFKD normalization decomposes `ｈ` → `h`
- **Combining marks**: stripped via `[\u0300-\u036F]` regex
- **Cyrillic/Greek confusables**: 30-char `CONFUSABLES` mapping table (е→e, а→a, і→i, etc.)

Applied to BOTH `blocklist.ts` and `generate.ts`. See `audit-reports/08_SECURITY_AUDIT_REPORT_001_2026-03-10_1545.md`.

## Testing Safety Changes
After modifying blocklist or system prompt:
- Run `npm test` (blocklist tests in `src/lib/__tests__/blocklist.test.ts` and `blocklist-deep.test.ts`)
- Test with diverse input pairs manually to verify tone and safety
- Test character substitution bypass attempts (e.g., `n1gg3r` should be caught)
- Test separator bypass attempts (e.g., `h.i.t.l.e.r` should be caught)
