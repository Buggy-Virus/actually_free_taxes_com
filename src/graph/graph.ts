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

import { Cond, CoreStatus, Expr, Unit } from './expr.js';
import {
  ArrowColorCategory,
  CalcBlockDefinition,
  CalcLineItem,
  CalcVariableBreakdown,
  CalcVariableContributor,
  FormulaToken,
  PanelSectionCategory
} from '../types.js';

export type { CoreStatus } from './expr.js';

export interface BracketRow { rate: number; min: number; max: number }
export type ParamValue = number | number[] | BracketRow[];

export interface GraphContext {
  year: number;
  status: CoreStatus;
  /** Scalar user inputs keyed by input id. Missing = 0. */
  inputs: Record<string, number>;
  /** Repeated user inputs (W-2s, 1099s, ...) keyed by collection id. */
  collections: Record<string, CollectionItem[]>;
  /** Non-numeric user choices referenced by `flag` conditions. */
  flags?: Record<string, boolean>;
}

export interface CollectionItem {
  id: number;
  /** Optional key used to build DOM ids for nested items (e.g. a W-2's state line). */
  key?: string;
  /** Optional display name (employer, payer). */
  name?: string;
  values: Record<string, number>;
}

export interface ParamDef {
  id: string;
  label: string;
  unit: Unit;
  /** Citation shown in the variable breakdown (form/line, Rev. Proc., statute). */
  source?: string;
  /** DOM elements whose value selects this param (filing status, tax year) — they get arrows. */
  domSources?: string[];
  resolve: (ctx: GraphContext) => ParamValue;
}

interface PanelLink { panelKey?: string; panelSection?: PanelSectionCategory }

export interface InputDef extends PanelLink {
  id: string;
  label: string;
  unit: Unit;
  domId: string;
  /** Inputs are clamped to ≥ 0 unless negatives are meaningful (capital gains, K-1 losses). */
  allowNegative?: boolean;
  /** Upper clamp (e.g. at most 4 age-65/blind boxes). */
  max?: number;
  /** Optional inputs that are 0 are left out of formulas (and arrows) entirely. */
  optional?: boolean;
}

export interface CollectionFieldDef extends PanelLink {
  label: string;
  unit: Unit;
  domId: (item: CollectionItem) => string;
  allowNegative?: boolean;
  /** A sum of this field is left out of formulas when every item's value is 0 (e.g. rarely-used boxes). */
  optional?: boolean;
}

export interface CollectionDef {
  id: string;
  itemLabel: (index: number, item: CollectionItem) => string;
  countLabel?: string;
  fields: Record<string, CollectionFieldDef>;
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
  /** A 0-valued optional quantity is left out of sums that use it… */
  optional?: boolean;
  /** …unless this holds (the user entered something that was reduced to $0, e.g. by a phase-out). */
  presentIf?: Cond;
}

export interface BlockSpec {
  id: string;
  stepLabel: string;
  title: string;
  isOutput?: boolean;
  /** Quantities shown in this block, in order. Default visibility: shown when non-zero. */
  quantities: Array<string | { id: string; show: 'always' | 'nonzero' }>;
}

export interface GraphBlock extends CalcBlockDefinition {
  /** Quantity ids actually rendered in this block. */
  quantityIds: string[];
}

// ---------- evaluated trees ----------

export interface BracketSlice { index: number; rate: number; min: number; max: number; amount: number; tax: number }

export interface ItemEval {
  itemId: number;
  label: string;
  domId: string;
  node: EvalNode;
  panel?: PanelLink;
}

export interface EvalNode {
  expr: Expr;
  value: number;
  children: EvalNode[];
  /** `if` nodes: which branch ran, and the evaluated condition. */
  branch?: 'then' | 'else';
  cond?: CondEval;
  /** `brackets` nodes */
  slices?: BracketSlice[];
  /** `sum_over` nodes: one evaluated body per item */
  items?: ItemEval[];
  /** `field` nodes: which item they read */
  scope?: Scope;
  /** `lookup` nodes: the index used */
  index?: number;
}

export interface CondEval {
  cond: Cond;
  value: boolean;
  operands: EvalNode[];
  parts: CondEval[];
  /** itemFlag conditions: which item they read */
  scope?: Scope;
}

export interface GraphEdge { sourceId: string; targetId: string; category: ArrowColorCategory; quantityId: string }

interface Scope { collection: string; item: CollectionItem; index: number }

export const lineDomId = (quantityId: string): string => `q-${quantityId.replace(/\./g, '-')}`;

// ---------- formatting ----------

export function fmtValue(value: number, unit: Unit): string {
  if (unit === 'rate') return `${Math.round(value * 10000) / 100}%`;
  if (unit === 'count') return String(Math.round(value * 10000) / 10000);
  const abs = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value < 0 ? `-$${abs}` : `$${abs}`;
}

const STATUS_LABEL: Record<CoreStatus, string> = {
  single: 'Single',
  married_joint: 'Married Filing Jointly',
  married_separate: 'Married Filing Separately',
  head_of_household: 'Head of Household'
};

const text = (t: string): FormulaToken => ({ type: 'text', text: t });
const varTok = (varId: string, label: string, valueFormatted: string, isEmpty: boolean): FormulaToken =>
  ({ type: 'var', varId, label, valueFormatted, isEmpty });

