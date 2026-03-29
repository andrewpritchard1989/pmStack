# Analytics Implementation Plan

PMStack has local analytics infrastructure in place but no remote aggregation. This document captures the full implementation plan for adding opt-in anonymous usage telemetry so the maintainer can see how the tool is being used across all installs.

## Current state

Local analytics already work. Every skill run appends a JSON record to `~/.pmstack/analytics/skill-usage.jsonl`. The `bin/pmstack-telemetry-log` binary handles the full event lifecycle including crash detection via pending markers. The config key `telemetry` controls the tier (`off` by default, `anonymous`, or `community`).

What is missing: a sync script to send local events to a remote server, the server itself, and an opt-in prompt during setup.

## Architecture

```
User's machine                          Your server
─────────────────────────────────       ──────────────────────────────
skill runs                              POST /events
  → pmstack-telemetry-log               → validate + strip sensitive fields
    → skill-usage.jsonl                 → SQLite (telemetry.db)
  → pmstack-telemetry-sync (bg)
    → strips sensitive fields     ───▶  GET /stats
    → POST /events                      → aggregate view by skill,
    → updates .sync-cursor                outcome, version, platform
```

## What is collected

| Field | Collected | Notes |
|---|---|---|
| `skill` | yes | e.g. "office-hours", "cpo-review" |
| `duration_s` | yes | how long the skill ran |
| `outcome` | yes | success / error / abort / unknown |
| `pmstack_version` | yes | version string from VERSION file |
| `os` | yes | darwin / linux / windows |
| `arch` | yes | arm64 / x86_64 etc |
| `used_browse` | yes | boolean — was the browse tool used |
| `error_class` | yes | generic error category, no message |
| `failed_step` | yes | which step failed, no file paths |
| `sessions` | yes | count of recent active sessions |
| `ts` | yes | UTC timestamp of the event |

## What is never collected

| Field | Reason |
|---|---|
| `_repo_slug` | reveals project/company name |
| `_branch` | reveals feature or internal names |
| `session_id` | could link sessions on same machine |
| `error_message` | may contain file paths or project names |
| `source` | internal flag, not useful for aggregation |
| IP address | server must not log this |

Sensitive field stripping happens client-side in `pmstack-telemetry-sync` before the POST. The server performs a second strip on receipt and rejects events that still contain those fields.

## Files to create

### `bin/pmstack-telemetry-sync`

Bash script. Called by the preamble in background after `pmstack-telemetry-log` runs.

Logic:
1. Read `telemetry` tier from config — exit 0 if `off` or empty
2. Resolve endpoint: `PMSTACK_TELEMETRY_ENDPOINT` env var, then `pmstack-config get telemetry_endpoint`, then default `https://telemetry.pmstack.dev`
3. Read cursor from `~/.pmstack/analytics/.sync-cursor` (integer line number, default 0)
4. If `skill-usage.jsonl` doesn't exist or cursor >= total lines, exit 0
5. Read lines from cursor+1 to EOF, cap at 500 lines
6. Parse and strip sensitive fields using bun (preferred) or python3 — skip malformed lines
7. Build payload: `{"events": [...], "batch_size": N}`
8. POST with curl: max-time 10s, connect-timeout 5s, `Content-Type: application/json`, `X-PMStack-Version: <version>`
9. Advance cursor only on HTTP 2xx
10. Never exit non-zero

Env overrides: `PMSTACK_DIR`, `PMSTACK_STATE_DIR`, `PMSTACK_TELEMETRY_ENDPOINT`

### `server/src/index.ts`

Bun HTTP server with SQLite persistence (using `bun:sqlite` — no external dependencies).

Endpoints:
- `POST /events` — receives event batch, validates, stores. Returns `{"accepted": N, "rejected": N}`.
- `GET /stats` — aggregate view (see Stats response below). Can be public or bearer-token protected.
- `GET /health` — liveness check for Fly.io health checks

Rate limiting: 10 batches per IP per minute using an in-memory map with TTL cleanup.

Input validation on `/events`:
- `skill` required, must match `/^[a-z0-9-]{1,50}$/`
- `outcome` must be one of: success, error, abort, unknown
- `event_type` must be `skill_run`
- `duration_s` must be 0–86400
- `pmstack_version` must match `/^[0-9a-z._-]{1,20}$/`
- Reject (not just strip) events that still contain `_repo_slug`, `_branch`, `session_id`, or `error_message`
- Batch max: 500 events

Stats response shape:
```json
{
  "total": 1234,
  "bySkill": [{"skill": "office-hours", "count": 456, "success_rate": 0.92, "avg_duration_s": 180}],
  "byVersion": [{"pmstack_version": "0.1.0", "count": 1234}],
  "byPlatform": [{"os": "darwin", "arch": "arm64", "count": 890}],
  "byOutcome": [{"outcome": "success", "count": 1100}],
  "recentByDay": [{"date": "2026-03-29", "count": 42}],
  "period": {"first_event": "...", "last_event": "..."}
}
```

