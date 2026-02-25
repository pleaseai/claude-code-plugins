// src/pre-tool-use.ts
import process from "node:process";

// src/chain-parser.ts
function parseChainedCommand(cmd) {
  if (/\$\(|`|\n|<\(|>\(/.test(cmd)) {
    return { kind: "unparseable" };
  }
  if (!/[;&|<>\\]/.test(cmd)) {
    return { kind: "single" };
  }
  let state = "normal";
  let escaped = false;
  const parts = [];
  let current = "";
  let hasChainOp = false;
  for (let i = 0;i < cmd.length; i++) {
    const ch = cmd[i];
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }
    if (state === "normal") {
      if (ch === "\\") {
        escaped = true;
        current += ch;
        continue;
      }
      if (ch === "'") {
        state = "single";
        current += ch;
        continue;
      }
      if (ch === '"') {
        state = "double";
        current += ch;
        continue;
      }
      if (ch === "<" || ch === ">") {
        return { kind: "unparseable" };
      }
      const next = cmd[i + 1];
      if (ch === "&" && next === "&") {
        parts.push(current);
        current = "";
        hasChainOp = true;
        i++;
        continue;
      }
      if (ch === "|" && next === "|") {
        return { kind: "unparseable" };
      }
      if (ch === ";") {
        parts.push(current);
        current = "";
        hasChainOp = true;
        continue;
      }
      if (ch === "|") {
        return { kind: "unparseable" };
      }
      if (ch === "&") {
        return { kind: "unparseable" };
      }
      current += ch;
    } else if (state === "single") {
      if (ch === "'") {
        state = "normal";
      }
      current += ch;
    } else if (state === "double") {
      if (ch === "\\") {
        escaped = true;
        current += ch;
        continue;
      }
      if (ch === '"') {
        state = "normal";
      }
      current += ch;
    }
  }
  if (state !== "normal" || escaped) {
    return { kind: "unparseable" };
  }
  parts.push(current);
  if (!hasChainOp) {
    return { kind: "single" };
  }
  const trimmed = parts.map((p) => p.trim());
  if (trimmed.includes("")) {
    return { kind: "unparseable" };
  }
  return { kind: "chain", parts: trimmed };
}

// src/pre-tool-use.ts
var DENY_RULES = [
  { pattern: /^rm\s+-rf\s+\/(?:\s|$)/i, reason: "Filesystem root deletion blocked" },
  { pattern: /^rm\s+-rf\s+\/\*(?:\s|$)/i, reason: "Destructive wildcard deletion from root blocked" },
  { pattern: /^rm\s+-rf\s+~(?:\/|$)/i, reason: "Home directory deletion blocked" },
  { pattern: /^mkfs\./i, reason: "Disk format command blocked" },
  {
    pattern: /^dd\s+if=\/dev\/zero\s+of=\/dev\//i,
    reason: "Disk zeroing blocked"
  },
  {
    pattern: /^(node|tsx)\s+(-e|-p|-c|--eval|--print)\b/i,
    reason: "Inline interpreter code execution blocked"
  },
  {
    pattern: /^(python3?|ruby|perl)\s+(-e|-c|--eval|--print)\b/i,
    reason: "Inline interpreter code execution blocked"
  },
  {
    pattern: /^(npx)\s+(-c|--call)\b/i,
    reason: "Inline interpreter code execution blocked"
  },
  {
    pattern: /^find\b.*\s(-exec|-execdir|-delete)\b/i,
    reason: "find -exec/-execdir/-delete blocked: potential arbitrary command execution or recursive deletion"
  }
];
var ALLOW_RULES = [
  {
    pattern: /^(npm|yarn|pnpm|bun)\s+(test|run|install|ci|add|remove|ls|info|outdated|audit|why)\b/i,
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
  return /^git\s+push\b/i.test(cmd) && !/--force(?:-with-lease)?\b|\s-(?!-)\S*f/i.test(cmd);
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
function splitChainedCommands(cmd) {
  const result = parseChainedCommand(cmd);
  return result.kind === "chain" ? result.parts : null;
}
function evaluateSingleCommand(cmd) {
  if (!cmd.trim()) {
    return null;
  }
  for (const rule of DENY_RULES) {
    if (rule.pattern.test(cmd)) {
      return { decision: "deny", reason: rule.reason };
    }
  }
  for (const rule of ALLOW_RULES) {
    if (rule.pattern.test(cmd)) {
      return { decision: "allow", reason: rule.reason };
    }
  }
  if (isGitPushNonForce(cmd)) {
    return { decision: "allow", reason: "Safe git push (non-force)" };
  }
  return null;
}
function evaluate(input) {
  if (input.tool_name !== "Bash") {
    return null;
  }
  const cmd = (input.tool_input?.command ?? "").trim();
  if (!cmd) {
    return null;
  }
  for (const rule of DENY_RULES) {
    if (rule.pattern.test(cmd)) {
      process.stderr.write(`gatekeeper: deny "${cmd}" — ${rule.reason}
`);
      return makeDecision("deny", rule.reason);
    }
  }
  const parsed = parseChainedCommand(cmd);
  if (parsed.kind === "unparseable") {
    process.stderr.write(`gatekeeper: passthrough "${cmd}" — unparseable structure
`);
    return null;
  }
  if (parsed.kind === "single") {
    const result = evaluateSingleCommand(cmd);
    if (result) {
      process.stderr.write(`gatekeeper: ${result.decision} "${cmd}" — ${result.reason}
`);
      return makeDecision(result.decision, result.reason);
    }
    process.stderr.write(`gatekeeper: passthrough "${cmd}" — no matching rule
`);
    return null;
  }
  const reasons = [];
  let firstAllowedResult = null;
  for (const part of parsed.parts) {
    const result = evaluateSingleCommand(part);
    if (result?.decision === "deny") {
      process.stderr.write(`gatekeeper: deny "${cmd}" — part "${part}": ${result.reason}
`);
      return makeDecision("deny", result.reason);
    }
    if (result === null) {
      process.stderr.write(`gatekeeper: passthrough "${cmd}" — unknown part "${part}"
`);
      return null;
    }
    reasons.push(`[${part}]: ${result.reason}`);
    if (firstAllowedResult === null) {
      firstAllowedResult = result;
    }
  }
  if (firstAllowedResult === null) {
    process.stderr.write(`gatekeeper: passthrough "${cmd}" — unexpected empty chain result
`);
    return null;
  }
  const compositeReason = `Chain allowed — ${reasons.join("; ")}`;
  process.stderr.write(`gatekeeper: allow "${cmd}" — ${compositeReason}
`);
  return makeDecision("allow", compositeReason);
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
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`gatekeeper: invalid JSON input: ${err instanceof Error ? err.message : String(err)}
`);
    process.exit(1);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    process.stderr.write(`gatekeeper: expected JSON object, got ${parsed === null ? "null" : typeof parsed}
`);
    process.exit(1);
  }
  const input = parsed;
  const decision = evaluate(input);
  if (decision) {
    process.stdout.write(JSON.stringify(decision));
  }
  process.exit(0);
}
main().catch((err) => {
  process.stderr.write(`gatekeeper: unexpected error: ${err instanceof Error ? err.message : String(err)}
`);
  process.exit(1);
});
export {
  splitChainedCommands,
  makeDecision,
  isGitPushNonForce,
  evaluateSingleCommand,
  evaluate,
  DENY_RULES,
  ALLOW_RULES
};
