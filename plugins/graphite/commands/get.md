---
description: Fetch a teammate's stack locally and start collaborating (gt get)
allowed-tools: Bash, Read
argument-hint: <branch-name> [--unfrozen | --force]
---

Pull a teammate's branch (and its full stack) into the local repo so you can review, extend, or build on top. User input: `$ARGUMENTS`.

## Steps

1. Confirm the working tree is clean (`git status --short`). If not, ask the user to commit or stash first.
2. Run `gt get <branch>`. Graphite fetches the branch and every ancestor up to trunk, tracking each one.
3. Branches arrive **frozen by default** — local edits are blocked until they're unfrozen. To start contributing immediately, run with `--unfrozen`.
4. Run `gt ls` to show the user the new stack alongside any existing local stacks.

## After fetching

To extend a teammate's stack:
```bash
gt co <their-branch>             # navigate to it
gt unfreeze <their-branch>       # if you'll modify it; otherwise skip
# make changes
gt create -am "your addition"    # stack your branch on top
gt submit                        # opens your own PR
```

To just review without editing, leave the branch frozen — `gt sync` will still keep it current with the remote.

## Key flags

- `-d, --downstack` — fetch only this branch's ancestors (default is full stack)
- `-u, --remote-upstack` — also fetch children pushed by the teammate
- `--unfrozen` — bring in unfrozen so local edits are immediately allowed
- `-f, --force` — overwrite any local copies of the same branch