const OP_SYMBOL: Record<string, string> = { add: ' + ', sub: ' − ', mul: ' × ', div: ' ÷ ' };
const CMP_SYMBOL: Record<string, string> = { '>': ' > ', '>=': ' ≥ ', '<': ' < ', '<=': ' ≤ ', '==': ' = ', '!=': ' ≠ ' };
const CMP_INVERSE: Record<string, string> = { '>': '<=', '>=': '<', '<': '>=', '<=': '>', '==': '!=', '!=': '==' };

export const tokensToText = (ts: FormulaToken[]): string =>
  ts.map(t => (t.type === 'text' ? t.text : t.valueFormatted ?? t.label)).join('');

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
    const visit = (e: Expr, owner: string, collection?: string): void => {
      switch (e.k) {
        case 'ref':
          if (!this.quantities.has(e.id) && !this.inputs.has(e.id)) problems.push(`${owner}: unknown ref "${e.id}"`);
          return;
        case 'param':
          if (!this.params.has(e.id)) problems.push(`${owner}: unknown param "${e.id}"`);
          return;
        case 'lookup':
          if (!this.params.has(e.table)) problems.push(`${owner}: unknown lookup table "${e.table}"`);
          visit(e.key, owner, collection);
          return;
        case 'count':
          if (!this.collections.has(e.collection)) problems.push(`${owner}: unknown collection "${e.collection}"`);
          return;
        case 'sum_over': {
          const c = this.collections.get(e.collection);
          if (!c) { problems.push(`${owner}: unknown collection "${e.collection}"`); return; }
          if (e.where && !c.fields[e.where]) problems.push(`${owner}: unknown where-field "${e.collection}.${e.where}"`);
          visit(e.body, owner, e.collection);
          return;
        }
        case 'field': {
          const c = collection ? this.collections.get(collection) : undefined;
          if (!c || !c.fields[e.name]) problems.push(`${owner}: field "${e.name}" outside its collection`);
          return;
        }
        case 'brackets':
          if (!this.params.has(e.table)) problems.push(`${owner}: unknown bracket table "${e.table}"`);
          childExprs(e).forEach(c => visit(c, owner, collection));
          return;
        default:
          childExprs(e).forEach(c => visit(c, owner, collection));
          condExprs(e).forEach(c => visit(c, owner, collection));
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
    case 'neg': case 'ceil': case 'floor': case 'round': return [e.e];
    case 'mul': case 'div': return [e.a, e.b];
    case 'min': case 'max': return e.args;
    case 'if': return [e.then, e.else];
    case 'brackets': return e.base ? [e.income, e.base] : [e.income];
    case 'lookup': return [e.key];
    case 'sum_over': return [e.body];
    default: return [];
  }
}
function condExprs(e: Expr): Expr[] { return e.k === 'if' ? condOperands(e.cond) : []; }
function condOperands(c: Cond): Expr[] {
  if (c.k === 'cmp') return [c.a, c.b];
  if (c.k === 'not' || c.k === 'quiet') return condOperands(c.cond);
  if (c.k === 'and' || c.k === 'or') return c.conds.flatMap(condOperands);
  return [];
}
function isCompound(e: Expr): boolean {
  return e.k === 'add' || e.k === 'sub' || e.k === 'mul' || e.k === 'div';
}

// ---------- evaluation (one per user state) ----------

export class Evaluation {
  private memo = new Map<string, EvalNode>();
  private inProgress = new Set<string>();
  private sourcesMemo = new Map<string, string[]>();
  private readonly domToQuantity = new Map<string, string>();

  constructor(readonly graph: FormulaGraph, readonly ctx: GraphContext) {
    graph.quantities.forEach(q => this.domToQuantity.set(lineDomId(q.id), q.id));
  }

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

  paramValue(id: string): ParamValue {
    const p = this.graph.params.get(id);
    if (!p) throw new Error(`Unknown param: ${id}`);
    return p.resolve(this.ctx);
  }

  inputValue(id: string): number {
    const def = this.graph.inputs.get(id)!;
    let v = Number(this.ctx.inputs[id]) || 0;
    if (!def.allowNegative) v = Math.max(0, v);
    if (def.max !== undefined) v = Math.min(def.max, v);
    return v;
  }

  items(collection: string): CollectionItem[] {
    return this.ctx.collections[collection] || [];
  }

  private fieldValue(scope: Scope, name: string): number {
    const def = this.graph.collections.get(scope.collection)!.fields[name];
    const v = Number(scope.item.values[name]) || 0;
    return def.allowNegative ? v : Math.max(0, v);
  }

