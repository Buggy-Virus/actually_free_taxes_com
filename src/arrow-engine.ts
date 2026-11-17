/**
 * Actually Free Taxes - Dynamic Arrow & Data Flow Engine (TypeScript)
 * Draws animated, color-coded SVG Bezier arrows connecting input fields to downstream calculations.
 */

import { ConnectionDef, ArrowColorCategory, ArrowDisplayMode } from './types.js';

export interface ArrowEngineOptions {
  showAll?: boolean;
  displayMode?: ArrowDisplayMode;
}

export class ArrowEngine {
  private svg: SVGSVGElement;
  private highlightSvg: SVGSVGElement;
  private connections: ConnectionDef[] = [];
  private activeSourceId: string | null = null;
  private activeTargetId: string | null = null;
  private selectedNodeId: string | null = null;
  private displayMode: ArrowDisplayMode = 'always';
  private animationFrame: number | null = null;
  private resizeObserver?: ResizeObserver;

  public readonly colors: Record<ArrowColorCategory, string> = {
    wages: '#10b981',       // Emerald
    withholding: '#0284c7', // Sky Blue
    ss: '#f59e0b',          // Amber
    medicare: '#ec4899',    // Pink
    state: '#8b5cf6',       // Violet for State Tax
    state_credit: '#c026d3',// Fuchsia/Magenta for Cross-State Tax Credit (OSTC)
    adjustments: '#6366f1', // Indigo
    status: '#4f46e5',      // Deep Indigo
    tax: '#f97316',         // Orange
    credits: '#14b8a6',     // Teal
    refund: '#10b981',      // Green
    owed: '#ef4444',        // Red
    itemized: '#059669',    // Rich Green for Itemized Deductions
    capital: '#d97706',     // Warm Amber for Capital Gains/Losses
    default: '#3b82f6'      // Blue
  };

  constructor(svgElement: SVGSVGElement, options: ArrowEngineOptions = {}) {
    this.svg = svgElement;
    if (options.displayMode) {
      this.displayMode = options.displayMode;
    } else if (options.showAll === false) {
      this.displayMode = 'selection';
    } else {
      this.displayMode = 'always';
    }

    // Create or reuse a high z-index highlight SVG layer so highlighted arrows sit on top of everything
    let hl = document.getElementById('arrow-canvas-highlight') as SVGSVGElement | null;
    if (!hl) {
      hl = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
      hl.id = 'arrow-canvas-highlight';
      this.svg.parentNode?.insertBefore(hl, this.svg.nextSibling);
    }
    this.highlightSvg = hl;

    this.initMarkers(this.svg, '');
    this.initMarkers(this.highlightSvg, 'hl-');
    this.bindEvents();
  }

  private initMarkers(targetSvg: SVGSVGElement, prefix: string): void {
    let defs = targetSvg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      targetSvg.appendChild(defs);
    }

