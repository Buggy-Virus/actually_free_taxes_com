/**
 * Actually Free Taxes - Dependency-Tracked Formula Graph (FormulaNode AST)
 * Single source of truth for calculation math, General Formula tokens,
 * With Your Numbers tokens, Intermediate Step expansion, and ArrowEngine sourceIds.
 */

import {
  CalcLineItem,
  CalcVariableBreakdown,
  CalcVariableContributor,
  FormulaToken
} from './types.js';

export type FormulaOp = 'add' | 'sub' | 'mul' | 'div' | 'min' | 'max';

export interface BracketSliceNode {
  index: number;
  rate: number;
  ratePercent: string;
  range: string;
  bracketWidth: number;
  taxableAmount: number;
  taxAmount: number;
  remainingBefore: number;
  remainingAfter: number;
}

export type FormulaNode =
  | {
      kind: 'input';
      id: string;
      domId: string;
      label: string;
      value: number;
      exact?: boolean;
      varId?: string;
    }
  | {
      kind: 'const';
      id: string;
      label: string;
      value: number;
      format: 'currency' | 'percent' | 'number';
    }
  | {
      kind: 'op';
      id: string;
      label: string;
      op: FormulaOp;
      args: FormulaNode[];
      value: number;
      formLineLabel?: string | null;
      expandIntermediate?: boolean;
      exact?: boolean;
    }
  | {
      kind: 'brackets';
      id: string;
      label: string;
      income: FormulaNode;
      slices: BracketSliceNode[];
      value: number;
      formLineLabel?: string | null;
      expandIntermediate?: boolean;
    };

function fmtCurrency(amount: number, exact = true): string {
  const abs = Math.abs(amount);
  const formatted = exact
    ? abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(abs).toLocaleString('en-US');
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
}

function fmtPercent(rate: number): string {
  const pct = rate * 100;
  const rounded = Math.round(pct * 100) / 100;
  return `${rounded}%`;
}

export function inputNode(
  id: string,
  domId: string,
  label: string,
  value: number,
  opts?: { exact?: boolean; varId?: string }
): FormulaNode {
  return {
    kind: 'input',
    id,
    domId,
    label,
    value,
    exact: opts?.exact ?? true,
    varId: opts?.varId
  };
}

export function constNode(
  id: string,
  label: string,
  value: number,
  format: 'currency' | 'percent' | 'number' = 'currency'
): FormulaNode {
  return { kind: 'const', id, label, value, format };
}

export function opNode(
  id: string,
  label: string,
  op: FormulaOp,
  args: FormulaNode[],
  opts?: {
    value?: number;
    formLineLabel?: string | null;
    expandIntermediate?: boolean;
    exact?: boolean;
  }
): FormulaNode {
  let computed = 0;
  if (opts?.value !== undefined) {
    computed = opts.value;
  } else if (args.length > 0) {
    if (op === 'add') computed = args.reduce((s, a) => s + a.value, 0);
    else if (op === 'sub') computed = args.slice(1).reduce((s, a) => s - a.value, args[0].value);
    else if (op === 'mul') computed = args.reduce((s, a) => s * a.value, 1);
    else if (op === 'div') computed = args[1]?.value ? args[0].value / args[1].value : 0;
    else if (op === 'min') computed = Math.min(...args.map(a => a.value));
    else if (op === 'max') computed = Math.max(...args.map(a => a.value));
  }
  return {
    kind: 'op',
    id,
    label,
    op,
    args,
    value: Math.round(computed * 100) / 100,
    formLineLabel: opts?.formLineLabel,
    expandIntermediate: opts?.expandIntermediate,
    exact: opts?.exact ?? true
  };
}

export function bracketsNode(
  id: string,
  label: string,
  income: FormulaNode,
  slices: BracketSliceNode[],
  value: number,
  opts?: { formLineLabel?: string | null; expandIntermediate?: boolean }
): FormulaNode {
  return {
    kind: 'brackets',
    id,
    label,
    income,
    slices,
    value,
    formLineLabel: opts?.formLineLabel,
    expandIntermediate: opts?.expandIntermediate ?? true
  };
}

