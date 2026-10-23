# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `cereallarceny/jungletribe`.
Use the `gh` CLI from this repository.

## Conventions

- Create: `gh issue create --title "..." --body-file <file>`
- Read: `gh issue view <number> --json number,title,body,labels,comments`
- List: `gh issue list --state open --json number,title,body,labels,assignees`
- Comment: `gh issue comment <number> --body-file <file>`
- Label: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`
- Close: `gh issue close <number> --comment "..."`

For multiline bodies, write the exact text to a temporary file and pass
`--body-file`.

When a skill says "publish to the issue tracker", create a GitHub issue.
When it says "fetch the relevant ticket", read the GitHub issue.

## Pull requests as a triage surface

**PRs as a request surface: no.**

GitHub issues and PRs share a number space. Resolve ambiguous references
before acting.

## Wayfinding operations

- Map: one issue labelled `wayfinder:map`, containing Notes,
  Decisions-so-far, and Fog.
- Child tickets: link them to the map using GitHub sub-issues. If
  unavailable, use a task list in the map and `Part of #<map>` in each
  child body.
- Ticket labels: `wayfinder:research`, `wayfinder:prototype`,
  `wayfinder:grilling`, or `wayfinder:task`.
- Blocking: use native GitHub issue dependencies. If unavailable, put
  `Blocked by: #<number>` references at the top of the child body.
  A ticket is unblocked when all its blockers are closed.
- Frontier: choose the first open, unassigned, unblocked child in map order.
- Claim: `gh issue edit <number> --add-assignee @me`.
- Resolve: comment with the result, close the ticket, and append a summary
  and evidence link to the map's Decisions-so-far.
