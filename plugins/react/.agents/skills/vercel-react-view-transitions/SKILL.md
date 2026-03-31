---
name: vercel-react-view-transitions
description: Guide for implementing smooth, native-feeling animations using React's View Transition API (`<ViewTransition>` component, `addTransitionType`, and CSS view transition pseudo-elements). Use this skill whenever the user wants to add page transitions, animate route changes, create shared element animations, animate enter/exit of components, animate list reorder, implement directional (forward/back) navigation animations, or integrate view transitions in Next.js. Also use when the user mentions view transitions, `startViewTransition`, `ViewTransition`, transition types, or asks about animating between UI states in React without third-party animation libraries.
license: MIT
metadata:
  author: vercel
  version: "1.0.0"
---

# React View Transitions

React's View Transition API lets you animate between UI states using the browser's native `document.startViewTransition` under the hood. Declare *what* to animate with `<ViewTransition>`, trigger *when* with `startTransition` / `useDeferredValue` / `Suspense`, and control *how* with CSS classes or the Web Animations API. Unsupported browsers skip the animation and apply the DOM change instantly.

## When to Animate (and When Not To)

Every `<ViewTransition>` should answer: **what spatial relationship or continuity does this animation communicate to the user?** If you can't articulate it, don't add it.

### Hierarchy of Animation Intent

From highest value to lowest — start from the top and only move down if your app doesn't already have animations at that level:

| Priority | Pattern | What it communicates | Example |
|----------|---------|---------------------|---------|
| 1 | **Shared element** (`name`) | "This is the same thing — I'm going deeper" | List thumbnail morphs into detail hero |
| 2 | **Suspense reveal** | "Data loaded, here's the real content" | Skeleton cross-fades into loaded page |
| 3 | **List identity** (per-item `key`) | "Same items, new arrangement" | Cards reorder during sort/filter |
| 4 | **State change** (`enter`/`exit`) | "Something appeared or disappeared" | Panel slides in on toggle |
| 5 | **Route change** (layout-level) | "Going to a new place" | Cross-fade between pages |