  private eval(e: Expr, scope?: Scope): EvalNode {
    const kids = (es: Expr[]) => es.map(x => this.eval(x, scope));
    switch (e.k) {
      case 'lit': return { expr: e, value: e.value, children: [] };
      case 'param': {
        const v = this.paramValue(e.id);
        if (typeof v !== 'number') throw new Error(`Param ${e.id} is a table; use brackets() or lookup()`);
        return { expr: e, value: v, children: [] };
      }
      case 'ref':
        if (this.graph.inputs.has(e.id)) return { expr: e, value: this.inputValue(e.id), children: [] };
        return { expr: e, value: this.node(e.id).value, children: [] };
      case 'field':
        if (!scope) throw new Error(`field(${e.name}) used outside sum_over`);
        return { expr: e, value: this.fieldValue(scope, e.name), children: [], scope };
      case 'count': {
        const items = this.items(e.collection).filter((item, index) => !e.where || this.fieldValue({ collection: e.collection, item, index }, e.where));
        return { expr: e, value: items.length, children: [] };
      }
      case 'sum_over': {
        const coll = this.graph.collections.get(e.collection)!;
        const firstField = firstFieldName(e.body) || Object.keys(coll.fields)[0];
        const fieldDef = coll.fields[firstField];
        const items: ItemEval[] = [];
        this.items(e.collection).forEach((item, index) => {
          const sc: Scope = { collection: e.collection, item, index };
          if (e.where && !this.fieldValue(sc, e.where)) return;
          items.push({
            itemId: item.id,
            label: coll.itemLabel(index, item),
            domId: fieldDef.domId(item),
            node: this.eval(e.body, sc),
            panel: { panelKey: fieldDef.panelKey, panelSection: fieldDef.panelSection }
          });
        });
        return { expr: e, value: items.reduce((s, i) => s + i.node.value, 0), children: [], items };
      }
      case 'add': { const c = kids(e.terms); return { expr: e, value: c.reduce((s, n) => s + n.value, 0), children: c }; }
      case 'sub': { const c = kids([e.a, ...e.minus]); return { expr: e, value: c.slice(1).reduce((s, n) => s - n.value, c[0].value), children: c }; }
      case 'neg': { const c = kids([e.e]); return { expr: e, value: -c[0].value, children: c }; }
      case 'mul': { const c = kids([e.a, e.b]); return { expr: e, value: c[0].value * c[1].value, children: c }; }
      case 'div': { const c = kids([e.a, e.b]); return { expr: e, value: c[1].value ? c[0].value / c[1].value : 0, children: c }; }
      case 'min': { const c = kids(e.args); return { expr: e, value: Math.min(...c.map(n => n.value)), children: c }; }
      case 'max': { const c = kids(e.args); return { expr: e, value: Math.max(...c.map(n => n.value)), children: c }; }
      case 'ceil': { const c = kids([e.e]); return { expr: e, value: Math.ceil(c[0].value), children: c }; }
      case 'floor': { const c = kids([e.e]); return { expr: e, value: Math.floor(c[0].value), children: c }; }
      case 'round': {
        const c = kids([e.e]);
        const f = e.to === 'cent' ? 100 : 1;
        return { expr: e, value: Math.round(c[0].value * f) / f, children: c };
      }
      case 'lookup': {
        const c = kids([e.key]);
        const table = this.paramValue(e.table);
        if (!Array.isArray(table) || typeof table[0] !== 'number') throw new Error(`Param ${e.table} is not a list`);
        const list = table as number[];
        const index = Math.max(0, Math.min(list.length - 1, Math.floor(c[0].value)));
        return { expr: e, value: list[index], children: c, index };
      }
      case 'if': {
        const cond = this.evalCond(e.cond, scope);
        // Only the branch that applies is evaluated, so unused branches create no arrows.
        const taken = this.eval(cond.value ? e.then : e.else, scope);
        return { expr: e, value: taken.value, children: [taken], branch: cond.value ? 'then' : 'else', cond };
      }
      case 'brackets': {
        const c = kids(e.base ? [e.income, e.base] : [e.income]);
        const income = c[0].value;
        const base = c[1]?.value ?? 0;
        const table = this.paramValue(e.table);
        if (!Array.isArray(table) || typeof table[0] === 'number') throw new Error(`Param ${e.table} is not a bracket table`);
        const slices: BracketSlice[] = [];
        (table as BracketRow[]).forEach((b, i) => {
          const amount = Math.max(0, Math.min(base + income, b.max) - Math.max(base, b.min));
          if (amount > 0) slices.push({ index: i + 1, rate: b.rate, min: b.min, max: b.max, amount, tax: amount * b.rate });
        });
        return { expr: e, value: slices.reduce((s, x) => s + x.tax, 0), children: c, slices };
      }
    }
  }

  private evalCond(c: Cond, scope?: Scope): CondEval {
    switch (c.k) {
      case 'cmp': {
        const a = this.eval(c.a, scope), b = this.eval(c.b, scope);
        const v = { '>': a.value > b.value, '>=': a.value >= b.value, '<': a.value < b.value, '<=': a.value <= b.value, '==': a.value === b.value, '!=': a.value !== b.value }[c.op];
        return { cond: c, value: v, operands: [a, b], parts: [] };
      }
      case 'not': { const p = this.evalCond(c.cond, scope); return { cond: c, value: !p.value, operands: [], parts: [p] }; }
      case 'quiet': { const p = this.evalCond(c.cond, scope); return { cond: c, value: p.value, operands: [], parts: [p] }; }
      case 'status': return { cond: c, value: c.in.includes(this.ctx.status), operands: [], parts: [] };
      case 'flag': return { cond: c, value: Boolean(this.ctx.flags?.[c.id]), operands: [], parts: [] };
      case 'itemFlag': {
        if (!scope) throw new Error(`itemFlag(${c.field}) used outside sum_over`);
        return { cond: c, value: this.fieldValue(scope, c.field) !== 0, operands: [], parts: [], scope } as CondEval;
      }
      default: {
        const parts = c.conds.map(x => this.evalCond(x, scope));
        return { cond: c, value: c.k === 'and' ? parts.every(p => p.value) : parts.some(p => p.value), operands: [], parts };
      }
    }
  }

