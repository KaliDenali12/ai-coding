# Disaster Recovery Plan — Conspiracy Board

> **Last updated**: 2026-03-13
> **Architecture**: Stateless SPA on Netlify (CDN + serverless functions). No database. No persistent storage.

This document is written for someone stressed, tired, and unfamiliar with the system at 3am. Follow the steps exactly.

---

## 1. Data Store Inventory

| Data Store | Type | Criticality | Backup Method | Frequency | Location | RPO | RTO |
|---|---|---|---|---|---|---|---|
| Git repository (GitHub) | Source code | **Irreplaceable** | GitHub (remote) + local clones | Every push | GitHub cloud + developer machines | Near-zero (last push) | Minutes |
| Netlify site config | Platform config | Reconstructable | None (manual) | N/A | Netlify dashboard | N/A | 15-30 min |
| `ANTHROPIC_API_KEY` | Secret | Reconstructable | None | N/A | Netlify dashboard + Anthropic console | N/A | 5 min |
| Netlify build logs | Logs | Ephemeral | Netlify retention | Automatic | Netlify | N/A | N/A |
| Netlify function logs | Logs | Ephemeral | Netlify → CloudWatch | Automatic | AWS CloudWatch | N/A | N/A |
| In-memory rate limiter | Runtime state | Ephemeral | None (by design) | N/A | Per function instance | N/A | N/A |
| In-memory circuit breaker | Runtime state | Ephemeral | None (by design) | N/A | Per function instance | N/A | N/A |
| Client-side React state | User session | Ephemeral | None (by design) | N/A | User's browser | N/A | N/A |

**Key insight**: The only irreplaceable asset is the **source code in Git**. Everything else is either reconstructable from the repo or ephemeral by design.

---

## 2. Recovery Procedures

### 2.1 Complete Site Down — Redeploy from Scratch

**When**: Netlify site is deleted, corrupted, or inaccessible.

