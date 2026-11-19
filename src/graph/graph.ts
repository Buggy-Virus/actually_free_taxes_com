/**
 * Formula Graph — registry, evaluator, renderer and dependency extraction.
 *
 * Authoring:   define quantities as `Expr` trees that reference other quantities by id.
 * Evaluation:  `graph.evaluate(ctx)` lazily evaluates any quantity (memoized, cycle-checked)
 *              and keeps the full evaluated tree, not just the final number.
 * Rendering:   lines are rendered FROM the evaluated tree, so every number shown in
 *              "With Your Numbers" is the number that was actually used.
 * Arrows:      edges are derived from the same trees, so arrows can never disagree with formulas.
 */

import { Cond, Expr, Unit } from './expr.js';
import { ArrowColorCategory, CalcLineItem, FormulaToken } from '../types.js';

export type CoreStatus = 'single' | 'married_joint' | 'married_separate' | 'head_of_household';

export interface BracketRow { rate: number; min: number; max: number }
export type ParamValue = number | BracketRow[];

export interface GraphContext {
  year: number;
  status: CoreStatus;
  /** Scalar user inputs keyed by input id. Missing = 0. */
  inputs: Record<string, number>;
  /** Repeated user inputs (W-2s, 1099s, ...) keyed by collection id. */
  collections: Record<string, CollectionItem[]>;
}

export interface CollectionItem {
  id: number;
  /** Optional key used to build DOM ids for nested items (e.g. a W-2's state line). */
  key?: string;
  values: Record<string, number>;
}

export interface ParamDef {
  id: string;
  label: string;
  unit: Unit;
  /** Citation shown on hover (form/line, Rev. Proc., statute). */
  source?: string;
  resolve: (ctx: GraphContext) => ParamValue;
}

export interface InputDef {
  id: string;
  label: string;
  unit: Unit;
  domId: string;
}

export interface CollectionDef {
  id: string;
  itemLabel: (index: number) => string;
  fields: Record<string, { label: string; unit: Unit; domId: (item: CollectionItem) => string }>;
}

export interface QuantityDef {
  id: string;
  label: string;
  unit: Unit;
  expr: Expr;
  /** e.g. 'Form 1040 Line 11' */
  form?: string;
  /** 'line' = own formula line + arrow target; 'inline' = expanded inside whoever uses it. */
  display?: 'line' | 'inline';
  category?: ArrowColorCategory;
  /** For auto-spawned items (credits, deductions): only shown/applied when this holds. */
  appliesWhen?: Cond;
}

// ---------- evaluated trees ----------

export interface BracketSlice { index: number; rate: number; min: number; max: number; amount: number; tax: number }

export interface EvalNode {
  expr: Expr;
  value: number;
  children: EvalNode[];
  /** `if` nodes: which branch ran, and the evaluated condition. */
  branch?: 'then' | 'else';
  cond?: CondEval;
  /** `brackets` nodes */
  slices?: BracketSlice[];
  /** `each` nodes */
  items?: Array<{ itemId: number; label: string; value: number; domId: string }>;
}

export interface CondEval {
  cond: Cond;
  value: boolean;
  operands: EvalNode[];
  parts: CondEval[];
}

export interface GraphEdge { sourceId: string; targetId: string; category: ArrowColorCategory }

export const lineDomId = (quantityId: string): string => `q-${quantityId.replace(/\./g, '-')}`;

// ---------- formatting ----------

function fmt(value: number, unit: Unit): string {
  if (unit === 'rate') return `${Math.round(value * 10000) / 100}%`;
  if (unit === 'count') return String(value);
  const abs = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `-$${abs}` : `$${abs}`;
}

const text = (t: string): FormulaToken => ({ type: 'text', text: t });
const varTok = (varId: string, label: string, valueFormatted: string, isEmpty: boolean): FormulaToken =>
  ({ type: 'var', varId, label, valueFormatted, isEmpty });

const OP_SYMBOL: Record<string, string> = { add: ' + ', sub: ' − ', mul: ' × ', div: ' ÷ ' };
const CMP_SYMBOL: Record<string, string> = { '>': ' > ', '>=': ' ≥ ', '<': ' < ', '<=': ' ≤ ', '==': ' = ', '!=': ' ≠ ' };

// ---------- graph ----------

export class FormulaGraph {
  readonly quantities = new Map<string, QuantityDef>();
  readonly params = new Map<string, ParamDef>();
  readonly inputs = new Map<string, InputDef>();
  readonly collections = new Map<string, CollectionDef>();

