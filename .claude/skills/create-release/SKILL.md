---
name: create-release
description: Cut a GitHub release for qb64pe-vscode — tag the version, attach the latest .vsix, and publish aggregated "What's New" notes from the changelog.
---

# Create Release (qb64pe-vscode)

When the user invokes this skill ("do a release", "cut a release", "create-release",
"ship a release"), publish a **GitHub Release** for this extension. Execute the steps
**in order**; confirm before the irreversible publish step. This creates a real, public
release, so treat Step 6 as outward-facing.

This repo's conventions (already true from the normal dev workflow):
- Version lives in `package.json` and is bumped per build.
- The packaged extension is committed as `qb64pe-<version>.vsix` at the repo root.
- Release **tags are `v`-prefixed** (e.g. `v0.20.21`); `changelog.md` headers are not (`## 0.20.21`).
- The repo is a **fork** — always pass `--repo grymmjack/qb64pe-vscode` to `gh`.
- GitHub attaches "Source code (zip/tar.gz)" to every release automatically; the `.vsix`
  is added as an explicit asset.

---

## Step 1 — Preflight

```bash
git branch --show-current                 # expect: main
git status --short                        # expect: clean (nothing to commit)
git fetch origin -q && git log origin/main..HEAD --oneline   # expect: empty (pushed)
node -p "require('./package.json').version"                   # -> V
```

- Must be on `main`, clean, and pushed. If not, stop and tell the user what's outstanding
  (uncommitted changes / unpushed commits). Do **not** commit or push on their behalf here —
  the per-build workflow already handles that.
- Let `V` = the version from `package.json`. The release tag is `vV`.

If a release for `vV` already exists (`gh release view vV --repo grymmjack/qb64pe-vscode`),
stop — the version wasn't bumped since the last release. Tell the user to bump first.

---

## Step 2 — Ensure the `.vsix` is built and matches `V`

```bash
ls qb64pe-$V.vsix
```

If it is missing (or you want to be certain it's current), rebuild and restore the dev bundle:

```bash
npm run package >/dev/null 2>&1 && npm run esbuild >/dev/null 2>&1 && ls -la qb64pe-$V.vsix
# verify the packaged version matches V:
unzip -p qb64pe-$V.vsix extension/package.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log("packaged:",JSON.parse(s).version))'
```

If a rebuild changed the tracked `.vsix`, that's a commit the user must make first (Step 1's
clean-tree rule) — surface it rather than committing silently.

---

## Step 3 — Find the last released version

```bash
LAST=$(gh release list --repo grymmjack/qb64pe-vscode --limit 1 --json tagName --jq '.[0].tagName')
echo "last release: $LAST"      # e.g. v0.20.1
```

`LAST` (minus its `v`) is the boundary for the changelog and history below. If there are no
releases yet, treat everything as new.

---

## Step 4 — Assemble "What's New" from the changelog

The `changelog.md` sections are the source of truth (they're already user-facing and were
written per build). Aggregate **every** `## X.Y.Z` section newer than `LAST` up to `V` — a
release usually spans several bumped versions.

```bash
LASTV=${LAST#v}   # strip the leading v
awk -v last="## $LASTV" 'f && $0==last {exit} /^## [0-9]/ {f=1} f {print}' changelog.md
```

That prints from the top-most `## X.Y.Z` down to (but not including) the last released
section. Use it as the body's changelog. Then supplement with a compact history:

```bash
# merged PRs since the last tag (richer than commit subjects)
gh pr list --repo grymmjack/qb64pe-vscode --state merged --limit 30 \
  --json number,title,mergedAt --jq '.[] | "- #\(.number) \(.title) (\(.mergedAt[0:10]))"'
# and/or raw commits since the last tag
git log --oneline --no-merges "$LAST"..HEAD
```

Also scan the **current conversation** for anything shipped this session not yet reflected in
the changelog, and fold it in.

---

## Step 5 — Draft the release notes and confirm