function opSymbol(op: FormulaOp): string {
  switch (op) {
    case 'add': return ' + ';
    case 'sub': return ' − ';
    case 'mul': return ' × ';
    case 'div': return ' ÷ ';
    default: return ', ';
  }
}

function formatConst(node: Extract<FormulaNode, { kind: 'const' }>, general: boolean): string {
  if (node.format === 'percent') return fmtPercent(node.value);
  if (node.format === 'number') return String(node.value);
  const valStr = fmtCurrency(node.value, node.value % 1 !== 0);
  return general && node.label && !node.label.startsWith('$') ? `${node.label} (${valStr})` : valStr;
}

function nodeToTokens(
  node: FormulaNode,
  general: boolean,
  vars: Record<string, CalcVariableBreakdown>,
  isTopLevel = false
): FormulaToken[] {
  const t = (text: string): FormulaToken => ({ type: 'text', text });

  if (node.kind === 'input') {
    if (node.varId && vars[node.varId]) {
      const vb = vars[node.varId];
      return [{
        type: 'var',
        varId: node.varId,
        label: node.label,
        valueFormatted: general ? node.label : fmtCurrency(node.value, node.exact ?? true),
        isEmpty: vb.isEmpty
      }];
    }
    return [t(general ? node.label : fmtCurrency(node.value, node.exact ?? true))];
  }

  if (node.kind === 'const') {
    return [t(formatConst(node, general))];
  }

  if (node.kind === 'brackets') {
    if (!isTopLevel) {
      return [t(general ? node.label : fmtCurrency(node.value, true))];
    }
    const active = node.slices.filter(s => s.taxableAmount > 0);
    if (general) {
      return [
        t(`${node.label} = ∑(`),
        ...nodeToTokens(node.income, true, vars, false),
        t(' × Bracket Rates)')
      ];
    }
    if (active.length === 0) {
      return [t(`${node.label} = $0.00`)];
    }
    return [
      t(`${node.label} = ${active.map(s => fmtCurrency(s.taxAmount, true)).join(' + ')} = ${fmtCurrency(node.value, true)}`)
    ];
  }

  // If this is a child op that has its own expanded intermediate line, reference it cleanly by label/value
  if (!isTopLevel && node.expandIntermediate) {
    return [t(general ? node.label : fmtCurrency(node.value, node.exact ?? true))];
  }

  const tokens: FormulaToken[] = [];
  if (isTopLevel) {
    tokens.push(t(`${node.label} = `));
  }

  if (node.op === 'min' || node.op === 'max') {
    tokens.push(t(`${node.op}(`));
    node.args.forEach((arg, idx) => {
      if (idx > 0) tokens.push(t(', '));
      tokens.push(...nodeToTokens(arg, general, vars, false));
    });
    tokens.push(t(')'));
  } else {
    const needParens = !isTopLevel && node.args.length > 1;
    if (needParens) tokens.push(t('('));
    node.args.forEach((arg, idx) => {
      if (idx > 0) tokens.push(t(opSymbol(node.op)));
      tokens.push(...nodeToTokens(arg, general, vars, false));
    });
    if (needParens) tokens.push(t(')'));
  }

  if (isTopLevel && !general) {
    tokens.push(t(` = ${fmtCurrency(node.value, node.exact ?? true)}`));
  }

  return tokens;
}

/**
 * Compiles a FormulaNode tree into ordered CalcLineItem[] rows:
 * - Intermediate rows for any child node with expandIntermediate=true or bracketsNode slices
 * - Final row for the root node itself
 */
