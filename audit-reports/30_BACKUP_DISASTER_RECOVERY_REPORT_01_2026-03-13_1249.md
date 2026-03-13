# Backup & Disaster Recovery Audit Report

**Report**: #30 — Backup & Disaster Recovery
**Run**: 01
**Date**: 2026-03-13 12:49
**Branch**: `observability-2026-03-13`
**Auditor**: Claude Opus 4.6
**Mode**: Read-only analysis (no code changes)

---

## 1. Executive Summary

**Readiness Rating**: **SOLID** — for the project's architecture

**One-sentence worst-case impact**: If the Git repository and all local clones were simultaneously lost, the entire application would be irrecoverable — but this is the *only* catastrophic scenario, because there is no database, no persistent user data, and no file storage.

**Top 3 Gaps**:
1. **No documented emergency contacts or access inventory** — the disaster recovery plan can't be executed if nobody knows who has Netlify/GitHub/Anthropic access at 3am
2. **No uptime monitoring** — site could be down without anyone knowing until users complain
3. **No backup Anthropic API key** — credential compromise requires navigating the Anthropic console under pressure

**Context**: This project has an unusually favorable DR posture. It is a fully stateless SPA with a single serverless function, no database, no persistent storage, and no user data. The entire system is reproducible from a Git clone + one environment variable (`ANTHROPIC_API_KEY`) in under 15 minutes. Most traditional backup/DR concerns (database backups, file storage replication, PITR, replication lag) are simply not applicable.

---

## 2. Data Asset Inventory

| Data Store | Engine | Criticality | Size Estimate | Growth Pattern | Backed Up? |
|---|---|---|---|---|---|
| Git repository (GitHub) | Git | **Irreplaceable** | ~5-10 MB (source code) | Linear, slow (code changes) | Yes — GitHub + local clones |
| Netlify site configuration | Netlify platform | Reconstructable | N/A (platform config) | Static | No dedicated backup — reconstructable from repo |
| `ANTHROPIC_API_KEY` | Netlify env vars | Reconstructable | 1 secret | Static | No — single copy in Netlify dashboard |
| Netlify function logs | CloudWatch (Netlify-managed) | Ephemeral | Varies | Per-request | Managed by Netlify (retention policy applies) |
| In-memory rate limiter | JavaScript `Map` | Ephemeral | < 1 KB typical | Per-instance, resets on cold start | None (by design) |
| In-memory circuit breaker | JavaScript variables | Ephemeral | ~16 bytes | Per-instance, resets on cold start | None (by design) |
| Client-side React state | Browser memory | Ephemeral | ~50 KB per session | Per-session, lost on tab close | None (by design) |
| Build artifacts (`dist/`) | Netlify CDN | Reconstructable | ~2-5 MB | Per-deploy | Every deploy is immutable on Netlify |

### Criticality Classification

**Irreplaceable** (cannot be reconstructed):
- Source code repository — the *only* irreplaceable asset

**Reconstructable** (rebuildable at moderate cost/time):
- Netlify site configuration (5-10 min to recreate from `netlify.toml` + manual env vars)
- API key (generate new one from Anthropic console)
- Build artifacts (rebuild from source)

**Ephemeral** (loss acceptable by design):
- In-memory rate limiter state
- In-memory circuit breaker state
- Client-side conspiracy board data (generated per-request, not stored)
- Function logs (operational, not business data)

### Volume & Growth Assessment

This project has **no unbounded growth risks**. There is no database, no file uploads, no logs stored on infrastructure the team controls, and no accumulating state. The only growing asset is the Git repository, which grows slowly with code changes (~5-10 MB total currently).

---

## 3. Backup Coverage

### Coverage Matrix

| Data Store | Backed Up? | Method | Frequency | Off-Site? | Encrypted? | Tested? | PITR? |
|---|---|---|---|---|---|---|---|
| Git repository | ✅ Yes | GitHub (distributed Git) | Every push | Yes (GitHub cloud) | In transit (HTTPS/SSH) | Implicitly (every clone is a restore test) | Yes (full Git history) |
| Netlify config | ⚠️ Partial | `netlify.toml` in repo covers most | Per-push | N/A | N/A | Not tested | N/A |
| API key | ❌ No | Single copy in Netlify dashboard | N/A | N/A | N/A | N/A | N/A |
| Function logs | ✅ Managed | Netlify → CloudWatch | Continuous | Yes | ⚠️ TEAM INPUT NEEDED | N/A | N/A |
| All other stores | N/A | Ephemeral — no backup needed | N/A | N/A | N/A | N/A | N/A |

### Critical Gaps

