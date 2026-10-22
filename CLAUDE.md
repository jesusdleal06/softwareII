# Project instructions for agents

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

1. Write the description in Spanish, in the style of the existing rows: one or two sentences saying what changed and why it matters, no commit hashes.
2. Preview it, then write it:
   ```bash
   python3 scripts/change-log/record_change.py --description "..." --author-email <commit author email> --dry-run
   python3 scripts/change-log/record_change.py --description "..." --author-email <commit author email>
   ```
   The script uses today's date and the last version + 0.1 by default (`--date`, `--version` override them). Use `--version 2.0` style jumps only when a deliverable is ready for final review, as the table's rules say.
3. Commit the `.docx` alone: `docs: record version X.Y in the change-control table`.