  quantity(def: QuantityDef): this { this.claim(def.id); this.quantities.set(def.id, def); return this; }
  param(def: ParamDef): this { this.claim(def.id); this.params.set(def.id, def); return this; }
  input(def: InputDef): this { this.claim(def.id); this.inputs.set(def.id, def); return this; }
  collection(def: CollectionDef): this { this.claim(def.id); this.collections.set(def.id, def); return this; }

  private claim(id: string): void {
    if (this.quantities.has(id) || this.params.has(id) || this.inputs.has(id) || this.collections.has(id)) {
      throw new Error(`Duplicate graph id: ${id}`);
    }
  }

  /** Static checks: every ref / param / collection field resolves. Run in tests. */
  validate(): string[] {
    const problems: string[] = [];
    const visit = (e: Expr, owner: string): void => {
      switch (e.k) {
        case 'ref':
          if (!this.quantities.has(e.id) && !this.inputs.has(e.id)) problems.push(`${owner}: unknown ref "${e.id}"`);
          return;
        case 'param':
          if (!this.params.has(e.id)) problems.push(`${owner}: unknown param "${e.id}"`);
          return;
        case 'each': {
          const c = this.collections.get(e.collection);
          if (!c || !c.fields[e.field]) problems.push(`${owner}: unknown collection field "${e.collection}.${e.field}"`);
          return;
        }
        case 'brackets':
          if (!this.params.has(e.table)) problems.push(`${owner}: unknown bracket table "${e.table}"`);
          visit(e.income, owner);
          return;
        default:
          childExprs(e).forEach(c => visit(c, owner));
          condExprs(e).forEach(c => visit(c, owner));
      }
    };
    this.quantities.forEach(q => {
      visit(q.expr, q.id);
      if (q.appliesWhen) condOperands(q.appliesWhen).forEach(c => visit(c, `${q.id} (appliesWhen)`));
    });
    return problems;
  }

  evaluate(ctx: GraphContext): Evaluation {
    return new Evaluation(this, ctx);
  }
}

function childExprs(e: Expr): Expr[] {
  switch (e.k) {
    case 'add': return e.terms;
    case 'sub': return [e.a, ...e.minus];
    case 'mul': case 'div': return [e.a, e.b];
    case 'min': case 'max': return e.args;
    case 'if': return [e.then, e.else];
    case 'brackets': return [e.income];
    case 'round': return [e.e];
    default: return [];
  }
}
function condExprs(e: Expr): Expr[] { return e.k === 'if' ? condOperands(e.cond) : []; }
function condOperands(c: Cond): Expr[] {
  if (c.k === 'cmp') return [c.a, c.b];
  if (c.k === 'not') return condOperands(c.cond);
  return c.conds.flatMap(condOperands);
}

// ---------- evaluation (one per user state) ----------

export class Evaluation {
  private memo = new Map<string, EvalNode>();
  private inProgress = new Set<string>();

  constructor(readonly graph: FormulaGraph, readonly ctx: GraphContext) {}

  value(id: string): number { return this.node(id).value; }

  /** Evaluated tree for a quantity (memoized). */
  node(id: string): EvalNode {
    const cached = this.memo.get(id);
    if (cached) return cached;
    const q = this.graph.quantities.get(id);
    if (!q) throw new Error(`Unknown quantity: ${id}`);
    if (this.inProgress.has(id)) throw new Error(`Cycle in formula graph at ${id}: ${[...this.inProgress].join(' → ')}`);
    this.inProgress.add(id);
    const n = this.eval(q.expr);
    this.inProgress.delete(id);
    this.memo.set(id, n);
    return n;
  }

  applies(id: string): boolean {
    const q = this.graph.quantities.get(id);
    return !q?.appliesWhen || this.evalCond(q.appliesWhen).value;
  }

  private paramValue(id: string): ParamValue {
    const p = this.graph.params.get(id);
    if (!p) throw new Error(`Unknown param: ${id}`);
    return p.resolve(this.ctx);
  }