  // ---------- presence ----------

  /** A term that contributes nothing because the user has no such input at all. */
  private isAbsent(n: EvalNode): boolean {
    const e = n.expr;
    if (e.k === 'sum_over') {
      if ((n.items || []).length === 0) return true;
      const f = e.body.k === 'field' ? this.graph.collections.get(e.collection)!.fields[e.body.name] : undefined;
      return Boolean(f?.optional) && n.value === 0;
    }
    if (e.k === 'ref') {
      const input = this.graph.inputs.get(e.id);
      if (input) return Boolean(input.optional) && n.value === 0;
      // A computed $0 stays visible when its `presentIf` holds (e.g. interest entered but fully phased out).
      const q = this.graph.quantities.get(e.id);
      return Boolean(q?.optional) && n.value === 0 && !(q?.presentIf && this.evalCond(q.presentIf).value);
    }
    if (e.k === 'mul') return n.children.some(c => this.isAbsent(c));
    if (e.k === 'round' || e.k === 'neg') return this.isAbsent(n.children[0]);
    return false;
  }

  /** Children that are shown (and that draw arrows). */
  private visibleChildren(n: EvalNode): EvalNode[] {
    if (n.expr.k === 'add') return n.children.filter(c => !this.isAbsent(c));
    if (n.expr.k === 'sub') return [n.children[0], ...n.children.slice(1).filter(c => !this.isAbsent(c))];
    return n.children;
  }

  // ---------- rendering ----------

  private unitOf(n: EvalNode): Unit {
    const e = n.expr;
    if (e.k === 'lit') return e.unit;
    if (e.k === 'param' || e.k === 'lookup') return this.graph.params.get(e.k === 'param' ? e.id : e.table)!.unit;
    if (e.k === 'ref') return (this.graph.inputs.get(e.id) || this.graph.quantities.get(e.id))!.unit;
    if (e.k === 'field') return this.graph.collections.get(n.scope!.collection)!.fields[e.name].unit;
    if (e.k === 'count') return 'count';
    if (e.k === 'sum_over') return n.items && n.items[0] ? this.unitOf(n.items[0].node) : 'usd';
    if (e.k === 'mul') return this.unitOf(n.children[0]) === 'rate' ? this.unitOf(n.children[1]) : this.unitOf(n.children[0]);
    return n.children[0] ? this.unitOf(n.children[0]) : 'usd';
  }

  private isSum(n: EvalNode): boolean {
    const e = n.expr;
    if (e.k === 'add' || e.k === 'sum_over') return true;
    if (e.k === 'ref') {
      const q = this.graph.quantities.get(e.id);
      return q?.display === 'inline' && this.isSum(this.node(e.id));
    }
    return false;
  }