Write the notes to a temp file (keeps `gh` invocation clean and handles apostrophes/`$`):

```bash
cat > /tmp/qb64pe-release-notes.md <<'NOTES'
## What's New in vV

<aggregated changelog sections from Step 4, lightly deduped>

---

### 📦 Install
Download `qb64pe-<version>.vsix` below, then either:
- VS Code → Extensions (`Ctrl+Shift+X`) → `⋯` → **Install from VSIX…**, or
- `code --install-extension qb64pe-<version>.vsix`

### 🔎 Full history
<optional: the PR / commit list from Step 4, or "See the commit log for details.">
NOTES
```

Show the user:
- the **tag** to be created (`vV`),
- the **title** (default `vV` — or `vV — <one-line highlight>` if a punchy summary fits; ask if unsure),
- the **asset** (`qb64pe-V.vsix`),
- the **notes** body.

**Confirm before publishing.** This is public and hard to undo.

---

## Step 6 — Tag and publish

Create an annotated tag, push it, and cut the release with the `.vsix` attached
(GitHub adds the source archives itself):

```bash
git tag -a "v$V" -m "v$V"
git push origin "v$V"
gh release create "v$V" "qb64pe-$V.vsix" \
  --repo grymmjack/qb64pe-vscode \
  --title "v$V" \
  --notes-file /tmp/qb64pe-release-notes.md
```

- Use `--latest` implicitly (default). Add `--prerelease` only if the user asked for a beta.
- If `gh release create` reports the tag already exists remotely but no release, it will still
  create the release for that tag — fine.

Then print the release URL (`gh release view "v$V" --repo grymmjack/qb64pe-vscode --json url --jq .url`)
and confirm the `.vsix` shows under Assets.

---

## Step 7 — Publish to Open VSX (optional, opt-in)

The extension is published on **open-vsx.org** as `grymmjack/qb64pe` (the `publisher`
field in `package.json` is the namespace). This step is **separate from the GitHub
release** and the user often does it by hand — **ask first**, and only proceed if they say yes.

Publishing needs an **open-vsx Personal Access Token**. Never hardcode or commit it; read it
from the environment (`OVSX_PAT`) or have the user pass it. Check availability without printing
the value:

```bash
if [ -n "$OVSX_PAT" ]; then echo "OVSX_PAT is set"; else echo "OVSX_PAT is NOT set"; fi
```

- **If `OVSX_PAT` is not set:** don't try to publish. Tell the user to create/copy a token at
  https://open-vsx.org/user-settings/tokens and either `export OVSX_PAT=…` then re-run this
  step, or run the publish command themselves (below) with `-p <token>`. Do **not** ask them to
  paste the token into the chat.
- **If `OVSX_PAT` is set**, confirm, then publish the same `.vsix` that's attached to the release:

```bash
npx ovsx publish "qb64pe-$V.vsix" -p "$OVSX_PAT"
```

- open-vsx rejects a version that's already published — if the user already pushed `V` manually,
  it will fail with "already exists"; that's expected, just report it and move on.
- Verify: `npx ovsx get grymmjack.qb64pe --metadata 2>/dev/null | grep -i version` or point the
  user to https://open-vsx.org/extension/grymmjack/qb64pe.

---

## Rules

- **Confirm before Step 6.** Never publish a release without showing the notes + tag first.
- **Never bump the version here** — the dev workflow already did. If `V` already has a release,
  stop and ask the user to bump.
- **Never force-delete or overwrite** an existing tag/release unless the user explicitly says so.
- **`gh` must target `--repo grymmjack/qb64pe-vscode`** (fork). The github MCP server has failed
  auth this session — use the `gh` CLI.
- Keep notes **user-facing**: the changelog is already curated; don't dump internal churn.
- Open VSX publishing (Step 7) is **optional and opt-in** — always ask first, and only when
  `OVSX_PAT` is set. Never hardcode, echo, or commit the token; read it from the environment.
- Today's date in `YYYY-MM-DD` where a date is needed.
