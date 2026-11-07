# Feature Flag Editor — Technical Notes

A form-based editor for [GO Feature Flag](https://gofeatureflag.org/editor)
configurations with nested targeting rules and a live JSON preview.

Code lives in [`src/pages/code-challenge/feature-flag-form/your-codes`](src/pages/code-challenge/feature-flag-form/your-codes).

## What it does

| Area            | Features                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Flag metadata   | Name, description, enabled/disabled, track events, version, flag type (boolean / string / number / JSON), free-form metadata                                             |
| Variations      | Add / remove / **drag to reorder**; the value input adapts to the flag type; changing the type resets values to valid defaults                                           |
| Targeting rules | Add / remove / **drag to reorder** (order = priority), per-rule disable switch                                                                                           |
| Query builder   | **Recursive groups** (AND / OR / NOT) up to 3 nested levels, 11 GO Feature Flag operators (`eq`, `in`, `pr`…), attribute suggestions (`role`, `group`…), drag to reorder |
| Serve           | Single variation, **percentage rollout** (live split bar, "split evenly"), **progressive rollout** (start/end date, variation, percentage)                               |
| Default rule    | Same serve editor as targeting rules                                                                                                                                     |
| Multiple flags  | "Add another flag", output is a map of flags                                                                                                                             |
| Live preview    | Monaco (read-only) JSON, updates on every keystroke; status badge, copy, export (download) only when valid                                                               |
| Errors          | Inline under the field + a list in the preview with a breadcrumb (`my-flag › Rule 2 › Condition`); clicking an issue scrolls to and focuses the field                    |

### Output format

The output follows the challenge's `expected.json` (`{ "flags": { "<name>": … } }`)
and the GO Feature Flag [flag format](https://gofeatureflag.org/docs/configure_flag/flag_format):

```json
{
  "flags": {
    "my-new-feature": {
      "variations": { "on": true, "off": false },
      "targeting": [
        {
          "name": "Beta testers",
          "query": "group eq \"beta\" and (role in [\"admin\", \"editor\"] or not (country eq \"TH\"))",
          "percentage": { "on": 50, "off": 50 }
        }
      ],
      "defaultRule": { "variation": "off" }
    }
  }
}
```

- Queries use GO Feature Flag's rule syntax (`eq`, `ne`, `in`, `pr`, `and`/`or`/`not`, parentheses for nested groups).
  Numbers and booleans are written unquoted; anything else is quoted (`"123"` can be typed explicitly to force a string).
- A percentage rollout is a `variation → %` map, as GO Feature Flag expects. (`expected.json` shows
  `"percentage": 50, "variation": "on"`, which isn't a valid GO Feature Flag rule, so I followed the real format.)
- Optional fields (`disable`, `trackEvents: false`, `version`, `metadata`) are only written when they differ from
  the defaults, which keeps the JSON close to what the official editor produces.

## Architecture

```
your-codes/
├─ model/                 Pure TypeScript — no React
│  ├─ constants.ts        Flag types, operators, serve types, colours
│  ├─ schema.ts           Zod schemas = single source of truth (types are inferred from them)
│  ├─ factories.ts        createFlag / createTargetingRule / createQueryTree …
│  ├─ query-tree.ts       Immutable tree operations + tree → query string
│  ├─ serialize.ts        Form values → GO Feature Flag JSON
│  ├─ issues.ts           Zod issues → { fieldName, location, message }
│  └─ __tests__/
├─ form/                  TanStack Form wiring
│  ├─ form-hook.ts        createFormHook (useAppForm / withForm), shared formOptions, useFormValue
│  ├─ fields/             TextField, NumberField, SelectField, SwitchField, ErrorMessage
│  ├─ paths.ts            Typed field-name builders (`flags[0].targeting[1].query`)
│  └─ selectors.ts        Narrow subscriptions (ids, variation options, serve)
└─ components/            UI only
   ├─ feature-flag-editor.tsx   Owns the form; flags on the left, preview on the right
   ├─ flag/  targeting/  query-builder/  serve/  preview/  shared/
   └─ __tests__/          Integration tests with Testing Library
```

**Separation of concerns:** `model/` knows nothing about React or the form library, so all
business logic (validation, query generation, output) is unit-tested in isolation. Components
read state and call either a form array helper (`pushFieldValue`, `moveFieldValues`…) or a pure
function from `model/`.

**Adding things later:** a new operator is one entry in `OPERATORS` (UI, validation and
serialization all read it); a new serve strategy is a new `SERVE_TYPES` entry + a branch in
`validateServe` / `toGoffServe` + one component.

## Key decisions

### 1. The condition tree is stored normalized, but rendered recursively

The natural model is a recursive type (`Group { children: (Group | Condition)[] }`), but
TanStack Form computes every possible field path (`DeepKeys`) from the form type — on a
recursive type that fails with _"Type instantiation is excessively deep and possibly infinite"_.

So each rule stores `{ rootId, nodes: Record<id, GroupNode | ConditionNode> }` where a group
lists its `childIds` (like a normalized Redux store). Benefits:

- Field names stay fully typed: `flags[0].targeting[1].query.nodes.${id}.attribute`.
- Moving / deleting a node is a small immutable update (`query-tree.ts`), easy to unit test.
- Each `QueryGroup` subscribes only to its own `childIds`, so typing in one condition doesn't
  re-render sibling groups.

`QueryGroup` still renders itself recursively for nested groups, and `toQueryString` walks the
tree recursively to build the query.

### 2. One Zod schema, used as the TanStack Form validator

`flagEditorSchema` is passed to `validators.onChange`. TanStack Form supports Standard Schema,
so every Zod issue is routed to the field whose name matches the issue `path`. Cross-field
rules (variation references, unique names, percentages summing to 100, end date after start
date) live in `superRefine` on the closest common parent and still target the exact field.

Errors show once a field is touched or after an export attempt, so a freshly added empty
condition isn't immediately red. The preview runs the same schema (`safeParse`) to list every
issue with its location.

### 3. Rules reference variations by id, not by name

Renaming `Variation_1` to `on` doesn't break any rule; names are resolved only when the JSON
is generated. Deleting a variation that is still referenced shows "Select a variation to serve".

### 4. Re-render control

- `createFormHook` + `withForm`: each section is its own component bound to the shared form type.
- `useFormValue(form, selector, isEqual)` subscribes to a slice of state; list components select
  only **ids** (compared element-wise), so adding a condition doesn't re-render the other rules.
- The preview uses `form.Subscribe` (it needs everything) plus `useDeferredValue` so keystrokes
  stay responsive while Monaco and validation catch up.

### 5. Small things

- Drag & drop: a generic `SortableList` (dnd-kit) that only reports `onMove(from, to)`; works with
  mouse, touch and keyboard (focus the grip, Space, arrows, Space).
- Native `<select>` (shadcn `native-select`) — accessible, keyboard and mobile friendly, simple to test.
- Switching serve type to "percentage rollout" pre-fills an even split instead of 0 %.
- The editor renders client-only (`ClientOnly`) because it generates random ids and uses Monaco.

## Changes outside `your-codes/`

- **`src/styles.css`** — the starter declared the `--color-*` tokens inside `:root` instead of
  `@theme inline`, so utilities like `bg-primary`, `bg-card`, `text-muted-foreground` were never
  generated, and light-theme values were missing. Fixed and added the standard shadcn neutral palette.
- **`src/components/ui/switch.tsx`** — the generated switch used `data-checked:` selectors, but
  Radix sets `data-state="checked"`.
- **`vitest.config.ts` / `vitest.setup.ts`** — tests run without the TanStack Start plugin (it
  duplicates React in jsdom) and with a `ResizeObserver` stub for Radix.
- Added `@dnd-kit/*` and shadcn `switch`, `label`, `textarea`, `badge`, `card`, `native-select`.

## Possible next steps

- Drag conditions **between** groups (currently reorder within a group).
- Import an existing YAML/JSON config back into the form.
- YAML / TOML output tabs like the official editor.
- Undo / redo (the normalized tree makes snapshots cheap).
