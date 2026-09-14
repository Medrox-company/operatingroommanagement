const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const finiteNonNegative = (value) => Number.isFinite(value) ? Math.max(0, value) : 0;

/**
 * Size the desktop room grid from the space available below its page header.
 * Short viewports keep readable cards and let the surrounding page scroll.
 * This helper has no dependency on room data, browser APIs, or the spatial view.
 *
 * @param {{ width?: number, height?: number, count?: number }} [input]
 * @returns {{ columns: number, rows: number, gap: number, cardHeight: number, maxWidth: number, density: 'compact' | 'comfortable' }}
 */
export function calculateDashboardGridLayout({ width, height, count } = {}) {
  const availableWidth = finiteNonNegative(width);
  const availableHeight = finiteNonNegative(height);
  const roomCount = Math.min(Number.MAX_SAFE_INTEGER, Math.floor(finiteNonNegative(count)));
  const gap = Math.round(clamp(availableWidth * 0.008, 12, 24));
  const minimumCardWidth = availableWidth >= 2500 ? 360 : availableWidth >= 1800 ? 300 : 240;
  const maximumColumns = Math.max(1, Math.min(
    roomCount || 1,
    Math.floor((availableWidth + gap) / (minimumCardWidth + gap)),
  ));

  const sizeCandidate = (candidateColumns) => {
    // Rebalance partial rows, e.g. six rooms become 3 + 3 instead of 5 + 1.
    const rows = roomCount === 0 ? 0 : Math.ceil(roomCount / candidateColumns);
    const columns = rows === 0 ? 1 : Math.ceil(roomCount / rows);
    const columnGaps = (columns - 1) * gap;
    const maxWidth = Math.min(availableWidth, columns * 520 + columnGaps);
    const cardWidth = Math.max(0, (maxWidth - columnGaps) / columns);

    // The lower-right SVG action pocket needs at least 72% of the card width.
    const minimumCardHeight = Math.max(280, Math.ceil(cardWidth * 0.72));
    const maximumCardHeight = Math.max(320, Math.min(540, cardWidth * 1.12));
    const visibleRows = Math.max(1, rows);
    const heightPerRow = (availableHeight - (visibleRows - 1) * gap) / visibleRows;
    const cardHeight = Math.max(
      minimumCardHeight,
      Math.floor(Math.min(heightPerRow, maximumCardHeight)),
    );

    return {
      columns,
      rows,
      gap,
      cardHeight,
      maxWidth,
      density: cardHeight < 320 ? 'compact' : 'comfortable',
    };
  };

  // The widest balanced layout remains the fallback when readable cards cannot
  // all fit vertically. Otherwise, use available height to make cards larger.
  const fallback = sizeCandidate(maximumColumns);
  let best = fallback;
  let bestArea = -1;
  const seenColumns = new Set();
  const consider = (layout) => {
    if (seenColumns.has(layout.columns)) return;
    seenColumns.add(layout.columns);
    const gridHeight = layout.rows === 0 ? 0 : layout.rows * layout.cardHeight + (layout.rows - 1) * gap;
    if (gridHeight > availableHeight) return;
    const cardWidth = Math.max(0, (layout.maxWidth - (layout.columns - 1) * gap) / layout.columns);
    const area = cardWidth * layout.cardHeight;
    if (area > bestArea || (area === bestArea && layout.rows < best.rows)) {
      best = layout;
      bestArea = area;
    }
  };

  consider(fallback);
  // Bound work even for invalid or implausibly large measurements/counts. The
  // actual widest candidate is considered above regardless of this bound.
  for (let columns = 1; columns <= Math.min(maximumColumns, 64); columns += 1) {
    consider(sizeCandidate(columns));
  }
  return best;
}