SQLite schema:
```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT NOT NULL,
  v INTEGER,
  ts TEXT,
  event_type TEXT,
  skill TEXT,
  pmstack_version TEXT,
  os TEXT,
  arch TEXT,
  duration_s REAL,
  outcome TEXT,
  error_class TEXT,
  failed_step TEXT,
  used_browse INTEGER,
  sessions INTEGER
);
CREATE INDEX idx_skill ON events (skill);
CREATE INDEX idx_outcome ON events (outcome);
CREATE INDEX idx_ts ON events (ts);
CREATE INDEX idx_received_at ON events (received_at);
```

### `server/package.json`

```json
{
  "name": "pmstack-telemetry-server",
  "version": "0.1.0",
  "description": "Aggregated telemetry server for PMStack",
  "type": "module",
  "scripts": {
    "start": "bun run src/index.ts",
    "dev": "bun --watch src/index.ts"
  },
  "engines": { "bun": ">=1.0.0" }
}
```

### `server/fly.toml`

```toml
app = "pmstack-telemetry"
primary_region = "lax"

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1

[[mounts]]
  source = "telemetry_data"
  destination = "/app/data"
```

## Files to modify

### `scripts/resolvers/preamble.ts`

Two changes:

**1. `generatePreambleBash()`** — replace the final `echo` line (which writes directly to skill-usage.jsonl) with a pending marker write:

```typescript
// Replace:
echo '{"skill":"${ctx.skillName}","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"...'  >> ~/.pmstack/analytics/skill-usage.jsonl 2>/dev/null || true

// With:
printf '{"skill":"${ctx.skillName}","ts":"%s","session_id":"%s"}\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$_SESSION_ID" \
  > ~/.pmstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
```

**2. `generateCompletionStatus(ctx: TemplateContext)`** — add ctx parameter, replace the raw echo with pmstack-telemetry-log + background sync:

```typescript
// Replace the echo line with:
${ctx.paths.binDir}/pmstack-telemetry-log \
  --skill ${ctx.skillName} \
  --duration "$_TEL_DUR" \
  --outcome OUTCOME \
  --session-id "$_SESSION_ID" \
  2>/dev/null || true
(${ctx.paths.binDir}/pmstack-telemetry-sync --session-id "$_SESSION_ID" >/dev/null 2>&1 &)
```

Update instruction text: "Replace `OUTCOME` with success/error/abort based on how the skill completed."

Update call site in `generatePreamble()`: `generateCompletionStatus(ctx)`.

After changes, run `bun run gen:skill-docs` to regenerate all SKILL.md files.

### `setup`

Add telemetry opt-in prompt after the default `config.yaml` creation block (around line 138, before the helper functions). Only runs on first install (guard: check if `telemetry:` key already exists in config).

Prompt design:
- Show a box with COLLECTED / NEVER COLLECTED sections
- Mention opt-out command: `pmstack-config set telemetry off`
- Default answer: N (no)
- On yes: append `telemetry: anonymous` to config
- On no: append `telemetry: off` to config

## Deployment steps

1. Register the `pmstack.dev` domain (or use any domain you own)
2. Create a subdomain: `telemetry.pmstack.dev`
3. Deploy the server: `cd server && fly auth login && fly launch`
4. Point DNS to the Fly.io app IP
5. Verify: `curl https://telemetry.pmstack.dev/health`

The default endpoint in `pmstack-telemetry-sync` is `https://telemetry.pmstack.dev`. If you use a different domain, update that default or set it in the setup script via `pmstack-config set telemetry_endpoint <url>`.

## Viewing analytics

Once deployed, query the stats endpoint:

```bash
# All-time aggregate
curl https://telemetry.pmstack.dev/stats | jq .

# Most-used skills
curl https://telemetry.pmstack.dev/stats | jq '.bySkill[] | {skill, count, success_rate}'

# Daily trend (last 30 days)
curl https://telemetry.pmstack.dev/stats | jq '.recentByDay'
```

## Open decisions before shipping

1. **Auth on `/stats`** — currently public. Anyone who knows the URL can read aggregate stats. Fine for an open-source project (data is anonymous), but you could add a simple bearer token check if you prefer.

2. **Domain** — `pmstack.dev` is not yet registered. Confirm the domain before hardcoding it as the default endpoint.

3. **Opt-in messaging** — the current prompt shows a box with what is/isn't collected. Review the exact wording before it goes in front of users.

4. **Tier distinction** — `anonymous` and `community` are both defined as tiers but currently collect the same fields. Decide if `community` should collect anything additional (e.g. locale, skill flow sequences) or remove the distinction.

5. **Local-only logging** — the current codebase still writes to `skill-usage.jsonl` regardless of tier. Decide whether local logging should also require opt-in, or if local-only logging with no remote sync is acceptable without consent.

---

All code for this feature was written and validated. To ship, restore the files described above, deploy the server, and register the domain.