| Gap | Severity | Details |
|---|---|---|
| No backup API key documented | **MEDIUM** | Only one copy of the key exists in Netlify dashboard. If it's lost/compromised, recovery requires navigating Anthropic console. Not critical because a new key can be generated in minutes, but adds stress during incidents. |
| Netlify env vars not backed up | **LOW** | Only 1-3 env vars to set. Documented in `.env.example` and `CLAUDE.md`. Fast to reconstruct. |
| No verified second Git clone | **LOW** | Git is distributed — any clone is a full backup. But if only one person has a clone and their machine fails alongside GitHub, it's catastrophic. Verify multiple clones exist. |

**Notable absence**: There are no **CRITICAL** or **HIGH** severity backup gaps. This is a direct consequence of the stateless architecture — there's almost nothing to back up.

---

## 4. Recovery Capability

### RPO (Recovery Point Objective) Analysis

| Data Store | Backup Frequency | Theoretical RPO | Business Tolerance | Match? |
|---|---|---|---|---|
| Source code | Every `git push` | Seconds to hours (depends on push frequency) | Hours (no user data at risk) | ✅ Acceptable |
| API key | No backup | ∞ (but regenerable in minutes) | Minutes | ✅ Acceptable (new key is equivalent) |
| User-generated content | N/A — none stored | N/A | N/A | ✅ N/A |
| Transaction data | N/A — none exists | N/A | N/A | ✅ N/A |

**RPO Assessment**: Since no user data or transactions are stored, RPO concerns are minimal. The worst case is losing unpushed code changes, which is a standard development workflow risk, not a DR risk.

### RTO (Recovery Time Objective) Analysis

**Scenario: Total infrastructure failure — Netlify site gone, need to rebuild from scratch**

| Recovery Step | Estimated Time | Dependencies |
|---|---|---|
| Access GitHub repository | 0 min | GitHub account access |
| Create new Netlify site | 3 min | Netlify account access |
| Connect to GitHub repo | 2 min | Both accounts |
| Set environment variables (1-3 vars) | 2 min | API key available |
| Trigger initial deploy | 1 min | N/A |
| Wait for build + deploy | 2-3 min | N/A |
| Verify site functionality | 2 min | N/A |
| Update DNS (if custom domain) | 5-30 min | DNS provider access, TTL |
| **Total (without custom domain)** | **~12 min** | |
| **Total (with custom domain + DNS propagation)** | **~15-45 min** | |

**RTO Assessment**: Extremely fast. No database restoration, no file storage recovery, no cache warming, no search index rebuilding. The entire application is rebuilt from source code in a single Netlify deploy.

### Single Points of Failure

| SPOF | Impact | Mitigation | Residual Risk |
|---|---|---|---|
| GitHub (source code host) | Can't deploy new versions | Local Git clones preserve full history | Low — GitHub has 99.9%+ uptime; local clones exist |
| Netlify (hosting platform) | Site completely down | Static assets on CDN are resilient; full site is reproducible on another platform | Low — could migrate to Vercel/Cloudflare Pages |
| Anthropic API | Conspiracy generation fails; site loads but can't produce content | Circuit breaker prevents cascade; maintenance mode provides graceful degradation | Medium — no fallback AI provider; single vendor dependency |
| Single API key | Key compromise = site down until rotated | Can generate new key in minutes; no user data at risk | Low |
| DNS provider | Site unreachable by domain name | ⚠️ TEAM INPUT NEEDED: Is there a secondary DNS? | Unknown |

### Infrastructure Reproducibility

| Component | Defined as Code? | Reproducible from Repo? |
|---|---|---|
| Frontend build | ✅ Yes (`package.json`, `vite.config.ts`) | ✅ Yes |
| Serverless functions | ✅ Yes (`netlify/functions/`) | ✅ Yes |
| Build pipeline | ✅ Yes (`netlify.toml`) | ✅ Yes |
| Security headers | ✅ Yes (`netlify.toml`) | ✅ Yes |
| Redirects/routing | ✅ Yes (`netlify.toml`) | ✅ Yes |
| Function timeout | ✅ Yes (`netlify.toml`) | ✅ Yes |
| CI/CD | ✅ Yes (`.github/workflows/ci.yml`) | ✅ Yes |
| Dependency updates | ✅ Yes (`.github/dependabot.yml`) | ✅ Yes |
| ESLint config | ✅ Yes (`eslint.config.js`) | ✅ Yes |
| Environment variables | ⚠️ Documented (`.env.example`) | ⚠️ Values must be provided manually |
| Custom domain + DNS | ❌ No | ❌ Manual setup required |
| Netlify account/team | ❌ No | ❌ Manual setup required |

**Score: 95% reproducible from repository alone.** Only secrets and platform account setup require manual intervention.

---

## 5. Disaster Scenario Analysis

### Summary Table

