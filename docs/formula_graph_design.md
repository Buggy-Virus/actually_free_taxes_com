# Unified Formula Graph — Design

Status: proposal, with a working prototype in `src/graph/` (tests: `src/tests/test-graph.ts`).

## Problem

Today the same math lives in four places that drift apart:

1. `calculateTaxes` — the real math, plus hand-written `generalFormula` / `pluggedFormula` strings.
2. `buildCalculationBlocks` — recomputes much of the math from raw inputs, then builds `FormulaNode`s whose
   result is handed in through `opNode(..., { value })`, so a node's displayed result can disagree with its
   displayed operands (e.g. Gross Income showing terms that sum to $288,200 but a total of $298,400).
3. `buildAutoPanels` — static `formulaSummary` strings and hand-typed `sourceIds`.
4. `app.ts buildConnections` — hand-wired arrows, ~15% of which point at DOM ids that no longer exist.

## Core idea

**One expression tree per quantity, interpreted several ways.** A formula is data (an `Expr` AST). The
same tree is:

| Interpreter | Produces |
|---|---|
| `evaluate` | the numbers (the only tax math in the app) |
| `render(general)` | General Formula tokens |
| `render(plugged)` | With Your Numbers tokens, read from the evaluated tree |
| `sources` / `edges` / `upstream` | dependency arrows and highlight chains |
| `applies` | whether an auto-spawned item (credit, deduction) exists for this return |

Nothing can be shown that wasn't computed, and nothing computed can lack a display or an arrow. There is
no `value` override anywhere.

### Why an AST and not "a class per variable with its own render/compute methods"

The instinct to make each variable a first-class object is right; the variables *are* first-class
(`QuantityDef`, `InputDef`, `ParamDef`, each with id, label, unit, form line, DOM id, citation). But if
each one carried its own hand-written `compute()` and `render()` methods, those two methods could
disagree, which is the current bug in a new form. Keeping a variable's *formula* as data and having
one shared evaluator and one shared renderer makes agreement structural rather than a matter of
discipline. Variables become declarations, not code.

## Model

```ts
// Formulas (src/graph/expr.ts)
add, sub, mul, div, min, max, round      // arithmetic
ref('fed.agi')                           // another quantity or a user input
param('fed.stdDeduction')                // law constant, resolved by year / status / state
each('w2', 'box1')                       // sum of a field across a repeated input (W-2s, 1099s)
when(cond, then, else), gt/gte/lt/and/or // conditionals; only the taken branch is evaluated
brackets(income, 'fed.brackets')         // progressive table; slices become intermediate lines

// Declarations (src/graph/graph.ts)
g.input({ id, label, unit, domId })                       // scalar user input
g.collection({ id, itemLabel, fields: { box1: {label, domId(item)} } })
g.param({ id, label, unit, source, resolve(ctx) })        // year/status-keyed data + citation
g.quantity({ id, label, unit, expr, form?, display?, category?, appliesWhen? })
```

Example (from `src/graph/federal-spine.ts`):

```ts
g.quantity({ id: 'fed.studentLoanDeduction', label: 'Student Loan Interest Deduction', unit: 'usd',
  display: 'inline', expr: min(ref('in.studentLoan'), param('fed.studentLoanCap')) });
g.quantity({ id: 'fed.adjustments', label: 'Adjustments to Income', unit: 'usd',
  form: 'Schedule 1 Line 26', category: 'adjustments',
  expr: add(ref('fed.studentLoanDeduction'), ref('in.ira'), ref('in.hsa')) });
```

renders as

```
General:    Adjustments to Income = min(Student Loan Interest Paid, Student Loan Interest Cap) + Traditional IRA Deduction + HSA Deduction
Your #s:    Adjustments to Income = min($3,000.00, $2,500.00) + $5,000.00 + $1,000.00 = $8,500.00
Arrows:     input-adj-student-loan, input-adj-ira, input-adj-hsa  →  q-fed-adjustments
```

## Granularity control: `line` vs `inline`

Today's blocks are too big in some places and too opaque in others. One switch per quantity
decides this:

- `display: 'line'` (default): the quantity gets its own formula line, its own DOM id
  (`q-<id>`), and is an arrow target. Parents show it as a named variable.
- `display: 'inline'`: the quantity is expanded inside whoever uses it, and its inputs' arrows go to
  that parent line. Use it for small helpers such as caps, `max(0, …)` and simple sums.

A **block** in the UI is just a list of quantity ids to show together. It contains no math, so
regrouping the page never touches calculations. "Show detail" can switch a block between showing
only its top quantity and showing every `line` quantity under it, using `upstream()`.

