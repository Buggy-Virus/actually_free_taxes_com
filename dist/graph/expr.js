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
// ---------- builders (the authoring DSL) ----------
export const lit = (value, unit = 'usd') => ({ k: 'lit', value, unit });
export const rate = (value) => ({ k: 'lit', value, unit: 'rate' });
export const param = (id) => ({ k: 'param', id });
export const ref = (id) => ({ k: 'ref', id });
export const each = (collection, field) => ({ k: 'each', collection, field });
export const add = (...terms) => ({ k: 'add', terms });
export const sub = (a, ...minus) => ({ k: 'sub', a, minus });
export const mul = (a, b) => ({ k: 'mul', a, b });
export const div = (a, b) => ({ k: 'div', a, b });
export const min = (...args) => ({ k: 'min', args });
export const max = (...args) => ({ k: 'max', args });
export const atLeast0 = (e) => max(lit(0), e);
export const when = (cond, then, otherwise) => ({ k: 'if', cond, then, else: otherwise });
export const brackets = (income, table) => ({ k: 'brackets', income, table });
export const round = (e, to = 'cent') => ({ k: 'round', e, to });
export const gt = (a, b) => ({ k: 'cmp', op: '>', a, b });
export const gte = (a, b) => ({ k: 'cmp', op: '>=', a, b });
export const lt = (a, b) => ({ k: 'cmp', op: '<', a, b });
export const and = (...conds) => ({ k: 'and', conds });
export const or = (...conds) => ({ k: 'or', conds });
export const not = (cond) => ({ k: 'not', cond });