  private eval(e: Expr): EvalNode {
    const kids = (es: Expr[]) => es.map(x => this.eval(x));
    switch (e.k) {
      case 'lit': return { expr: e, value: e.value, children: [] };
      case 'param': {
        const v = this.paramValue(e.id);
        if (typeof v !== 'number') throw new Error(`Param ${e.id} is a table; use brackets()`);
        return { expr: e, value: v, children: [] };
      }
      case 'ref':
        if (this.graph.inputs.has(e.id)) return { expr: e, value: Number(this.ctx.inputs[e.id]) || 0, children: [] };
        return { expr: e, value: this.node(e.id).value, children: [] };
      case 'each': {
        const coll = this.graph.collections.get(e.collection)!;
        const field = coll.fields[e.field];
        const items = (this.ctx.collections[e.collection] || []).map((it, idx) => ({
          itemId: it.id,
          label: `${coll.itemLabel(idx)} ${field.label}`,
          value: Number(it.values[e.field]) || 0,
          domId: field.domId(it)
        }));
        return { expr: e, value: items.reduce((s, i) => s + i.value, 0), children: [], items };
      }
      case 'add': { const c = kids(e.terms); return { expr: e, value: c.reduce((s, n) => s + n.value, 0), children: c }; }
      case 'sub': { const c = kids([e.a, ...e.minus]); return { expr: e, value: c.slice(1).reduce((s, n) => s - n.value, c[0].value), children: c }; }
      case 'mul': { const c = kids([e.a, e.b]); return { expr: e, value: c[0].value * c[1].value, children: c }; }
      case 'div': { const c = kids([e.a, e.b]); return { expr: e, value: c[1].value ? c[0].value / c[1].value : 0, children: c }; }
      case 'min': { const c = kids(e.args); return { expr: e, value: Math.min(...c.map(n => n.value)), children: c }; }
      case 'max': { const c = kids(e.args); return { expr: e, value: Math.max(...c.map(n => n.value)), children: c }; }
      case 'round': {
        const c = kids([e.e]);
        const f = e.to === 'cent' ? 100 : 1;
        return { expr: e, value: Math.round(c[0].value * f) / f, children: c };
      }
      case 'if': {
        const cond = this.evalCond(e.cond);
        // Only the branch that applies is evaluated, so unused branches create no arrows.
        const taken = this.eval(cond.value ? e.then : e.else);
        return { expr: e, value: taken.value, children: [taken], branch: cond.value ? 'then' : 'else', cond };
      }
      case 'brackets': {
        const income = this.eval(e.income);
        const table = this.paramValue(e.table);
        if (typeof table === 'number') throw new Error(`Param ${e.table} is not a bracket table`);
        const slices: BracketSlice[] = [];
        table.forEach((b, i) => {
          const amount = Math.max(0, Math.min(income.value, b.max) - b.min);
          if (amount > 0) slices.push({ index: i + 1, rate: b.rate, min: b.min, max: b.max, amount, tax: amount * b.rate });
        });
        return { expr: e, value: slices.reduce((s, x) => s + x.tax, 0), children: [income], slices };
      }
    }
  }

  private evalCond(c: Cond): CondEval {
    if (c.k === 'cmp') {
      const a = this.eval(c.a), b = this.eval(c.b);
      const v = { '>': a.value > b.value, '>=': a.value >= b.value, '<': a.value < b.value, '<=': a.value <= b.value, '==': a.value === b.value, '!=': a.value !== b.value }[c.op];
      return { cond: c, value: v, operands: [a, b], parts: [] };
    }
    if (c.k === 'not') { const p = this.evalCond(c.cond); return { cond: c, value: !p.value, operands: [], parts: [p] }; }
    const parts = c.conds.map(x => this.evalCond(x));
    return { cond: c, value: c.k === 'and' ? parts.every(p => p.value) : parts.some(p => p.value), operands: [], parts };
  }

  // ---------- rendering ----------

  private unitOf(n: EvalNode): Unit {
    const e = n.expr;
    if (e.k === 'lit') return e.unit;
    if (e.k === 'param') return this.graph.params.get(e.id)!.unit;
    if (e.k === 'ref') return (this.graph.inputs.get(e.id) || this.graph.quantities.get(e.id))!.unit;
    if (e.k === 'mul') return this.unitOf(n.children[0]) === 'rate' ? this.unitOf(n.children[1]) : this.unitOf(n.children[0]);
    return n.children[0] ? this.unitOf(n.children[0]) : 'usd';
  }

  private isSum(n: EvalNode): boolean {
    const e = n.expr;
    if (e.k === 'add' || e.k === 'each') return true;
    if (e.k === 'ref') {
      const q = this.graph.quantities.get(e.id);
      return q?.display === 'inline' && this.isSum(this.node(e.id));
    }
    return false;
  }

