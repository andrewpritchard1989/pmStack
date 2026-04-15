# Implementation Plan: Parallel Browser Execution for Competitive Intel

## What this does

Adds a `POST /batch` endpoint to the browse server (`browse/src/server.ts`) that accepts
an array of commands and executes them concurrently across multiple browser contexts.
Then updates the `/pm-competitive-intel` skill to use this endpoint when profiling
multiple competitors simultaneously — reducing research time from O(n×serial) to roughly
O(1 round-trip) for the browse-heavy phases.

## Why this matters for competitive-intel

`/pm-competitive-intel` currently profiles 3-5 Tier 1 competitors sequentially. For each
competitor it may browse their product page, changelog, and review aggregator pages.
That is 9-15 sequential browser calls. With batch execution, all competitor homepages
can be fetched in a single round-trip, and per-competitor deep-dives can be parallelised
across tabs.

Note: Phase 1-3 of `competitive-intel` relies primarily on `WebSearch`, not the browse
binary. The browse binary is used in Phase 2 only when competitors have a publicly
accessible trial or free tier. The batch endpoint is most impactful there — when the PM
wants to screenshot and navigate 4-5 competitor products in the same session.

## Current browse server architecture

The browse server lives in `browse/src/server.ts`. It exposes an HTTP server on a
local port (default 3456, written to `~/.pmstack/.browse/port`). The CLI (`browse/src/cli.ts`)
sends commands to this server as HTTP requests.

Commands are handled sequentially per tab. The server maintains a single
`BrowserManager` instance (`browse/src/browser-manager.ts`) with a tab pool.

Read these files fully before implementing:
- `browse/src/server.ts` — understand the existing request/response format
- `browse/src/browser-manager.ts` — understand how tabs are managed and how to open
  parallel tabs safely
- `browse/src/commands.ts` — understand how individual commands are dispatched
- `browse/src/cli.ts` — understand how the CLI sends commands, so the batch endpoint
  can be called the same way

## Part 1: Add `POST /batch` to `browse/src/server.ts`

### Endpoint spec

```
POST /batch
Content-Type: application/json

{
  "commands": [
    { "tab": "tab_1", "cmd": "goto", "args": ["https://competitor-a.com"] },
    { "tab": "tab_2", "cmd": "goto", "args": ["https://competitor-b.com"] },
    { "tab": "tab_3", "cmd": "goto", "args": ["https://competitor-c.com"] }
  ],
  "timeout_ms": 30000
}
```

Response:
```json
{
  "results": [
    { "tab": "tab_1", "output": "...", "error": null },
    { "tab": "tab_2", "output": "...", "error": null },
    { "tab": "tab_3", "output": "Timeout after 30000ms", "error": "timeout" }
  ]
}
```

### Implementation in `browse/src/server.ts`

Add a route handler for `POST /batch`. Find the existing route handler block (look for
where `goto`, `text`, `snapshot` etc. are handled) and add the batch endpoint alongside
the existing routes.

The handler should:

1. Parse the request body as JSON
2. Validate that `commands` is a non-empty array (max 20 items — guard against runaway
   parallelism)
3. For each command, resolve or create a tab via `BrowserManager`. Tab names in the
   batch payload map to browser tabs. If the tab name is new, open a new tab. If it
   already exists, reuse it.
4. Execute all commands concurrently using `Promise.allSettled` — never `Promise.all`,
   because one tab timing out should not cancel the others.
5. Collect results and return the array in the same order as the input commands.
6. Apply a per-command timeout (from `timeout_ms` or a default of 20000ms).

Skeleton:

```typescript
// In the HTTP request handler, add a new route:
if (req.method === 'POST' && pathname === '/batch') {
  const body = await readBody(req); // parse JSON body
  const { commands, timeout_ms = 20000 } = body as {
    commands: Array<{ tab: string; cmd: string; args?: string[] }>;
    timeout_ms?: number;
  };

  if (!Array.isArray(commands) || commands.length === 0) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'commands must be a non-empty array' }));
    return;
  }

  if (commands.length > 20) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'batch size limit is 20 commands' }));
    return;
  }

  const results = await Promise.allSettled(
    commands.map(async ({ tab: tabName, cmd, args = [] }) => {
      // Get or create tab
      const tab = await browserManager.getOrCreateTab(tabName);
      // Execute with timeout
      const output = await Promise.race([
        dispatchCommand(tab, cmd, args),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeout_ms}ms`)), timeout_ms)
        ),
      ]);
      return { tab: tabName, output, error: null };
    })
  );

  const response = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { tab: commands[i].tab, output: null, error: r.reason?.message ?? 'unknown error' }
  );

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ results: response }));
  return;
}
```

You will need to implement or adapt:
- `readBody(req)` — read and JSON-parse the incoming request body (check if one already exists in server.ts)
- `browserManager.getOrCreateTab(tabName)` — check if `BrowserManager` has this method
  already; if not, add it. It should look up an existing tab by name/label or create a
  new one and register it under that name.
- `dispatchCommand(tab, cmd, args)` — this likely already exists in some form; find how
  individual commands are dispatched per-tab and extract it into a reusable function if
  it is not already.

### `BrowserManager` changes (`browse/src/browser-manager.ts`)

If `BrowserManager` does not already have named tab support, add:

```typescript
private namedTabs: Map<string, Page> = new Map();