  /**
   * Tokens for an evaluated node. `plugged` = With Your Numbers.
   * Every variable token rendered is registered in `vars` with its breakdown (for the popover).
   */
  render(n: EvalNode, plugged: boolean, nested = false, vars?: Map<string, CalcVariableBreakdown>): FormulaToken[] {
    const e = n.expr;
    const show = (v: number) => fmtValue(v, this.unitOf(n));
    const reg = (varId: string, label: string, contributors: () => CalcVariableContributor[]) => {
      if (vars && !vars.has(varId)) {
        vars.set(varId, { varId, label, totalValue: n.value, totalFormatted: show(n.value), isEmpty: n.value === 0, contributors: contributors() });
      }
    };
    switch (e.k) {
      case 'lit': return [text(show(e.value))];
      case 'param': {
        const p = this.graph.params.get(e.id)!;
        reg(e.id, p.label, () => this.contributors(n));
        return [varTok(e.id, p.label, plugged ? show(n.value) : p.label, false)];
      }
      case 'lookup': {
        const p = this.graph.params.get(e.table)!;
        if (plugged) {
          reg(e.table, p.label, () => this.contributors(n));
          return [varTok(e.table, p.label, show(n.value), false)];
        }
        return [varTok(e.table, p.label, p.label, false), text('['), ...this.render(n.children[0], false, false, vars), text(']')];
      }
      case 'ref': {
        const input = this.graph.inputs.get(e.id);
        if (input) {
          reg(e.id, input.label, () => this.contributors(n));
          return [varTok(e.id, input.label, plugged ? show(n.value) : input.label, n.value === 0)];
        }
        const q = this.graph.quantities.get(e.id)!;
        if (q.display === 'inline') return this.render(this.node(e.id), plugged, nested, vars);
        reg(e.id, q.label, () => this.contributors(this.node(e.id)));
        return [varTok(e.id, q.label, plugged ? show(n.value) : q.label, n.value === 0)];
      }
      case 'field': {
        const sc = n.scope!;
        const f = this.graph.collections.get(sc.collection)!.fields[e.name];
        const varId = `${sc.collection}#${sc.item.id}.${e.name}`;
        const label = `${this.graph.collections.get(sc.collection)!.itemLabel(sc.index, sc.item)} ${f.label}`;
        reg(varId, label, () => [this.contrib(label, n.value, f.domId(sc.item), false, f)]);
        return [varTok(varId, label, plugged ? show(n.value) : f.label, n.value === 0)];
      }
      case 'count': {
        const c = this.graph.collections.get(e.collection)!;
        const label = `${c.countLabel || `Number of ${e.collection}`}${e.where ? ` (${c.fields[e.where].label})` : ''}`;
        return [plugged ? text(show(n.value)) : text(label)];
      }
      case 'sum_over': {
        const coll = this.graph.collections.get(e.collection)!;
        const items = n.items || [];
        const where = e.where ? ` where ${coll.fields[e.where].label}` : '';
        if (!plugged || items.length === 0) {
          if (e.body.k === 'field') {
            const label = `∑ ${coll.fields[e.body.name].label}${where}`;
            const varId = `sum:${e.collection}.${e.body.name}${e.where ? `|${e.where}` : ''}`;
            reg(varId, label, () => this.contributors(n));
            return [varTok(varId, label, plugged ? show(n.value) : label, n.value === 0)];
          }
          return [text('∑ '), ...this.renderRaw(e.body, e.collection, true), ...(where ? [text(where)] : [])];
        }
        const multi = items.length > 1;
        const toks: FormulaToken[] = nested && multi ? [text('(')] : [];
        items.forEach((it, i) => {
          if (i > 0) toks.push(text(' + '));
          toks.push(...this.render(it.node, true, multi || nested, vars));
        });
        if (nested && multi) toks.push(text(')'));
        return toks;
      }
      case 'add': case 'sub': case 'mul': case 'div': {
        const visible = this.visibleChildren(n);
        if (visible.length === 0) return [text(fmtValue(0, this.unitOf(n)))];
        if (visible.length === 1) return this.render(visible[0], plugged, nested, vars);
        const toks: FormulaToken[] = nested ? [text('(')] : [];
        visible.forEach((c, i) => {
          if (i > 0) toks.push(text(OP_SYMBOL[e.k]));
          // Sums inside sums need no parentheses (a + (b + c) reads as a + b + c).
          const flat = e.k === 'add' && this.isSum(c);
          toks.push(...this.render(c, plugged, !flat, vars));
        });
        if (nested) toks.push(text(')'));
        return toks;
      }
      case 'neg': return [text('−'), ...this.render(n.children[0], plugged, true, vars)];
      case 'min': case 'max': case 'ceil': case 'floor': {
        const toks: FormulaToken[] = [text(`${e.k}(`)];
        n.children.forEach((c, i) => {
          if (i > 0) toks.push(text(', '));
          toks.push(...this.render(c, plugged, false, vars));
        });
        toks.push(text(')'));
        return toks;
      }
      case 'round': return this.render(n.children[0], plugged, nested, vars);
      case 'if': {
        if (plugged) {
          // Show the branch that ran, plus why (unless the reason is an unset user choice).
          const body = this.render(n.children[0], true, nested, vars);
          return this.isQuiet(n.cond!) ? body : [...body, text('  ⟨since '), ...this.explainCond(n.cond!, vars), text('⟩')];
        }
        // General form shows both branches; the untaken branch is rendered from the raw Expr.
        const thenT = n.branch === 'then' ? this.render(n.children[0], false, true, vars) : this.renderRaw(e.then);
        const elseT = n.branch === 'else' ? this.render(n.children[0], false, true, vars) : this.renderRaw(e.else);
        return [text('('), ...thenT, text(' if '), ...this.renderCondGeneral(e.cond), text(', otherwise '), ...elseT, text(')')];
      }
      case 'brackets': {
        if (!plugged) {
          const toks = [text('Bracket Tax('), ...this.render(n.children[0], false, false, vars)];
          if (n.children[1]) toks.push(text(' stacked on '), ...this.render(n.children[1], false, false, vars));
          toks.push(text(')'));
          return toks;
        }
        if (!n.slices || n.slices.length === 0) return [text('$0.00')];
        const toks: FormulaToken[] = nested && n.slices.length > 1 ? [text('(')] : [];
        n.slices.forEach((s, i) => {
          if (i > 0) toks.push(text(' + '));
          toks.push(text(`(${fmtValue(s.amount, 'usd')} × ${fmtValue(s.rate, 'rate')})`));
        });
        if (nested && n.slices.length > 1) toks.push(text(')'));
        return toks;
      }
    }
  }

  /** Why a condition has the value it has, with the user's numbers. */
  private explainCond(c: CondEval, vars?: Map<string, CalcVariableBreakdown>): FormulaToken[] {
    const cond = c.cond;
    switch (cond.k) {
      case 'cmp': {
        const op = c.value ? cond.op : CMP_INVERSE[cond.op];
        return [...this.render(c.operands[0], true, true, vars), text(CMP_SYMBOL[op]), ...this.render(c.operands[1], true, true, vars)];
      }
      case 'status': return [text(`Filing Status ${c.value ? 'is' : 'is not'} ${cond.in.map(s => STATUS_LABEL[s]).join(' / ')}`)];
      case 'flag': return [text(c.value ? cond.label : cond.negLabel)];
      case 'itemFlag': return [text(c.value ? cond.label : cond.negLabel)];
      case 'quiet': return [];
      case 'not': return this.explainCond(c.parts[0], vars);
      default: {
        // and→true / or→false: every part matters. and→false / or→true: only the deciding parts.
        const all = (cond.k === 'and') === c.value;
        const parts = (all ? c.parts : c.parts.filter(p => p.value === c.value)).filter(p => !this.isQuiet(p));
        return parts.flatMap((p, i) => [...(i > 0 ? [text(' and ')] : []), ...this.explainCond(p, vars)]);
      }
    }
  }

