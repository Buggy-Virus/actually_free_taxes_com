/**
 * Actually Free Taxes - Main Application Controller (TypeScript)
 */
import { calculateTaxes, formatCurrency, formatCurrencyExact } from './tax-engine.js';
import { ArrowEngine } from './arrow-engine.js';
import { renderRatingPill, renderRatingCardHtml, renderFieldExplanationDrawer, renderExplainToggleBtn } from './field-ratings.js';
export const US_STATES = [
    { code: 'AL', name: 'Alabama', noIncomeTax: false },
    { code: 'AK', name: 'Alaska', noIncomeTax: true },
    { code: 'AZ', name: 'Arizona', noIncomeTax: false },
    { code: 'AR', name: 'Arkansas', noIncomeTax: false },
    { code: 'CA', name: 'California', noIncomeTax: false },
    { code: 'CO', name: 'Colorado', noIncomeTax: false },
    { code: 'CT', name: 'Connecticut', noIncomeTax: false },
    { code: 'DE', name: 'Delaware', noIncomeTax: false },
    { code: 'DC', name: 'District of Columbia', noIncomeTax: false },
    { code: 'FL', name: 'Florida', noIncomeTax: true },
    { code: 'GA', name: 'Georgia', noIncomeTax: false },
    { code: 'HI', name: 'Hawaii', noIncomeTax: false },
    { code: 'ID', name: 'Idaho', noIncomeTax: false },
    { code: 'IL', name: 'Illinois', noIncomeTax: false },
    { code: 'IN', name: 'Indiana', noIncomeTax: false },
    { code: 'IA', name: 'Iowa', noIncomeTax: false },
    { code: 'KS', name: 'Kansas', noIncomeTax: false },
    { code: 'KY', name: 'Kentucky', noIncomeTax: false },
    { code: 'LA', name: 'Louisiana', noIncomeTax: false },
    { code: 'ME', name: 'Maine', noIncomeTax: false },
    { code: 'MD', name: 'Maryland', noIncomeTax: false },
    { code: 'MA', name: 'Massachusetts', noIncomeTax: false },
    { code: 'MI', name: 'Michigan', noIncomeTax: false },
    { code: 'MN', name: 'Minnesota', noIncomeTax: false },
    { code: 'MS', name: 'Mississippi', noIncomeTax: false },
    { code: 'MO', name: 'Missouri', noIncomeTax: false },
    { code: 'MT', name: 'Montana', noIncomeTax: false },
    { code: 'NE', name: 'Nebraska', noIncomeTax: false },
    { code: 'NV', name: 'Nevada', noIncomeTax: true },
    { code: 'NH', name: 'New Hampshire', noIncomeTax: true },
    { code: 'NJ', name: 'New Jersey', noIncomeTax: false },
    { code: 'NM', name: 'New Mexico', noIncomeTax: false },
    { code: 'NY', name: 'New York', noIncomeTax: false },
    { code: 'NC', name: 'North Carolina', noIncomeTax: false },
    { code: 'ND', name: 'North Dakota', noIncomeTax: false },
    { code: 'OH', name: 'Ohio', noIncomeTax: false },
    { code: 'OK', name: 'Oklahoma', noIncomeTax: false },
    { code: 'OR', name: 'Oregon', noIncomeTax: false },
    { code: 'PA', name: 'Pennsylvania', noIncomeTax: false },
    { code: 'RI', name: 'Rhode Island', noIncomeTax: false },
    { code: 'SC', name: 'South Carolina', noIncomeTax: false },
    { code: 'SD', name: 'South Dakota', noIncomeTax: true },
    { code: 'TN', name: 'Tennessee', noIncomeTax: true },
    { code: 'TX', name: 'Texas', noIncomeTax: true },
    { code: 'UT', name: 'Utah', noIncomeTax: false },
    { code: 'VT', name: 'Vermont', noIncomeTax: false },
    { code: 'VA', name: 'Virginia', noIncomeTax: false },
    { code: 'WA', name: 'Washington', noIncomeTax: true },
    { code: 'WV', name: 'West Virginia', noIncomeTax: false },
    { code: 'WI', name: 'Wisconsin', noIncomeTax: false },
    { code: 'WY', name: 'Wyoming', noIncomeTax: true }
];
const STORAGE_KEY_DRAFT = 'aft_local_draft_v2';
const STORAGE_KEY_TOS = 'aft_tos_accepted_v1';
function getDefaultTaxAppState() {
    return {
        year: 2024,
        filingStatus: 'single',
        residentState: 'CA',
        w2s: [
            {
                id: 0,
                employer: 'Acme Corp, Inc.',
                ein: '12-3456789',
                box1: 75000,
                box2: 8900,
                box3: 75000,
                box4: 4650,
                box5: 75000,
                box6: 1087.50,
                states: [
                    {
                        id: 0,
                        state: 'CA',
                        stateId: '987-6543-2',
                        stateWages: 75000,
                        stateTaxWithheld: 3450,
                        localWages: 0,
                        localTaxWithheld: 0,
                        localityName: ''
                    }
                ]
            }
        ],
        otherIncome: {
            interest: 0,
            sources: [],
            capitalGains: { shortTerm: 0, longTerm: 0 },
            scheduleCExpenses: 0
        },
        adjustments: {
            studentLoan: 0,
            ira: 0,
            hsa: 0
        },
        dependents: {
            childrenCount: 0
        },
        itemizedDeductions: {
            medicalExpenses: 0,
            realEstateTax: 0,
            mortgageInterest: 0,
            charity: 0
        },
        deductionMethod: 'auto',
        showAllArrows: true
    };
}
class TaxApp {
    constructor() {
        this.state = getDefaultTaxAppState();
        this.arrowEngine = null;
        this.w2Counter = 1;
        this.stateLineCounter = 1;
        this.incomeSourceCounter = 1;
        this.scrollspyAttached = false;
        this.isTosAccepted = false;
        this.init();
    }
    init() {
        const svgEl = document.getElementById('arrow-canvas');
        if (svgEl) {
            this.arrowEngine = new ArrowEngine(svgEl, { showAll: this.state.showAllArrows });
        }
        // Check TOS acceptance on first page open
        this.checkTosOnLoad();
        // Check if URL specifies a preset
        let loadedFromPreset = false;
        if (typeof window !== 'undefined' && window.location) {
            const urlParams = new URLSearchParams(window.location.search);
            const presetParam = urlParams.get('preset');
            if (presetParam) {
                this.loadPreset(presetParam);
                loadedFromPreset = true;
            }
        }
        // If no preset in URL, restore saved progress from localStorage if available
        if (!loadedFromPreset) {
            this.loadDraft();
        }
        this.renderW2Forms();
        this.renderIncomeSources();
        this.syncAllDomInputs();
        this.bindGlobalEvents();
        this.recalculateAndRender();
        // Support URL parameters for automated testing & deep-linking
        if (typeof window !== 'undefined' && window.location) {
            const urlParams = new URLSearchParams(window.location.search);
            const modalParam = urlParams.get('modal');
            if (modalParam) {
                this.openGuidanceModal(modalParam);
            }
            const expandParam = urlParams.get('expand');
            if (expandParam === 'all') {
                const globalToggle = document.getElementById('btn-toggle-all-explain');
                if (globalToggle)
                    globalToggle.click();
            }
            const scrollParam = urlParams.get('scroll');
            if (scrollParam) {
                const num = parseInt(scrollParam, 10);
                if (!isNaN(num)) {
                    window.scrollTo(0, num);
                }
                else {
                    const target = document.getElementById(scrollParam);
                    if (target) {
                        target.scrollIntoView({ behavior: 'auto', block: 'start' });
                        window.scrollBy(0, -70);
                    }
                }
            }
        }
    }
    /* --------------------------------------------------------------------------
       TOS & Legal Advisory Modal Methods
       -------------------------------------------------------------------------- */
    checkTosOnLoad() {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined')
            return;
        try {
            const accepted = localStorage.getItem(STORAGE_KEY_TOS);
            if (accepted === 'true') {
                this.isTosAccepted = true;
            }
            else {
                this.isTosAccepted = false;
                // Automatically present the legal advisory & TOS on first open
                this.openTosModal();
            }
        }
        catch (e) {
            console.warn("Could not check TOS status in localStorage:", e);
        }
    }
    openTosModal() {
        const overlay = document.getElementById('tos-modal-overlay');
        if (overlay) {
            overlay.classList.add('open');
        }
    }
    closeTosModal() {
        const overlay = document.getElementById('tos-modal-overlay');
        if (overlay) {
            overlay.classList.remove('open');
        }
    }
    acceptTos() {
        const checkbox = document.getElementById('tos-confirm-checkbox');
        if (checkbox && !checkbox.checked) {
            alert("Please confirm you have read and agree to the Terms of Service.");
            return;
        }
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY_TOS, 'true');
            }
            catch (e) {
                console.warn("Could not record TOS acceptance:", e);
            }
        }
        this.isTosAccepted = true;
        this.closeTosModal();
    }
    /* --------------------------------------------------------------------------
       Client-Side Local Storage & Auto-Save Methods
       -------------------------------------------------------------------------- */
    saveDraft() {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined')
            return;
        try {
            localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(this.state));
            const statusText = document.getElementById('storage-status-text');
            const dot = document.getElementById('storage-dot');
            if (statusText) {
                const now = new Date();
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                statusText.textContent = `Draft auto-saved locally (${timeStr})`;
            }
            if (dot) {
                dot.style.background = '#10b981';
            }
        }
        catch (e) {
            console.warn("Could not save tax draft to localStorage:", e);
        }
    }
    loadDraft() {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined')
            return false;
        try {
            const saved = localStorage.getItem(STORAGE_KEY_DRAFT);
            if (!saved)
                return false;
            const parsed = JSON.parse(saved);
            if (parsed && Array.isArray(parsed.w2s) && parsed.w2s.length > 0) {
                this.state = parsed;
                this.updateIdCounters();
                const statusText = document.getElementById('storage-status-text');
                if (statusText) {
                    statusText.textContent = "Restored saved draft from this device";
                }
                return true;
            }
        }
        catch (e) {
            console.warn("Failed to load saved tax draft:", e);
        }
        return false;
    }
    clearDraft() {
        if (typeof window !== 'undefined') {
            const confirmed = window.confirm("Are you sure you want to clear your saved tax progress and reset to blank/default?");
            if (!confirmed)
                return;
            if (typeof localStorage !== 'undefined') {
                try {
                    localStorage.removeItem(STORAGE_KEY_DRAFT);
                }
                catch (e) {
                    console.warn("Failed to remove saved draft:", e);
                }
            }
            this.state = getDefaultTaxAppState();
            this.updateIdCounters();
            this.syncAllDomInputs();
            this.renderW2Forms();
            this.renderIncomeSources();
            this.recalculateAndRender();
            const statusText = document.getElementById('storage-status-text');
            if (statusText) {
                statusText.textContent = "Saved data cleared. Started fresh.";
            }
        }
    }
    exportDraft() {
        if (typeof window === 'undefined')
            return;
        try {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `actually_free_taxes_${this.state.year}_draft.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        }
        catch (e) {
            alert("Could not export backup: " + e.message);
        }
    }
    importDraft(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                const parsed = JSON.parse(text);
                if (parsed && Array.isArray(parsed.w2s) && parsed.w2s.length > 0) {
                    this.state = parsed;
                    this.updateIdCounters();
                    this.syncAllDomInputs();
                    this.renderW2Forms();
                    this.renderIncomeSources();
                    this.recalculateAndRender();
                    const statusText = document.getElementById('storage-status-text');
                    if (statusText) {
                        statusText.textContent = `Imported backup (${file.name}) successfully!`;
                    }
                    alert(`Successfully imported backup file: ${file.name}`);
                }
                else {
                    alert("Invalid tax backup file format. Expected an ActuallyFreeTaxes JSON file with W-2 entries.");
                }
            }
            catch (err) {
                alert("Failed to read backup file. Please ensure it is a valid JSON file.");
            }
        };
        reader.readAsText(file);
    }
    updateIdCounters() {
        let maxW2 = 0;
        let maxState = 0;
        (this.state.w2s || []).forEach(w => {
            if (w.id >= maxW2)
                maxW2 = w.id + 1;
            (w.states || []).forEach(s => {
                if (s.id >= maxState)
                    maxState = s.id + 1;
            });
        });
        this.w2Counter = Math.max(1, maxW2);
        this.stateLineCounter = Math.max(1, maxState);
        let maxInc = 0;
        (this.state.otherIncome?.sources || []).forEach(src => {
            if (src.id >= maxInc)
                maxInc = src.id + 1;
        });
        this.incomeSourceCounter = Math.max(1, maxInc);
    }
    syncAllDomInputs() {
        const yearSelect = document.getElementById('select-tax-year');
        if (yearSelect)
            yearSelect.value = String(this.state.year);
        const statusSelect = document.getElementById('select-filing-status');
        if (statusSelect)
            statusSelect.value = this.state.filingStatus;
        const resSelect = document.getElementById('select-resident-state');
        if (resSelect)
            resSelect.value = this.state.residentState || 'CA';
        const dedSelect = document.getElementById('select-deduction-method');
        if (dedSelect)
            dedSelect.value = this.state.deductionMethod || 'auto';
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el)
                el.value = String(val !== undefined ? val : 0);
        };
        setVal('input-adj-student-loan', this.state.adjustments?.studentLoan);
        setVal('input-adj-ira', this.state.adjustments?.ira);
        setVal('input-adj-hsa', this.state.adjustments?.hsa);
        setVal('input-other-interest', this.state.otherIncome?.interest);
        setVal('input-children-count', this.state.dependents?.childrenCount);
        setVal('input-capital-gains-st', this.state.otherIncome?.capitalGains?.shortTerm);
        setVal('input-capital-gains-lt', this.state.otherIncome?.capitalGains?.longTerm);
        setVal('input-1099-nec-expenses', this.state.otherIncome?.scheduleCExpenses);
        setVal('input-itemized-medical', this.state.itemizedDeductions?.medicalExpenses);
        setVal('input-itemized-salt', this.state.itemizedDeductions?.realEstateTax);
        setVal('input-itemized-mortgage', this.state.itemizedDeductions?.mortgageInterest);
        setVal('input-itemized-charity', this.state.itemizedDeductions?.charity);
        this.renderYearBadges();
    }
    bindGlobalEvents() {
        const yearSelect = document.getElementById('select-tax-year');
        if (yearSelect) {
            yearSelect.value = String(this.state.year);
            yearSelect.addEventListener('change', (e) => {
                this.state.year = parseInt(e.target.value, 10);
                this.renderYearBadges();
                this.recalculateAndRender();
            });
        }
        const statusSelect = document.getElementById('select-filing-status');
        if (statusSelect) {
            statusSelect.value = this.state.filingStatus;
            statusSelect.addEventListener('change', (e) => {
                this.state.filingStatus = e.target.value;
                this.recalculateAndRender();
            });
        }
        const resStateSelect = document.getElementById('select-resident-state');
        if (resStateSelect) {
            resStateSelect.value = this.state.residentState || 'CA';
            resStateSelect.addEventListener('change', (e) => {
                this.state.residentState = e.target.value;
                this.recalculateAndRender();
            });
        }
        const toggleArrows = document.getElementById('toggle-all-arrows');
        if (toggleArrows) {
            toggleArrows.checked = this.state.showAllArrows;
            toggleArrows.addEventListener('change', (e) => {
                this.state.showAllArrows = e.target.checked;
                if (this.arrowEngine) {
                    this.arrowEngine.setShowAll(this.state.showAllArrows);
                }
            });
        }
        // Bind all Add W-2 buttons (header, section header, bottom banner, and left TOC button)
        ['btn-add-w2', 'btn-add-w2-section', 'btn-add-w2-bottom', 'btn-add-w2-toc'].forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.addW2();
                });
            }
        });
        // Bind all Add Income Source buttons (section header and left TOC button)
        ['btn-add-income-source', 'btn-add-income-toc'].forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.addIncomeSource();
                });
            }
        });
        document.querySelectorAll('[data-preset]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('[data-preset]');
                const preset = target.dataset.preset;
                if (preset) {
                    this.loadPreset(preset);
                }
            });
        });
        const bindInput = (id, setter) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    setter(Number(e.target.value) || 0);
                    this.recalculateAndRender();
                });
                el.addEventListener('focus', () => this.arrowEngine?.setActiveSource(id));
                el.addEventListener('blur', () => this.arrowEngine?.clearActive());
                el.addEventListener('mouseenter', () => this.arrowEngine?.setActiveSource(id));
                el.addEventListener('mouseleave', () => this.arrowEngine?.clearActive());
            }
        };
        bindInput('input-adj-student-loan', val => this.state.adjustments.studentLoan = val);
        bindInput('input-adj-ira', val => this.state.adjustments.ira = val);
        bindInput('input-adj-hsa', val => this.state.adjustments.hsa = val);
        bindInput('input-other-interest', val => this.state.otherIncome.interest = val);
        bindInput('input-children-count', val => this.state.dependents.childrenCount = val);
        const getCapitalGains = () => {
            if (!this.state.otherIncome.capitalGains) {
                this.state.otherIncome.capitalGains = { shortTerm: 0, longTerm: 0 };
            }
            return this.state.otherIncome.capitalGains;
        };
        const getItemized = () => {
            if (!this.state.itemizedDeductions) {
                this.state.itemizedDeductions = { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 0, charity: 0 };
            }
            return this.state.itemizedDeductions;
        };
        // Capital gains & Schedule C expenses
        bindInput('input-capital-gains-st', val => getCapitalGains().shortTerm = val);
        bindInput('input-capital-gains-lt', val => getCapitalGains().longTerm = val);
        bindInput('input-1099-nec-expenses', val => this.state.otherIncome.scheduleCExpenses = val);
        // Schedule A Itemized deductions
        bindInput('input-itemized-medical', val => getItemized().medicalExpenses = val);
        bindInput('input-itemized-salt', val => getItemized().realEstateTax = val);
        bindInput('input-itemized-mortgage', val => getItemized().mortgageInterest = val);
        bindInput('input-itemized-charity', val => getItemized().charity = val);
        const dedMethodSelect = document.getElementById('select-deduction-method');
        if (dedMethodSelect) {
            dedMethodSelect.value = this.state.deductionMethod || 'auto';
            dedMethodSelect.addEventListener('change', (e) => {
                this.state.deductionMethod = e.target.value;
                this.recalculateAndRender();
            });
        }
        this.bindCardInspectors();
        this.bindGuidanceModalEvents();
        this.bindFilterToolbar();
        this.bindRatingPillEvents();
        this.bindExplainEvents();
        // TOS modal bindings
        const btnAcceptTos = document.getElementById('btn-accept-tos');
        if (btnAcceptTos) {
            btnAcceptTos.addEventListener('click', () => this.acceptTos());
        }
        const btnCloseTos = document.getElementById('btn-close-tos-modal');
        if (btnCloseTos) {
            btnCloseTos.addEventListener('click', () => {
                if (!this.isTosAccepted) {
                    alert("You must review and accept the Terms of Service to proceed.");
                    return;
                }
                this.closeTosModal();
            });
        }
        // Open TOS from header, storage bar, or footer
        ['btn-header-tos', 'btn-open-tos', 'btn-footer-tos'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.openTosModal());
            }
        });
        // Local Storage toolbar bindings
        ['btn-clear-draft', 'btn-footer-clear'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => this.clearDraft());
            }
        });
        const btnExport = document.getElementById('btn-export-draft');
        if (btnExport) {
            btnExport.addEventListener('click', () => this.exportDraft());
        }
        const btnImportTrigger = document.getElementById('btn-import-draft-trigger');
        const inputImport = document.getElementById('input-import-draft');
        if (btnImportTrigger && inputImport) {
            btnImportTrigger.addEventListener('click', () => {
                inputImport.click();
            });
            inputImport.addEventListener('change', () => {
                if (inputImport.files && inputImport.files.length > 0) {
                    this.importDraft(inputImport.files[0]);
                    inputImport.value = ''; // reset
                }
            });
        }
    }
    openGuidanceModal(fieldKey) {
        const modalEl = document.getElementById('guidance-modal-overlay');
        const bodyEl = document.getElementById('guidance-modal-body');
        if (!modalEl || !bodyEl)
            return;
        bodyEl.innerHTML = renderRatingCardHtml(fieldKey);
        modalEl.classList.add('open');
    }
    closeGuidanceModal() {
        const modalEl = document.getElementById('guidance-modal-overlay');
        if (modalEl) {
            modalEl.classList.remove('open');
        }
    }
    bindGuidanceModalEvents() {
        const modalEl = document.getElementById('guidance-modal-overlay');
        const closeBtn = document.getElementById('btn-close-guidance-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeGuidanceModal());
        }
        if (modalEl) {
            modalEl.addEventListener('click', (e) => {
                if (e.target === modalEl) {
                    this.closeGuidanceModal();
                }
            });
        }
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeGuidanceModal();
            }
        });
    }
    bindRatingPillEvents() {
        document.querySelectorAll('[data-rating-field]').forEach(pill => {
            pill.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                const fieldKey = pill.dataset.ratingField;
                if (fieldKey) {
                    this.openGuidanceModal(fieldKey);
                }
            };
            pill.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const fieldKey = pill.dataset.ratingField;
                    if (fieldKey) {
                        this.openGuidanceModal(fieldKey);
                    }
                }
            };
        });
    }
    bindExplainEvents() {
        document.querySelectorAll('.btn-explain-toggle').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                const targetId = btn.dataset.explainTarget;
                if (!targetId)
                    return;
                const drawer = document.getElementById(targetId);
                if (!drawer)
                    return;
                const isOpen = drawer.classList.contains('open');
                if (isOpen) {
                    drawer.classList.remove('open');
                    drawer.setAttribute('hidden', '');
                    drawer.setAttribute('aria-hidden', 'true');
                    btn.setAttribute('aria-expanded', 'false');
                    btn.classList.remove('active');
                }
                else {
                    drawer.classList.add('open');
                    drawer.removeAttribute('hidden');
                    drawer.setAttribute('aria-hidden', 'false');
                    btn.setAttribute('aria-expanded', 'true');
                    btn.classList.add('active');
                }
            };
        });
        document.querySelectorAll('[data-close-drawer]').forEach(closeBtn => {
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                const drawerId = closeBtn.dataset.closeDrawer;
                if (!drawerId)
                    return;
                const drawer = document.getElementById(drawerId);
                if (!drawer)
                    return;
                drawer.classList.remove('open');
                drawer.setAttribute('hidden', '');
                drawer.setAttribute('aria-hidden', 'true');
                const toggleBtn = document.querySelector(`[data-explain-target="${drawerId}"]`);
                if (toggleBtn) {
                    toggleBtn.setAttribute('aria-expanded', 'false');
                    toggleBtn.classList.remove('active');
                }
            };
        });
        const globalToggle = document.getElementById('btn-toggle-all-explain');
        if (globalToggle && !globalToggle.dataset.bound) {
            globalToggle.dataset.bound = 'true';
            let allExpanded = false;
            globalToggle.addEventListener('click', () => {
                allExpanded = !allExpanded;
                const drawers = document.querySelectorAll('.field-explain-drawer');
                const toggleBtns = document.querySelectorAll('.btn-explain-toggle');
                drawers.forEach(drawer => {
                    if (allExpanded) {
                        drawer.classList.add('open');
                        drawer.removeAttribute('hidden');
                        drawer.setAttribute('aria-hidden', 'false');
                    }
                    else {
                        drawer.classList.remove('open');
                        drawer.setAttribute('hidden', '');
                        drawer.setAttribute('aria-hidden', 'true');
                    }
                });
                toggleBtns.forEach(btn => {
                    btn.setAttribute('aria-expanded', allExpanded ? 'true' : 'false');
                    if (allExpanded)
                        btn.classList.add('active');
                    else
                        btn.classList.remove('active');
                });
                globalToggle.innerHTML = allExpanded
                    ? '🔒 Collapse All Explanations'
                    : '💡 Expand All Explanations';
                globalToggle.style.background = allExpanded ? '#fef3c7' : '#f0fdf4';
                globalToggle.style.color = allExpanded ? '#b45309' : '#15803d';
                globalToggle.style.borderColor = allExpanded ? '#fde68a' : '#bbf7d0';
            });
        }
    }
    bindFilterToolbar() {
        const toolbar = document.getElementById('ratings-filter-toolbar');
        if (!toolbar)
            return;
        toolbar.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                toolbar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const filter = chip.dataset.filter;
                document.body.classList.remove('filter-must-only', 'filter-savers-only', 'filter-hide-niche');
                if (filter === 'must-only') {
                    document.body.classList.add('filter-must-only');
                }
                else if (filter === 'savers-only') {
                    document.body.classList.add('filter-savers-only');
                }
                else if (filter === 'hide-niche') {
                    document.body.classList.add('filter-hide-niche');
                }
            });
        });
        const legendBtn = document.getElementById('btn-open-ratings-legend');
        if (legendBtn) {
            legendBtn.addEventListener('click', () => {
                this.openGuidanceModal('w2-box1');
            });
        }
    }
    bindCardInspectors() {
        const cardMap = [
            'calc-total-w2-wages',
            'calc-gross-income',
            'calc-capital-gains',
            'calc-total-adjustments',
            'calc-agi',
            'calc-itemized-deductions',
            'calc-standard-deduction',
            'calc-taxable-income',
            'calc-tax-before-credits',
            'calc-total-credits',
            'calc-total-tax-liability',
            'calc-total-withholding',
            'calc-final-verdict',
            'calc-fica-breakdown',
            'calc-state-tax-summary'
        ];
        cardMap.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('mouseenter', () => this.arrowEngine?.setActiveTarget(id));
                el.addEventListener('mouseleave', () => this.arrowEngine?.clearActive());
            }
        });
    }
    addW2() {
        const newId = this.w2Counter++;
        // Default to a different state for multi-state scenario demo (e.g. NY for W-2 #2)
        const defaultState = newId === 1 ? 'NY' : (newId === 2 ? 'TX' : 'WA');
        this.state.w2s.push({
            id: newId,
            employer: `Employer #${newId + 1}`,
            ein: `88-${1000000 + newId}`,
            box1: 50000,
            box2: 5800,
            box3: 50000,
            box4: 3100,
            box5: 50000,
            box6: 725,
            states: [
                {
                    id: this.stateLineCounter++,
                    state: defaultState,
                    stateId: `${defaultState}-ID-${newId + 1}`,
                    stateWages: 50000,
                    stateTaxWithheld: defaultState === 'TX' || defaultState === 'WA' ? 0 : 2250,
                    localWages: 0,
                    localTaxWithheld: 0,
                    localityName: ''
                }
            ]
        });
        this.renderW2Forms();
        this.recalculateAndRender();
        // Smoothly scroll down to the newly added W-2
        const newCard = document.getElementById(`w2-card-${newId}`);
        if (newCard) {
            newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newCard.classList.add('flash-highlight');
            setTimeout(() => newCard.classList.remove('flash-highlight'), 1200);
        }
    }
    removeW2(id) {
        if (this.state.w2s.length <= 1) {
            alert("At least one W-2 is required. You can set the amounts to $0 if needed.");
            return;
        }
        this.state.w2s = this.state.w2s.filter(w => w.id !== id);
        this.renderW2Forms();
        this.recalculateAndRender();
    }
    addStateToW2(w2Id) {
        const w2 = this.state.w2s.find(w => w.id === w2Id);
        if (!w2)
            return;
        if (!w2.states)
            w2.states = [];
        const newId = this.stateLineCounter++;
        w2.states.push({
            id: newId,
            state: 'NY',
            stateId: '',
            stateWages: Math.round(w2.box1 * 0.5),
            stateTaxWithheld: Math.round(w2.box1 * 0.5 * 0.05),
            localWages: 0,
            localTaxWithheld: 0,
            localityName: ''
        });
        this.renderW2Forms();
        this.recalculateAndRender();
    }
    removeStateFromW2(w2Id, stateLineId) {
        const w2 = this.state.w2s.find(w => w.id === w2Id);
        if (!w2 || !w2.states || w2.states.length <= 1) {
            alert("Each W-2 must have at least one state entry (or set to No State Tax).");
            return;
        }
        w2.states = w2.states.filter(s => s.id !== stateLineId);
        this.renderW2Forms();
        this.recalculateAndRender();
    }
    addIncomeSource(type = '1099-NEC') {
        if (!this.state.otherIncome.sources) {
            this.state.otherIncome.sources = [];
        }
        const newId = this.incomeSourceCounter++;
        const defaultPayer = type === '1099-NEC' ? 'Client Freelance Project' : (type === '1099-DIV' ? 'Vanguard Dividend Fund' : 'Consulting / Other');
        const defaultAmount = type === '1099-NEC' ? 4500 : (type === '1099-DIV' ? 1200 : 2000);
        this.state.otherIncome.sources.push({
            id: newId,
            type,
            payer: defaultPayer,
            amount: defaultAmount
        });
        this.renderIncomeSources();
        this.recalculateAndRender();
        const newCard = document.getElementById(`income-source-card-${newId}`);
        if (newCard) {
            newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newCard.classList.add('flash-highlight');
            setTimeout(() => newCard.classList.remove('flash-highlight'), 1200);
        }
    }
    removeIncomeSource(id) {
        if (!this.state.otherIncome.sources)
            return;
        this.state.otherIncome.sources = this.state.otherIncome.sources.filter(s => s.id !== id);
        this.renderIncomeSources();
        this.recalculateAndRender();
    }
    renderIncomeSources() {
        const container = document.getElementById('dynamic-income-sources-container');
        if (!container)
            return;
        container.innerHTML = '';
        const sources = this.state.otherIncome.sources || [];
        sources.forEach(src => {
            let ratingKey = 'income-1099-nec';
            let priorityClass = 'priority-must';
            if (src.type === '1099-DIV') {
                ratingKey = 'income-1099-div';
                priorityClass = 'priority-verify';
            }
            else if (src.type === '1099-MISC' || src.type === 'Other') {
                ratingKey = 'income-1099-misc';
                priorityClass = 'priority-skip';
            }
            else if (src.type === '1099-INT') {
                ratingKey = 'other-interest';
                priorityClass = 'priority-verify';
            }
            const card = document.createElement('div');
            card.className = `calc-card ${priorityClass}`;
            card.id = `income-source-card-${src.id}`;
            card.style.padding = '1.25rem';
            card.style.position = 'relative';
            card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.4rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <select class="w2-input" id="select-income-type-${src.id}" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; font-weight: 700; width: auto; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; border-radius: 4px;">
              <option value="1099-NEC" ${src.type === '1099-NEC' ? 'selected' : ''}>Form 1099-NEC (Freelance/Contract)</option>
              <option value="1099-DIV" ${src.type === '1099-DIV' ? 'selected' : ''}>Form 1099-DIV (Dividends)</option>
              <option value="1099-MISC" ${src.type === '1099-MISC' ? 'selected' : ''}>Form 1099-MISC (Prizes/Other)</option>
              <option value="1099-INT" ${src.type === '1099-INT' ? 'selected' : ''}>Form 1099-INT (Interest)</option>
              <option value="Other" ${src.type === 'Other' ? 'selected' : ''}>Other Taxable Income</option>
            </select>
            ${renderExplainToggleBtn(`drawer-explain-income-${src.id}`)}
            ${renderRatingPill(ratingKey)}
          </div>
          <button type="button" class="btn" id="btn-del-income-${src.id}" title="Remove this income source" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; color: #ef4444; border-color: #fecaca; background: #fef2f2;">
            ✕
          </button>
        </div>

        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
          <input type="text" class="w2-input" id="input-income-payer-${src.id}" value="${src.payer}" placeholder="Payer / Client Name" style="font-size: 0.85rem; font-weight: 600; padding: 0.35rem 0.6rem; flex: 2;">
          <select class="w2-input" id="select-income-state-${src.id}" style="font-size: 0.8rem; padding: 0.35rem 0.5rem; flex: 1;" title="State where this income was earned">
            <option value="">Default (Home State)</option>
            ${US_STATES.map(s => `<option value="${s.code}" ${src.state === s.code ? 'selected' : ''}>${s.code} - ${s.name}</option>`).join('')}
          </select>
        </div>

        <div class="w2-input-wrapper">
          <span class="currency-symbol">$</span>
          <input type="number" step="any" class="w2-input" id="input-income-source-${src.id}" value="${src.amount}" placeholder="0">
        </div>
        <div style="font-size: 0.7rem; color: #64748b; margin-top: 0.4rem;">
          Reported on 1040 line &amp; feeds directly into Gross Income and State Sourced Income.
        </div>
        ${renderFieldExplanationDrawer(ratingKey, `drawer-explain-income-${src.id}`)}
      `;
            container.appendChild(card);
            const typeSelect = card.querySelector(`#select-income-type-${src.id}`);
            if (typeSelect) {
                typeSelect.addEventListener('change', (e) => {
                    src.type = e.target.value;
                    this.recalculateAndRender();
                });
            }
            const stateSelect = card.querySelector(`#select-income-state-${src.id}`);
            if (stateSelect) {
                stateSelect.addEventListener('change', (e) => {
                    src.state = e.target.value || undefined;
                    this.recalculateAndRender();
                });
            }
            const payerInput = card.querySelector(`#input-income-payer-${src.id}`);
            if (payerInput) {
                payerInput.addEventListener('input', (e) => {
                    src.payer = e.target.value;
                    this.updateTableOfContents();
                });
            }
            const amtInput = card.querySelector(`#input-income-source-${src.id}`);
            if (amtInput) {
                amtInput.addEventListener('input', (e) => {
                    src.amount = Number(e.target.value) || 0;
                    this.recalculateAndRender();
                });
                amtInput.addEventListener('focus', () => this.arrowEngine?.setActiveSource(`input-income-source-${src.id}`));
                amtInput.addEventListener('blur', () => this.arrowEngine?.clearActive());
                amtInput.addEventListener('mouseenter', () => this.arrowEngine?.setActiveSource(`input-income-source-${src.id}`));
                amtInput.addEventListener('mouseleave', () => this.arrowEngine?.clearActive());
            }
            const delBtn = card.querySelector(`#btn-del-income-${src.id}`);
            if (delBtn) {
                delBtn.addEventListener('click', () => {
                    this.removeIncomeSource(src.id);
                });
            }
        });
    }
    loadPreset(presetName) {
        if (presetName === 'single-75k') {
            this.state.filingStatus = 'single';
            this.state.w2s = [{
                    id: 0,
                    employer: 'Northwind Tech Inc.',
                    ein: '12-3456789',
                    box1: 75000,
                    box2: 8900,
                    box3: 75000,
                    box4: 4650,
                    box5: 75000,
                    box6: 1087.50,
                    states: [{
                            id: 0,
                            state: 'CA',
                            stateId: 'CA-987654',
                            stateWages: 75000,
                            stateTaxWithheld: 3450,
                            localWages: 0,
                            localTaxWithheld: 0,
                            localityName: ''
                        }]
                }];
            this.state.otherIncome.interest = 0;
            this.state.adjustments = { studentLoan: 0, ira: 0, hsa: 0 };
            this.state.dependents.childrenCount = 0;
        }
        else if (presetName === 'multi-state-dual') {
            // Scenario with 2 jobs in 2 different states (e.g. California & New York)
            this.state.filingStatus = 'single';
            this.state.w2s = [
                {
                    id: 0,
                    employer: 'Silicon Valley Labs (CA)',
                    ein: '94-1122334',
                    box1: 65000,
                    box2: 7400,
                    box3: 65000,
                    box4: 4030,
                    box5: 65000,
                    box6: 942.50,
                    states: [{
                            id: 0,
                            state: 'CA',
                            stateId: 'CA-112233',
                            stateWages: 65000,
                            stateTaxWithheld: 2980,
                            localWages: 0,
                            localTaxWithheld: 0,
                            localityName: ''
                        }]
                },
                {
                    id: 1,
                    employer: 'Empire State Media (NY)',
                    ein: '13-5566778',
                    box1: 45000,
                    box2: 5100,
                    box3: 45000,
                    box4: 2790,
                    box5: 45000,
                    box6: 652.50,
                    states: [{
                            id: 1,
                            state: 'NY',
                            stateId: 'NY-556677',
                            stateWages: 45000,
                            stateTaxWithheld: 2150,
                            localWages: 45000,
                            localTaxWithheld: 1450,
                            localityName: 'NYC'
                        }]
                }
            ];
            this.state.otherIncome.interest = 200;
            this.state.adjustments = { studentLoan: 0, ira: 0, hsa: 0 };
            this.state.dependents.childrenCount = 0;
        }
        else if (presetName === 'married-dual-140k') {
            this.state.filingStatus = 'married_joint';
            this.state.w2s = [
                {
                    id: 0,
                    employer: 'TechCorp Solutions',
                    ein: '11-2233445',
                    box1: 82000,
                    box2: 9600,
                    box3: 82000,
                    box4: 5084,
                    box5: 82000,
                    box6: 1189,
                    states: [{
                            id: 0,
                            state: 'IL',
                            stateId: 'IL-112233',
                            stateWages: 82000,
                            stateTaxWithheld: 4059,
                            localWages: 0,
                            localTaxWithheld: 0,
                            localityName: ''
                        }]
                },
                {
                    id: 1,
                    employer: 'Metro Health Systems',
                    ein: '55-6677889',
                    box1: 58000,
                    box2: 6800,
                    box3: 58000,
                    box4: 3596,
                    box5: 58000,
                    box6: 841,
                    states: [{
                            id: 1,
                            state: 'WI',
                            stateId: 'WI-556677',
                            stateWages: 58000,
                            stateTaxWithheld: 2950,
                            localWages: 0,
                            localTaxWithheld: 0,
                            localityName: ''
                        }]
                }
            ];
            this.state.otherIncome.interest = 450;
            this.state.adjustments = { studentLoan: 0, ira: 0, hsa: 0 };
            this.state.dependents.childrenCount = 1;
        }
        else if (presetName === 'student-grad') {
            this.state.filingStatus = 'single';
            this.state.w2s = [{
                    id: 0,
                    employer: 'Creative Design Studio',
                    ein: '33-4455667',
                    box1: 52000,
                    box2: 5400,
                    box3: 52000,
                    box4: 3224,
                    box5: 52000,
                    box6: 754,
                    states: [{
                            id: 0,
                            state: 'TX',
                            stateId: 'TX-NONE',
                            stateWages: 52000,
                            stateTaxWithheld: 0,
                            localWages: 0,
                            localTaxWithheld: 0,
                            localityName: ''
                        }]
                }];
            this.state.otherIncome.interest = 50;
            this.state.adjustments = { studentLoan: 1800, ira: 1000, hsa: 0 };
            this.state.dependents.childrenCount = 0;
        }
        else if (presetName === 'blank') {
            this.state.filingStatus = 'single';
            this.state.w2s = [{
                    id: 0,
                    employer: 'Employer Name',
                    ein: '00-0000000',
                    box1: 0,
                    box2: 0,
                    box3: 0,
                    box4: 0,
                    box5: 0,
                    box6: 0,
                    states: [{
                            id: 0,
                            state: 'CA',
                            stateId: '',
                            stateWages: 0,
                            stateTaxWithheld: 0,
                            localWages: 0,
                            localTaxWithheld: 0,
                            localityName: ''
                        }]
                }];
            this.state.otherIncome.interest = 0;
            this.state.adjustments = { studentLoan: 0, ira: 0, hsa: 0 };
            this.state.dependents.childrenCount = 0;
        }
        const statusSelect = document.getElementById('select-filing-status');
        if (statusSelect)
            statusSelect.value = this.state.filingStatus;
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el)
                el.value = String(val);
        };
        setVal('input-adj-student-loan', this.state.adjustments.studentLoan);
        setVal('input-adj-ira', this.state.adjustments.ira);
        setVal('input-adj-hsa', this.state.adjustments.hsa);
        setVal('input-other-interest', this.state.otherIncome.interest);
        setVal('input-children-count', this.state.dependents.childrenCount);
        this.state.otherIncome.sources = [];
        this.renderW2Forms();
        this.renderIncomeSources();
        this.recalculateAndRender();
    }
    renderYearBadges() {
        document.querySelectorAll('.current-tax-year-text').forEach(el => {
            el.textContent = String(this.state.year);
        });
    }
    renderStateOptions(selectedCode) {
        return US_STATES.map(s => {
            const isSel = s.code === selectedCode ? 'selected' : '';
            const noTax = s.noIncomeTax ? ' (No Income Tax)' : '';
            return `<option value="${s.code}" ${isSel}>${s.code} — ${s.name}${noTax}</option>`;
        }).join('');
    }
    renderW2Forms() {
        const container = document.getElementById('w2-list-container');
        if (!container)
            return;
        container.innerHTML = '';
        this.state.w2s.forEach((w2, index) => {
            const card = document.createElement('div');
            card.className = 'w2-card-wrapper';
            card.id = `w2-card-${w2.id}`;
            if (!w2.states || w2.states.length === 0) {
                w2.states = [{
                        id: 0,
                        state: 'CA',
                        stateId: '',
                        stateWages: w2.box1,
                        stateTaxWithheld: 0,
                        localWages: 0,
                        localTaxWithheld: 0,
                        localityName: ''
                    }];
            }
            // Render state rows (Boxes 15-20)
            const stateRowsHtml = w2.states.map((st, sIdx) => `
        <div class="w2-state-row" id="w2-${w2.id}-state-${st.id}-row">
          <!-- Box 15: State -->
          <div class="w2-box highlight-state priority-must" id="w2-${w2.id}-state-${st.id}-box15-state">
            <div class="w2-box-header">
              <div>
                <span class="w2-box-number">15</span>
                <span class="w2-box-label">State</span>
              </div>
              ${renderRatingPill('w2-box15-state')}
            </div>
            <select class="state-select-input" data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="state">
              ${this.renderStateOptions(st.state)}
            </select>
          </div>

          <!-- Box 15: State ID -->
          <div class="w2-box priority-skip">
            <div class="w2-box-header">
              <div>
                <span class="w2-box-number">15</span>
                <span class="w2-box-label">State ID No.</span>
              </div>
              ${renderRatingPill('w2-box15-stateId')}
            </div>
            <input type="text" class="w2-input-text" value="${st.stateId}" placeholder="ID No."
                   data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="stateId">
          </div>

          <!-- Box 16: State wages -->
          <div class="w2-box priority-must" id="w2-${w2.id}-state-${st.id}-box16-container">
            <div class="w2-box-header">
              <div>
                <span class="w2-box-number">16</span>
                <span class="w2-box-label">State wages</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-st-${st.id}-box16`)}
                ${renderRatingPill('w2-box16')}
              </div>
            </div>
            <div class="w2-input-wrapper">
              <span class="currency-symbol">$</span>
              <input type="number" step="any" class="w2-input" id="w2-${w2.id}-state-${st.id}-box16" value="${st.stateWages}" placeholder="0"
                     data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="stateWages">
            </div>
            ${renderFieldExplanationDrawer('w2-box16', `drawer-explain-w2-${w2.id}-st-${st.id}-box16`)}
          </div>

          <!-- Box 17: State income tax withheld (KEY INPUT) -->
          <div class="w2-box highlight-state priority-must priority-saver" id="w2-${w2.id}-state-${st.id}-box17-container">
            <div class="w2-box-header">
              <div>
                <span class="w2-box-number">17</span>
                <span class="w2-box-label">State tax withheld</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-st-${st.id}-box17`)}
                ${renderRatingPill('w2-box17')}
              </div>
            </div>
            <div class="w2-input-wrapper">
              <span class="currency-symbol">$</span>
              <input type="number" step="any" class="w2-input" id="w2-${w2.id}-state-${st.id}-box17" value="${st.stateTaxWithheld}" placeholder="0"
                     data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="stateTaxWithheld">
            </div>
            ${renderFieldExplanationDrawer('w2-box17', `drawer-explain-w2-${w2.id}-st-${st.id}-box17`)}
          </div>

          <!-- Box 18: Local wages -->
          <div class="w2-box priority-skip">
            <div class="w2-box-header">
              <div>
                <span class="w2-box-number">18</span>
                <span class="w2-box-label">Local wages</span>
              </div>
              ${renderRatingPill('w2-box18-20')}
            </div>
            <div class="w2-input-wrapper">
              <span class="currency-symbol">$</span>
              <input type="number" step="any" class="w2-input" value="${st.localWages}" placeholder="0"
                     data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="localWages">
            </div>
          </div>

          <!-- Box 19 & 20: Local tax & Locality -->
          <div class="w2-box priority-skip">
            <div class="w2-box-header">
              <div>
                <span class="w2-box-number">19/20</span>
                <span class="w2-box-label">Local tax / Locality</span>
              </div>
              ${renderRatingPill('w2-box18-20')}
            </div>
            <div style="display: flex; gap: 0.35rem;">
              <div class="w2-input-wrapper" style="flex: 1;">
                <span class="currency-symbol" style="font-size: 0.8rem;">$</span>
                <input type="number" step="any" class="w2-input" style="font-size: 0.85rem;" value="${st.localTaxWithheld}" placeholder="0"
                       data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="localTaxWithheld">
              </div>
              <input type="text" class="w2-input-text" style="width: 70px; font-size: 0.8rem;" value="${st.localityName}" placeholder="Locality"
                     data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="localityName">
            </div>
          </div>

          <!-- Delete state line action -->
          <div style="display: flex; align-items: center; justify-content: center; background: white; padding: 0 0.4rem;">
            ${w2.states.length > 1 ? `
              <button type="button" class="btn btn-sm" style="color: #ef4444; padding: 0.2rem 0.4rem; font-size: 0.75rem;"
                      data-remove-state="${w2.id}:${st.id}" title="Remove this state line">✕</button>
            ` : ''}
          </div>
        </div>
      `).join('');
            card.innerHTML = `
        <div class="w2-form">
          <div class="w2-top-strip">
            <div>
              <div class="w2-omb">OMB No. 1545-0008</div>
              <div style="font-size: 0.85rem; font-weight: 800; color: #1e293b;">
                W-2 #${index + 1}: ${w2.employer || 'Employer'} 
                <span style="font-weight: 500; color: #64748b; font-size: 0.75rem;">
                  ${w2.states.map(s => s.state).join(', ')}
                </span>
              </div>
            </div>
            <div class="w2-form-title">
              <div class="doc-code">Form W-2</div>
              <div class="doc-desc">Wage and Tax Statement</div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="w2-year-badge current-tax-year-text">${this.state.year}</div>
              ${this.state.w2s.length > 1 ? `
                <button type="button" class="btn btn-sm" style="color: #ef4444; border-color: #fecaca; padding: 0.25rem 0.6rem; font-size: 0.8rem; font-weight: 700;" data-remove-w2="${w2.id}">
                  ✕ Remove W-2
                </button>
              ` : ''}
            </div>
          </div>

          <div class="w2-grid">
            <!-- Box a: SSN -->
            <div class="w2-box priority-must">
              <div class="w2-box-header">
                <span class="w2-box-number">a</span>
                <span class="w2-box-label">Employee's social security number</span>
              </div>
              <input type="text" class="w2-input-text" value="***-**-1234" readonly>
            </div>

            <!-- Box 1: Wages, tips, other compensation (KEY INPUT) -->
            <div class="w2-box highlight-wages priority-must" id="w2-${w2.id}-box1-container">
              <div class="w2-box-header">
                <div>
                  <span class="w2-box-number">1</span>
                  <span class="w2-box-label">Wages, tips, other comp.</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-box1`)}
                  ${renderRatingPill('w2-box1')}
                </div>
              </div>
              <div class="w2-input-wrapper">
                <span class="currency-symbol">$</span>
                <input type="number" step="any" class="w2-input" id="w2-${w2.id}-box1" value="${w2.box1}" placeholder="0">
              </div>
              ${renderFieldExplanationDrawer('w2-box1', `drawer-explain-w2-${w2.id}-box1`)}
            </div>

            <!-- Box 2: Federal income tax withheld (KEY INPUT) -->
            <div class="w2-box highlight-withholding priority-must priority-saver" id="w2-${w2.id}-box2-container">
              <div class="w2-box-header">
                <div>
                  <span class="w2-box-number">2</span>
                  <span class="w2-box-label">Federal tax withheld</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-box2`)}
                  ${renderRatingPill('w2-box2')}
                </div>
              </div>
              <div class="w2-input-wrapper">
                <span class="currency-symbol">$</span>
                <input type="number" step="any" class="w2-input" id="w2-${w2.id}-box2" value="${w2.box2}" placeholder="0">
              </div>
              ${renderFieldExplanationDrawer('w2-box2', `drawer-explain-w2-${w2.id}-box2`)}
            </div>

            <!-- Box b: EIN -->
            <div class="w2-box priority-must">
              <div class="w2-box-header">
                <div>
                  <span class="w2-box-number">b</span>
                  <span class="w2-box-label">Employer identification number</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-ein`)}
                  ${renderRatingPill('w2-ein')}
                </div>
              </div>
              <input type="text" class="w2-input-text" value="${w2.ein}" data-w2-field="ein" data-w2-id="${w2.id}">
              ${renderFieldExplanationDrawer('w2-ein', `drawer-explain-w2-${w2.id}-ein`)}
            </div>

            <!-- Box 3: Social Security wages -->
            <div class="w2-box highlight-ss priority-skip" id="w2-${w2.id}-box3-container">
              <div class="w2-box-header">
                <div>
                  <span class="w2-box-number">3</span>
                  <span class="w2-box-label">Social security wages</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-box3`)}
                  ${renderRatingPill('w2-box3')}
                </div>
              </div>
              <div class="w2-input-wrapper">
                <span class="currency-symbol">$</span>
                <input type="number" step="any" class="w2-input" id="w2-${w2.id}-box3" value="${w2.box3}" placeholder="0">
              </div>
              ${renderFieldExplanationDrawer('w2-box3', `drawer-explain-w2-${w2.id}-box3`)}
            </div>

            <!-- Box 4: Social Security tax withheld -->
            <div class="w2-box highlight-ss priority-skip" id="w2-${w2.id}-box4-container">
              <div class="w2-box-header">
                <div>
                  <span class="w2-box-number">4</span>
                  <span class="w2-box-label">SS tax withheld</span>
                </div>
                ${renderRatingPill('w2-box3')}
              </div>
              <div class="w2-input-wrapper">
                <span class="currency-symbol">$</span>
                <input type="number" step="any" class="w2-input" id="w2-${w2.id}-box4" value="${w2.box4}" placeholder="0">
              </div>
            </div>

            <!-- Box c: Employer's name, address -->
            <div class="w2-box priority-must">
              <div class="w2-box-header">
                <span class="w2-box-number">c</span>
                <span class="w2-box-label">Employer's name, address, and ZIP</span>
              </div>
              <input type="text" class="w2-input-text" value="${w2.employer}" data-w2-field="employer" data-w2-id="${w2.id}">
            </div>

            <!-- Box 5: Medicare wages -->
            <div class="w2-box highlight-medicare priority-skip" id="w2-${w2.id}-box5-container">
              <div class="w2-box-header">
                <div>
                  <span class="w2-box-number">5</span>
                  <span class="w2-box-label">Medicare wages</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-box5`)}
                  ${renderRatingPill('w2-box5')}
                </div>
              </div>
              <div class="w2-input-wrapper">
                <span class="currency-symbol">$</span>
                <input type="number" step="any" class="w2-input" id="w2-${w2.id}-box5" value="${w2.box5}" placeholder="0">
              </div>
              ${renderFieldExplanationDrawer('w2-box5', `drawer-explain-w2-${w2.id}-box5`)}
            </div>

            <!-- Box 6: Medicare tax withheld -->
            <div class="w2-box highlight-medicare priority-skip" id="w2-${w2.id}-box6-container">
              <div class="w2-box-header">
                <div>
                  <span class="w2-box-number">6</span>
                  <span class="w2-box-label">Medicare tax withheld</span>
                </div>
                ${renderRatingPill('w2-box5')}
              </div>
              <div class="w2-input-wrapper">
                <span class="currency-symbol">$</span>
                <input type="number" step="any" class="w2-input" id="w2-${w2.id}-box6" value="${w2.box6}" placeholder="0">
              </div>
            </div>

            <!-- Box 12: Deferred Compensation / Benefits -->
            <div class="w2-box priority-verify" id="w2-${w2.id}-box12-container">
              <div class="w2-box-header">
                <div>
                  <span class="w2-box-number">12</span>
                  <span class="w2-box-label">Codes (D, W, DD, etc.)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.35rem;">
                  ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-box12`)}
                  ${renderRatingPill('w2-box12')}
                </div>
              </div>
              <div style="display: flex; gap: 0.35rem;">
                <input type="text" class="w2-input-text" style="width: 55px; text-transform: uppercase; font-weight: 700; text-align: center;" value="${w2.box12Code || ''}" placeholder="Code" data-w2-id="${w2.id}" data-w2-field="box12Code">
                <div class="w2-input-wrapper" style="flex: 1;">
                  <span class="currency-symbol">$</span>
                  <input type="number" step="any" class="w2-input" id="w2-${w2.id}-box12-amt" value="${w2.box12Amount || ''}" placeholder="0" data-w2-id="${w2.id}" data-w2-field="box12Amount">
                </div>
              </div>
              ${renderFieldExplanationDrawer('w2-box12', `drawer-explain-w2-${w2.id}-box12`)}
            </div>

            <!-- Boxes 15-20: State and Local Taxes Section -->
            <div class="w2-state-container">
              <div style="background: #e2e8f0; padding: 0.35rem 0.75rem; font-size: 0.75rem; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; display: flex; justify-content: space-between; align-items: center;">
                <span>Boxes 15–20: State & Local Income Tax Reporting</span>
                <button type="button" class="btn btn-sm" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;" data-add-state="${w2.id}">
                  + Add State Line to W-2 #${index + 1}
                </button>
              </div>
              ${stateRowsHtml}
            </div>
          </div>

          <div class="w2-footer-note">
            <span>Copy B — To Be Filed With Employee's FEDERAL Tax Return</span>
            <span>Department of the Treasury — Internal Revenue Service</span>
          </div>
        </div>
      `;
            container.appendChild(card);
        });
        this.bindW2Events();
    }
    bindW2Events() {
        this.state.w2s.forEach(w2 => {
            // Employer name & EIN
            const empInput = document.querySelector(`[data-w2-field="employer"][data-w2-id="${w2.id}"]`);
            if (empInput) {
                empInput.addEventListener('input', (e) => {
                    w2.employer = e.target.value;
                });
            }
            const einInput = document.querySelector(`[data-w2-field="ein"][data-w2-id="${w2.id}"]`);
            if (einInput) {
                einInput.addEventListener('input', (e) => {
                    w2.ein = e.target.value;
                });
            }
            // Federal Box 1 - 6
            const bindW2Field = (boxNum, propName, autoFillFICA = false) => {
                const inputId = `w2-${w2.id}-box${boxNum}`;
                const inputEl = document.getElementById(inputId);
                if (!inputEl)
                    return;
                inputEl.addEventListener('input', (e) => {
                    const val = Number(e.target.value) || 0;
                    w2[propName] = val;
                    if (autoFillFICA && (w2.box3 === 0 || w2.box3 === w2.box1)) {
                        w2.box3 = val;
                        w2.box4 = Math.round(val * 0.062 * 100) / 100;
                        w2.box5 = val;
                        w2.box6 = Math.round(val * 0.0145 * 100) / 100;
                        const b3 = document.getElementById(`w2-${w2.id}-box3`);
                        const b4 = document.getElementById(`w2-${w2.id}-box4`);
                        const b5 = document.getElementById(`w2-${w2.id}-box5`);
                        const b6 = document.getElementById(`w2-${w2.id}-box6`);
                        if (b3)
                            b3.value = String(w2.box3);
                        if (b4)
                            b4.value = String(w2.box4);
                        if (b5)
                            b5.value = String(w2.box5);
                        if (b6)
                            b6.value = String(w2.box6);
                        // Also default state wages on first state line if matching
                        if (w2.states && w2.states.length === 1 && (w2.states[0].stateWages === 0 || w2.states[0].stateWages === val)) {
                            w2.states[0].stateWages = val;
                            const sw = document.getElementById(`w2-${w2.id}-state-${w2.states[0].id}-box16`);
                            if (sw)
                                sw.value = String(val);
                        }
                    }
                    this.recalculateAndRender();
                });
                inputEl.addEventListener('focus', () => this.arrowEngine?.setActiveSource(inputId));
                inputEl.addEventListener('blur', () => this.arrowEngine?.clearActive());
                inputEl.addEventListener('mouseenter', () => this.arrowEngine?.setActiveSource(inputId));
                inputEl.addEventListener('mouseleave', () => this.arrowEngine?.clearActive());
            };
            bindW2Field(1, 'box1', true);
            bindW2Field(2, 'box2');
            bindW2Field(3, 'box3');
            bindW2Field(4, 'box4');
            bindW2Field(5, 'box5');
            bindW2Field(6, 'box6');
            // State Boxes 15-20 fields
            w2.states.forEach(st => {
                const rowSelector = `[data-w2-id="${w2.id}"][data-state-id="${st.id}"]`;
                // State select dropdown
                const stateSelect = document.querySelector(`select${rowSelector}[data-state-field="state"]`);
                if (stateSelect) {
                    stateSelect.addEventListener('change', (e) => {
                        st.state = e.target.value;
                        const stateObj = US_STATES.find(s => s.code === st.state);
                        if (stateObj?.noIncomeTax) {
                            st.stateTaxWithheld = 0;
                            const taxInp = document.getElementById(`w2-${w2.id}-state-${st.id}-box17`);
                            if (taxInp)
                                taxInp.value = '0';
                        }
                        this.recalculateAndRender();
                    });
                }
                // State ID
                const stateIdInp = document.querySelector(`input${rowSelector}[data-state-field="stateId"]`);
                if (stateIdInp) {
                    stateIdInp.addEventListener('input', (e) => {
                        st.stateId = e.target.value;
                    });
                }
                // State Wages (Box 16)
                const wagesInp = document.getElementById(`w2-${w2.id}-state-${st.id}-box16`);
                if (wagesInp) {
                    wagesInp.addEventListener('input', (e) => {
                        st.stateWages = Number(e.target.value) || 0;
                        this.recalculateAndRender();
                    });
                    wagesInp.addEventListener('focus', () => this.arrowEngine?.setActiveSource(`w2-${w2.id}-state-${st.id}-box16`));
                    wagesInp.addEventListener('blur', () => this.arrowEngine?.clearActive());
                }
                // State Tax Withheld (Box 17) - Key Arrow Source!
                const taxInp = document.getElementById(`w2-${w2.id}-state-${st.id}-box17`);
                if (taxInp) {
                    taxInp.addEventListener('input', (e) => {
                        st.stateTaxWithheld = Number(e.target.value) || 0;
                        this.recalculateAndRender();
                    });
                    taxInp.addEventListener('focus', () => this.arrowEngine?.setActiveSource(`w2-${w2.id}-state-${st.id}-box17`));
                    taxInp.addEventListener('blur', () => this.arrowEngine?.clearActive());
                    taxInp.addEventListener('mouseenter', () => this.arrowEngine?.setActiveSource(`w2-${w2.id}-state-${st.id}-box17`));
                    taxInp.addEventListener('mouseleave', () => this.arrowEngine?.clearActive());
                }
                // Local wages
                const localWagesInp = document.querySelector(`input${rowSelector}[data-state-field="localWages"]`);
                if (localWagesInp) {
                    localWagesInp.addEventListener('input', (e) => {
                        st.localWages = Number(e.target.value) || 0;
                        this.recalculateAndRender();
                    });
                }
                // Local Tax
                const localTaxInp = document.querySelector(`input${rowSelector}[data-state-field="localTaxWithheld"]`);
                if (localTaxInp) {
                    localTaxInp.addEventListener('input', (e) => {
                        st.localTaxWithheld = Number(e.target.value) || 0;
                        this.recalculateAndRender();
                    });
                }
                // Locality Name
                const locNameInp = document.querySelector(`input${rowSelector}[data-state-field="localityName"]`);
                if (locNameInp) {
                    locNameInp.addEventListener('input', (e) => {
                        st.localityName = e.target.value;
                    });
                }
            });
        });
        // Remove W-2 buttons
        document.querySelectorAll('[data-remove-w2]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idToRemove = parseInt(e.target.dataset.removeW2 || '', 10);
                this.removeW2(idToRemove);
            });
        });
        // Add State to W-2 buttons
        document.querySelectorAll('[data-add-state]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const w2Id = parseInt(e.target.dataset.addState || '', 10);
                this.addStateToW2(w2Id);
            });
        });
        // Remove State from W-2 buttons
        document.querySelectorAll('[data-remove-state]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const [w2IdStr, stateIdStr] = (e.target.dataset.removeState || '').split(':');
                this.removeStateFromW2(parseInt(w2IdStr, 10), parseInt(stateIdStr, 10));
            });
        });
    }
    buildConnections(taxData) {
        const connections = [];
        // 1. W2 Box 1 (Wages) -> Total Wages Calc
        this.state.w2s.forEach(w => {
            connections.push({
                id: `conn-w2-${w.id}-box1-wages`,
                sourceId: `w2-${w.id}-box1`,
                targetId: 'calc-total-w2-wages',
                category: 'wages',
                label: `W-2 #${w.id + 1} Wages to Total Wages`
            });
        });
        // 2. Total Wages -> Gross Income
        connections.push({
            id: 'conn-wages-gross',
            sourceId: 'calc-total-w2-wages',
            targetId: 'calc-gross-income',
            category: 'wages',
            label: 'Total Wages to Gross Income'
        });
        // 3. Other Incomes -> Gross Income
        if (this.state.otherIncome.interest > 0) {
            connections.push({
                id: 'conn-interest-gross',
                sourceId: 'input-other-interest',
                targetId: 'calc-gross-income',
                category: 'wages',
                label: 'Interest to Gross Income'
            });
        }
        (this.state.otherIncome.sources || []).forEach(src => {
            if (src.amount > 0) {
                connections.push({
                    id: `conn-income-source-${src.id}-gross`,
                    sourceId: `input-income-source-${src.id}`,
                    targetId: 'calc-gross-income',
                    category: 'wages',
                    label: `${src.type} (${src.payer}) to Gross Income`
                });
            }
        });
        // 3b. Capital Gains -> Capital Gains Card & Gross Income
        const cap = this.state.otherIncome.capitalGains;
        if (cap && (cap.shortTerm !== 0 || cap.longTerm !== 0)) {
            connections.push({
                id: 'conn-capital-gains-st',
                sourceId: 'input-capital-gains-st',
                targetId: 'calc-capital-gains',
                category: 'capital',
                label: 'Short-Term Capital Gains'
            });
            connections.push({
                id: 'conn-capital-gains-lt',
                sourceId: 'input-capital-gains-lt',
                targetId: 'calc-capital-gains',
                category: 'capital',
                label: 'Long-Term Capital Gains'
            });
            connections.push({
                id: 'conn-capital-gains-gross',
                sourceId: 'calc-capital-gains',
                targetId: 'calc-gross-income',
                category: 'capital',
                label: 'Allowable Capital Gains/Loss'
            });
        }
        // 3c. Schedule C Freelance Expenses -> Gross Income
        const schedExp = this.state.otherIncome.scheduleCExpenses || 0;
        if (schedExp > 0) {
            connections.push({
                id: 'conn-1099-expenses-gross',
                sourceId: 'input-1099-nec-expenses',
                targetId: 'calc-gross-income',
                category: 'adjustments',
                label: 'Schedule C Expenses reduce Business Profit'
            });
        }
        // 4. Adjustments -> Total Adjustments
        connections.push({
            id: 'conn-adj-student-loan',
            sourceId: 'input-adj-student-loan',
            targetId: 'calc-total-adjustments',
            category: 'adjustments',
            label: 'Student Loan to Adjustments'
        });
        if (this.state.adjustments.ira > 0) {
            connections.push({
                id: 'conn-adj-ira',
                sourceId: 'input-adj-ira',
                targetId: 'calc-total-adjustments',
                category: 'adjustments',
                label: 'IRA Deduction to Adjustments'
            });
        }
        if (this.state.adjustments.hsa > 0) {
            connections.push({
                id: 'conn-adj-hsa',
                sourceId: 'input-adj-hsa',
                targetId: 'calc-total-adjustments',
                category: 'adjustments',
                label: 'HSA Form 8889 to Adjustments'
            });
        }
        // 5. Gross Income & Adjustments -> AGI
        connections.push({
            id: 'conn-gross-agi',
            sourceId: 'calc-gross-income',
            targetId: 'calc-agi',
            category: 'wages',
            label: 'Gross to AGI'
        });
        connections.push({
            id: 'conn-adj-agi',
            sourceId: 'calc-total-adjustments',
            targetId: 'calc-agi',
            category: 'adjustments',
            label: 'Adjustments to AGI'
        });
        // 5b. Schedule A Itemized Deductions Connections
        const itm = this.state.itemizedDeductions;
        if (itm && itm.medicalExpenses > 0) {
            connections.push({
                id: 'conn-itemized-medical',
                sourceId: 'input-itemized-medical',
                targetId: 'calc-itemized-deductions',
                category: 'itemized',
                label: 'Medical Expenses (>7.5% AGI)'
            });
        }
        if (itm && itm.realEstateTax > 0) {
            connections.push({
                id: 'conn-itemized-salt',
                sourceId: 'input-itemized-salt',
                targetId: 'calc-itemized-deductions',
                category: 'itemized',
                label: 'Real Estate Tax (SALT)'
            });
        }
        if (itm && itm.mortgageInterest > 0) {
            connections.push({
                id: 'conn-itemized-mortgage',
                sourceId: 'input-itemized-mortgage',
                targetId: 'calc-itemized-deductions',
                category: 'itemized',
                label: 'Mortgage Interest'
            });
        }
        if (itm && itm.charity > 0) {
            connections.push({
                id: 'conn-itemized-charity',
                sourceId: 'input-itemized-charity',
                targetId: 'calc-itemized-deductions',
                category: 'itemized',
                label: 'Charitable Donations'
            });
        }
        // Schedule A Itemized Card -> Deduction Card
        connections.push({
            id: 'conn-itemized-deduction-choice',
            sourceId: 'calc-itemized-deductions',
            targetId: 'calc-standard-deduction',
            category: 'itemized',
            label: 'Optimal Deduction to Return'
        });
        // 6. Filing Status -> Standard Deduction
        connections.push({
            id: 'conn-status-deduction',
            sourceId: 'select-filing-status',
            targetId: 'calc-standard-deduction',
            category: 'status',
            label: 'Status sets Standard Deduction'
        });
        // 7. AGI & Deduction -> Taxable Income
        connections.push({
            id: 'conn-agi-taxable',
            sourceId: 'calc-agi',
            targetId: 'calc-taxable-income',
            category: 'wages',
            label: 'AGI to Taxable Income'
        });
        connections.push({
            id: 'conn-deduction-taxable',
            sourceId: 'calc-standard-deduction',
            targetId: 'calc-taxable-income',
            category: 'status',
            label: 'Deduction to Taxable Income'
        });
        // 8. Taxable Income -> Tentative Tax (Brackets)
        connections.push({
            id: 'conn-taxable-tentative',
            sourceId: 'calc-taxable-income',
            targetId: 'calc-tax-before-credits',
            category: 'tax',
            label: 'Taxable Income to Tax Brackets'
        });
        // 9. Credits -> Total Tax Liability
        connections.push({
            id: 'conn-tentative-totaltax',
            sourceId: 'calc-tax-before-credits',
            targetId: 'calc-total-tax-liability',
            category: 'tax',
            label: 'Tentative Tax to Liability'
        });
        connections.push({
            id: 'conn-credits-totaltax',
            sourceId: 'calc-total-credits',
            targetId: 'calc-total-tax-liability',
            category: 'credits',
            label: 'Credits reduce Liability'
        });
        // 10. W2 Box 2 (Withholding) -> Total Withholding
        this.state.w2s.forEach(w => {
            connections.push({
                id: `conn-w2-${w.id}-box2-withheld`,
                sourceId: `w2-${w.id}-box2`,
                targetId: 'calc-total-withholding',
                category: 'withholding',
                label: `W-2 #${w.id + 1} Box 2 Withheld`
            });
        });
        // 11. Final comparison: Total Withholding & Total Tax -> Final Verdict
        connections.push({
            id: 'conn-withheld-verdict',
            sourceId: 'calc-total-withholding',
            targetId: 'calc-final-verdict',
            category: 'withholding',
            label: 'Payments to Verdict'
        });
        connections.push({
            id: 'conn-tax-verdict',
            sourceId: 'calc-total-tax-liability',
            targetId: 'calc-final-verdict',
            category: 'tax',
            label: 'Tax to Verdict'
        });
        // 12. FICA Connections
        this.state.w2s.forEach(w => {
            connections.push({
                id: `conn-w2-${w.id}-box4-fica`,
                sourceId: `w2-${w.id}-box4`,
                targetId: 'calc-fica-breakdown',
                category: 'ss',
                label: `W-2 #${w.id + 1} SS Tax to FICA`
            });
            connections.push({
                id: `conn-w2-${w.id}-box6-fica`,
                sourceId: `w2-${w.id}-box6`,
                targetId: 'calc-fica-breakdown',
                category: 'medicare',
                label: `W-2 #${w.id + 1} Medicare Tax to FICA`
            });
        });
        // 13. State Tax Withholding & Wage Connections
        this.state.w2s.forEach(w => {
            (w.states || []).forEach(st => {
                const stateKey = (st.state || '').toLowerCase();
                connections.push({
                    id: `conn-w2-${w.id}-state-${st.id}-wages`,
                    sourceId: `w2-${w.id}-state-${st.id}-box16`,
                    targetId: `calc-state-${stateKey}-card`,
                    category: 'state',
                    label: `${st.state} State Sourced Wages (Box 16)`
                });
                connections.push({
                    id: `conn-w2-${w.id}-state-${st.id}-tax`,
                    sourceId: `w2-${w.id}-state-${st.id}-box17`,
                    targetId: `calc-state-${stateKey}-card`,
                    category: 'state',
                    label: `${st.state} State Tax Withheld (Box 17)`
                });
            });
        });
        // 14. Cross-State Double Taxation Shield (OSTC) Connections
        (taxData?.stateReturnsCalc || []).forEach((sr) => {
            const homeStateKey = sr.state.toLowerCase();
            (sr.creditedStates || []).forEach((c) => {
                const sourceStateKey = c.fromState.toLowerCase();
                connections.push({
                    id: `conn-ostc-${sourceStateKey}-to-${homeStateKey}`,
                    sourceId: `calc-state-${sourceStateKey}-card`,
                    targetId: `calc-state-${homeStateKey}-card`,
                    category: 'state_credit',
                    label: `🛡️ ${c.fromState} Tax Credited to ${sr.state}`
                });
            });
        });
        // 15. Federal Verdict & State Outcomes -> Grand Total Unified Summary
        connections.push({
            id: 'conn-fed-to-unified',
            sourceId: 'calc-final-verdict',
            targetId: 'calc-unified-summary',
            category: 'withholding',
            label: 'Federal Outcome to Grand Total'
        });
        (taxData?.stateReturnsCalc || []).forEach((sr) => {
            const stateKey = sr.state.toLowerCase();
            connections.push({
                id: `conn-state-${stateKey}-to-unified`,
                sourceId: `calc-state-${stateKey}-card`,
                targetId: 'calc-unified-summary',
                category: 'state',
                label: `${sr.state} Return Outcome to Grand Total`
            });
        });
        return connections;
    }
    recalculateAndRender() {
        const taxData = calculateTaxes(this.state);
        const updateCard = (cardId, calcObj, formattedVal) => {
            const card = document.getElementById(cardId);
            if (!card)
                return;
            const genEl = card.querySelector('.formula-general');
            const plugEl = card.querySelector('.formula-plugged');
            const valEl = card.querySelector('.calc-output-value');
            if (genEl && calcObj.generalFormula)
                genEl.textContent = calcObj.generalFormula;
            if (plugEl && calcObj.pluggedFormula)
                plugEl.textContent = calcObj.pluggedFormula;
            if (valEl && formattedVal)
                valEl.textContent = formattedVal;
        };
        updateCard('calc-total-w2-wages', taxData.w2WagesCalc, formatCurrency(taxData.w2WagesCalc.result));
        updateCard('calc-gross-income', taxData.grossIncomeCalc, formatCurrency(taxData.grossIncomeCalc.result));
        updateCard('calc-capital-gains', taxData.capitalGainsCalc, formatCurrencyExact(taxData.capitalGainsCalc.result));
        updateCard('calc-total-adjustments', taxData.adjustmentsCalc, formatCurrency(taxData.adjustmentsCalc.result));
        updateCard('calc-agi', taxData.agiCalc, formatCurrency(taxData.agiCalc.result));
        updateCard('calc-itemized-deductions', taxData.itemizedCalc, formatCurrency(taxData.itemizedCalc.result));
        updateCard('calc-standard-deduction', taxData.deductionCalc, formatCurrency(taxData.deductionCalc.result));
        updateCard('calc-taxable-income', taxData.taxableIncomeCalc, formatCurrency(taxData.taxableIncomeCalc.result));
        updateCard('calc-tax-before-credits', taxData.taxBeforeCreditsCalc, formatCurrencyExact(taxData.taxBeforeCreditsCalc.result));
        this.renderTaxBrackets(taxData.taxBeforeCreditsCalc.brackets, taxData.taxableIncomeCalc.result);
        const optDedEl = document.getElementById('optimal-deduction-amount');
        if (optDedEl)
            optDedEl.textContent = formatCurrency(taxData.deductionCalc.result);
        const compBadge = document.getElementById('deduction-comparison-badge');
        if (compBadge) {
            const isItemizedChosen = taxData.itemizedCalc.chosenMethod === 'itemized';
            compBadge.className = `deduction-comparison-pill ${isItemizedChosen ? 'optimal-itemized' : 'optimal-standard'}`;
            const diff = Math.abs(taxData.itemizedCalc.totalItemizedDeductions - taxData.itemizedCalc.standardDeduction);
            if (isItemizedChosen) {
                compBadge.textContent = `🌟 Optimal Choice: Itemized (+$${formatCurrency(diff)} Extra Deduction!)`;
            }
            else {
                compBadge.textContent = `Optimal Choice: Standard Deduction ($${formatCurrency(taxData.itemizedCalc.standardDeduction)})`;
            }
        }
        updateCard('calc-total-credits', taxData.creditsCalc, formatCurrency(taxData.creditsCalc.result));
        updateCard('calc-total-tax-liability', taxData.totalTaxCalc, formatCurrencyExact(taxData.totalTaxCalc.result));
        updateCard('calc-total-withholding', taxData.withholdingCalc, formatCurrencyExact(taxData.withholdingCalc.result));
        this.renderVerdict(taxData);
        this.renderUnifiedSummary(taxData);
        updateCard('calc-fica-breakdown', taxData.ficaCalc, formatCurrencyExact(taxData.ficaCalc.totalFica));
        // Render State Tax Summary Card & Dynamic State Returns
        this.renderStateTaxSummary(taxData);
        this.renderStateReturns(taxData);
        this.render1040Mirror(taxData);
        this.updateHeaderStats(taxData);
        const connections = this.buildConnections(taxData);
        if (this.arrowEngine) {
            this.arrowEngine.setConnections(connections);
        }
        this.updateTableOfContents();
        this.bindRatingPillEvents();
        this.bindExplainEvents();
        this.saveDraft();
    }
    renderStateReturns(taxData) {
        const container = document.getElementById('container-state-returns');
        if (!container)
            return;
        container.innerHTML = '';
        const stateReturns = taxData.stateReturnsCalc || [];
        stateReturns.forEach(sr => {
            const card = document.createElement('div');
            card.className = 'state-return-card';
            card.id = `calc-state-${sr.state.toLowerCase()}-card`;
            const isRes = sr.residentStatus === 'resident';
            const statusBadge = isRes
                ? '<span class="state-status-badge badge-resident">🏠 Resident Return</span>'
                : '<span class="state-status-badge badge-nonresident">💼 Nonresident Return</span>';
            let extraBadge = '';
            if (sr.creditForOtherStates > 0) {
                extraBadge = `<span class="state-status-badge badge-shield" id="calc-state-${sr.state.toLowerCase()}-ostc" title="Credit for Taxes Paid to Other States">🛡️ Double-Tax Shield: -${formatCurrency(sr.creditForOtherStates)}</span>`;
            }
            else if (sr.reciprocityExemption) {
                extraBadge = `<span class="state-status-badge badge-reciprocal">🤝 Reciprocal Agreement Active</span>`;
            }
            else if (!sr.hasIncomeTax) {
                extraBadge = `<span class="state-status-badge badge-no-tax">🌴 0% Wage Tax State</span>`;
            }
            card.innerHTML = `
        <div class="calc-card-header">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
              <span class="step-indicator" style="color: #6d28d9; margin-bottom: 0;">State Return • ${sr.state}</span>
              ${statusBadge}
              ${extraBadge}
            </div>
            <h3 class="calc-card-title">${sr.stateName}: ${sr.formName}</h3>
          </div>
          <span class="irs-line-tag" style="background: #f5f3ff; color: #7c3aed; border-color: #ddd6fe;">${sr.formName}</span>
        </div>

        <div class="formula-box">
          <div class="formula-row">
            <span class="formula-badge general">General Formula</span>
            <span class="formula-math formula-general">${sr.generalFormula}</span>
          </div>
          <div class="formula-row">
            <span class="formula-badge plugged" style="background: #f5f3ff; color: #7c3aed; border-color: #ddd6fe;">With Your Numbers</span>
            <span class="formula-math plugged-highlight formula-plugged">${sr.pluggedFormula}</span>
          </div>
        </div>

        ${sr.creditedStates.length > 0 ? `
          <div style="background: #fdf4ff; border: 1px solid #f0abfc; border-radius: 8px; padding: 0.75rem 1rem; margin-top: 0.75rem; font-size: 0.82rem; color: #701a75;">
            <strong>🛡️ Other State Tax Credit (OSTC) Detail:</strong>
            ${sr.creditedStates.map(c => `
              <div>• Credited from <strong>${c.fromState}</strong>: Source tax paid was ${formatCurrencyExact(c.sourceTaxPaid)}, resident attributable tax is ${formatCurrencyExact(c.homeAttributableTax)} ➔ Credit allowed: <strong>${formatCurrencyExact(c.creditAllowed)}</strong></div>
            `).join('')}
          </div>
        ` : ''}

        ${sr.reciprocityNote ? `
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 0.75rem 1rem; margin-top: 0.75rem; font-size: 0.82rem; color: #065f46;">
            <strong>🤝 Reciprocity Note:</strong> ${sr.reciprocityNote}
          </div>
        ` : ''}

        <div class="state-outcome-banner ${sr.isRefund ? 'is-refund' : 'is-owed'}" id="calc-state-${sr.state.toLowerCase()}-outcome">
          <div>
            <div style="font-size: 0.85rem; opacity: 0.9;">
              ${sr.isRefund ? `Estimated ${sr.stateName} State Refund:` : `Estimated ${sr.stateName} State Tax Owed:`}
            </div>
            <div style="font-size: 0.75rem; opacity: 0.8;">
              Box 17 Withholding (${formatCurrencyExact(sr.stateWithholding)}) vs. Tax Liability (${formatCurrencyExact(sr.stateTaxLiability)})
            </div>
          </div>
          <div class="state-outcome-amount" id="calc-state-${sr.state.toLowerCase()}-liability">
            ${sr.isRefund ? `+${formatCurrencyExact(sr.netOutcome)}` : `-${formatCurrencyExact(sr.netOutcome)}`}
          </div>
        </div>
      `;
            container.appendChild(card);
        });
    }
    renderUnifiedSummary(taxData) {
        const card = document.getElementById('calc-unified-summary');
        if (!card)
            return;
        const banner = document.getElementById('unified-hero-banner');
        const amountEl = document.getElementById('unified-hero-amount');
        const subtitleEl = document.getElementById('unified-hero-subtitle');
        const pluggedEl = document.getElementById('unified-formula-plugged');
        const tbody = document.getElementById('unified-ledger-tbody');
        const u = taxData.unifiedSummaryCalc;
        if (!u)
            return;
        if (banner) {
            banner.className = `unified-hero-banner ${u.isGrandTotalRefund ? 'is-refund' : 'is-owed'}`;
        }
        if (amountEl) {
            amountEl.textContent = `${u.isGrandTotalRefund ? '+' : '-'}${formatCurrencyExact(u.result)}`;
        }
        if (subtitleEl) {
            subtitleEl.textContent = u.isGrandTotalRefund
                ? 'Total combined refund check amount coming back to you across the IRS and all states!'
                : 'Total combined balance due across the IRS and state tax revenue departments.';
        }
        if (pluggedEl) {
            pluggedEl.textContent = u.pluggedFormula;
        }
        if (tbody) {
            tbody.innerHTML = '';
            u.lines.forEach(line => {
                const tr = document.createElement('tr');
                const isRef = line.netOutcome >= 0;
                const outcomeColor = isRef ? 'val-refund' : 'val-owed';
                const outcomeFormatted = `${isRef ? '+' : '-'}${formatCurrencyExact(Math.abs(line.netOutcome))}`;
                tr.innerHTML = `
          <td><strong>${line.jurisdiction}</strong></td>
          <td><span class="irs-line-tag">${line.formName}</span></td>
          <td>${formatCurrencyExact(line.taxLiability)}</td>
          <td>${formatCurrencyExact(line.withholding)}</td>
          <td class="${outcomeColor}">${outcomeFormatted} ${isRef ? 'Refund' : 'Owed'}</td>
          <td>${line.badge ? `<span class="state-status-badge badge-shield">${line.badge}</span>` : '<span style="color: #94a3b8;">Standard Filing</span>'}</td>
        `;
                tbody.appendChild(tr);
            });
            // Total row
            const totalTr = document.createElement('tr');
            totalTr.className = 'total-row';
            const grandRef = u.isGrandTotalRefund;
            totalTr.innerHTML = `
        <td colspan="4" style="text-align: right; text-transform: uppercase; letter-spacing: 0.05em;">Grand Total Net Pocket Outcome:</td>
        <td class="${grandRef ? 'val-refund' : 'val-owed'}">${grandRef ? '+' : '-'}${formatCurrencyExact(u.result)} ${grandRef ? 'NET REFUND' : 'NET OWED'}</td>
        <td><strong>${grandRef ? '🎉 In Your Pocket' : '⚠️ Total Due'}</strong></td>
      `;
            tbody.appendChild(totalTr);
        }
    }
    renderStateTaxSummary(taxData) {
        const card = document.getElementById('calc-state-tax-summary');
        if (!card)
            return;
        const genEl = card.querySelector('.formula-general');
        const plugEl = card.querySelector('.formula-plugged');
        const valEl = card.querySelector('.calc-output-value');
        if (genEl)
            genEl.textContent = taxData.stateTaxCalc.generalFormula;
        if (plugEl)
            plugEl.textContent = taxData.stateTaxCalc.pluggedFormula;
        if (valEl)
            valEl.textContent = formatCurrencyExact(taxData.stateTaxCalc.totalStateWithheld);
        const tbody = document.getElementById('state-summary-tbody');
        if (tbody) {
            tbody.innerHTML = '';
            if (taxData.stateTaxCalc.byState.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No state tax lines entered.</td></tr>`;
            }
            else {
                taxData.stateTaxCalc.byState.forEach(st => {
                    const stateObj = US_STATES.find(s => s.code === st.state);
                    const stateName = stateObj ? `${stateObj.code} (${stateObj.name})` : st.state;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
            <td><strong>${stateName}</strong></td>
            <td>${formatCurrency(st.stateWages)}</td>
            <td style="color: #7c3aed; font-weight: 700;">${formatCurrencyExact(st.stateTaxWithheld)}</td>
            <td>${formatCurrencyExact(st.localTaxWithheld)}</td>
          `;
                    tbody.appendChild(tr);
                });
            }
        }
    }
    renderTaxBrackets(brackets, taxableIncome) {
        const tbody = document.getElementById('tax-brackets-tbody');
        const barContainer = document.getElementById('bracket-progress-bar');
        if (!tbody)
            return;
        tbody.innerHTML = '';
        if (barContainer)
            barContainer.innerHTML = '';
        brackets.forEach(b => {
            const isTaxed = b.taxableAmount > 0;
            const tr = document.createElement('tr');
            if (isTaxed)
                tr.className = 'active-bracket';
            tr.innerHTML = `
        <td><strong>${b.ratePercent}</strong></td>
        <td>${b.range}</td>
        <td>${formatCurrency(b.taxableAmount)}</td>
        <td>${b.formula}</td>
      `;
            tbody.appendChild(tr);
            if (barContainer && taxableIncome > 0 && isTaxed) {
                const pct = Math.max(2, (b.taxableAmount / taxableIncome) * 100);
                const seg = document.createElement('div');
                seg.className = 'bracket-segment';
                seg.style.width = `${pct}%`;
                seg.title = `${b.ratePercent} bracket: ${formatCurrency(b.taxableAmount)}`;
                seg.textContent = `${b.ratePercent}`;
                barContainer.appendChild(seg);
            }
        });
    }
    renderVerdict(taxData) {
        const verdictCard = document.getElementById('calc-final-verdict');
        if (!verdictCard)
            return;
        const isRefund = taxData.finalResultCalc.isRefund;
        const amount = taxData.finalResultCalc.result;
        verdictCard.classList.remove('is-refund', 'is-owed');
        verdictCard.classList.add(isRefund ? 'is-refund' : 'is-owed');
        const badgeEl = verdictCard.querySelector('.verdict-header');
        const amountEl = verdictCard.querySelector('.verdict-amount');
        const subEl = verdictCard.querySelector('.verdict-subtitle');
        const genEl = verdictCard.querySelector('.formula-general');
        const plugEl = verdictCard.querySelector('.formula-plugged');
        if (badgeEl)
            badgeEl.textContent = isRefund ? '🎉 Your Estimated Federal Tax Refund' : '⚠️ Federal Tax Balance You Owe';
        if (amountEl)
            amountEl.textContent = formatCurrencyExact(amount);
        if (subEl) {
            if (isRefund) {
                subEl.textContent = `You overpaid throughout the year through paychecks ($${formatCurrencyExact(taxData.withholdingCalc.result)} withheld vs $${formatCurrencyExact(taxData.totalTaxCalc.result)} owed). The IRS will refund the difference!`;
            }
            else {
                subEl.textContent = `Your total tax liability ($${formatCurrencyExact(taxData.totalTaxCalc.result)}) exceeds your paycheck withholding ($${formatCurrencyExact(taxData.withholdingCalc.result)}). You must pay the remaining balance to the IRS.`;
            }
        }
        if (genEl)
            genEl.textContent = taxData.finalResultCalc.generalFormula;
        if (plugEl)
            plugEl.textContent = taxData.finalResultCalc.pluggedFormula;
        const withheldBar = document.getElementById('comp-bar-withheld');
        const taxBar = document.getElementById('comp-bar-tax');
        const maxVal = Math.max(taxData.withholdingCalc.result, taxData.totalTaxCalc.result, 1);
        if (withheldBar) {
            const wPct = Math.min(100, (taxData.withholdingCalc.result / maxVal) * 100);
            withheldBar.style.width = `${wPct}%`;
            const valLabel = document.getElementById('comp-val-withheld');
            if (valLabel)
                valLabel.textContent = formatCurrencyExact(taxData.withholdingCalc.result);
        }
        if (taxBar) {
            const tPct = Math.min(100, (taxData.totalTaxCalc.result / maxVal) * 100);
            taxBar.style.width = `${tPct}%`;
            const valLabel = document.getElementById('comp-val-tax');
            if (valLabel)
                valLabel.textContent = formatCurrencyExact(taxData.totalTaxCalc.result);
        }
    }
    updateHeaderStats(taxData) {
        const setStat = (id, text) => {
            const el = document.getElementById(id);
            if (el)
                el.textContent = text;
        };
        setStat('header-gross-income', formatCurrency(taxData.grossIncomeCalc.result));
        setStat('header-taxable-income', formatCurrency(taxData.taxableIncomeCalc.result));
        setStat('header-total-withholding', formatCurrency(taxData.withholdingCalc.result));
        const verdictPill = document.getElementById('header-verdict-pill');
        const verdictVal = document.getElementById('header-verdict-val');
        const verdictLbl = document.getElementById('header-verdict-lbl');
        if (verdictPill && verdictVal && verdictLbl) {
            const isRefund = taxData.finalResultCalc.isRefund;
            verdictPill.classList.remove('is-refund', 'is-owed');
            verdictPill.classList.add(isRefund ? 'is-refund' : 'is-owed');
            verdictLbl.textContent = isRefund ? 'EST. REFUND' : 'TAX OWED';
            verdictVal.textContent = formatCurrencyExact(taxData.finalResultCalc.result);
        }
    }
    render1040Mirror(taxData) {
        const setLine = (id, val) => {
            const el = document.getElementById(id);
            if (el)
                el.textContent = formatCurrencyExact(val);
        };
        setLine('line-1040-1z', taxData.w2WagesCalc.result);
        setLine('line-1040-9', taxData.grossIncomeCalc.result);
        setLine('line-1040-10', taxData.adjustmentsCalc.result);
        setLine('line-1040-11', taxData.agiCalc.result);
        setLine('line-1040-12', taxData.deductionCalc.result);
        setLine('line-1040-15', taxData.taxableIncomeCalc.result);
        setLine('line-1040-16', taxData.taxBeforeCreditsCalc.result);
        setLine('line-1040-19', taxData.creditsCalc.result);
        setLine('line-1040-24', taxData.totalTaxCalc.result);
        setLine('line-1040-25d', taxData.withholdingCalc.result);
        const refundRow = document.getElementById('row-1040-refund');
        const owedRow = document.getElementById('row-1040-owed');
        if (refundRow && owedRow) {
            if (taxData.finalResultCalc.isRefund) {
                refundRow.style.display = 'table-row';
                owedRow.style.display = 'none';
                setLine('line-1040-34', taxData.finalResultCalc.result);
            }
            else {
                refundRow.style.display = 'none';
                owedRow.style.display = 'table-row';
                setLine('line-1040-37', taxData.finalResultCalc.result);
            }
        }
    }
    updateTableOfContents() {
        const listContainer = document.getElementById('toc-w2-list');
        const counterEl = document.getElementById('toc-w2-count');
        if (listContainer) {
            listContainer.innerHTML = '';
            if (counterEl) {
                counterEl.textContent = `${this.state.w2s.length} ${this.state.w2s.length === 1 ? 'W-2' : 'W-2s'}`;
            }
            this.state.w2s.forEach((w2, index) => {
                const link = document.createElement('a');
                link.className = 'toc-link is-w2';
                link.href = `#w2-card-${w2.id}`;
                link.dataset.tocTarget = `w2-card-${w2.id}`;
                const statesLabel = (w2.states && w2.states.length > 0)
                    ? w2.states.map(s => s.state).join('/')
                    : 'Federal';
                const empName = w2.employer ? (w2.employer.length > 13 ? w2.employer.substring(0, 13) + '…' : w2.employer) : `W-2 #${index + 1}`;
                link.innerHTML = `
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            W-2 #${index + 1}: ${empName}
          </span>
          <span class="toc-badge">${statesLabel}</span>
        `;
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = document.getElementById(`w2-card-${w2.id}`);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        target.classList.add('flash-highlight');
                        setTimeout(() => target.classList.remove('flash-highlight'), 1200);
                    }
                });
                listContainer.appendChild(link);
            });
        }
        // Dynamic Income Sources in Table of Contents
        const incomeListContainer = document.getElementById('toc-income-list');
        const incomeCounterEl = document.getElementById('toc-income-count');
        if (incomeListContainer) {
            incomeListContainer.innerHTML = '';
            const sources = this.state.otherIncome.sources || [];
            const totalIncomeCount = 1 + sources.length; // 1099-INT + dynamic sources
            if (incomeCounterEl) {
                incomeCounterEl.textContent = `${totalIncomeCount} ${totalIncomeCount === 1 ? 'Source' : 'Sources'}`;
            }
            // Default Taxable Interest
            const intLink = document.createElement('a');
            intLink.className = 'toc-link is-income';
            intLink.href = '#card-other-interest';
            intLink.dataset.tocTarget = 'card-other-interest';
            intLink.innerHTML = `
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          Taxable Interest
        </span>
        <span class="toc-badge">1099-INT</span>
      `;
            intLink.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.getElementById('card-other-interest');
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.classList.add('flash-highlight');
                    setTimeout(() => target.classList.remove('flash-highlight'), 1200);
                }
            });
            incomeListContainer.appendChild(intLink);
            // Extra Income Sources
            sources.forEach((src, idx) => {
                const link = document.createElement('a');
                link.className = 'toc-link is-income';
                link.href = `#income-source-card-${src.id}`;
                link.dataset.tocTarget = `income-source-card-${src.id}`;
                const name = src.payer ? (src.payer.length > 13 ? src.payer.substring(0, 13) + '…' : src.payer) : `Income #${idx + 1}`;
                link.innerHTML = `
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${name}
          </span>
          <span class="toc-badge">${src.type}</span>
        `;
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = document.getElementById(`income-source-card-${src.id}`);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        target.classList.add('flash-highlight');
                        setTimeout(() => target.classList.remove('flash-highlight'), 1200);
                    }
                });
                incomeListContainer.appendChild(link);
            });
        }
        this.bindTocScrollspy();
    }
    bindTocScrollspy() {
        document.querySelectorAll('.toc-link:not(.is-w2):not(.is-income)').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                const targetId = link.dataset.tocTarget;
                if (targetId) {
                    const target = document.getElementById(targetId);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        target.classList.add('flash-highlight');
                        setTimeout(() => target.classList.remove('flash-highlight'), 1200);
                    }
                }
            };
        });
        if (!this.scrollspyAttached) {
            this.scrollspyAttached = true;
            window.addEventListener('scroll', () => {
                const links = document.querySelectorAll('.toc-link');
                const scrollPos = window.scrollY + 200;
                let currentActive = null;
                for (const link of Array.from(links)) {
                    const targetId = link.dataset.tocTarget;
                    if (targetId) {
                        const el = document.getElementById(targetId);
                        if (el) {
                            const top = el.offsetTop;
                            const height = el.offsetHeight;
                            if (scrollPos >= top && scrollPos < top + height + 70) {
                                currentActive = link;
                            }
                        }
                    }
                }
                if (currentActive) {
                    links.forEach(l => l.classList.remove('active'));
                    currentActive.classList.add('active');
                }
            }, { passive: true });
        }
    }
}
window.addEventListener('DOMContentLoaded', () => {
    window.taxApp = new TaxApp();
});