  /** Tokens for an evaluated node. `plugged` = With Your Numbers. */
  render(n: EvalNode, plugged: boolean, nested = false): FormulaToken[] {
    const e = n.expr;
    const show = (v: number) => fmt(v, this.unitOf(n));
    switch (e.k) {
      case 'lit': return [text(show(e.value))];
      case 'param': {
        const p = this.graph.params.get(e.id)!;
        return [varTok(e.id, p.label, plugged ? show(n.value) : p.label, false)];
      }
      case 'ref': {
        const input = this.graph.inputs.get(e.id);
        if (input) return [varTok(e.id, input.label, plugged ? show(n.value) : input.label, n.value === 0)];
        const q = this.graph.quantities.get(e.id)!;
        if (q.display === 'inline') {
          return this.render(this.node(e.id), plugged, nested);
        }
        return [varTok(e.id, q.label, plugged ? show(n.value) : q.label, n.value === 0)];
      }
      case 'each': {
        const coll = this.graph.collections.get(e.collection)!;
        const label = `∑ ${coll.fields[e.field].label}`;
        if (!plugged || (n.items || []).length <= 1) {
          return [varTok(`${e.collection}.${e.field}`, label, plugged ? show(n.value) : label, n.value === 0)];
        }
        const toks: FormulaToken[] = nested ? [text('(')] : [];
        n.items!.forEach((it, i) => {
          if (i > 0) toks.push(text(' + '));
          toks.push(varTok(`${e.collection}.${e.field}#${it.itemId}`, it.label, show(it.value), it.value === 0));
        });
        if (nested) toks.push(text(')'));
        return toks;
      }
      case 'add': case 'sub': case 'mul': case 'div': {
        const toks: FormulaToken[] = nested && n.children.length > 1 ? [text('(')] : [];
        n.children.forEach((c, i) => {
          if (i > 0) toks.push(text(OP_SYMBOL[e.k]));
          // Sums inside sums need no parentheses (a + (b + c) reads as a + b + c).
          const flat = e.k === 'add' && this.isSum(c);
          toks.push(...this.render(c, plugged, !flat));
        });
        if (nested && n.children.length > 1) toks.push(text(')'));
        return toks;
      }
      case 'min': case 'max': {
        const toks: FormulaToken[] = [text(`${e.k}(`)];
        n.children.forEach((c, i) => {
          if (i > 0) toks.push(text(', '));
          toks.push(...this.render(c, plugged, false));
        });
        toks.push(text(')'));
        return toks;
      }
      case 'round': return this.render(n.children[0], plugged, nested);
      case 'if': {
        if (plugged) {
          // Show the branch that ran, plus why.
          return [...this.render(n.children[0], plugged, nested), text('  ⟨since '), ...this.renderCond(n.cond!, true), text('⟩')];
        }
        // General form shows both branches; the unevaluated branch is rendered from the raw Expr.
        const thenT = n.branch === 'then' ? this.render(n.children[0], false, true) : this.renderRaw(e.then);
        const elseT = n.branch === 'else' ? this.render(n.children[0], false, true) : this.renderRaw(e.else);
        return [text('('), ...thenT, text(' if '), ...this.renderCond(n.cond!, false), text(', otherwise '), ...elseT, text(')')];
      }
      case 'brackets': {
        if (!plugged) return [text(`Bracket Tax(`), ...this.render(n.children[0], false), text(')')];
        if (!n.slices || n.slices.length === 0) return [text('$0.00')];
        return n.slices.flatMap((s, i) => [
          ...(i > 0 ? [text(' + ')] : []),
          text(`(${fmt(s.amount, 'usd')} × ${fmt(s.rate, 'rate')})`)
        ]);
      }
    }
  }

  private renderCond(c: CondEval, plugged: boolean): FormulaToken[] {
    if (c.cond.k === 'cmp') {
      return [...this.render(c.operands[0], plugged, true), text(CMP_SYMBOL[c.cond.op]), ...this.render(c.operands[1], plugged, true)];
    }
    if (c.cond.k === 'not') return [text('not ('), ...this.renderCond(c.parts[0], plugged), text(')')];
    const joiner = c.cond.k === 'and' ? ' and ' : ' or ';
    return c.parts.flatMap((p, i) => [...(i > 0 ? [text(joiner)] : []), ...this.renderCond(p, plugged)]);
  }