  private isQuiet(c: CondEval): boolean {
    if (c.cond.k === 'flag') return !c.value;
    // Filing status is known context; the general formula already shows status conditions.
    if (c.cond.k === 'status' || c.cond.k === 'quiet') return true;
    if (c.cond.k === 'not') return this.isQuiet(c.parts[0]);
    if (c.cond.k === 'and' || c.cond.k === 'or') return c.parts.every(p => this.isQuiet(p));
    return false;
  }

  private renderCondGeneral(c: Cond): FormulaToken[] {
    switch (c.k) {
      case 'cmp': return [...this.renderRaw(c.a), text(CMP_SYMBOL[c.op]), ...this.renderRaw(c.b)];
      case 'status': return [text(`Filing Status is ${c.in.map(s => STATUS_LABEL[s]).join(' / ')}`)];
      case 'flag': return [text(c.label)];
      case 'itemFlag': return [text(c.label)];
      case 'quiet': return this.renderCondGeneral(c.cond);
      case 'not': return [text('not ('), ...this.renderCondGeneral(c.cond), text(')')];
      default: {
        const joiner = c.k === 'and' ? ' and ' : ' or ';
        return c.conds.flatMap((p, i) => [...(i > 0 ? [text(joiner)] : []), ...this.renderCondGeneral(p)]);
      }
    }
  }

  /** General-form rendering of an expression that was not evaluated (untaken branch, ∑ bodies). */
  private renderRaw(e: Expr, collection?: string, top = false): FormulaToken[] {
    const r = (x: Expr) => this.renderRaw(x, collection);
    switch (e.k) {
      case 'lit': return [text(fmtValue(e.value, e.unit))];
      case 'param': return [text(this.graph.params.get(e.id)!.label)];
      case 'lookup': return [text(`${this.graph.params.get(e.table)!.label}[`), ...r(e.key), text(']')];
      case 'ref': return [text((this.graph.inputs.get(e.id) || this.graph.quantities.get(e.id))!.label)];
      case 'field': return [text(collection ? this.graph.collections.get(collection)!.fields[e.name].label : e.name)];
      case 'count': return [text(this.graph.collections.get(e.collection)!.countLabel || e.collection)];
      case 'sum_over': return [text('∑ '), ...this.renderRaw(e.body, e.collection, true)];
      case 'neg': return [text('−'), ...r(e.e)];
      case 'round': return this.renderRaw(e.e, collection, top);
      case 'min': case 'max': case 'ceil': case 'floor': {
        const args = childExprs(e);
        return [text(`${e.k}(`), ...args.flatMap((a, i) => [...(i ? [text(', ')] : []), ...r(a)]), text(')')];
      }
      case 'if': return [text('('), ...r(e.then), text(' if '), ...this.renderCondGeneral(e.cond), text(', otherwise '), ...r(e.else), text(')')];
      case 'brackets': return [text('Bracket Tax('), ...r(e.income), text(')')];
      default: {
        const kids = childExprs(e);
        const inner = kids.flatMap((a, i) => [...(i ? [text(OP_SYMBOL[e.k] || ', ')] : []), ...r(a)]);
        return top || !isCompound(e) ? inner : [text('('), ...inner, text(')')];
      }
    }
  }

  // ---------- variable breakdowns (popover contents) ----------

  private contrib(label: string, value: number, target: string, negate: boolean, panel?: PanelLink): CalcVariableContributor {
    return {
      label,
      sign: (value < 0) !== negate ? '-' : '+',
      amount: Math.abs(value),
      amountFormatted: fmtValue(Math.abs(value), 'usd'),
      isSetUp: value !== 0,
      targetElementId: target,
      panelKey: panel?.panelKey,
      panelSection: panel?.panelSection
    };
  }

  /** The additive pieces of a value, each pointing at the element the user can edit or inspect. */
  contributors(n: EvalNode, negate = false): CalcVariableContributor[] {
    const e = n.expr;
    switch (e.k) {
      case 'add': return this.visibleChildren(n).flatMap(c => this.contributors(c, negate));
      case 'sub': {
        const [a, ...rest] = this.visibleChildren(n);
        return [...this.contributors(a, negate), ...rest.flatMap(c => this.contributors(c, !negate))];
      }
      case 'neg': return this.contributors(n.children[0], !negate);
      case 'round': return this.contributors(n.children[0], negate);
      case 'min': case 'max': {
        const nonLit = n.children.filter(c => c.expr.k !== 'lit');
        return nonLit.length === 1 ? this.contributors(nonLit[0], negate) : this.leafContributors(n);
      }
      case 'sum_over':
        return (n.items || []).map(it => this.contrib(it.label, it.node.value, it.domId, negate, it.panel));
      case 'field': {
        const sc = n.scope!;
        const f = this.graph.collections.get(sc.collection)!.fields[e.name];
        return [this.contrib(`${this.graph.collections.get(sc.collection)!.itemLabel(sc.index, sc.item)} ${f.label}`, n.value, f.domId(sc.item), negate, f)];
      }
      case 'ref': {
        const input = this.graph.inputs.get(e.id);
        if (input) return [this.contrib(input.label, n.value, input.domId, negate, input)];
        const q = this.graph.quantities.get(e.id)!;
        if (q.display === 'inline') return this.contributors(this.node(e.id), negate);
        return [this.contrib(q.label, n.value, lineDomId(q.id), negate)];
      }
      case 'param': case 'lookup': {
        const p = this.graph.params.get(e.k === 'param' ? e.id : e.table)!;
        return [{
          label: p.source ? `${p.label} (${p.source})` : p.label,
          sign: 'info',
          amount: n.value,
          amountFormatted: fmtValue(n.value, p.unit),
          isSetUp: true,
          targetElementId: p.domSources?.[0] || ''
        }];
      }
      case 'lit': return [];
      default: return this.leafContributors(n);
    }
  }

