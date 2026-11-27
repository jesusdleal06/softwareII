# Project instructions for agents

## Backend

Before any work in `Desarrollo/backend`, read `Desarrollo/backend/docs/development-prompt.md`: architecture, dependencies, data model, conventions and order of work.

## Test plan

The test plan is `Documentacion/pruebas/Actividad módulo 2_Plan de pruebas.docx` (ISO/IEC/IEEE 29119-3, cases `CP-RFxx-nn` / `CP-RNFxx-nn`). It is the source of truth for what "done" means. `Documentacion/Plan_de_Pruebas.docx` is an older draft: do not use it.

The course requires testing in parallel with development: a requirement is finished only when its test cases pass. When you implement or change behavior covered by a requirement RF01–RF10:

1. **Read its cases first.** Find the requirement's section in the plan (section 12) and implement every case for it, at the level the plan's `Nivel` column assigns: `U` unit, `I` integration, `E2E` end to end, `M` manual (not automated, but leave the behavior testable by hand).
2. **Write the test before the code** (RED, then GREEN), and name it with the case ID so traceability can be checked with a grep:
   - Frontend (Vitest, `pnpm test`): `it('CP-RF02-02: blocks saving without a phone', ...)`
   - Backend (JUnit 5): `@DisplayName("CP-RF03-02: rejects an overlapping appointment")`
   - Unit tests use JUnit 5 + Mockito; integration tests use Spring Boot Test + MockMvc against PostgreSQL through Testcontainers, never H2 or a shared database.
   - E2E tests use Playwright (not installed yet: add it when the first E2E case is due).
3. **Match the plan's expected results exactly**: user messages (for example «El número de celular es obligatorio.»), HTTP codes (401 without session, 403 for a wrong role), durations, send times and limits.
4. **Keep rules testable as the plan needs**: the reminder service (RF05) takes an injectable clock so tests can simulate 18:00 and 08:00; the WhatsApp client is behind an interface so unit and integration tests use a fake; concurrency rules (CP-RF07-03, CP-RF08-02) are enforced in the database, not only in memory.
5. **Exit criteria to respect**: at least 70 % branch coverage on availability and reminder rules; only fictitious patient data and team phone numbers.
6. **Do not edit the matrix states** (section 13) or the results report (section 14): QA fills them after running the cases.

If the code you are asked to write contradicts the plan, or a behavior has no case, stop and say so instead of choosing silently.

Decided (change-control version 1.3, 2026-10-22): the patient never signs in. Only staff have accounts, with two roles, `auxiliar` and `odontólogo`. The patient books from the public site and manages an appointment through a personal, unguessable link sent in the WhatsApp reminder (CP-RF06-05). In the backend the patient is its own table, identified by a unique phone number and linked to its appointments, not a user or a role.

A change to the plan itself is a change of requirements: record it in the change-control table below.

A change of business rules (for example the clinic's opening hours) is also a change of requirements: update the affected test cases in the plan and record it in the change-control table. If the plan has no case for the new behavior, stop and say so.

## Git workflow

Several people and agents work on this repository at once. These rules exist because stacked PRs once merged into already-merged branches, and two branches both created a Flyway `V5` and a change-control version `1.15`.

- `main` is the only integration branch. Start every branch from an up-to-date `main`: `git fetch origin && git switch -c <type>/<name> origin/main`.
- A PR always targets `main`, never another feature branch. If you must stack PRs, retarget the next one to `main` as soon as its parent merges, and check the base (`gh pr view <n> --json baseRefName`) before merging.
- Before pushing to a branch, check its PR (`gh pr view --json state`). If it is already merged, do not push there: start a new branch from `main`.
- Before opening or merging a PR, bring the branch up to date with `main` (`git fetch origin && git merge origin/main`) and run every suite: `./gradlew check` in `Desarrollo/backend`; `pnpm test --watch=false && pnpm build && pnpm verify:csp` in `Desarrollo/frontend`; `Desarrollo/e2e/run.sh` for the E2E cases.
- Flyway migrations: right before committing one, take the next free version on the latest `origin/main` (`ls Desarrollo/backend/src/main/resources/db/migration`). Never edit or renumber a migration that may already be applied in any shared database.

## Change-control table

The file `Documentacion/pruebas/Actividad módulo 2_Tabla Control de cambios y versiones.docx` is a graded deliverable. Its rule: every change of scope, requirements or schedule gets a new version row, and the person responsible for the change is the author of the row.

After each commit, a hook asks you to decide whether the commit belongs in the table: `.claude/hooks/after_commit.py` in Claude Code, and `.opencode/plugins/change-log.js` in OpenCode, which runs the same Python hook. OpenCode reads this file because the project has no `AGENTS.md`.

### Record a row when the commit closes one of these

- A change of scope, requirements or schedule.
- A new user-visible feature or a finished functional milestone (for example "flujo público de agendamiento", "esqueleto del backend").
- A fix that changes behavior users or developers notice (for example the Docker uid fix in 1.2).
- A change of technology, tooling or development environment (package manager, Docker, database).
- A new or substantially rewritten deliverable document (test plan, requirements, diagrams).

### Do not record

- `chore`, `style`, `refactor` or `test` commits with no visible effect.
- Small doc edits, typo fixes, README tweaks, ignore rules.
- One slice of a larger change that is still in progress: record the whole change once, on the commit that closes it, and describe all of it in that row.
- The commit that only adds the row itself.

When unsure, skip it and say so in one line; the team can add it later.

### How to record

1. Merge the latest `origin/main` first, so the default version (last + 0.1) is the next free one on `main`. Git cannot merge the `.docx`: if it conflicts, keep `main`'s file (`git checkout --ours` while merging `main` in) and record your row again with the script.
2. Write the description in Spanish, in the style of the existing rows: one or two sentences saying what changed and why it matters, no commit hashes.
3. Preview it, then write it:
   ```bash
   python3 scripts/change-log/record_change.py --description "..." --author-email <commit author email> --dry-run
   python3 scripts/change-log/record_change.py --description "..." --author-email <commit author email>
   ```
   The script uses today's date and the last version + 0.1 by default (`--date`, `--version` override them). Use `--version 2.0` style jumps only when a deliverable is ready for final review, as the table's rules say.
4. Commit the `.docx` alone: `docs: record version X.Y in the change-control table`.