Route-level transitions (#5) are the lowest priority because the URL change already signals a context switch. A blanket cross-fade on every navigation says nothing — it's visual noise. Prefer specific, intentional animations (#1–#4) over ambient page transitions.

**Rule of thumb:** at any given moment, only one level of the tree should be visually transitioning. If your pages already manage their own Suspense reveals or shared element morphs, adding a layout-level route transition on top produces double-animation where both levels fight for attention.

### Choosing the Right Animation Style

Not everything should slide. Match the animation to the spatial relationship:

| Context | Animation | Why |
|---------|-----------|-----|
| Detail page main content | `enter="slide-up"` | Reveals "deeper" content the user drilled into |
| Detail page outer wrapper | `enter`/`exit` type map for `nav-forward` | Navigating forward — horizontal direction |
| List / overview pages | Bare `<ViewTransition>` (fade) or `default="none"` | Lateral navigation — no spatial depth to communicate |
| Page headers / breadcrumbs | Bare `<ViewTransition>` (fade) | Small, fast-loading metadata — slide feels excessive |
| Secondary section on same page | `enter="slide-up"` | Second Suspense boundary streaming in after the header |
| Revalidation / background refresh | `default="none"` | Data refreshed silently — animation would be distracting |

When in doubt, use a bare `<ViewTransition>` (default cross-fade) or `default="none"`. Only add directional motion (slide-up, slide-from-right) when it communicates spatial meaning.

---

## Availability

- `<ViewTransition>` and `addTransitionType` require `react@canary` or `react@experimental`. They are **not** in stable React (including 19.x). Before implementing, verify the project uses canary — check `package.json` for `"react": "canary"` or run `npm ls react`. If on stable, install canary: `npm install react@canary react-dom@canary`.
- Browser support: Chromium 111+, with Firefox and Safari adding support. The API gracefully degrades — unsupported browsers skip the animation and apply the DOM change instantly.

---

## Core Concepts

### The `<ViewTransition>` Component

Wrap the elements you want to animate:

```jsx
import { ViewTransition } from 'react';

<ViewTransition>
  <Component />
</ViewTransition>
```

React automatically assigns a unique `view-transition-name` to the nearest DOM node inside each `<ViewTransition>`, and calls `document.startViewTransition` behind the scenes. Never call `startViewTransition` yourself — React coordinates all view transitions and will interrupt external ones.

### Animation Triggers

React decides which type of animation to run based on what changed:

| Trigger | When it fires |
|---------|--------------|
| **enter** | A `<ViewTransition>` is first inserted during a Transition |
| **exit** | A `<ViewTransition>` is first removed during a Transition |
| **update** | DOM mutations happen inside a `<ViewTransition>`, or the boundary changes size/position due to an immediate sibling |
| **share** | A named `<ViewTransition>` unmounts and another with the same `name` mounts in the same Transition (shared element transition) |

Only updates wrapped in `startTransition`, `useDeferredValue`, or `Suspense` activate `<ViewTransition>`. Regular `setState` updates immediately and does not animate.

### Critical Placement Rule

`<ViewTransition>` only activates enter/exit if it appears **before any DOM nodes** in the component tree:

```jsx
// Works — ViewTransition is before the DOM node
function Item() {
  return (
    <ViewTransition enter="auto" exit="auto">
      <div>Content</div>
    </ViewTransition>
  );
}

// Broken — a <div> wraps the ViewTransition, preventing enter/exit
function Item() {
  return (
    <div>
      <ViewTransition enter="auto" exit="auto">
        <div>Content</div>
      </ViewTransition>
    </div>
  );
}
```

---

## Styling Animations with View Transition Classes

### Props

Each prop controls a different animation trigger. Values can be:

- `"auto"` — use the browser default cross-fade
- `"none"` — disable this animation type
- `"my-class-name"` — a custom CSS class
- An object `{ [transitionType]: value }` for type-specific animations (see Transition Types below)

```jsx
<ViewTransition
  default="none"          // disable everything not explicitly listed
  enter="slide-in"        // CSS class for enter animations
  exit="slide-out"        // CSS class for exit animations
  update="cross-fade"     // CSS class for update animations
  share="morph"           // CSS class for shared element animations
/>
```

If `default` is `"none"`, all triggers are off unless explicitly listed.

### Defining CSS Animations

Use the view transition pseudo-element selectors with the class name:

```css
::view-transition-old(.slide-in) {
  animation: 300ms ease-out slide-out-to-left;
}
::view-transition-new(.slide-in) {
  animation: 300ms ease-out slide-in-from-right;
}

@keyframes slide-out-to-left {
  to { transform: translateX(-100%); opacity: 0; }
}
@keyframes slide-in-from-right {
  from { transform: translateX(100%); opacity: 0; }
}
```

The pseudo-elements available are:

- `::view-transition-group(.class)` — the container for the transition
- `::view-transition-image-pair(.class)` — contains old and new snapshots
- `::view-transition-old(.class)` — the outgoing snapshot
- `::view-transition-new(.class)` — the incoming snapshot

---

## Transition Types with `addTransitionType`

`addTransitionType` lets you tag a transition with a string label so `<ViewTransition>` can pick different animations based on *what caused* the change. This is essential for directional navigation (forward vs. back) or distinguishing user actions (click vs. swipe vs. keyboard).

### Basic Usage

```jsx
import { startTransition, addTransitionType } from 'react';

function navigate(url, direction) {
  startTransition(() => {
    addTransitionType(`navigation-${direction}`); // "navigation-forward" or "navigation-back"
    setCurrentPage(url);
  });
}
```

You can add multiple types to a single transition, and if multiple transitions are batched, all types are collected.

### Using Types with View Transition Classes

Pass an object instead of a string to any activation prop. Keys are transition type strings, values are CSS class names:

```jsx
<ViewTransition
  enter={{
    'navigation-forward': 'slide-in-from-right',
    'navigation-back': 'slide-in-from-left',
    default: 'fade-in',
  }}
  exit={{
    'navigation-forward': 'slide-out-to-left',
    'navigation-back': 'slide-out-to-right',
    default: 'fade-out',
  }}
>
  <Page />
</ViewTransition>
```

The `default` key inside the object is the fallback when no type matches. If any type has the value `"none"`, the ViewTransition is disabled for that trigger.

### Using Types with CSS `:active-view-transition-type()`

React adds transition types as browser view transition types, enabling pure CSS scoping with `:root:active-view-transition-type(type-name)`. **Caveat:** `::view-transition-old(*)` / `::view-transition-new(*)` match **all** named elements — the wildcard can override specific class-based animations. Prefer class-based props for per-component animations; reserve `:active-view-transition-type()` for global rules.

The `types` array is also available as the second argument in event callbacks (`onEnter`, `onExit`, etc.) — see `references/patterns.md`.

### Types and Suspense: When Types Are Available

When a `<Link>` with `transitionTypes` triggers navigation, the transition type is available to **all `<ViewTransition>`s that enter/exit during that navigation**. An outer page-level `<ViewTransition>` with a type map sees the type and responds. Inner `<ViewTransition>`s with simple string props also enter — the type is irrelevant to them because simple strings fire regardless of type.

Subsequent Suspense reveals — when streamed data loads after navigation completes — are **separate transitions with no type**. This means type-keyed props on Suspense content don't work:

```jsx
// This does NOT animate on Suspense reveal — the type is gone by then
<ViewTransition enter={{ "nav-forward": "slide-up", default: "none" }} default="none">
  <AsyncContent />
</ViewTransition>
```

When Suspense resolves later, a new transition fires with no type — so `default: "none"` applies and nothing animates.

**Use type maps for `<ViewTransition>`s that enter/exit directly with the navigation. Use simple string props for Suspense reveals.** See the two-layer pattern in "Two Patterns — Can Coexist with Proper Isolation" below for a complete example.

---

## Shared Element Transitions

Assign the same `name` to two `<ViewTransition>` components — one in the unmounting tree and one in the mounting tree — to animate between them as if they're the same element:

```jsx
const HERO_IMAGE = 'hero-image';

function ListView({ onSelect }) {
  return (
    <ViewTransition name={HERO_IMAGE}>
      <img src="/thumb.jpg" onClick={() => startTransition(() => onSelect())} />
    </ViewTransition>
  );
}

function DetailView() {
  return (
    <ViewTransition name={HERO_IMAGE}>
      <img src="/full.jpg" />
    </ViewTransition>
  );
}
```

Rules for shared element transitions:
- Only one `<ViewTransition>` with a given `name` can be mounted at a time — use globally unique names (namespace with a prefix or module constant).
- The "share" trigger takes precedence over "enter"/"exit".
- If either side is outside the viewport, no pair forms and each side animates independently as enter/exit.
- Use a constant defined in a shared module to avoid name collisions.

---

## View Transition Events (JavaScript Animations)

For imperative control with `onEnter`, `onExit`, `onUpdate`, `onShare` callbacks and the `instance` object (`.old`, `.new`, `.group`, `.imagePair`, `.name`), see `references/patterns.md`. Always return a cleanup function from event handlers. Only one event fires per `<ViewTransition>` per Transition — `onShare` takes precedence over `onEnter`/`onExit`.

---

## Common Patterns

### Animate Enter/Exit of a Component

Conditionally render the `<ViewTransition>` itself — toggle with `startTransition`:

```jsx
{show && (
  <ViewTransition enter="fade-in" exit="fade-out">
    <Panel />
  </ViewTransition>
)}
```

### Animate List Reorder

Wrap each item (not a wrapper div) in `<ViewTransition>` with a stable `key`:

```jsx
{items.map(item => (
  <ViewTransition key={item.id}>
    <ItemCard item={item} />
  </ViewTransition>
))}
```

Triggering the reorder inside `startTransition` will smoothly animate each item to its new position. Avoid wrapper `<div>`s between the list and `<ViewTransition>` — they block the reorder animation.

**How it works:** `startTransition` doesn't need async work to animate. The View Transition API captures a "before" snapshot of the DOM, then React applies the state update, and the API captures an "after" snapshot. As long as items change position between snapshots, the animation runs — even for purely synchronous local state changes like sorting.

### Force Re-Enter with `key`

Use a `key` prop on `<ViewTransition>` to force an enter/exit animation when a value changes — even if the component itself doesn't unmount:

```jsx
<ViewTransition key={searchParams.toString()} enter="slide-up" exit="slide-down" default="none">
  <ResultsGrid results={results} />
</ViewTransition>
```

When the key changes, React unmounts and remounts the `<ViewTransition>`, which triggers exit on the old instance and enter on the new one. This is useful for animating content swaps driven by URL parameters, tab switches, or any state change where the content identity changes but the component type stays the same.

**Caution with Suspense:** If the `<ViewTransition>` wraps a `<Suspense>`, changing the key remounts the entire Suspense boundary, re-triggering the data fetch. Only use `key` on `<ViewTransition>` outside of Suspense, or accept the refetch.

### Animate Suspense Fallback to Content

The simplest approach: wrap `<Suspense>` in a single `<ViewTransition>` for a zero-config cross-fade from skeleton to content:

```jsx
<ViewTransition>
  <Suspense fallback={<Skeleton />}>
    <Content />
  </Suspense>
</ViewTransition>
```

For directional motion, give the fallback and content separate `<ViewTransition>`s. Use `default="none"` on the content to prevent re-animation on revalidation:

```jsx
<Suspense
  fallback={
    <ViewTransition exit="slide-down">
      <Skeleton />
    </ViewTransition>
  }
>
  <ViewTransition default="none" enter="slide-up">
    <AsyncContent />
  </ViewTransition>
</Suspense>
```

**Why `exit` on the fallback and `enter` on the content?** When Suspense resolves, two things happen simultaneously in one transition: the fallback unmounts (exit) and the content mounts (enter). The fallback slides down and fades out while the content slides up and fades in — creating a smooth handoff. The staggered CSS timing (`enter` delays by the `exit` duration) ensures the skeleton leaves before new content arrives.

### Opt Out of Nested Animations

Wrap children in `<ViewTransition update="none">` to prevent them from animating when a parent changes:

```jsx
<ViewTransition>
  <div className={theme}>
    <ViewTransition update="none">
      {children}
    </ViewTransition>
  </div>
</ViewTransition>
```

For more patterns (isolate persistent/floating elements, reusable animated collapse, preserve state with `<Activity>`, exclude elements with `useOptimistic`), see `references/patterns.md`.

---

## How Multiple `<ViewTransition>`s Interact

When a transition fires, **every** `<ViewTransition>` in the tree that matches the trigger participates simultaneously. Each gets its own `view-transition-name`, and the browser animates all of them inside a single `document.startViewTransition` call. They run in parallel, not sequentially.

This means multiple `<ViewTransition>`s that fire during the **same** transition all animate at once. A layout-level cross-fade + a page-level slide-up + per-item reorder all running in the same `document.startViewTransition` produces competing animations. But `<ViewTransition>`s that fire in **different** transitions (e.g., navigation vs. a later Suspense resolve) don't compete — they animate at different moments.

### Use `default="none"` Liberally

Prevent unintended animations by disabling the default trigger on ViewTransitions that should only fire for specific types:

```jsx
// Only animates when 'navigation-forward' or 'navigation-back' types are present.
// Silent on all other transitions (Suspense reveals, state changes, etc.)
<ViewTransition
  default="none"
  enter={{
    'navigation-forward': 'slide-in-from-right',
    'navigation-back': 'slide-in-from-left',
    default: 'none',
  }}
  exit={{
    'navigation-forward': 'slide-out-to-left',
    'navigation-back': 'slide-out-to-right',
    default: 'none',
  }}
>
  {children}
</ViewTransition>
```

**TypeScript note:** When passing an object to `enter`/`exit`, the `ViewTransitionClassPerType` type requires a `default` key. Always include `default: 'none'` (or `'auto'`) in the object — omitting it causes a type error even if the component-level `default` prop is set.

Without `default="none"`, a `<ViewTransition>` with `default="auto"` (the implicit default) fires the browser's cross-fade on **every** transition — including ones triggered by child Suspense boundaries, `useDeferredValue` updates, or `startTransition` calls within the page.

**Next.js revalidation:** This is especially important in Next.js — when `revalidateTag()` fires (from a Server Action, webhook, or polling), the page re-renders. Without `default="none"`, every `<ViewTransition>` in the tree re-animates: content slides up again, things flash. Always use `default="none"` on content `<ViewTransition>`s and only enable specific triggers (`enter`, `exit`) explicitly.

### Two Patterns — Can Coexist with Proper Isolation

There are two distinct view transition patterns:

**Pattern A — Directional page slides** (e.g., left/right navigation):
- Uses `transitionTypes` on `<Link>` or `addTransitionType` to tag navigation direction
- An outer `<ViewTransition>` on the page maps types to slide classes with `default="none"`
- Fires during the navigation transition (when the type is present)

**Pattern B — Suspense content reveals** (e.g., streaming data):
- No `transitionTypes` needed
- Simple `enter="slide-up"` / `exit="slide-down"` on `<ViewTransition>`s around Suspense boundaries
- `default="none"` prevents re-animation on revalidation
- Fires later when data loads (a separate transition with no type)

**These coexist when they fire at different moments.** The nav slide fires during the navigation transition (with the type); the Suspense reveal fires later when data streams in (no type). `default="none"` on both layers prevents cross-interference — the nav VT ignores Suspense resolves, and the Suspense VT ignores navigations:

```jsx
<ViewTransition
  enter={{ "nav-forward": "slide-from-right", default: "none" }}
  exit={{ "nav-forward": "slide-to-left", default: "none" }}
  default="none"
>
  <div>
    <Suspense fallback={
      <ViewTransition exit="slide-down"><Skeleton /></ViewTransition>
    }>
      <ViewTransition enter="slide-up" default="none">
        <Content />
      </ViewTransition>
    </Suspense>
  </div>
</ViewTransition>
```

**Always pair `enter` with `exit` on directional transitions.** Without an exit animation, the old page disappears instantly while the new one slides in at scroll position 0 — a jarring jump. The exit slide masks the scroll change within the transition snapshot because the old content animates out simultaneously.

**When they DO conflict:** If both layers use `default="auto"`, or if a layout-level `<ViewTransition>` fires a cross-fade during the same transition as a page-level slide-up, they animate simultaneously and fight for attention. The conflict is about **same-moment** animations, not about using both patterns on the same page.

Place the outer directional `<ViewTransition>` in each **page component** — not in a layout (layouts persist and don't trigger enter/exit). Per-page wrappers are the cleanest approach.

Shared element transitions (`name` prop) work alongside either pattern because the `share` trigger takes precedence over `enter`/`exit`.

---

## Next.js Integration

Next.js supports React View Transitions. `<ViewTransition>` works out of the box for `startTransition`- and `Suspense`-triggered updates — no config needed.

To also animate `<Link>` navigations, enable the experimental flag in `next.config.js` (or `next.config.ts`):

```js
const nextConfig = {
  experimental: {
    viewTransition: true,
  },
};
module.exports = nextConfig;
```

**What this flag does:** It wraps every `<Link>` navigation in `document.startViewTransition`, so all mounted `<ViewTransition>` components participate in every link click. Without this flag, only `startTransition`/`Suspense`-triggered transitions animate. This makes the composition rules in "How Multiple `<ViewTransition>`s Interact" especially important: use `default="none"` on layout-level `<ViewTransition>`s to avoid competing animations.

For a detailed guide including App Router patterns and Server Component considerations, see `references/nextjs.md`.

Key points:
- The `<ViewTransition>` component is imported from `react` directly — no Next.js-specific import.
- Works with the App Router and `startTransition` + `router.push()` for programmatic navigation.

### The `transitionTypes` prop on `next/link`

`next/link` supports a native `transitionTypes` prop — pass an array of strings directly, no `'use client'` or wrapper component needed:

```tsx
<Link href="/products/1" transitionTypes={['transition-to-detail']}>View Product</Link>
```

For full examples with shared element transitions and directional animations, see `references/nextjs.md`.

---

## Accessibility

Always respect `prefers-reduced-motion`. React does not disable animations automatically for this preference. Add this to your global CSS:

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*),
  ::view-transition-group(*) {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
  }
}
```

Or disable specific animations conditionally in JavaScript events by checking the media query.

---

## Reference Files

- **`references/patterns.md`** — Real-world patterns (searchable grids, expand/collapse, type-safe helpers), animation timing, view transition events (JavaScript Animations API), and troubleshooting.
- **`references/css-recipes.md`** — Ready-to-use CSS animation recipes (slide, fade, scale, directional nav, and combined patterns).
- **`references/nextjs.md`** — Detailed Next.js integration guide with App Router patterns and Server Component considerations.
