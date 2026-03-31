// src/pre-tool-use.ts
import path from "node:path";
import process from "node:process";

// src/chain-parser.ts
function isDigit(ch) {
  return ch !== undefined && ch >= "0" && ch <= "9";
}
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
      if (ch === ">" || ch === "<") {
        if (ch === "<") {
          if (cmd[i + 1] === "&" && (isDigit(cmd[i + 2]) || cmd[i + 2] === "-")) {
            current += cmd.slice(i, i + 3);
            i += 2;
            continue;
          }
          return { kind: "unparseable" };
        }
        let j = i + 1;
        if (cmd[j] === ">") {
          j++;
        }
        if (cmd[j] === "&" && (isDigit(cmd[j + 1]) || cmd[j + 1] === "-")) {
          current += cmd.slice(i, j + 2);
          i = j + 1;
          continue;
        }
        let k = j;
        while (k < cmd.length && (cmd[k] === " " || cmd[k] === "\t"))
          k++;
        const afterNull = cmd[k + 9];
        if (cmd.slice(k, k + 9) === "/dev/null" && (afterNull === undefined || afterNull === " " || afterNull === "\t" || afterNull === ";" || afterNull === "&" || afterNull === "|" || afterNull === ">" || afterNull === "<")) {
          current += cmd.slice(i, k + 9);
          i = k + 8;
          continue;
        }
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
var HARD_DENY_RULES = [
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
var SOFT_DENY_RULES = [
  { pattern: /^git\s+push\s+--force(?:-with-lease)?\b/i, reason: "Force push needs user intent verification" },
  { pattern: /^git\s+push(?:\s+\S+)*\s-(?!-)\S*f/i, reason: "Force push (short flag) needs user intent verification" },
  { pattern: /^git\s+push\s+(?:\S+\s+)?(?:origin\s+)?(?:main|master)\s*$/i, reason: "Push to default branch needs user intent verification" },
  { pattern: /^git\s+reset\s+--hard\b/i, reason: "Hard reset needs user intent verification" },
  { pattern: /^git\s+clean\s+-[a-z]*f/i, reason: "Git clean needs user intent verification" },
  { pattern: /^git\s+branch\s+-[a-z]*D/i, reason: "Force branch delete needs user intent verification" },
  { pattern: /^npm\s+publish\b/i, reason: "Package publish needs user intent verification" },
  { pattern: /^(terraform|pulumi)\s+apply\b/i, reason: "Infrastructure apply needs user intent verification" },
  { pattern: /^(terraform|pulumi)\s+destroy\b/i, reason: "Infrastructure destroy needs user intent verification" },
  { pattern: /^kubectl\s+(apply|delete)\b/i, reason: "Kubernetes mutation needs user intent verification" },
  { pattern: /(?:^|\s)\.claude\/settings/i, reason: "Agent self-modification needs user intent verification" },
  { pattern: /\bCLAUDE\.md\b/i, reason: "Agent self-modification needs user intent verification" },
  { pattern: /^git\s+commit(?:\s+\S+)*\s--no-verify\b/i, reason: "Skipping commit verification needs user intent verification" },
  { pattern: /\bchmod\s+\S*777\b/i, reason: "Broad permission change needs user intent verification" },
  { pattern: /\b(nc|ncat|socat)\s+-l/i, reason: "Exposing local service needs user intent verification" },
  { pattern: /\bpython3?\s+-m\s+http\.server/i, reason: "Exposing HTTP server needs user intent verification" },
  { pattern: /\b(crontab|systemctl\s+enable|ssh-keygen|ssh-copy-id)\b/i, reason: "Unauthorized persistence needs user intent verification" },
  { pattern: /\b(?:gcloud(?:\s+\S+)*\s+add-iam|aws\s+iam|az\s+role\s+assignment)\b/i, reason: "Permission grant needs user intent verification" },
  { pattern: /\bsystemctl\s+stop\s+\S*log/i, reason: "Logging tampering needs user intent verification" }
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
var WRITE_EDIT_SOFT_DENY_PATTERNS = [
  { pattern: /(?:^|[/\\])\.env(?:\.|$)/i, reason: "Writing to .env file needs user intent verification" },
  { pattern: /(?:^|[/\\])\.claude[/\\]settings/i, reason: "Writing to .claude/settings needs user intent verification" },
  { pattern: /(?:^|[/\\])CLAUDE\.md$/i, reason: "Writing to CLAUDE.md needs user intent verification" },
  { pattern: /(?:^|[/\\])\.github[/\\]workflows[/\\]/i, reason: "Writing to CI/CD config needs user intent verification" },
  { pattern: /(?:^|[/\\])\.gitlab-ci\.yml$/i, reason: "Writing to CI/CD config needs user intent verification" },
  { pattern: /(?:^|[/\\])Jenkinsfile$/i, reason: "Writing to CI/CD config needs user intent verification" },
  { pattern: /(?:^|[/\\])\.circleci[/\\]/i, reason: "Writing to CI/CD config needs user intent verification" }
];
function classifyWriteEdit(filePath) {
  if (!filePath) {
    return null;
  }
  for (const rule of WRITE_EDIT_SOFT_DENY_PATTERNS) {
    if (rule.pattern.test(filePath)) {
      return { decision: "soft_deny", reason: rule.reason };
    }
  }
  const resolvedPath = path.resolve(filePath);
  if (resolvedPath.startsWith(process.cwd()) || resolvedPath.includes(`${path.sep}node_modules${path.sep}`)) {
    return { decision: "allow", reason: "Safe project file write" };
  }
  return null;
}
var WEBFETCH_SOFT_DENY_PATTERNS = [
  { pattern: /^https?:\/\/(?:[^/]+\.)?(pastebin\.com|paste\.ee|hastebin\.com|dpaste\.org|ghostbin\.com|rentry\.co)(?:\/|$)/i, reason: "Paste service needs user intent verification" },
  { pattern: /^https?:\/\/(?:[^/]+\.)?(transfer\.sh|file\.io|0x0\.st|tmpfiles\.org)(?:\/|$)/i, reason: "File sharing service needs user intent verification" },
  { pattern: /\.(sh|bash|ps1|bat|cmd)(\?|$)/i, reason: "Script download needs user intent verification" },
  { pattern: /\braw\.githubusercontent\.com\/.*\.(sh|py|rb|js)(?:\?|$)/i, reason: "Raw script download needs user intent verification" }
];
function classifyWebFetch(url) {
  if (!url) {
    return null;
  }
  for (const rule of WEBFETCH_SOFT_DENY_PATTERNS) {
    if (rule.pattern.test(url)) {
      return { decision: "soft_deny", reason: rule.reason };
    }
  }
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?(?:[/?#]|$)/i.test(url)) {
    return { decision: "allow", reason: "Safe localhost request" };
  }
  return null;
}
var SAFE_TOOLS = new Set([
  "Read",
  "Glob",
  "Grep",
  "LS",
  "Search",
  "TaskCreate",
  "TaskUpdate",
  "TaskList",
  "TaskGet",
  "TodoRead",
  "TodoWrite",
  "NotebookRead"
]);
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
  for (const rule of HARD_DENY_RULES) {
    if (rule.pattern.test(cmd)) {
      return { decision: "hard_deny", reason: rule.reason };
    }
  }
  for (const rule of SOFT_DENY_RULES) {
    if (rule.pattern.test(cmd)) {
      return { decision: "soft_deny", reason: rule.reason };
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
function decisionToOutput(decision, reason, label) {
  switch (decision) {
    case "hard_deny":
      process.stderr.write(`gatekeeper: deny "${label}" — ${reason}
`);
      return makeDecision("deny", reason);
    case "soft_deny":
      process.stderr.write(`gatekeeper: soft_deny "${label}" — ${reason}
`);
      return null;
    case "allow":
      process.stderr.write(`gatekeeper: allow "${label}" — ${reason}
`);
      return makeDecision("allow", reason);
  }
}
function evaluateBash(cmd) {
  if (!cmd) {
    return null;
  }
  for (const rule of HARD_DENY_RULES) {
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
      return decisionToOutput(result.decision, result.reason, cmd);
    }
    process.stderr.write(`gatekeeper: passthrough "${cmd}" — no matching rule
`);
    return null;
  }
  const reasons = [];
  let firstAllowedResult = null;
  for (const part of parsed.parts) {
    const result = evaluateSingleCommand(part);
    if (result?.decision === "hard_deny") {
      process.stderr.write(`gatekeeper: deny "${cmd}" — part "${part}": ${result.reason}
`);
      return makeDecision("deny", result.reason);
    }
    if (result?.decision === "soft_deny" || result === null) {
      process.stderr.write(`gatekeeper: passthrough "${cmd}" — ${result ? "soft_deny" : "unknown"} part "${part}"
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
function evaluate(input) {
  const toolName = input.tool_name;
  const toolInput = input.tool_input;
  if (SAFE_TOOLS.has(toolName)) {
    process.stderr.write(`gatekeeper: allow "${toolName}" — safe tool
`);
    return makeDecision("allow", `Safe tool: ${toolName}`);
  }
  if (toolName === "Bash") {
    const cmd = (toolInput?.command ?? "").trim();
    return evaluateBash(cmd);
  }
  if (toolName === "Write" || toolName === "Edit") {
    const filePath = toolInput?.file_path ?? "";
    const result = classifyWriteEdit(filePath);
    if (result) {
      return decisionToOutput(result.decision, result.reason, `${toolName}:${filePath}`);
    }
    process.stderr.write(`gatekeeper: passthrough "${toolName}:${filePath}" — no matching rule
`);
    return null;
  }
  if (toolName === "WebFetch") {
    const url = toolInput?.url ?? "";
    const result = classifyWebFetch(url);
    if (result) {
      return decisionToOutput(result.decision, result.reason, `WebFetch:${url}`);
    }
    process.stderr.write(`gatekeeper: passthrough "WebFetch:${url}" — no matching rule
`);
    return null;
  }
  process.stderr.write(`gatekeeper: passthrough "${toolName}" — unknown tool
`);
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
  classifyWriteEdit,
  classifyWebFetch,
  SOFT_DENY_RULES,
  HARD_DENY_RULES,
  ALLOW_RULES
};