  /** General-form rendering of an expression that was not evaluated (the untaken `if` branch). */
  private renderRaw(e: Expr): FormulaToken[] {
    switch (e.k) {
      case 'lit': return [text(fmt(e.value, e.unit))];
      case 'param': return [text(this.graph.params.get(e.id)!.label)];
      case 'ref': return [text((this.graph.inputs.get(e.id) || this.graph.quantities.get(e.id))!.label)];
      case 'each': return [text(`∑ ${this.graph.collections.get(e.collection)!.fields[e.field].label}`)];
      case 'min': case 'max': return [text(`${e.k}(`), ...e.args.flatMap((a, i) => [...(i ? [text(', ')] : []), ...this.renderRaw(a)]), text(')')];
      default: {
        const kids = childExprs(e);
        const sym = OP_SYMBOL[e.k] || ', ';
        return [text('('), ...kids.flatMap((a, i) => [...(i ? [text(sym)] : []), ...this.renderRaw(a)]), text(')')];
      }
    }
  }

  /** Formula lines for one quantity, in the existing CalcLineItem shape the UI already renders. */
  lines(id: string): CalcLineItem[] {
    const q = this.graph.quantities.get(id)!;
    const n = this.node(id);
    const out: CalcLineItem[] = [];
    // Any bracket computation inside this quantity's own formula gets one intermediate line per slice.
    const bracketNodes: EvalNode[] = [];
    const findBrackets = (x: EvalNode): void => {
      if (x.expr.k === 'brackets') bracketNodes.push(x);
      x.children.forEach(findBrackets);
    };
    findBrackets(n);
    bracketNodes.forEach(b => (b.slices || []).forEach(s => out.push({
        id: `${lineDomId(id)}-b${s.index}`,
        label: `Bracket ${s.index} (${fmt(s.rate, 'rate')})`,
        formLineLabel: null,
        isIntermediate: true,
        generalTokens: [text(`Bracket ${s.index} = (min(Income, ${fmt(s.max, 'usd')}) − ${fmt(s.min, 'usd')}) × ${fmt(s.rate, 'rate')}`)],
        pluggedTokens: [text(`Bracket ${s.index} = ${fmt(s.amount, 'usd')} × ${fmt(s.rate, 'rate')} = ${fmt(s.tax, 'usd')}`)],
        resultFormatted: fmt(s.tax, 'usd')
      })));
    out.push({
      id: lineDomId(id),
      label: q.label,
      formLineLabel: q.form ?? null,
      isIntermediate: !q.form,
      generalTokens: [text(`${q.label} = `), ...this.render(n, false)],
      pluggedTokens: [text(`${q.label} = `), ...this.render(n, true), text(` = ${fmt(n.value, q.unit)}`)],
      resultFormatted: fmt(n.value, q.unit),
      isEmpty: n.value === 0
    });
    return out;
  }

  // ---------- dependencies / arrows ----------

  /** DOM ids that feed this quantity's line. Inline quantities are looked through. */
  sources(id: string): string[] {
    const out = new Set<string>();
    const walk = (n: EvalNode): void => {
      const e = n.expr;
      if (e.k === 'ref') {
        const input = this.graph.inputs.get(e.id);
        if (input) { out.add(input.domId); return; }
        const q = this.graph.quantities.get(e.id)!;
        if (q.display === 'inline') walk(this.node(e.id));
        else out.add(lineDomId(e.id));
        return;
      }
      if (e.k === 'each') { (n.items || []).forEach(i => out.add(i.domId)); return; }
      if (n.cond) walkCond(n.cond);
      n.children.forEach(walk);
    };
    const walkCond = (c: CondEval): void => { c.operands.forEach(walk); c.parts.forEach(walkCond); };
    walk(this.node(id));
    const q = this.graph.quantities.get(id)!;
    if (q.appliesWhen) walkCond(this.evalCond(q.appliesWhen));
    return [...out];
  }

  /** Every arrow in the app, derived from the formulas that were actually evaluated. */
  edges(lineIds: string[]): GraphEdge[] {
    return lineIds.flatMap(id => {
      const q = this.graph.quantities.get(id)!;
      return this.sources(id).map(src => ({ sourceId: src, targetId: lineDomId(id), category: q.category || 'default' }));
    });
  }

  /** Full transitive upstream (for "highlight everything that feeds this"). */
  upstream(id: string): string[] {
    const seen = new Set<string>();
    const domToQuantity = new Map<string, string>();
    this.graph.quantities.forEach(q => domToQuantity.set(lineDomId(q.id), q.id));
    const visit = (qid: string): void => {
      this.sources(qid).forEach(src => {
        if (seen.has(src)) return;
        seen.add(src);
        const next = domToQuantity.get(src);
        if (next) visit(next);
      });
    };
    visit(id);
    return [...seen];
  }
}