    Object.entries(this.colors).forEach(([name, color]) => {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', `${prefix}arrowhead-${name}`);
      marker.setAttribute('viewBox', '0 0 12 12');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '6');
      marker.setAttribute('markerWidth', '8');
      marker.setAttribute('markerHeight', '8');
      marker.setAttribute('orient', 'auto-start-reverse');

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M 1 2 L 10 6 L 1 10 Z');
      path.setAttribute('fill', color);
      marker.appendChild(path);
      defs!.appendChild(marker);
    });
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.scheduleRedraw());
    window.addEventListener('scroll', () => this.scheduleRedraw(), { passive: true });

    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.scheduleRedraw());
      this.resizeObserver.observe(document.body);
    }
  }

  public setConnections(connectionList: ConnectionDef[]): void {
    this.connections = connectionList;
    this.scheduleRedraw();
  }

  public addConnection(conn: ConnectionDef): void {
    this.connections.push(conn);
    this.scheduleRedraw();
  }

  public clearConnections(): void {
    this.connections = [];
    this.scheduleRedraw();
  }

  public setActiveSource(sourceId: string | null): void {
    this.activeSourceId = sourceId;
    this.scheduleRedraw();
  }

  public setActiveTarget(targetId: string | null): void {
    this.activeTargetId = targetId;
    this.scheduleRedraw();
  }

  public setSelectedNode(nodeId: string | null): void {
    this.selectedNodeId = nodeId;
    this.scheduleRedraw();
  }

  public getSelectedNode(): string | null {
    return this.selectedNodeId;
  }

  public clearActive(): void {
    this.activeSourceId = null;
    this.activeTargetId = null;
    this.scheduleRedraw();
  }

  public setShowAll(val: boolean): void {
    this.displayMode = val ? 'always' : 'selection';
    this.scheduleRedraw();
  }

  public setDisplayMode(mode: ArrowDisplayMode): void {
    this.displayMode = mode;
    this.scheduleRedraw();
  }

  public scheduleRedraw(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.animationFrame = requestAnimationFrame(() => this.redraw());
  }

  private updateSvgDimensions(): void {
    const docWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth);
    const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight);
    [this.svg, this.highlightSvg].forEach(el => {
      el.setAttribute('width', String(docWidth));
      el.setAttribute('height', String(docHeight));
      el.style.width = `${docWidth}px`;
      el.style.height = `${docHeight}px`;
    });
  }

  private isConnectionHighlighted(conn: ConnectionDef): boolean {
    if (this.selectedNodeId && (conn.sourceId === this.selectedNodeId || conn.targetId === this.selectedNodeId)) {
      return true;
    }
    if (this.activeSourceId && (conn.sourceId === this.activeSourceId || conn.targetId === this.activeSourceId)) {
      return true;
    }
    if (this.activeTargetId && (conn.targetId === this.activeTargetId || conn.sourceId === this.activeTargetId)) {
      return true;
    }
    return false;
  }

  private redraw(): void {
    this.updateSvgDimensions();

    const defs = this.svg.querySelector('defs');
    this.svg.innerHTML = '';
    if (defs) this.svg.appendChild(defs);

    const hlDefs = this.highlightSvg.querySelector('defs');
    this.highlightSvg.innerHTML = '';
    if (hlDefs) this.highlightSvg.appendChild(hlDefs);

    if (this.displayMode === 'off') {
      this.updateHighlightStyles();
      return;
    }

    const docScrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const docScrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Find main content container bounds for gutters
    const mainEl = document.querySelector('.main-content') as HTMLElement | null;
    const mainRect = mainEl ? mainEl.getBoundingClientRect() : null;
    const docMainLeft = mainRect ? mainRect.left + docScrollX : 340;
    const docMainRight = mainRect ? mainRect.right + docScrollX : (window.innerWidth - 80);
    const docMainCenter = (docMainLeft + docMainRight) / 2;

    // Filter connections that should be displayed
    const visibleConnections = this.connections.filter(conn => {
      const sourceEl = document.getElementById(conn.sourceId);
      const targetEl = document.getElementById(conn.targetId);
      if (!sourceEl || !targetEl) return false;
      const sRect = sourceEl.getBoundingClientRect();
      const tRect = targetEl.getBoundingClientRect();
      if (sRect.width === 0 || tRect.width === 0) return false;

      if (this.displayMode === 'always') return true;
      return this.isConnectionHighlighted(conn);
    });

    interface PreparedConn {
      conn: ConnectionDef;
      sourceEl: HTMLElement;
      targetEl: HTMLElement;
      sourceRect: DOMRect;
      targetRect: DOMRect;
      side: 'left' | 'right';
      isHighlighted: boolean;
      colorCategory: ArrowColorCategory;
      strokeColor: string;
    }

    const preparedList: PreparedConn[] = [];

    visibleConnections.forEach(conn => {
      const sourceEl = document.getElementById(conn.sourceId)!;
      const targetEl = document.getElementById(conn.targetId)!;
      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      const isConnectedToActive = this.isConnectionHighlighted(conn);

      const colorCategory: ArrowColorCategory = conn.category || 'default';
      const strokeColor = this.colors[colorCategory] || this.colors.default;

      const sMidX = sourceRect.left + docScrollX + (sourceRect.width / 2);

      let side: 'left' | 'right' = 'left';
      if (conn.side) {
        side = conn.side;
      } else if (
        conn.category === 'withholding' ||
        conn.category === 'ss' ||
        conn.category === 'medicare' ||
        conn.id.includes('box2') ||
        conn.id.includes('box4') ||
        conn.id.includes('box6') ||
        conn.id.includes('box17') ||
        conn.id.includes('withheld') ||
        conn.id.includes('unified') ||
        conn.id.includes('verdict') ||
        conn.id.includes('tax-verdict') ||
        conn.id.includes('ostc')
      ) {
        side = 'right';
      } else if (sMidX >= docMainCenter) {
        side = 'right';
      } else {
        side = 'left';
      }

      preparedList.push({
        conn,
        sourceEl,
        targetEl,
        sourceRect,
        targetRect,
        side,
        isHighlighted: isConnectedToActive,
        colorCategory,
        strokeColor
      });
    });

    const leftConns = preparedList.filter(p => p.side === 'left');
    const rightConns = preparedList.filter(p => p.side === 'right');

    const baseLeftGutter = docMainLeft - 18;
    const baseRightGutter = docMainRight + 18;
    const laneSpacing = 11;

    const targetPortCount: Record<string, number> = {};
    const anyActive = Boolean(this.activeSourceId || this.activeTargetId || this.selectedNodeId);

    const renderArrow = (p: PreparedConn, laneIndex: number) => {
      const { conn, targetEl, sourceRect, targetRect, side, isHighlighted, colorCategory, strokeColor } = p;

      const targetKey = `${conn.targetId}-${side}`;
      const portIndex = targetPortCount[targetKey] || 0;
      targetPortCount[targetKey] = portIndex + 1;

      let sX: number;
      const sY = sourceRect.top + docScrollY + (sourceRect.height / 2);

      let tX: number;
      const tY = targetRect.top + docScrollY + Math.min(26 + (portIndex * 14), Math.max(15, targetRect.height - 12));

      let laneX: number;
      if (side === 'left') {
        sX = sourceRect.left + docScrollX - 2;
        tX = targetRect.left + docScrollX - 2;
        laneX = baseLeftGutter - (laneIndex * laneSpacing);
      } else {
        sX = sourceRect.right + docScrollX + 2;
        tX = targetRect.right + docScrollX + 2;
        laneX = baseRightGutter + (laneIndex * laneSpacing);
      }

      const dy = tY - sY;
      const dirY = dy >= 0 ? 1 : -1;
      const absDy = Math.abs(dy);
      const R = Math.min(14, Math.max(3, (absDy - 4) / 2));

      let pathData: string;

      if (absDy < 8) {
        pathData = `M ${sX} ${sY} L ${tX} ${tY}`;
      } else if (side === 'left') {
        pathData = `M ${sX} ${sY} L ${laneX + R} ${sY} Q ${laneX} ${sY}, ${laneX} ${sY + dirY * R} L ${laneX} ${tY - dirY * R} Q ${laneX} ${tY}, ${laneX + R} ${tY} L ${tX} ${tY}`;
      } else {
        pathData = `M ${sX} ${sY} L ${laneX - R} ${sY} Q ${laneX} ${sY}, ${laneX} ${sY + dirY * R} L ${laneX} ${tY - dirY * R} Q ${laneX} ${tY}, ${laneX - R} ${tY} L ${tX} ${tY}`;
      }

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `arrow-group ${isHighlighted ? 'active' : ''}`);
      g.dataset.source = conn.sourceId;
      g.dataset.target = conn.targetId;

      // Anchor dot at field origin
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', String(sX));
      dot.setAttribute('cy', String(sY));
      dot.setAttribute('r', isHighlighted ? '4.5' : '3.2');
      dot.setAttribute('fill', strokeColor);
      dot.setAttribute('opacity', isHighlighted ? '1' : '0.85');
      g.appendChild(dot);

      if (isHighlighted) {
        const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        halo.setAttribute('cx', String(sX));
        halo.setAttribute('cy', String(sY));
        halo.setAttribute('r', '8');
        halo.setAttribute('fill', strokeColor);
        halo.setAttribute('opacity', '0.25');
        g.appendChild(halo);

        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        glow.setAttribute('d', pathData);
        glow.setAttribute('fill', 'none');
        glow.setAttribute('stroke', strokeColor);
        glow.setAttribute('stroke-width', '8');
        glow.setAttribute('stroke-opacity', '0.25');
        glow.setAttribute('stroke-linecap', 'round');
        g.appendChild(glow);
      }

      const markerPrefix = isHighlighted ? 'hl-' : '';
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', strokeColor);
      path.setAttribute('stroke-width', isHighlighted ? '3.5' : '2.2');
      path.setAttribute('stroke-opacity', isHighlighted ? '1' : (anyActive ? '0.2' : '0.75'));
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('marker-end', `url(#${markerPrefix}arrowhead-${colorCategory})`);
      path.setAttribute('class', `arrow-line ${isHighlighted ? 'flowing' : ''}`);

      if (isHighlighted || this.displayMode === 'always') {
        path.setAttribute('stroke-dasharray', isHighlighted ? '8 4' : '6 4');
      }

      g.appendChild(path);

      // Wide transparent hit area
      const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hitArea.setAttribute('d', pathData);
      hitArea.setAttribute('fill', 'none');
      hitArea.setAttribute('stroke', 'transparent');
      hitArea.setAttribute('stroke-width', '16');
      hitArea.style.cursor = 'pointer';
      (hitArea.style as any).pointerEvents = 'stroke';

      hitArea.addEventListener('mouseenter', () => {
        this.setActiveSource(conn.sourceId);
        this.setActiveTarget(conn.targetId);
      });
      hitArea.addEventListener('mouseleave', () => {
        this.clearActive();
      });
      hitArea.addEventListener('click', () => {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.add('flash-highlight');
        setTimeout(() => targetEl.classList.remove('flash-highlight'), 1200);
      });

      g.appendChild(hitArea);

      // Highlighted arrows go on top of everything; unhighlighted go behind panels
      if (isHighlighted) {
        this.highlightSvg.appendChild(g);
      } else {
        this.svg.appendChild(g);
      }
    };

    leftConns.forEach((p, idx) => renderArrow(p, idx));
    rightConns.forEach((p, idx) => renderArrow(p, idx));

    this.updateHighlightStyles();
  }

  private updateHighlightStyles(): void {
    document.querySelectorAll('.data-source-active, .data-target-active, .calc-selected').forEach(el => {
      el.classList.remove('data-source-active', 'data-target-active', 'calc-selected');
    });

    const activeIds = new Set<string>();
    if (this.activeSourceId) activeIds.add(this.activeSourceId);
    if (this.activeTargetId) activeIds.add(this.activeTargetId);
    if (this.selectedNodeId) {
      const selEl = document.getElementById(this.selectedNodeId);
      if (selEl) selEl.classList.add('calc-selected');
      activeIds.add(this.selectedNodeId);
    }

    activeIds.forEach(id => {
      this.connections.filter(c => c.sourceId === id).forEach(c => {
        const srcEl = document.getElementById(c.sourceId);
        const tgtEl = document.getElementById(c.targetId);
        if (srcEl) srcEl.classList.add('data-source-active');
        if (tgtEl) tgtEl.classList.add('data-target-active');
      });
      this.connections.filter(c => c.targetId === id).forEach(c => {
        const srcEl = document.getElementById(c.sourceId);
        const tgtEl = document.getElementById(c.targetId);
        if (srcEl) srcEl.classList.add('data-source-active');
        if (tgtEl) tgtEl.classList.add('data-target-active');
      });
    });
  }
}