**Prerequisites**:
- Access to GitHub repository
- A Netlify account
- An Anthropic API key (from https://console.anthropic.com)

**Steps**:

1. **Create new Netlify site**
   - Go to https://app.netlify.com → "Add new site" → "Import an existing project"
   - Connect to GitHub → select the `conspiracy-board` repository
   - Branch: `main`
   - Build command: `npm rebuild esbuild && npm audit --audit-level=high && npm test && npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

2. **Set environment variables**
   - Go to Site settings → Environment variables
   - Add `ANTHROPIC_API_KEY` = your API key (starts with `sk-ant-`)
   - Optionally add `ANTHROPIC_TIMEOUT_MS` = `25000`

3. **Configure function timeout**
   - This is already in `netlify.toml` (26s) — no manual config needed

4. **Trigger deploy**
   - Go to Deploys → "Trigger deploy" → "Deploy site"

5. **Verify**
   - Wait for build to complete (typically 1-2 minutes)
   - Visit site URL — landing screen should appear
   - Hit `/api/health` — should return `{"status":"healthy"}`
   - Hit `/api/health/ready` — should return 200
   - Submit a test conspiracy (e.g., "Pizza" and "Moon") — should generate a board

6. **Update DNS** (if using custom domain)
   - ⚠️ TEAM INPUT NEEDED: Custom domain configuration, DNS provider, and nameserver details

**Estimated total time**: 10-15 minutes (assuming GitHub and Anthropic access)

### 2.2 GitHub Repository Lost

**When**: Repository deleted, account compromised, or GitHub outage.

**Steps**:

1. **Check for local clones**
   - Any developer who has cloned the repo has a full copy including all history
   - Run `git log --oneline -5` to verify it's current

2. **Create new remote**
   - Create new GitHub repository (or use GitLab, Bitbucket as fallback)
   - `git remote set-url origin <new-repo-url>`
   - `git push --all origin`
   - `git push --tags origin`

3. **Update Netlify**
   - Site settings → Build & deploy → Link to new repository

4. **Verify**: Trigger a deploy from the new remote

**Estimated time**: 5-10 minutes (if a local clone exists)

**If NO local clone exists**: The codebase is lost. This is the only true catastrophic scenario for this project.

### 2.3 Anthropic API Key Compromised

**When**: Key leaked, unauthorized usage detected, or key revoked.

**Steps**:

1. **Revoke the compromised key immediately**
   - Go to https://console.anthropic.com → API Keys → Revoke the key
   - ⚠️ This will cause ALL requests to fail with 500 (auth_failure) immediately

2. **Generate a new key**
   - Same console → Create new API key
   - Copy the key (you can only see it once)

3. **Update Netlify**
   - Netlify dashboard → Site settings → Environment variables
   - Update `ANTHROPIC_API_KEY` with the new key

4. **Redeploy** (environment variable changes require a new deploy)
   - Deploys → "Trigger deploy" → "Clear cache and deploy site"

5. **Verify**
   - `/api/health/ready` returns 200
   - Submit a test conspiracy

**Estimated time**: 5 minutes
**Expected downtime**: 2-5 minutes between revoking old key and deploying with new key

### 2.4 Netlify Account Compromised

**Steps**:

1. **Change Netlify account password immediately**
2. **Enable 2FA** if not already enabled
3. **Review deploy logs** — check for unauthorized deploys
4. **Rotate ALL environment variables** (follow 2.3 for API key)
5. **Check redirects/headers** in Netlify dashboard — ensure no malicious changes
6. **Verify site content** — compare deployed site against latest `main` commit
7. **If site was modified**: Trigger a clean deploy from `main`

⚠️ TEAM INPUT NEEDED: Netlify account owner, recovery email, 2FA backup codes location

---

## 3. Infrastructure Recreation

### What can be recreated from the repository alone

| Component | Source | Manual Steps Needed? |
|---|---|---|
| Frontend application | `src/` + `package.json` + `vite.config.ts` | No |
| Serverless function | `netlify/functions/generate.ts` | No |
| Health check endpoint | `netlify/functions/health.ts` | No |
| Build configuration | `netlify.toml` | No |
| Security headers (CSP, etc.) | `netlify.toml` | No |
| Redirects (/api/* → functions) | `netlify.toml` | No |
| Function timeout (26s) | `netlify.toml` | No |
| CI/CD pipeline | `.github/workflows/ci.yml` | No |
| Dependabot config | `.github/dependabot.yml` | No |
| ESLint config | `eslint.config.js` | No |
| TypeScript config | `tsconfig*.json` | No |

### What requires manual setup

| Component | Where to configure | Details |
|---|---|---|
| `ANTHROPIC_API_KEY` | Netlify dashboard → Environment variables | Get from https://console.anthropic.com |
| `ANTHROPIC_TIMEOUT_MS` | Netlify dashboard → Environment variables | Optional, default 25000 |
| `MAINTENANCE_MODE` | Netlify dashboard → Environment variables | Optional, set to `"true"` for kill switch |
| Netlify site linking | Netlify dashboard | Connect to GitHub repo |
| Custom domain | Netlify dashboard + DNS provider | ⚠️ TEAM INPUT NEEDED |
| SSL certificate | Netlify (automatic with Let's Encrypt) | Auto-provisioned for custom domains |
| GitHub → Netlify webhook | Automatic on site creation | Re-created when linking repo |

---

## 4. Credential Rotation Procedures

### ANTHROPIC_API_KEY

| Field | Detail |
|---|---|
| Location | Netlify dashboard → Environment variables |
| Generation | https://console.anthropic.com → API Keys → Create key |
| Dependent services | `netlify/functions/generate.ts` (auto-reads from `process.env`) |
| Expected downtime | 2-5 minutes (deploy required after update) |
| Rotation steps | See Section 2.3 above |

### GitHub Personal Access Token (if used for Netlify integration)

| Field | Detail |
|---|---|
| Location | ⚠️ TEAM INPUT NEEDED |
| Generation | GitHub → Settings → Developer settings → Personal access tokens |
| Dependent services | Netlify deploy hook |
| Expected downtime | None (deploys queue until token is updated) |

---

## 5. Disaster Response Playbooks

### Playbook 1: Site Completely Down

**Detection**: Users report site not loading, or uptime monitor fires
**Triage**:
1. Is it Netlify? → Check https://www.netlifystatus.com/
2. Is it DNS? → `nslookup <your-domain>` — does it resolve?
3. Is it the function? → Does the static site load but API calls fail?

**Recovery**:
- If Netlify outage → Wait. Static site is on CDN, should be resilient. Function may be affected.
- If site deleted → Follow Section 2.1 (Redeploy from Scratch)
- If DNS issue → ⚠️ TEAM INPUT NEEDED: DNS provider and configuration

**Verification**: Landing page loads + `/api/health` returns healthy + test conspiracy generates

### Playbook 2: API Calls Failing (Site Loads, But No Conspiracies Generate)

**Detection**: Users see error screen after submitting concepts
**Triage**:
1. Hit `/api/health/ready` — is it 200 or 503?
2. Check Netlify function logs for error events
3. Look for: `auth_failure`, `timeout`, `api_rate_limited`, `circuit_open`

**Recovery by error type**:
| Error | Log event | Fix |
|---|---|---|
| Auth failure | `auth_failure` + `CRITICAL` | Rotate API key (Section 2.3) |
| Timeout | `timeout` | Check https://status.anthropic.com; increase `ANTHROPIC_TIMEOUT_MS` if needed |
| Rate limited | `api_rate_limited` | Anthropic rate limit hit — wait, or upgrade plan |
| Circuit open | `circuit_open` | Upstream issue triggered breaker — will auto-reset after 30s cooldown |
| Maintenance mode | `maintenance_mode` | Intentional — set `MAINTENANCE_MODE` to empty string and redeploy |

### Playbook 3: Suspected Security Breach

**Detection**: Unexpected API charges, unauthorized deploys, or leaked credentials
**Triage**:
1. Check Anthropic console for unexpected usage
2. Check Netlify deploy history for unauthorized deploys
3. Check GitHub audit log for unauthorized access

**Recovery**:
1. **Immediately** revoke API key (Section 2.3)
2. **Immediately** change Netlify account password + enable 2FA
3. Check GitHub for unauthorized commits or branches
4. Review Netlify headers/redirects for injected content
5. Deploy clean build from verified `main` commit
6. Generate new API key and deploy

### Playbook 4: Bad Deploy (Broken Code in Production)

**Detection**: Site errors after a deploy
**Recovery**:
1. **Netlify instant rollback**: Deploys → find last known good deploy → "Publish deploy"
2. This is instant — no rebuild needed
3. Fix the code on a branch, test, then merge to `main`

**This is Netlify's strongest DR feature** — every deploy is immutable and instantly rollback-able.

---

## 6. Emergency Contacts & Access

| Role | Person | Contact |
|---|---|---|
| Netlify account owner | ⚠️ TEAM INPUT NEEDED | ⚠️ TEAM INPUT NEEDED |
| GitHub repository admin | ⚠️ TEAM INPUT NEEDED | ⚠️ TEAM INPUT NEEDED |
| Anthropic account holder | ⚠️ TEAM INPUT NEEDED | ⚠️ TEAM INPUT NEEDED |
| DNS provider admin | ⚠️ TEAM INPUT NEEDED | ⚠️ TEAM INPUT NEEDED |
| On-call engineer | ⚠️ TEAM INPUT NEEDED | ⚠️ TEAM INPUT NEEDED |

### Access Requirements for Recovery

| System | Access needed | Who has it |
|---|---|---|
| GitHub (repository) | Write access to `main` | ⚠️ TEAM INPUT NEEDED |
| Netlify (hosting) | Admin or site owner role | ⚠️ TEAM INPUT NEEDED |
| Anthropic console | Account access for key generation | ⚠️ TEAM INPUT NEEDED |
| DNS provider | Record edit access | ⚠️ TEAM INPUT NEEDED |

---

## Appendix: Architecture Diagram

```
User Browser                    Netlify CDN              Netlify Functions         Anthropic API
┌──────────┐                  ┌───────────┐            ┌──────────────┐          ┌────────────┐
│  React   │ ──GET index──→   │  Static   │            │              │          │            │
│  SPA     │ ←──HTML/JS/CSS── │  Assets   │            │              │          │            │
│          │                  │  (dist/)  │            │              │          │            │
│          │ ──POST /api/──→  │  ─proxy─→ │ ──invoke─→ │  generate.ts │ ──API──→ │  Claude    │
│          │ ←──JSON──────    │           │ ←──────    │  health.ts   │ ←──────  │  Sonnet    │
└──────────┘                  └───────────┘            └──────────────┘          └────────────┘
   (ephemeral                    (rebuilt from            (rebuilt from            (external,
    state only)                   repo on deploy)          repo on deploy)          no local data)
```

**No persistent data flows exist.** Every piece of data in this system is either:
1. In the Git repository (source of truth)
2. Transiently in memory during a request
3. Displayed in the user's browser until they close the tab
