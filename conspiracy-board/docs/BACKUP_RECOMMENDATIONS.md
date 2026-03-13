# Backup & Resilience Recommendations — Conspiracy Board

> **Last updated**: 2026-03-13
> **Context**: Stateless SPA on Netlify. No database, no persistent user data.

---

## Current State

This application has an unusually favorable disaster recovery posture due to its architecture:

- **No database** → no database backups needed
- **No user data stored** → no PII/data loss risk
- **No file uploads** → no object storage to back up
- **Fully stateless** → entire application is reproducible from Git + 1 API key
- **Netlify's immutable deploys** → instant rollback to any previous deploy

The primary risk is **loss of the source code repository**, which is mitigated by Git's distributed nature (every clone is a full backup).

---

## Recommendations

### Priority 1: Essential (Do These)

#### 1.1 Document Emergency Access

**What**: Fill in all `⚠️ TEAM INPUT NEEDED` sections in `docs/DISASTER_RECOVERY.md`
**Why**: The recovery plan exists but can't be executed if nobody knows who has access to what at 3am
**Effort**: 30 minutes
**Tooling**: None — just fill in the table

#### 1.2 Ensure Multiple Git Clones Exist

**What**: Verify that at least 2 team members have recent local clones of the repository
**Why**: If GitHub goes down or the repo is deleted, a local clone is the only backup
**Effort**: 5 minutes
**Tooling**: `git clone` — no special backup tooling needed

#### 1.3 Store a Backup API Key

**What**: Generate a second Anthropic API key and document where it's stored
**Why**: If the primary key is compromised and revoked, you need a replacement immediately — not after navigating Anthropic's console under pressure
**Effort**: 5 minutes
**Tooling**: Anthropic console

### Priority 2: Recommended (Do If Time Allows)

#### 2.1 Set Up Uptime Monitoring

**What**: Configure a free uptime monitor (UptimeRobot, Better Stack, or similar) to ping `/api/health/ready`
**Why**: You'll know the site is down before users report it. The health endpoint already exists and returns proper status codes.
**Effort**: 15 minutes
**Tooling**: UptimeRobot (free tier), Better Stack, or Netlify's built-in analytics

#### 2.2 Enable Netlify 2FA

**What**: Enable two-factor authentication on the Netlify account
**Why**: Netlify account compromise = ability to inject malicious code into deployed site, steal API keys from env vars
**Effort**: 5 minutes
**Tooling**: Netlify dashboard → User settings → Security

#### 2.3 Enable GitHub Branch Protection

**What**: Protect the `main` branch — require PR reviews, prevent force push, require CI to pass
**Why**: Prevents accidental force-push that could rewrite history and lose code
**Effort**: 10 minutes
**Tooling**: GitHub → Settings → Branches → Branch protection rules

### Priority 3: Nice to Have

#### 3.1 Mirror Repository to a Second Provider

**What**: Set up an automatic mirror to GitLab or Bitbucket
**Why**: Protects against GitHub-specific outages or account suspension. Overkill for most projects, but near-zero effort.
**Effort**: 15 minutes
**Tooling**: GitLab's repository mirroring (free), or a simple cron job with `git push --mirror`

#### 3.2 Anthropic API Spending Alert

**What**: Set up billing alerts on the Anthropic account
**Why**: Detects credential compromise (unexpected usage spike) before the bill arrives
**Effort**: 5 minutes
**Tooling**: Anthropic console → Billing settings

---

## What NOT to Implement

The following are standard backup recommendations that are **not applicable** to this project:

| Recommendation | Why it doesn't apply |
|---|---|
| Database backup schedule | No database exists |
| Database point-in-time recovery | No database exists |
| File storage backup (S3 versioning, etc.) | No file storage exists |
| Search index rebuild procedure | No search index exists |
| Session store backup | No session store — fully stateless |
| Message queue dead letter monitoring | No message queues |
| Disaster recovery site / multi-region | Netlify CDN already handles this |
| Container/VM image backups | Serverless — no servers to image |
| Log backup/archival | Logs are operational, not business data |

---

## Backup Testing Schedule

Given the minimal backup surface, testing is simple:

| Test | Frequency | How |
|---|---|---|
| Verify local Git clone is current | Monthly | `git fetch --dry-run` on a second machine |
| Verify Netlify rollback works | After any incident | Deploys → publish a previous deploy → verify site works → publish latest again |
| Verify backup API key works | Quarterly | Temporarily set backup key in Netlify env, trigger deploy, test, revert |
| Verify new site creation from scratch | Annually | Create a test site on Netlify from the repo (can be deleted after) |

---

## Summary

This project's architecture is its best disaster recovery feature. A stateless application with no persistent data and infrastructure-as-code means the entire system can be recreated from a Git clone and one API key in under 15 minutes. The main gaps are operational (documenting who has access to what) rather than technical.