## Arrows

- Every `input` and collection field knows its DOM id; every `line` quantity has `q-<id>`.
- `edges()` walks the *evaluated* trees, so arrows reflect only the branches that actually ran
  (an untaken `when` branch draws no arrow) and inputs that are 0 still connect.
- Arrow color comes from `category` on the quantity, not substring guessing.
- Arrows land on the specific formula line, not the block corner.
- Selecting a line highlights `upstream(id)`, the full chain back to the raw inputs.
- `buildConnections` in `app.ts` is deleted.

## Auto-spawned items

Credits and deductions the user doesn't enter (EITC, Saver's Credit, ACTC, state exemption credits)
are ordinary quantities with `appliesWhen`. A panel exists iff `applies(id)` is true. Its formula,
"your numbers" and arrows come from the same tree, so `buildAutoPanels` and its string
summaries go away.

## Law constants as data

`param`s resolve from tables keyed by **year → status → (state)** with a citation. This fixes the
state rules not being keyed by year at all, makes the next tax year a data change rather than a code
change, and lets the UI show "Standard Deduction ($14,600, Rev. Proc. 2023-34)" on hover.

## States at the same granularity as federal

Define one **state template**, a fixed set of quantity ids every state uses:

```
state.XX.startingPoint → additions → subtractions → stateAgi → deduction → exemptions
→ taxableIncome → tentativeTax → surtaxes → nonrefundableCredits → otherStateCredit
→ refundableCredits → localTax → total → payments → refund/owed
```

Each state module provides `Expr`s for those slots (defaulting to "federal AGI", "0", "flat rate"
and so on) plus its own extra quantities. States then share the same shape, rendering and arrows, and
a missing rule shows up as a slot still using its default, which can be listed automatically.
Refundable and nonrefundable credits are separate slots, which fixes the current clamp that loses
refundable state credits.

## People, not just returns

Some rules are per person (excess Social Security credit, SE tax Social Security cap, IRA limits,
65+/blind). Collections should carry an owner (`taxpayer` / `spouse`), and `each` takes an optional
filter, e.g. `each('w2', 'box4', { owner: 'spouse' })`. This removes the MFJ excess-SS bug class.

## Invariants (enforced in tests)

1. `graph.validate()` is empty: every ref, param and collection field resolves.
2. No cycles (checked at evaluation).
3. Every rendered "With Your Numbers" line ends with its own result. This holds by construction because
   there is no override path.
4. Every edge's source and target exist in the DOM (browser test).
5. Golden tests against published IRS/state worked examples per year.

Recommended follow-up: integer cents for currency values, with rounding only where the forms round
(`round(e, 'dollar')`).

## Migration (incremental, always green)

1. **Core** (done in prototype): `expr.ts`, `graph.ts`, federal spine through Line 16, parity test
   against `calculateTaxes`.
2. **Federal engine**: port remaining federal lines (Schedule 1/2/3, credits, other taxes) into
   modules (`fed/income.ts`, `fed/credits.ts`, ...). Keep `calculateTaxes` as an adapter that reads
   graph values into the existing `TaxCalculationSummary`, so current tests and UI keep working.
3. **UI**: render calc blocks from `ev.lines(id)` (same `CalcLineItem` shape), auto-panels from
   `appliesWhen` quantities, arrows from `ev.edges()`. Delete `buildCalculationBlocks`,
   `buildAutoPanels` strings, and `buildConnections`.
4. **States**: implement the template, port states one at a time behind the adapter.
5. Remove the adapter once the UI reads the graph directly.

## Prior art worth reading

- **IRS Direct File "Fact Graph"**, published as open source: a declarative graph of tax facts with
  derived values, built for this problem. Good source for modeling ideas, especially incompleteness
  ("we can't know this yet") and per-person facts.
- **OpenFisca / PolicyEngine**: variables + year-keyed parameters with citations, covering US federal
  and many state rules. Useful as a cross-check for parameter values.

None of them render human-readable formulas with plugged numbers or arrows, which is this app's
distinguishing feature, so a small in-house TypeScript graph is the right fit.

## Open questions

- **Incompleteness:** should a quantity distinguish "0" from "not enough information yet"? The Direct
  File Fact Graph does, and it would let the UI flag missing inputs precisely.
- **Iterative rules:** a few rules are genuinely circular. The best known is the self-employed health
  insurance deduction ↔ Premium Tax Credit (Rev. Proc. 2014-41 iterative method). Model these as
  explicit fixed-point quantities rather than allowing cycles in the graph.
