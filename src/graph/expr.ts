/**
 * Formula Graph — expression language.
 *
 * Every formula in the app is an `Expr` tree. The same tree is interpreted by:
 *   - evaluate()  → numbers (the actual tax math)
 *   - render()    → General Formula tokens and With-Your-Numbers tokens
 *   - deps()      → dependency arrows
 * There is no other place where math or formula text is written, so what the
 * user sees is, by construction, the math that ran.
 */

export type Unit = 'usd' | 'rate' | 'count';

export type CmpOp = '>' | '>=' | '<' | '<=' | '==' | '!=';

export type Cond =
  | { k: 'cmp'; op: CmpOp; a: Expr; b: Expr }
  | { k: 'and'; conds: Cond[] }
  | { k: 'or'; conds: Cond[] }
  | { k: 'not'; cond: Cond };

export type Expr =
  | { k: 'lit'; value: number; unit: Unit }
  /** A law constant looked up by year / filing status / state (e.g. standard deduction). */
  | { k: 'param'; id: string }
  /** Another quantity or a scalar user input, by id. */
  | { k: 'ref'; id: string }
  /** Sum of one input field across a collection (every W-2's Box 1, every 1099-INT, ...). */
  | { k: 'each'; collection: string; field: string }
  | { k: 'add'; terms: Expr[] }
  | { k: 'sub'; a: Expr; minus: Expr[] }
  | { k: 'mul'; a: Expr; b: Expr }
  | { k: 'div'; a: Expr; b: Expr }
  | { k: 'min'; args: Expr[] }
  | { k: 'max'; args: Expr[] }
  | { k: 'if'; cond: Cond; then: Expr; else: Expr }
  /** Progressive tax on `income` using a bracket table param. */
  | { k: 'brackets'; income: Expr; table: string }
  | { k: 'round'; e: Expr; to: 'cent' | 'dollar' };

// ---------- builders (the authoring DSL) ----------

export const lit = (value: number, unit: Unit = 'usd'): Expr => ({ k: 'lit', value, unit });
export const rate = (value: number): Expr => ({ k: 'lit', value, unit: 'rate' });
export const param = (id: string): Expr => ({ k: 'param', id });
export const ref = (id: string): Expr => ({ k: 'ref', id });
export const each = (collection: string, field: string): Expr => ({ k: 'each', collection, field });
export const add = (...terms: Expr[]): Expr => ({ k: 'add', terms });
export const sub = (a: Expr, ...minus: Expr[]): Expr => ({ k: 'sub', a, minus });
export const mul = (a: Expr, b: Expr): Expr => ({ k: 'mul', a, b });
export const div = (a: Expr, b: Expr): Expr => ({ k: 'div', a, b });
export const min = (...args: Expr[]): Expr => ({ k: 'min', args });
export const max = (...args: Expr[]): Expr => ({ k: 'max', args });
export const atLeast0 = (e: Expr): Expr => max(lit(0), e);
export const when = (cond: Cond, then: Expr, otherwise: Expr): Expr => ({ k: 'if', cond, then, else: otherwise });
export const brackets = (income: Expr, table: string): Expr => ({ k: 'brackets', income, table });
export const round = (e: Expr, to: 'cent' | 'dollar' = 'cent'): Expr => ({ k: 'round', e, to });

export const gt = (a: Expr, b: Expr): Cond => ({ k: 'cmp', op: '>', a, b });
export const gte = (a: Expr, b: Expr): Cond => ({ k: 'cmp', op: '>=', a, b });
export const lt = (a: Expr, b: Expr): Cond => ({ k: 'cmp', op: '<', a, b });
export const and = (...conds: Cond[]): Cond => ({ k: 'and', conds });
export const or = (...conds: Cond[]): Cond => ({ k: 'or', conds });
export const not = (cond: Cond): Cond => ({ k: 'not', cond });