export function compileFormulaToLines(
  root: FormulaNode,
  vars: Record<string, CalcVariableBreakdown> = {}
): CalcLineItem[] {
  const lines: CalcLineItem[] = [];
  const emittedIds = new Set<string>();

  const walk = (node: FormulaNode, isRoot: boolean): void => {
    if (node.kind === 'input' || node.kind === 'const') return;

    if (node.kind === 'op') {
      node.args.forEach(arg => walk(arg, false));
      if (isRoot || node.expandIntermediate) {
        if (!emittedIds.has(node.id)) {
          emittedIds.add(node.id);
          lines.push({
            id: node.id,
            label: node.label,
            formLineLabel: isRoot ? (node.formLineLabel ?? null) : null,
            isIntermediate: !isRoot || !node.formLineLabel,
            generalTokens: nodeToTokens(node, true, vars, true),
            pluggedTokens: nodeToTokens(node, false, vars, true),
            resultFormatted: fmtCurrency(node.value, node.exact ?? true)
          });
        }
      }
      return;
    }

    if (node.kind === 'brackets') {
      walk(node.income, false);
      const active = node.slices.filter(s => s.taxableAmount > 0);
      active.forEach((s, idx) => {
        const sliceId = `${node.id}-b${s.index}`;
        if (emittedIds.has(sliceId)) return;
        emittedIds.add(sliceId);
        const remLabel = idx === 0 ? node.income.label : 'Remaining Income';
        const generalTokens: FormulaToken[] =
          s.bracketWidth !== Infinity
            ? [
                {
                  type: 'text',
                  text: `Bracket ${s.index} (${s.ratePercent}, ${s.range}) = min(${remLabel}, ${fmtCurrency(s.bracketWidth, false)}) × ${s.ratePercent}`
                }
              ]
            : [
                {
                  type: 'text',
                  text: `Bracket ${s.index} (${s.ratePercent}, ${s.range}) = ${remLabel} × ${s.ratePercent}`
                }
              ];

        lines.push({
          id: sliceId,
          label: `Bracket ${s.index} (${s.ratePercent})`,
          formLineLabel: null,
          generalTokens,
          pluggedTokens: [
            {
              type: 'text',
              text: `Bracket ${s.index} (${s.ratePercent}): ${fmtCurrency(s.taxableAmount, true)} × ${s.ratePercent} = ${fmtCurrency(s.taxAmount, true)} (Remaining: ${fmtCurrency(s.remainingBefore, true)} − ${fmtCurrency(s.taxableAmount, true)} = ${fmtCurrency(s.remainingAfter, true)})`
            }
          ],
          resultFormatted: fmtCurrency(s.taxAmount, true)
        });
      });

      if (isRoot && !emittedIds.has(node.id)) {
        emittedIds.add(node.id);
        lines.push({
          id: node.id,
          label: node.label,
          formLineLabel: node.formLineLabel ?? null,
          generalTokens: nodeToTokens(node, true, vars, true),
          pluggedTokens: nodeToTokens(node, false, vars, true),
          resultFormatted: fmtCurrency(node.value, true)
        });
      }
    }
  };

  walk(root, true);
  return lines;
}

/**
 * Automatically extracts all unique DOM / Block source IDs referenced by a FormulaNode tree.
 */
export function extractSourceIds(node: FormulaNode): string[] {
  const ids = new Set<string>();
  const walk = (n: FormulaNode): void => {
    if (n.kind === 'input') {
      if (n.domId) ids.add(n.domId);
      return;
    }
    if (n.kind === 'op') {
      n.args.forEach(walk);
    } else if (n.kind === 'brackets') {
      walk(n.income);
    }
  };
  walk(node);
  return Array.from(ids);
}

export function makeContributor(
  label: string,
  amount: number,
  targetElementId: string,
  sign: '+' | '-' | 'info' = '+',
  isSetUp?: boolean
): CalcVariableContributor {
  return {
    label,
    sign,
    amount,
    amountFormatted: fmtCurrency(amount, true),
    isSetUp: isSetUp ?? amount !== 0,
    targetElementId
  };
}