  private leafContributors(n: EvalNode): CalcVariableContributor[] {
    const out: CalcVariableContributor[] = [];
    const seen = new Set<string>();
    const walk = (x: EvalNode): void => {
      const e = x.expr;
      if (e.k === 'ref' || e.k === 'param' || e.k === 'lookup' || e.k === 'sum_over' || e.k === 'field') {
        this.contributors(x).forEach(c => {
          const key = `${c.targetElementId}|${c.label}`;
          if (!seen.has(key)) { seen.add(key); out.push({ ...c, sign: 'info' }); }
        });
        return;
      }
      if (x.cond) this.condNodes(x.cond).forEach(walk);
      this.visibleChildren(x).forEach(walk);
    };
    walk(n);
    return out;
  }

  private condNodes(c: CondEval): EvalNode[] {
    return [...c.operands, ...c.parts.flatMap(p => this.condNodes(p))];
  }

  // ---------- lines & blocks ----------

  /** Formula lines for one quantity, in the CalcLineItem shape the UI renders. */
  lines(id: string, vars?: Map<string, CalcVariableBreakdown>): CalcLineItem[] {
    const q = this.graph.quantities.get(id)!;
    const n = this.node(id);
    const out: CalcLineItem[] = [];
    // Bracket computations inside this quantity's own formula get one intermediate line per slice.
    this.bracketNodes(n).forEach((b, bi) => (b.slices || []).forEach(s => out.push({
      id: `${lineDomId(id)}-b${bi > 0 ? `${bi}-` : ''}${s.index}`,
      label: `Bracket ${s.index} (${fmtValue(s.rate, 'rate')})`,
      formLineLabel: null,
      isIntermediate: true,
      generalTokens: [text(`Bracket ${s.index} (${fmtValue(s.rate, 'rate')}) = portion of income between ${fmtValue(s.min, 'usd')} and ${s.max === Infinity ? '∞' : fmtValue(s.max, 'usd')} × ${fmtValue(s.rate, 'rate')}`)],
      pluggedTokens: [text(`Bracket ${s.index} (${fmtValue(s.rate, 'rate')}) = ${fmtValue(s.amount, 'usd')} × ${fmtValue(s.rate, 'rate')} = ${fmtValue(s.tax, 'usd')}`)],
      resultFormatted: fmtValue(s.tax, 'usd')
    })));
    out.push({
      id: lineDomId(id),
      label: q.label,
      formLineLabel: q.form ?? null,
      isIntermediate: !q.form,
      generalTokens: [text(`${q.label} = `), ...this.render(n, false, false, vars)],
      pluggedTokens: [text(`${q.label} = `), ...this.render(n, true, false, vars), text(` = ${fmtValue(n.value, q.unit)}`)],
      resultFormatted: fmtValue(n.value, q.unit),
      isEmpty: n.value === 0
    });
    return out;
  }

  /** Bracket nodes in a quantity's own formula (not inside referenced quantities). */
  bracketNodes(n: EvalNode): EvalNode[] {
    const out: EvalNode[] = [];
    const walk = (x: EvalNode): void => {
      if (x.expr.k === 'brackets') out.push(x);
      x.children.forEach(walk);
    };
    walk(n);
    return out;
  }

  /** Plain-text formula (for summaries, printing and legacy string fields). */
  lineText(id: string, plugged: boolean): string {
    const l = this.lines(id);
    const main = l[l.length - 1];
    return tokensToText(plugged ? main.pluggedTokens : main.generalTokens);
  }

  isShown(id: string, show: 'always' | 'nonzero', showEmpty: boolean): boolean {
    if (!this.applies(id)) return false;
    return show === 'always' || showEmpty || this.value(id) !== 0;
  }

  block(spec: BlockSpec, showEmpty = false): GraphBlock {
    const entries = spec.quantities
      .map(q => (typeof q === 'string' ? { id: q, show: 'nonzero' as const } : q))
      .filter(q => this.graph.quantities.has(q.id)); // some quantities exist only in certain tax years
    const shown = entries.filter(q => this.isShown(q.id, q.show, showEmpty)).map(q => q.id);
    const vars = new Map<string, CalcVariableBreakdown>();
    const lines = shown.flatMap(id => this.lines(id, vars));
    const own = new Set(shown.map(lineDomId));
    const sourceIds = Array.from(new Set(shown.flatMap(id => this.sources(id)).filter(s => !own.has(s))));
    return {
      id: spec.id,
      stepLabel: spec.stepLabel,
      title: spec.title,
      isOutput: spec.isOutput,
      hasImpact: entries.some(q => this.applies(q.id) && this.value(q.id) !== 0 && this.usesUserData(q.id)),
      lines,
      variables: Object.fromEntries(vars),
      sourceIds,
      quantityIds: shown
    };
  }

  private userDataMemo = new Map<string, boolean>();

