/**
 * Shared cell size tokens for chain slot tracks.
 * All tracks (monomer sequence, secondary structure, template) use these
 * to ensure vertical alignment across parallel rows.
 *
 * Usage:
 *   - Import CELL_TOKENS to get numeric values
 *   - Apply CELL_CSS_VARS as inline style on a parent container
 *   - Use 'var(--pp-cell-w)' / 'var(--pp-cell-h)' in child components
 */

// Numeric tokens (use for calculations, fallbacks)
export const CELL_WIDTH = 36;   // px – wider to accommodate labels + stripe
export const CELL_HEIGHT = 24;  // px
export const CELL_GAP = 4;      // px (gap between cells)

// Convenience object
export const CELL_TOKENS = {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    gap: CELL_GAP,
};

// CSS custom properties to set on a parent element
// Child elements can then use var(--pp-cell-w), var(--pp-cell-h), var(--pp-cell-gap)
export const CELL_CSS_VARS = {
    '--pp-cell-w': `${CELL_WIDTH}px`,
    '--pp-cell-h': `${CELL_HEIGHT}px`,
    '--pp-cell-gap': `${CELL_GAP}px`,
};

// MUI sx helper (spread onto a Box/component's sx)
export const cellSizeSx = {
    width: 'var(--pp-cell-w)',
    minWidth: 'var(--pp-cell-w)',
    height: 'var(--pp-cell-h)',
    minHeight: 'var(--pp-cell-h)',
};
