/**
 * Formula Graph — expression language.
 *
 * Every formula in the app is an `Expr` tree. The same tree is interpreted by:
 *   - evaluate()  → numbers (the actual tax math)
 *   - render()    → General Formula tokens and With-Your-Numbers tokens
 *   - sources()   → dependency arrows
 * There is no other place where math or formula text is written, so what the
 * user sees is, by construction, the math that ran.
 */

export type Unit = 'usd' | 'rate' | 'count';

export type CoreStatus = 'single' | 'married_joint' | 'married_separate' | 'head_of_household';

export type CmpOp = '>' | '>=' | '<' | '<=' | '==' | '!=';

export type Cond =
  | { k: 'cmp'; op: CmpOp; a: Expr; b: Expr }
  | { k: 'and'; conds: Cond[] }
  | { k: 'or'; conds: Cond[] }
  | { k: 'not'; cond: Cond }
  /** Filing status is one of the listed statuses. */
  | { k: 'status'; in: CoreStatus[] }
  /** A user choice that is not a number (e.g. "force itemized deductions"). */
  | { k: 'flag'; id: string; label: string; negLabel: string; domId?: string };

export type Expr =
  | { k: 'lit'; value: number; unit: Unit }
  /** A law constant looked up by year / filing status / state (e.g. standard deduction). */
  | { k: 'param'; id: string }
  /** Another quantity or a scalar user input, by id. */
  | { k: 'ref'; id: string }
  /** Sum of `body` evaluated once per item of a repeated input (W-2s, 1099s, ...). */
  | { k: 'sum_over'; collection: string; body: Expr; where?: string }
  /** A field of the current collection item (only valid inside `sum_over`). */
  | { k: 'field'; name: string }
  /** Number of items in a collection. */
  | { k: 'count'; collection: string; where?: string }
  | { k: 'add'; terms: Expr[] }
  | { k: 'sub'; a: Expr; minus: Expr[] }
  | { k: 'neg'; e: Expr }
  | { k: 'mul'; a: Expr; b: Expr }
  | { k: 'div'; a: Expr; b: Expr }
  | { k: 'min'; args: Expr[] }
  | { k: 'max'; args: Expr[] }
  | { k: 'ceil'; e: Expr }
  | { k: 'floor'; e: Expr }
  | { k: 'if'; cond: Cond; then: Expr; else: Expr }
  /** Pick an entry of a list-valued param by a computed index (clamped to the list). */
  | { k: 'lookup'; table: string; key: Expr }
  /** Progressive tax on `income` (stacked on top of `base`, if given) using a bracket table param. */
  | { k: 'brackets'; income: Expr; table: string; base?: Expr }
  | { k: 'round'; e: Expr; to: 'cent' | 'dollar' };

// ---------- builders (the authoring DSL) ----------

export const lit = (value: number, unit: Unit = 'usd'): Expr => ({ k: 'lit', value, unit });
export const rate = (value: number): Expr => ({ k: 'lit', value, unit: 'rate' });
export const num = (value: number): Expr => ({ k: 'lit', value, unit: 'count' });
export const param = (id: string): Expr => ({ k: 'param', id });
export const ref = (id: string): Expr => ({ k: 'ref', id });
export const field = (name: string): Expr => ({ k: 'field', name });
export const sumOver = (collection: string, body: Expr, where?: string): Expr => ({ k: 'sum_over', collection, body, where });
export const each = (collection: string, fieldName: string, where?: string): Expr => sumOver(collection, field(fieldName), where);
export const count = (collection: string, where?: string): Expr => ({ k: 'count', collection, where });
export const add = (...terms: Expr[]): Expr => ({ k: 'add', terms });
export const sub = (a: Expr, ...minus: Expr[]): Expr => ({ k: 'sub', a, minus });
export const neg = (e: Expr): Expr => ({ k: 'neg', e });
export const mul = (a: Expr, b: Expr): Expr => ({ k: 'mul', a, b });
export const div = (a: Expr, b: Expr): Expr => ({ k: 'div', a, b });
export const min = (...args: Expr[]): Expr => ({ k: 'min', args });
export const max = (...args: Expr[]): Expr => ({ k: 'max', args });
export const ceil = (e: Expr): Expr => ({ k: 'ceil', e });
export const floor = (e: Expr): Expr => ({ k: 'floor', e });
export const atLeast0 = (e: Expr): Expr => max(lit(0), e);
export const when = (cond: Cond, then: Expr, otherwise: Expr): Expr => ({ k: 'if', cond, then, else: otherwise });
export const lookup = (table: string, key: Expr): Expr => ({ k: 'lookup', table, key });
export const brackets = (income: Expr, table: string, base?: Expr): Expr => ({ k: 'brackets', income, table, base });
export const round = (e: Expr, to: 'cent' | 'dollar' = 'cent'): Expr => ({ k: 'round', e, to });

export const gt = (a: Expr, b: Expr): Cond => ({ k: 'cmp', op: '>', a, b });
export const gte = (a: Expr, b: Expr): Cond => ({ k: 'cmp', op: '>=', a, b });
export const lt = (a: Expr, b: Expr): Cond => ({ k: 'cmp', op: '<', a, b });
export const lte = (a: Expr, b: Expr): Cond => ({ k: 'cmp', op: '<=', a, b });
export const and = (...conds: Cond[]): Cond => ({ k: 'and', conds });
export const or = (...conds: Cond[]): Cond => ({ k: 'or', conds });
export const not = (cond: Cond): Cond => ({ k: 'not', cond });
export const statusIs = (...statuses: CoreStatus[]): Cond => ({ k: 'status', in: statuses });
export const flag = (id: string, label: string, negLabel: string, domId?: string): Cond => ({ k: 'flag', id, label, negLabel, domId });