async getOrCreateTab(name: string): Promise<Page> {
  if (this.namedTabs.has(name)) {
    return this.namedTabs.get(name)!;
  }
  const page = await this.browser.newPage();
  this.namedTabs.set(name, page);
  return page;
}
```

Make sure tabs created via `getOrCreateTab` are included in cleanup when the server
shuts down.

## Part 2: Add batch helper to browse CLI

So the skill can call batch via the existing `$B` alias, add a `batch` sub-command to
`browse/src/cli.ts` (or `browse/src/meta-commands.ts`).

The CLI batch command reads a JSON file (or stdin) containing the commands array and
POSTs to `/batch`:

```bash
# Usage from a skill:
$B batch /tmp/batch-commands.json
```

Or accept inline JSON:
```bash
$B batch '{"commands": [...]}'
```

The command should print results as newline-separated JSON objects (one per tab result),
so the skill can parse them.

Add to `COMMAND_DESCRIPTIONS` in `browse/src/commands.ts`:
```typescript
batch: {
  category: 'Meta',
  description: 'Execute multiple commands in parallel across browser tabs. Accepts a JSON file path or inline JSON string.',
  usage: 'batch <json-file-or-json-string>',
}
```

## Part 3: Update `competitive-intel/SKILL.md.tmpl`

### What to change in Phase 2

Add a new "Parallel browse setup" block in Phase 2, after the competitor list is
confirmed but before the per-competitor analysis begins.

After Phase 1 (where the PM confirms the Tier 1 competitor list), add:

```markdown
### Phase 2a: Parallel homepage capture (optional — if competitors have public sites)

If 3 or more Tier 1 competitors have public-facing product pages worth screenshotting,
use the batch browse endpoint to capture them in a single round-trip rather than
serially.

Build the batch commands file:

\`\`\`bash
# Competitor homepages — replace URLs with actual competitors from Phase 1
cat > /tmp/competitive-batch.json << 'EOF'
{
  "commands": [
    { "tab": "comp_a", "cmd": "goto", "args": ["https://COMPETITOR_A_URL"] },
    { "tab": "comp_b", "cmd": "goto", "args": ["https://COMPETITOR_B_URL"] },
    { "tab": "comp_c", "cmd": "goto", "args": ["https://COMPETITOR_C_URL"] }
  ],
  "timeout_ms": 20000
}
EOF
$B batch /tmp/competitive-batch.json
\`\`\`

Then collect text from each tab:

\`\`\`bash
$B tabs                            # confirm tabs are open
$B switch comp_a && $B text        # Competitor A homepage content
$B switch comp_b && $B text        # Competitor B homepage content
$B switch comp_c && $B text        # Competitor C homepage content
\`\`\`

If the batch endpoint is unavailable (NEEDS_SETUP or server not running), fall back to
sequential goto/text calls. The analysis is the same either way — parallel just saves
time.
```

### Add `$B server start` to the setup block

The batch endpoint requires the browse server to be running (not just the CLI). Update
the existing setup block in the skill to start the server before batch operations:

```bash
# Ensure browse server is running for batch support
$B server status 2>/dev/null || $B server start
```

### Keep the SKILL.md.tmpl regenerable

This plan changes `competitive-intel/SKILL.md.tmpl` directly. After editing the `.tmpl`,
run `bun run gen:skill-docs` to regenerate `competitive-intel/SKILL.md`. Do not edit
`SKILL.md` directly.

## Part 4: Add `$B switch` command (if not present)

The parallel flow above uses `$B switch <tab-name>` to move between named tabs. Check
whether this command exists in `browse/src/meta-commands.ts`. If not, add it:

```typescript
case 'switch': {
  const tabName = args[0];
  if (!tabName) return 'Usage: switch <tab-name>';
  const page = await bm.getOrCreateTab(tabName);
  await page.bringToFront();
  return `Switched to tab: ${tabName}`;
}
```

Add to `COMMAND_DESCRIPTIONS`:
```typescript
switch: {
  category: 'Tabs',
  description: 'Switch to a named tab created by the batch command.',
  usage: 'switch <tab-name>',
}
```

## Scope boundary

This plan does not add batch support to the WebSearch phase of competitive-intel — that
already runs via the Claude API and is inherently parallel from Claude's perspective.
This plan only addresses the browse-based screenshot and page-text collection that
happens in Phase 2 when competitors have public product pages.

Do not add batch support to other skills in this change. The batch endpoint is
infrastructure — once it exists, other skills can adopt it independently.

## Testing

### Browse server tests

1. Start the browse server: `$B server start`
2. Send a batch request manually:
   ```bash
   curl -s -X POST http://localhost:$(cat ~/.pmstack/.browse/port)/batch \
     -H 'Content-Type: application/json' \
     -d '{"commands":[{"tab":"t1","cmd":"goto","args":["https://example.com"]},{"tab":"t2","cmd":"goto","args":["https://httpbin.org/get"]}]}'
   ```
3. Verify both tabs loaded (check `$B tabs`)
4. Verify `$B switch t1 && $B text` returns example.com content
5. Verify a timeout command returns `error: "Timeout after Xms"` without blocking the others

### Competitive-intel skill test

1. Run `/pm-competitive-intel` against a known domain (e.g. "B2B invoicing for freelancers")
2. In Phase 2, when browse is used, verify all competitor tabs open simultaneously
3. Verify results are collected correctly and the report is saved to `~/.pmstack/competitive/`

### Fallback test

1. Stop the browse server: `$B server stop`
2. Run competitive-intel again — verify it falls back to sequential `goto` calls without
   erroring

## Files changed (summary)

| File | Change |
|------|--------|
| `browse/src/server.ts` | Add `POST /batch` route handler |
| `browse/src/browser-manager.ts` | Add `getOrCreateTab(name)` method |
| `browse/src/meta-commands.ts` | Add `batch` and `switch` commands |
| `browse/src/commands.ts` | Register `batch` and `switch` in `COMMAND_DESCRIPTIONS` |
| `competitive-intel/SKILL.md.tmpl` | Add Phase 2a parallel browse block |
| `competitive-intel/SKILL.md` | Regenerate via `bun run gen:skill-docs` |