| Scenario | Data Loss | Recovery Time | Complexity | Documented? |
|---|---|---|---|---|
| 1. "Database" destroyed | N/A — no database | N/A | N/A | N/A |
| 2. Application servers destroyed | None | ~12 min | Low | ✅ Yes (DISASTER_RECOVERY.md §2.1) |
| 3. File storage destroyed | N/A — no file storage | N/A | N/A | N/A |
| 4. Third-party service unavailable | No data loss; functionality degraded | Depends on provider | Medium | ✅ Yes (DISASTER_RECOVERY.md §5) |
| 5. Credential compromise | No data loss | ~5 min | Low | ✅ Yes (DISASTER_RECOVERY.md §2.3) |
| 6. Bad deploy / code corruption | None (Netlify rollback) | ~1 min | Very Low | ✅ Yes (DISASTER_RECOVERY.md §5.4) |

### Detailed Analysis

#### Scenario 1: Primary Database Destroyed
**Not applicable.** This project has no database. All data is ephemeral — generated per-request by the Anthropic API and held in client-side React state until the browser tab closes. There is zero persistent user data.

#### Scenario 2: Application Servers Destroyed
**Impact**: Site goes down entirely.
**Recovery path**: Create new Netlify site from GitHub repo. Set 1 environment variable. Deploy. Total: ~12 minutes.
**Data loss**: None — there is no server-side state to lose.
**Manual steps**: Create Netlify site, set `ANTHROPIC_API_KEY`, trigger deploy, optionally configure custom domain.
**What the on-call engineer needs**: GitHub access, Netlify account access, the Anthropic API key (or Anthropic console access to generate one).

#### Scenario 3: File Storage Destroyed
**Not applicable.** No file uploads, no object storage, no media. The cork texture is CSS-only. Fonts are loaded from Google Fonts CDN. All static assets are built from source code.

#### Scenario 4: Third-Party Service Permanently Unavailable

| Service | Impact | Local Data Sufficiency | Coupling Level |
|---|---|---|---|
| **Anthropic API** | Core functionality broken — cannot generate conspiracies. Static site still loads. | No local fallback. | **Tight** — the entire product value depends on this API. |
| **Google Fonts** | Fonts fall back to system fonts. Visual degradation only. | Font declarations in CSS provide fallback stacks. | **Loose** — graceful degradation. |
| **Netlify** | Site completely down. | Full repo + config exists to redeploy elsewhere (Vercel, Cloudflare Pages). | **Medium** — migration requires ~1 hour of work. |
| **GitHub** | Can't deploy new versions. Existing deploy unaffected. | Local Git clones have full history. | **Loose** — can switch to GitLab/Bitbucket. |

**Anthropic API is the only tightly-coupled external dependency.** If Anthropic permanently shuts down, the application would need to be rewritten to use a different AI provider (OpenAI, Google, etc.). The prompt engineering and response validation would need updating, but the frontend would remain unchanged.

#### Scenario 5: Credential Compromise
**Impact**: Unauthorized Anthropic API usage (cost impact). No user data exposure possible (none exists).
**Recovery**: Revoke key in Anthropic console → generate new key → update Netlify env → redeploy. ~5 minutes.
**Detection**: Unexpected charges on Anthropic billing. Unusual request patterns in Netlify function logs.
**Unique risk**: The API key is the *only* secret. If it's compromised, the attacker can make API calls at your expense, but cannot access any user data (there is none), modify the site (requires Netlify access), or read source code (requires GitHub access).

#### Scenario 6: Accidental Data Corruption / Bad Migration
**Impact**: Broken production site.
**Recovery**: Netlify immutable deploys → publish any previous deploy instantly. No rebuild required.
**Time**: Under 1 minute.
**PITR equivalent**: Netlify deploy history IS the point-in-time recovery mechanism — every deploy is preserved.
**Audit trail**: Git log shows what changed. Netlify deploy log shows who deployed and when.

This is the project's strongest DR capability. Netlify's immutable deploy model means any bad deploy can be instantly rolled back.

---

## 6. Documentation Generated

### Files Created

| File | Purpose |
|---|---|
| `docs/DISASTER_RECOVERY.md` | Step-by-step recovery procedures for 4 scenarios + playbooks for 4 incident types |
| `docs/BACKUP_RECOMMENDATIONS.md` | Prioritized recommendations with effort estimates + backup testing schedule |

### ⚠️ TEAM INPUT NEEDED Items

The following items in `docs/DISASTER_RECOVERY.md` require team input before the DR plan is complete:

| Item | Section | Why it matters |
|---|---|---|
| Custom domain configuration | §2.1 (Redeploy from Scratch) | Can't restore DNS without knowing the domain and provider |
| DNS provider details | §2.1, §5.1 | DNS is a SPOF — need to know who controls it |
| Netlify account owner | §6 (Emergency Contacts) | Someone needs to log in to recover the site |
| GitHub repository admin | §6 (Emergency Contacts) | Someone needs repo access for recovery |
| Anthropic account holder | §6 (Emergency Contacts) | Someone needs to generate new API keys |
| DNS provider admin | §6 (Emergency Contacts) | Someone needs DNS access if domain changes |
| On-call engineer | §6 (Emergency Contacts) | Who gets woken up at 3am? |
| Netlify 2FA backup codes location | §2.4 (Account Compromised) | Can't recover account without 2FA backup |

