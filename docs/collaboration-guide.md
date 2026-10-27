# KutirGRS: Working Together in Cursor

Answers to how two developers can collaborate on this Project and the [KutirGRS](https://github.com/digoyal/KutirGRS) repo.

---

## 1. How do I add another developer?

Two layers: the **GitHub repo** and **Cursor**.

### Code (always)

On [github.com/digoyal/KutirGRS](https://github.com/digoyal/KutirGRS) → **Settings → Collaborators** (or an org team) → invite their GitHub account. They clone, run locally, and open PRs as usual.

### Cursor (agents / this Project)

There is no separate “invite to this Project” button in the docs. Collaboration goes through your **Cursor team**:

1. Open [cursor.com/dashboard](https://cursor.com/dashboard) → **Invite Members**
2. Enter their email → role **Member** (or Admin)
3. They accept and sign in with the same Cursor account they use in the app

They need a plan that includes Cloud Agents / Projects. Project **Context** visibility for a teammate is not automatic (see §5).

### Their machine

They install the Cursor CLI, run `agent login`, clone the repo, and can run `agent worker start` on their own machine if agents should execute there. Your Mac worker stays yours.

**Practical minimum:** GitHub collaborator + Cursor team invite (if they will use Cursor with you).

---

## 2. How do we avoid overwriting each other’s changes?

Use **Git branches + pull requests** as the source of truth — not two people editing the same local checkout.

### Rules

1. **Never both commit to `main`.** Each person (and each agent) works on a named branch, opens a PR, reviews, then merges.
2. **One branch per task.** e.g. `fix/scope-idor`, `feat/donors-page` — short-lived, merge often.
3. **Pull before you start / before you push.** Build on the latest `main`.
4. **If two PRs touch the same files**, merge one first; the other rebases onto `main` and resolves conflicts once in Git.
5. **Don’t share one working tree.** Each person has their own clone (or worktree). Agents on your Mac only touch *your* checkout; his machine/agents touch *his*. Cloud agents get their own branch/VM.

### Day-to-day

| You | Them |
|-----|------|
| Branch → change → PR | Branch → change → PR |
| Review each other’s PRs | Same |
| Merge to `main` when green | Pull `main` before next task |

### With this Cursor Project

Tell the coordinator which branch/PR a task owns. Agent work should land on a **new branch + PR**, not straight onto `main`.

**Optional hardening:** protect `main` on GitHub (require PR + 1 review; no direct pushes).

---

## 3. Does he need his own subscription?

Depends how he will work:

| Mode | Cursor subscription? |
|------|----------------------|
| **GitHub only** (clone, code, PRs) | No — any editor is fine |
| **Cursor Team with you** | No separate personal sub required — he uses a **team seat** on your shared bill |
| **You stay on an individual plan** | Yes — he needs his **own** Cursor account on a plan that includes Cloud Agents/Projects |

Git collaboration never requires Cursor. Team seat = one shared bill; no team = he pays for his own (or you both keep separate individual plans).

---

## 4. What is Teams seat pricing?

**Teams** is billed **per active paid seat** ([Team Pricing docs](https://cursor.com/docs/account/teams/pricing)):

| Seat | Price | Rough fit |
|------|-------|-----------|
| **Premium** | **$30**/user/mo | Everyday coding + Cloud Agents |
| **Super** | **$100**/user/mo | Heavy daily agent use (~3.75× Premium usage) |
| **Ultra** | **$200**/user/mo | Power users / many agents (~12.5× Premium) |
| **Free** | **$0** | No team usage pool (uses their personal plan / free allowance) |

- You can **mix tiers**. Mid-cycle adds are **pro-rated**. Taxes extra.
- Included weekly usage is **per person** (not shared between seats).
- Extra usage and most third-party models come from a **team prepaid balance** (API list price + Cursor Token Rate on eligible models).

**Example for two people:** 2× Premium ≈ **$60/mo** on one bill, or one Premium + one Free if he only needs GitHub and light personal Cursor.

**Legacy teams** (created before the current plan): Standard **$40** / Premium **$120** per user/mo until they switch.

Enterprise is custom (invoicing, pooled usage, etc.). Live numbers: [cursor.com/pricing](https://cursor.com/pricing).

---

## 5. How is context shared on a Team?

**Short answer:** a Cursor Team does **not** automatically give him this Project’s Context (notes, AUDIT.md, preferences).

Today, Project Context syncs across **agents and machines for that Project** — not as a multi-user “team Project.” Team-owned shared Projects have been discussed publicly but are not the normal path yet.

### What a Team *does* share

- Billing / seats, admin, privacy mode, SSO
- **Team marketplace:** rules, skills, plugins you publish for the org
- Same **GitHub repo** access (if you grant it)
- Shared chat **links** (transcript share — not live co-editing one chat)

### What stays yours unless you put it in git

This Project’s Context — notes, AUDIT.md, agents notes, preferences — is **this Project’s store**. He won’t see it just because he’s on the team.

### How you two should share context today

1. **Repo as source of truth** — keep `AGENTS.md`, `docs/AUDIT.md`, `docs/KutirGRS_PRD.md`, and a short CONTRIBUTING in git. Both pull → both (and both agents) have it.
2. **Branches + PRs** — code and review, not one shared working tree.
3. **Optional:** duplicate important decisions into team Rules / a shared doc; share chat links when useful.

**Bottom line:** Team = same Cursor org + billing + team rules. Collaboration memory for KutirGRS should live in the **repo** (and PRs), not only in this Project’s Context — until shared Projects ship.

---

## Quick checklist

- [ ] Add them as a GitHub collaborator on KutirGRS
- [ ] (Optional) Create/join a Cursor Team and invite them with a seat
- [ ] Agree: branches + PRs only; protect `main`
- [ ] Keep durable docs in the repo (`AGENTS.md`, audit, requirements, this guide)
- [ ] Each person uses their own clone / machine / worker

---

*Compiled 23 Oct 2026 from Project chat. Pricing and product behavior can change — verify on [cursor.com/pricing](https://cursor.com/pricing) and [Team Pricing docs](https://cursor.com/docs/account/teams/pricing).*
