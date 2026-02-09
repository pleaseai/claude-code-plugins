// src/pre-tool-use.ts
import process from "node:process";
var DENY_RULES = [
  { pattern: /rm\s+-rf\s+\//i, reason: "Filesystem root deletion blocked" },
  { pattern: /rm\s+-rf\s+~/i, reason: "Home directory deletion blocked" },
  { pattern: /mkfs\./i, reason: "Disk format command blocked" },
  {
    pattern: /dd\s+if=\/dev\/zero\s+of=\/dev\//i,
    reason: "Disk zeroing blocked"
  }
];
var ALLOW_RULES = [
  {
    pattern: /^(npm|yarn|pnpm|bun)\s+(test|run|install|ci|add|remove|exec|ls|info|outdated|audit|why|x)\b/i,
    reason: "Safe package manager command"
  },
  {
    pattern: /^git\s+(status|log|diff|branch|fetch|remote|tag|show|stash\s+list|rev-parse)\b/i,
    reason: "Safe git read operation"
  },
  {
    pattern: /^git\s+(add|commit|checkout|switch|merge|rebase|stash|pull|cherry-pick)\b/i,
    reason: "Safe git write operation"
  },
  {
    pattern: /^(node|npx|tsx|python3?|ruby|go\s+run|cargo\s+(build|run|test|check|clippy)|make|gradle|mvn)\b/i,
    reason: "Safe build/runtime command"
  },
  {
    pattern: /^(ls|pwd|cat|head|tail|wc|file|which|type|env|echo|printf|grep|find|rg|fd|ag|tree)\b/i,
    reason: "Safe file inspection command"
  },
  {
    pattern: /^docker\s+(ps|logs|images|inspect|version)\b/i,
    reason: "Safe docker read operation"
  }
];
function isGitPushNonForce(cmd) {
  return /^git\s+push\b/i.test(cmd) && !/--force\b|-f\b/i.test(cmd);
}
function makeDecision(decision, reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: decision,
      permissionDecisionReason: reason
    }
  };
}
function evaluate(input) {
  if (input.tool_name !== "Bash") {
    return null;
  }
  const cmd = input.tool_input?.command ?? "";
  if (!cmd) {
    return null;
  }
  for (const rule of DENY_RULES) {
    if (rule.pattern.test(cmd)) {
      return makeDecision("deny", rule.reason);
    }
  }
  for (const rule of ALLOW_RULES) {
    if (rule.pattern.test(cmd)) {
      return makeDecision("allow", rule.reason);
    }
  }
  if (isGitPushNonForce(cmd)) {
    return makeDecision("allow", "Safe git push (non-force)");
  }
  return null;
}
function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}
async function main() {
  const raw = await readStdin();
  if (!raw.trim()) {
    process.exit(0);
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  const decision = evaluate(input);
  if (decision) {
    process.stdout.write(JSON.stringify(decision));
  }
  process.exit(0);
}
main();
export {
  makeDecision,
  isGitPushNonForce,
  evaluate,
  DENY_RULES,
  ALLOW_RULES
};
