# Implementation Plan: Team Mode Auto-Update via SessionStart Hook

## What this does

Adds a `--team` flag to the PMStack `setup` script. When run, it installs a Claude Code
`SessionStart` hook so every team member automatically pulls the latest PMStack and
re-runs setup whenever they open a new Claude Code session. Eliminates version drift
across teams without vendoring files into repos.

## Current state

The `setup` script (project root `/setup`) currently supports one flag: `--local`
(installs to `.claude/skills/` in the project root rather than `~/.claude/skills/`).
There is no automatic update mechanism. Users must manually run `git pull && ./setup`
to get new versions.

The preamble bash block in every skill (`scripts/resolvers/preamble.ts`,
`generatePreambleBash`) already runs `pmstack-update-check` on skill invocation and
tells the user to update manually. The `--team` flag replaces that manual step with an
automated one.

## How Claude Code SessionStart hooks work

Hooks are configured in `~/.claude/settings.json` (global) or `.claude/settings.json`
(project-local). The `SessionStart` event fires once when a Claude Code session begins.

Settings.json format:
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "YOUR_COMMAND_HERE"
          }
        ]
      }
    ]
  }
}
```

The command runs as a shell command. Stdout is surfaced to Claude. Exit code 0 = success.
Non-zero exits are logged but do not block the session from starting.

## Files to change

### 1. `setup` (the main install script)

**Where:** The flag-parsing block near the top, currently:
```bash
LOCAL_INSTALL=0
while [ $# -gt 0 ]; do
  case "$1" in
    --local) LOCAL_INSTALL=1; shift ;;
    *) shift ;;
  esac
done
```

**Change:** Add `--team` flag parsing and a new function that writes the hook.

The full addition — add this variable alongside `LOCAL_INSTALL`:
```bash
TEAM_INSTALL=0
```

Add to the case block:
```bash
    --team) TEAM_INSTALL=1; shift ;;
```

Add this function after the flag-parsing block:
```bash
install_team_hook() {
  local settings_file="$HOME/.claude/settings.json"
  local hook_command="git -C ~/.claude/skills/pmstack pull --quiet --ff-only 2>/dev/null && ~/.claude/skills/pmstack/setup --quiet 2>/dev/null || true"

  # Create settings.json if it doesn't exist
  if [ ! -f "$settings_file" ]; then
    mkdir -p "$(dirname "$settings_file")"
    echo '{}' > "$settings_file"
  fi

  # Check if our hook is already present (idempotent)
  if grep -q "pmstack.*setup.*quiet" "$settings_file" 2>/dev/null; then
    echo "  SessionStart hook already installed — skipping"
    return 0
  fi

  # Use bun/node to safely merge into existing JSON rather than clobbering it
  bun --eval "
    const fs = require('fs');
    const path = '$settings_file';
    const hookEntry = {
      hooks: [{ type: 'command', command: '$hook_command' }]
    };
    let settings = {};
    try { settings = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
    if (!settings.hooks) settings.hooks = {};
    if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];
    // Avoid duplicates
    const alreadyPresent = settings.hooks.SessionStart.some(
      e => e.hooks && e.hooks.some(h => h.command && h.command.includes('pmstack'))
    );
    if (!alreadyPresent) {
      settings.hooks.SessionStart.push(hookEntry);
      fs.writeFileSync(path, JSON.stringify(settings, null, 2));
      console.log('SessionStart hook installed');
    } else {
      console.log('SessionStart hook already present — skipping');
    }
  " 2>/dev/null || {
    echo "  Warning: could not write settings.json — install bun or add the hook manually" >&2
    echo "  Add this to ~/.claude/settings.json under hooks.SessionStart:" >&2
    echo "    { \"hooks\": [{ \"type\": \"command\", \"command\": \"$hook_command\" }] }" >&2
  }
}
```

Add this block at the end of the script, just before the final `echo "Start with: /pm-office-hours"` line:

```bash
# 5. Install team auto-update hook if requested
if [ "$TEAM_INSTALL" -eq 1 ]; then
  echo "Installing team auto-update hook..."
  install_team_hook
  echo ""
  echo "Team mode: PMStack will auto-update at the start of each Claude Code session."
  echo "Share this command with teammates:"
  echo "  cd ~/.claude/skills/pmstack && ./setup --team"
  echo ""
fi
```

### 2. `setup` — add `--quiet` flag support

The `install_team_hook` function calls `./setup --quiet` from the hook command itself.
Add `QUIET_INSTALL=0` to the flag parser and `--quiet) QUIET_INSTALL=1; shift ;;` to
the case block. Then wrap the verbose echo lines with `[ "$QUIET_INSTALL" -eq 0 ] && ...`
for any output that would be noisy on every session start. At minimum, suppress the
Playwright install output and the "PMStack ready" banner. The `UPGRADE_AVAILABLE` and
`JUST_UPGRADED` signals should still echo even in quiet mode — the preamble looks for them.

### 3. `bin/pmstack-update-check` (optional cleanup)

Once `--team` is installed, the manual update prompt in the preamble becomes redundant
for team users. You can leave it — it will still fire but the git pull will already have
run, so `pmstack-update-check` will see no update available and stay silent. No change
required here.

## Behavior after installation

When a team member opens a new Claude Code session:
1. The `SessionStart` hook fires
2. `git -C ~/.claude/skills/pmstack pull --quiet --ff-only` runs
3. If new commits were pulled, `./setup --quiet` re-runs (re-links any new skill dirs, rebuilds browse binary if source changed)
4. Claude Code session starts normally

If the user is offline or the remote is unreachable, `--ff-only` ensures no merge
attempt and the `|| true` ensures the hook exits 0 and does not block the session.

## Edge cases to handle

- **settings.json does not exist:** Create it with `{}` before merging.
- **settings.json is malformed JSON:** The bun script will throw — catch and fall back to the manual instruction printout.
- **Hook already installed:** The grep check + the `alreadyPresent` check make this idempotent. Running `./setup --team` twice is safe.
- **User has no write access to `~/.claude/settings.json`:** Print the manual instruction as a fallback.
- **git pull produces a merge conflict:** `--ff-only` means it will refuse rather than merge. Exit 0 via `|| true`, session proceeds, preamble's `pmstack-update-check` will surface the divergence on next skill invocation.

## Testing

After implementation:
1. Run `./setup --team` — verify `~/.claude/settings.json` contains the hook entry.
2. Run `./setup --team` again — verify it is idempotent (no duplicate hook).
3. Open a new Claude Code session — verify the hook fires (check `~/.pmstack/analytics/skill-usage.jsonl` for a session entry, or add a test echo in the hook temporarily).
4. Make a test commit to a local branch of pmstack, then open a new session — verify the pull runs and the new commit is present.

## What this does NOT change

- No skill `.tmpl` files need to change.
- No `SKILL.md` files need regeneration.
- The existing `--local` flag is unaffected.
- The existing `pmstack-update-check` preamble logic is unaffected.
