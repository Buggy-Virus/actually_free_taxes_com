/**
 * Repeating records entered as lists (businesses, Form 8949 transactions, rental properties, Form 1095-A policies).
 * One definition drives the list editor in the UI, the DOM ids that dependency arrows point at, and the
 * graph collection the federal context builds from the same data.
 */

import { TaxAppState, BusinessRecord, CapitalTransaction, RentalProperty, MarketplacePolicy } from './types.js';

export interface RecordField {
  key: string;
  label: string;
  type: 'money' | 'number' | 'text' | 'select' | 'checkbox';
  options?: Array<[string, string]>;
  /** Shown only on joint returns (e.g. "Whose business?"). */
  jointOnly?: boolean;
  placeholder?: string;
}

export interface RecordKind<T extends { id: number }> {
  kind: string;
  panelKey: string;
  itemNoun: string;
  fields: RecordField[];
  list: (state: TaxAppState) => T[];
  setList: (state: TaxAppState, items: T[]) => void;
  create: (id: number, state: TaxAppState) => T;
}

/** DOM id of one field of one record — what graph collection domIds point at. */
export const recordDomId = (kind: string, id: number, key: string) => `rec-${kind}-${id}-${key}`;

const OWNER: RecordField = { key: 'owner', label: 'Whose?', type: 'select', options: [['taxpayer', 'Taxpayer'], ['spouse', 'Spouse']], jointOnly: true };

export const BUSINESS_KIND: RecordKind<BusinessRecord> = {
  kind: 'biz', panelKey: 'sched-c-businesses', itemNoun: 'Business',
  fields: [
    { key: 'name', label: 'Business Name', type: 'text' },
    OWNER,
    { key: 'receipts', label: 'Gross Receipts Not on a 1099', type: 'money' },
    { key: 'advertising', label: 'Advertising', type: 'money' },
    { key: 'supplies', label: 'Supplies', type: 'money' },
    { key: 'insurance', label: 'Insurance', type: 'money' },
    { key: 'utilities', label: 'Utilities & Phone', type: 'money' },
    { key: 'rentLease', label: 'Rent / Lease', type: 'money' },
    { key: 'legalProfessional', label: 'Legal & Professional', type: 'money' },
    { key: 'otherExpenses', label: 'Other Expenses', type: 'money' },
    { key: 'meals', label: 'Business Meals (50% deductible)', type: 'money' },
    { key: 'vehicleMiles', label: 'Business Miles (standard rate)', type: 'number' },
    { key: 'homeOfficeSqFt', label: 'Home Office Sq Ft (simplified, max 300)', type: 'number' }
  ],
  list: s => s.businesses || [],
  setList: (s, items) => { s.businesses = items; },
  create: id => ({ id, name: `Business ${id}` })
};

export const TRANSACTION_KIND: RecordKind<CapitalTransaction> = {
  kind: 'tx', panelKey: 'form-8949-transactions', itemNoun: 'Sale',
  fields: [
    { key: 'description', label: 'Description (e.g. 100 sh XYZ)', type: 'text' },
    { key: 'term', label: 'Held', type: 'select', options: [['short', 'One year or less (short-term)'], ['long', 'More than one year (long-term)']] },
    { key: 'box', label: 'Form 8949 Box', type: 'select', options: [['A', 'A — basis reported'], ['B', 'B — basis not reported'], ['C', 'C — no 1099-B'], ['D', 'D — basis reported'], ['E', 'E — basis not reported'], ['F', 'F — no 1099-B']] },
    { key: 'proceeds', label: 'Proceeds', type: 'money' },
    { key: 'basis', label: 'Cost Basis', type: 'money' },
    { key: 'adjustment', label: 'Adjustment (e.g. wash sale W, + adds back)', type: 'money' }
  ],
  list: s => s.capitalTransactions || [],
  setList: (s, items) => { s.capitalTransactions = items; },
  create: id => ({ id, description: '', term: 'long', proceeds: 0, basis: 0, box: 'D' })
};

export const RENTAL_KIND: RecordKind<RentalProperty> = {
  kind: 'rent', panelKey: 'rental-properties', itemNoun: 'Property',
  fields: [
    { key: 'name', label: 'Property', type: 'text' },
    { key: 'rents', label: 'Rents Received', type: 'money' },
    { key: 'expenses', label: 'Expenses (excl. depreciation)', type: 'money' },
    { key: 'depreciation', label: 'Depreciation (blank = compute)', type: 'money' },
    { key: 'buildingBasis', label: 'Building Basis (excl. land)', type: 'money' },
    { key: 'placedInServiceYear', label: 'Year Placed in Service', type: 'number' },
    { key: 'placedInServiceMonth', label: 'Month Placed in Service (1–12)', type: 'number' },
    { key: 'rentalDays', label: 'Days Rented at Fair Price', type: 'number' },
    { key: 'personalDays', label: 'Days of Personal Use', type: 'number' }
  ],
  list: s => s.rentalProperties || [],
  setList: (s, items) => { s.rentalProperties = items; },
  create: id => ({ id, name: `Property ${id}`, rents: 0, expenses: 0 })
};

export const MARKETPLACE_KIND: RecordKind<MarketplacePolicy> = {
  kind: 'mkt', panelKey: 'cred-1095a', itemNoun: 'Form 1095-A',
  fields: [
    { key: 'premiums', label: 'Annual Enrollment Premiums (col. A)', type: 'money' },
    { key: 'slcsp', label: 'Annual SLCSP Premium (col. B)', type: 'money' },
    { key: 'advancePtc', label: 'Advance PTC Paid (col. C)', type: 'money' }
  ],
  list: s => s.marketplacePolicies || [],
  setList: (s, items) => { s.marketplacePolicies = items; },
  create: id => ({ id, premiums: 0, slcsp: 0, advancePtc: 0 })
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const RECORD_KINDS: Array<RecordKind<any>> = [BUSINESS_KIND, TRANSACTION_KIND, RENTAL_KIND, MARKETPLACE_KIND];
