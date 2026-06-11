# Bun Test Runner — `bun:test`

Jest-compatible API, zero config. Runs `*.test.{ts,tsx,js,jsx,mjs,cjs}` and `*.spec.*` under the cwd by default.

```bash
bun test                            # run all tests
bun test path/to/file.test.ts       # specific file
bun test -t "describe pattern"      # filter by name
bun test --watch                    # re-run on change
bun test --coverage                 # collect coverage
bun test --bail=5                   # stop after N failures
bun test --timeout 10000            # default per-test timeout (ms)
bun test --update-snapshots         # rewrite snapshots
```

## Basics

```ts
import { test, expect, describe, beforeAll, beforeEach, afterEach, afterAll } from "bun:test";

describe("arithmetic", () => {
  beforeAll(() => { /* once before all */ });
  afterEach(() => { /* after each test */ });

  test("addition", () => {
    expect(2 + 2).toBe(4);
  });

  test.todo("subtraction");           // shown as TODO
  test.skip("flaky", () => {});       // skipped
  test.only("isolated", () => {});    // only-mode runs only marked tests
  test.failing("expected fail", () => { expect(1).toBe(2); }); // passes if it throws

  test.each([[1, 2, 3], [2, 3, 5]])("adds %i + %i = %i", (a, b, c) => {
    expect(a + b).toBe(c);
  });
});
```

Tests can be async, or use a `done` callback:

```ts
test("await", async () => { await delay(10); expect(true).toBe(true); });
test("done", done => { setTimeout(() => { expect(true).toBe(true); done(); }, 10); });
```

## Mocks — `mock`, `spyOn`, `mock.module`

```ts
import { test, expect, mock, spyOn } from "bun:test";

// Plain function mock
const fn = mock((x: number) => x * 2);
fn(3);
expect(fn).toHaveBeenCalledWith(3);
expect(fn).toHaveBeenCalledTimes(1);
expect(fn.mock.calls).toEqual([[3]]);
expect(fn.mock.results[0]).toEqual({ type: "return", value: 6 });

fn.mockReturnValue(42);
fn.mockReturnValueOnce(99);
fn.mockImplementation(x => x + 1);
fn.mockResolvedValue("done");           // for async
fn.mockClear();                          // clear history
fn.mockReset();                          // + remove implementation
fn.mockRestore();                        // (spyOn only) restore original

// Spy on existing object method
const calc = { add: (a: number, b: number) => a + b };
const spy = spyOn(calc, "add");
calc.add(1, 2);
expect(spy).toHaveBeenCalledWith(1, 2);
spy.mockRestore();                       // un-spy

// Module mock — replace a whole import (mock and mock.module come from the bun:test import at the top of the file)
mock.module("./logger", () => ({
  log: mock(() => {}),
  error: mock(() => {}),
}));
```

`jest.fn()`, `jest.spyOn()`, `jest.mock()` aliases also work for migration compatibility.

## Snapshots

```ts
test("renders", () => {
  expect({ name: "Alice", age: 30 }).toMatchSnapshot();          // file snapshot
  expect("<h1>hi</h1>").toMatchInlineSnapshot(`"<h1>hi</h1>"`);  // inline
});
```

- File snapshots land in `__snapshots__/<file>.snap` next to the test.
- Update with `bun test --update-snapshots` (alias: `-u`).
- Inline snapshots are written into the test file itself.

## Dates and timers — `setSystemTime`

```ts
import { test, expect, setSystemTime } from "bun:test";

test("frozen clock", () => {
  setSystemTime(new Date("2030-01-01"));
  expect(new Date().getFullYear()).toBe(2030);
  setSystemTime();                                   // restore real clock
});
```

For fine-grained fake timers (advance time, run pending timers), use Bun's `jest.useFakeTimers()` / `jest.advanceTimersByTime()` API.

## DOM — `bun:test` + Happy DOM

Bun does not bundle a DOM by default. For component tests use Happy DOM (preloaded):

```ts
// happydom.ts
import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();
```

```toml bunfig.toml
[test]
preload = ["./happydom.ts"]
```

```bash
bun add -d @happy-dom/global-registrator
bun test
```

`document`, `window`, `HTMLElement`, etc. are now global.

## Coverage

```bash
bun test --coverage                       # text report
bun test --coverage --coverage-reporter=lcov --coverage-dir=./coverage
```

```toml bunfig.toml
[test]
coverage = true
coverageThreshold = { line = 0.9, function = 0.95 }
coverageReporter = ["text", "lcov"]
coverageDir = "./coverage"
coverageSkipTestFiles = true
coverageIgnoreSourcemaps = false
```

Coverage reporter writes `lcov.info` for upload to Codecov / Coveralls / SonarQube.

## Reporters

```bash
bun test --reporter=junit --reporter-outfile=./junit.xml
```

Built-in reporters: `text` (default), `junit`. CI integration via JUnit XML is the most portable.

## bunfig.toml — test keys

```toml
[test]
preload = ["./setup.ts"]                   # always loaded before tests
root = "./src"                              # restrict discovery
coverage = true
coveragePathIgnorePatterns = ["**/node_modules/**", "**/*.test.ts"]
```

## Migration from Jest / Vitest

| Jest/Vitest | Bun |
|-------------|-----|
| `jest`/`vitest` config in package.json or jest.config | `[test]` in `bunfig.toml` (much smaller surface) |
| `jest.fn()` | `mock(fn)` or `jest.fn()` (alias kept) |
| `jest.spyOn(obj, "m")` | `spyOn(obj, "m")` |
| `jest.mock("./mod")` factory | `mock.module("./mod", () => ({ ... }))` |
| `jest.useFakeTimers()` | `jest.useFakeTimers()` (supported alias) |
| `vi.*` (Vitest) | not exported — replace with `mock`/`spyOn`/`jest.*` |
| `setupFiles`, `setupFilesAfterEnv` | `preload` in `bunfig.toml` |
| `--testNamePattern` | `-t` |
| `--coverage` | `--coverage` |
| `*.test.ts` (Jest default) | same |

**Matchers**: Bun implements most Jest matchers but not every one (e.g. some `.toMatchObject` deep-equality edge cases differ slightly). Run the suite once after migration and read failures carefully — most are real, some are matcher gaps.

## Common gotchas

- **`mock()` is a top-level import**, not a namespace. `import { mock } from "bun:test"` — there is no `jest.fn` global without an import.
- **`mock.module` is hoisted, like Jest** — calls before the affected import work, after may not. Put module mocks at the top of the test file.
- **Tests do not share global state** by file — but they do within a file. Use `beforeEach` for isolation.
- **`expect.extend()` is supported** for custom matchers, with the same signature as Jest.
- **No `vi.*` global** — Vitest migration requires replacing `vi.fn` → `mock`, `vi.spyOn` → `spyOn`, `vi.mock` → `mock.module`.