  /** True if the quantity depends on at least one non-zero value the user entered. */
  usesUserData(id: string): boolean {
    const cached = this.userDataMemo.get(id);
    if (cached !== undefined) return cached;
    this.userDataMemo.set(id, false);
    const walk = (n: EvalNode): boolean => {
      const e = n.expr;
      if (e.k === 'ref') return this.graph.inputs.has(e.id) ? n.value !== 0 : this.usesUserData(e.id);
      if (e.k === 'field') return n.value !== 0;
      if (e.k === 'count') return n.value !== 0;
      if (e.k === 'sum_over') return (n.items || []).some(it => walk(it.node));
      if (n.cond && this.condNodes(n.cond).some(walk)) return true;
      return n.children.some(walk);
    };
    const r = walk(this.node(id));
    this.userDataMemo.set(id, r);
    return r;
  }

  // ---------- dependencies / arrows ----------

  /** DOM ids that feed this quantity's line. Inline quantities and absent terms are looked through. */
  sources(id: string): string[] {
    const cached = this.sourcesMemo.get(id);
    if (cached) return cached;
    const out = new Set<string>();
    const walk = (n: EvalNode): void => {
      const e = n.expr;
      if (e.k === 'ref') {
        const input = this.graph.inputs.get(e.id);
        if (input) {
          // An optional input left at 0 contributes nothing (and its panel may not be on screen).
          if (!(input.optional && n.value === 0)) out.add(input.domId);
          return;
        }
        const q = this.graph.quantities.get(e.id)!;
        if (q.display === 'inline') walk(this.node(e.id));
        else out.add(lineDomId(e.id));
        return;
      }
      if (e.k === 'param' || e.k === 'lookup') {
        (this.graph.params.get(e.k === 'param' ? e.id : e.table)!.domSources || []).forEach(d => out.add(d));
      }
      if (e.k === 'field') {
        out.add(this.graph.collections.get(n.scope!.collection)!.fields[e.name].domId(n.scope!.item));
        return;
      }
      if (e.k === 'sum_over') { (n.items || []).forEach(it => walk(it.node)); return; }
      if (n.cond) walkCond(n.cond);
      this.visibleChildren(n).forEach(walk);
    };
    const walkCond = (c: CondEval): void => {
      if (c.cond.k === 'status') out.add('select-filing-status');
      if (c.cond.k === 'flag' && c.cond.domId && !this.isQuiet(c)) out.add(c.cond.domId);
      if (c.cond.k === 'itemFlag' && c.scope) out.add(this.graph.collections.get(c.scope.collection)!.fields[c.cond.field].domId(c.scope.item));
      c.operands.forEach(walk);
      c.parts.forEach(walkCond);
    };
    walk(this.node(id));
    const q = this.graph.quantities.get(id)!;
    if (q.appliesWhen) walkCond(this.evalCond(q.appliesWhen));
    const result = [...out];
    this.sourcesMemo.set(id, result);
    return result;
  }

  /**
   * Arrows into the given visible quantities. Sources that are quantities not on screen are
   * resolved to *their* sources, so no arrow ever points at a missing element. When `groupOf`
   * is given, arrows between quantities of the same group (block) are omitted — the block's
   * own formula already shows that relationship.
   */
  edges(visible: Iterable<string>, groupOf?: (quantityId: string) => string | undefined): GraphEdge[] {
    const visibleSet = new Set(visible);
    const out: GraphEdge[] = [];
    visibleSet.forEach(id => {
      const q = this.graph.quantities.get(id)!;
      const targetGroup = groupOf?.(id);
      const srcs = this.resolvedSources(id, visibleSet);
      srcs.forEach(src => {
        const srcQ = this.domToQuantity.get(src);
        if (srcQ && targetGroup !== undefined && groupOf!(srcQ) === targetGroup) return;
        out.push({ sourceId: src, targetId: lineDomId(id), category: q.category || 'default', quantityId: id });
      });
    });
    return out;
  }

  /**
   * Sources of a quantity, where any source that is a quantity *not* in `visible` is replaced by
   * that quantity's own (resolved) sources — so every returned id is an on-screen element.
   */
  resolvedSources(id: string, visible: Set<string>): string[] {
    const resolve = (dom: string, stack: Set<string>): string[] => {
      const qid = this.domToQuantity.get(dom);
      if (!qid || visible.has(qid)) return [dom];
      if (stack.has(qid)) return [];
      stack.add(qid);
      const r = this.sources(qid).flatMap(s => resolve(s, stack));
      stack.delete(qid);
      return r;
    };
    return Array.from(new Set(this.sources(id).flatMap(s => resolve(s, new Set()))));
  }

  /** Full transitive upstream (for "highlight everything that feeds this"). */
  upstream(id: string): string[] {
    const seen = new Set<string>();
    const visit = (qid: string): void => {
      this.sources(qid).forEach(src => {
        if (seen.has(src)) return;
        seen.add(src);
        const next = this.domToQuantity.get(src);
        if (next) visit(next);
      });
    };
    visit(id);
    return [...seen];
  }
}

function firstFieldName(e: Expr): string | undefined {
  if (e.k === 'field') return e.name;
  for (const c of childExprs(e)) {
    const f = firstFieldName(c);
    if (f) return f;
  }
  if (e.k === 'if') {
    for (const c of condOperands(e.cond)) {
      const f = firstFieldName(c);
      if (f) return f;
    }
  }
  return undefined;
}
