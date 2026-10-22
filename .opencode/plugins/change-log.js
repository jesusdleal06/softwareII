// OpenCode counterpart of .claude/hooks/after_commit.py: after a successful
// `git commit`, append the change-control reminder to the bash tool output so
// the agent sees it. The decision logic lives in the Python hook, shared by both tools.
import { spawnSync } from "node:child_process"
import path from "node:path"

export const ChangeLogPlugin = async (ctx) => {
  const root = ctx?.directory ?? ctx?.location?.directory ?? process.cwd()
  const hook = path.join(root, ".claude", "hooks", "after_commit.py")

  return {
    "tool.execute.after": async (input, output) => {
      const command = input?.args?.command
      if (input?.tool !== "bash" || typeof command !== "string" || !command.includes("git commit")) return

      const result = spawnSync("python3", [hook], {
        input: JSON.stringify({ tool_input: { command } }),
        env: { ...process.env, CLAUDE_PROJECT_DIR: root },
        encoding: "utf8",
      })
      if (result.status !== 0 || !result.stdout.trim()) return

      try {
        const message = JSON.parse(result.stdout).hookSpecificOutput?.additionalContext
        if (message) output.output += `\n\n[change-control] ${message}`
      } catch {
        // A malformed hook reply must never break the bash tool.
      }
    },
  }
}