---

## 7. Recommendations

| # | Recommendation | Impact | Risk if Ignored | Worth Doing? | Details |
|---|---|---|---|---|---|
| 1 | Fill in emergency contacts in DISASTER_RECOVERY.md | DR plan becomes executable | **High** — plan exists but can't be followed if nobody knows who has access | Yes | 30 minutes of team time. The recovery procedures are documented; the "who" is not. |
| 2 | Verify multiple Git clones exist | Protects against total code loss | **High** — unlikely but catastrophic. Git repo is the only irreplaceable asset. | Yes | 5 minutes. Run `git fetch --dry-run` on a second machine to confirm clone is current. |
| 3 | Generate and document a backup API key | Faster incident response for credential compromise | **Medium** — new keys are easy to generate, but navigating the console under pressure adds delay | Probably | 5 minutes. Store the backup key securely outside of Netlify (password manager, etc.). |
| 4 | Set up uptime monitoring on `/api/health/ready` | Early detection of outages | **Medium** — without monitoring, you learn about downtime from user complaints | Probably | 15 minutes. UptimeRobot free tier is sufficient. Health endpoint already exists. |
| 5 | Enable 2FA on Netlify account | Prevents account takeover | **Medium** — Netlify account compromise = ability to inject code + steal API key | Probably | 5 minutes in Netlify settings. |
| 6 | Enable GitHub branch protection on `main` | Prevents accidental force-push | **Low** — unlikely for small team, but irreversible if it happens | Only if time allows | 10 minutes. Require PR reviews, prevent force push, require CI pass. |
| 7 | Set up Anthropic billing alerts | Early detection of credential compromise | **Low** — detects misuse before the bill arrives, but key compromise has no data risk for this app | Only if time allows | 5 minutes in Anthropic console billing settings. |
| 8 | Mirror Git repo to second provider | Redundancy against GitHub outage/suspension | **Low** — GitHub is highly reliable; local clones provide backup | Only if time allows | 15 minutes. GitLab offers free automatic mirroring. |

---

## 8. Conclusion

This project's stateless, serverless architecture is its greatest disaster recovery asset. The answer to "If the worst happened right now, could we recover?" is:

**Yes — in under 15 minutes, with zero data loss.**

The "worst" that could happen to this project is losing the Git repository with no remaining clones. Every other failure mode (hosting down, API key compromised, bad deploy, third-party outage) is recoverable in minutes with no data loss, because there is no persistent data to lose.

The gaps are operational, not technical:
- **Who** has access to recover? (Not documented)
- **When** will you know something is wrong? (No monitoring)
- **Where** is the backup API key? (Doesn't exist yet)

These are all solvable in under an hour of total effort.

---

## Appendix A: Comparison to Traditional Applications

For context, here's how this project compares to a typical web application on backup/DR concerns:

| Concern | Typical Web App | This Project |
|---|---|---|
| Database backup | Critical — hours of data at risk | N/A — no database |
| Database PITR | Essential for financial data | N/A |
| File storage backup | Important for user uploads | N/A — no uploads |
| Session store redundancy | Needed for user experience | N/A — no sessions |
| Cache warming after recovery | Can take hours for large caches | N/A — no caches |
| Search index rebuild | Can take hours for large indexes | N/A — no search index |
| Message queue replay | Risk of lost transactions | N/A — no queues |
| Multi-AZ/region failover | Critical for high availability | Handled by Netlify CDN |
| Secrets rotation | Complex with many secrets | Simple — 1 API key |
| Infrastructure as code | Partially — often drift | 95% — almost everything in repo |
| Recovery time estimate | Hours to days | 12-15 minutes |
| Data loss risk | High without proper backups | Near-zero by architecture |

## Appendix B: Pre-existing Operational Documentation

This project already has strong operational documentation:

| Document | What it covers |
|---|---|
| `docs/RUNBOOKS.md` | 10 operational runbooks for all identified failure modes |
| `CLAUDE.md` | Complete technical reference including architecture, env vars, and pitfalls |
| `.env.example` | Documented environment variables with descriptions |
| `netlify.toml` | Infrastructure-as-code for build, functions, security headers, redirects |
| `.github/workflows/ci.yml` | CI pipeline with lint, typecheck, test, and daily security audit |

The disaster recovery documentation generated by this audit fills the remaining gap: **what to do when infrastructure itself fails**, rather than when the application misbehaves within working infrastructure.
