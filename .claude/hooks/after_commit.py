#!/usr/bin/env python3
"""PostToolUse hook: after a successful `git commit`, ask the agent to decide
whether the commit belongs in the change-control table (see CLAUDE.md)."""

import json
import os
import subprocess
import sys
import time

TABLE = "Documentacion/pruebas/Actividad módulo 2_Tabla Control de cambios y versiones.docx"


def git(*args):
    root = os.environ.get("CLAUDE_PROJECT_DIR", ".")
    result = subprocess.run(["git", "-C", root, *args], capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else ""


def main():
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return
    command = payload.get("tool_input", {}).get("command", "")
    if "git commit" not in command:
        return

    # Only react to a commit that was just created (not a failed or empty one).
    committed_at = git("log", "-1", "--format=%ct")
    if not committed_at or time.time() - int(committed_at) > 120:
        return

    files = git("-c", "core.quotePath=false", "show", "--name-only", "--format=", "HEAD").splitlines()
    files = [f for f in files if f]
    # The commit that records the row itself must not trigger another review.
    if files and all(f == TABLE for f in files):
        return

    summary = git("log", "-1", "--format=%h %s (author: %ae, date: %ad)", "--date=format:%d/%m/%Y")
    message = (
        f"A commit was just created: {summary}. "
        "Follow the 'Change-control table' section of CLAUDE.md: decide whether this commit "
        "closes a change relevant enough for the table. If it does, record it with "
        "scripts/change-log/record_change.py and commit the .docx separately; if it does not, "
        "say in one line why it was skipped."
    )
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": message}}))


if __name__ == "__main__":
    main()
