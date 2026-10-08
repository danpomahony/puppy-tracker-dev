# How we work: GitHub Issues and Projects

A light Kanban workflow for a one-person project. The aim is to always know what to do next, and to keep a record of why things were done.

## The loop

Work moves through four columns on the project board:

| Status | Meaning |
|---|---|
| **Backlog** | Captured, not yet scheduled |
| **Ready** | Small, clear, and next in line |
| **In progress** | Being worked on now. Keep this to one or two items |
| **Done** | Merged and closed |

Finish what is in progress before pulling the next item from the top of **Ready**.

## Capturing a bug or idea

1. Go to **Issues → New issue** and choose **Bug report** or **Feature request**.
2. Title it with a verb and an outcome: "Show a day label on older entries", not "Dates".
3. Set a **label** and a **milestone** (tables below). Leave it in Backlog.

One issue means one outcome. If it needs "and" in the title, split it.

Capture first, think later. A rough issue now is better than a perfect one never written.

## Labels

| Label | Use for |
|---|---|
| `bug` | Something is broken |
| `feature` | A new capability |
| `infra` | Hosting, CI/CD, monitoring, backups |
| `tech-debt` | Cleanup and internal quality |
| `docs` | Documentation |
| `blocked` | Waiting on something else. Say what in a comment |

## Milestones

| Milestone | Goal |
|---|---|
| MVP polish | The working MVP is pleasant and trustworthy for daily use |
| HTTPS and offline | Reachable over HTTPS, installable, works with no signal |
| Training and words | Vocabulary library and practice sessions |
| Insights | Patterns from the data |
| Production infra | Proper hosting: IaC, TLS, backups, monitoring, deploys |
| Later | Ideas that are not scheduled |

## Doing a piece of work

1. **Pick** the top item in Ready and move it to In progress.
2. **Branch** from `main`, named with the type, issue number and a few words: `feat/12-history-screen`, `fix/7-day-label`, `infra/20-caddy-tls`.
3. **Commit** in small steps with conventional messages: `feat(app): add history screen`, `fix(app): show day on older entries`, `ci: fail on lint warnings`.
4. **Open a pull request** with `gh pr create --fill`. Put `Closes #12` in the description so the issue closes automatically when it merges.
5. **Wait for CI** to go green (`gh pr checks`). If it's red, fix it on the same branch.
6. **Merge** with `gh pr merge --squash --delete-branch`, then pull `main`.

Working through pull requests even solo means CI runs before code reaches `main`, and the history reads as a clean list of finished changes.

## Definition of done

- It works on the phone, not just the laptop
- Lint, build and the smoke test are green
- Docs are updated if behaviour changed
- The issue is closed by the merged pull request

## Weekly review (10 minutes)

1. Triage new issues: label them, give them a milestone, delete duplicates.
2. Promote three to five items to **Ready**, most valuable first.
3. Look at **blocked** items. Can any be unblocked?
4. Merge or close Dependabot pull requests.

## One-time setup

### Labels, milestones and the starter backlog

```bash
sudo apt install gh        # or follow the official steps at https://cli.github.com
gh auth login              # choose GitHub.com, SSH, and the web browser or code flow
bash scripts/setup-github.sh
```

The script can be re-run safely. It updates labels and skips milestones and issues that already exist. Edit `scripts/backlog.psv` to change the starter backlog.

### The project board

1. On GitHub, open your profile's **Projects** tab and choose **New project**, then the **Board** template. Name it "Puppy tracker".
2. Edit the **Status** field so its options are exactly: Backlog, Ready, In progress, Done.
3. Link the repository to the project (project settings, or the repository's Projects tab).
4. Add the issues to the board: use **Add item** and search for the repository, or turn on the built-in **Auto-add to project** workflow.
5. Open **Workflows** in the project menu and turn on: *Item added to project* (set Status to Backlog), *Item closed* (set Status to Done) and *Pull request merged* (set Status to Done). Menu names can vary slightly between GitHub updates.
6. Create a second view as a **Table** grouped by **Milestone**. Use it for the weekly review. Keep the Board view for day-to-day work.

### Optional: protect `main`

In the repository's **Settings**, add a branch rule or ruleset for `main` that requires the `app` and `backend` CI checks to pass before merging. Availability of some rule options depends on your plan and whether the repository is public.

## Handy commands

```bash
gh issue create                          # new issue (prompts for the details)
gh issue list --milestone "MVP polish"   # what's left in a milestone
gh issue list --label bug                # open bugs
gh issue view 12                         # read an issue
gh pr create --fill                      # open a PR from the current branch
gh pr checks                             # CI status for the current PR
gh pr merge --squash --delete-branch     # merge and tidy up
```

