/**
 * Shared monomer tag derivation and theming utilities.
 * Used by the Monomer Library cards and the Sequence Track monomer items.
 */
import { alpha } from '@mui/material/styles';

/**
 * Derive a concise tag label for a monomer based on its type/subtype.
 * @param {Object} m - monomer object
 * @returns {'Natural' | 'Non-natural' | 'N-cap' | 'C-cap' | 'Cap' | null}
 */
export function getMonomerTag(m) {
    const subtype = m?.m_subtype || m?.m_type;

    // Caps: prefer m_RgroupIdx to determine N-ter vs C-ter
    if (subtype === 'cap') {
        const rg = m?.m_RgroupIdx;
        const hasIdx = Array.isArray(rg);
        const isNterCap = hasIdx && rg[1] != null; // N-ter uses index 1
        const isCterCap = hasIdx && rg[0] != null; // C-ter uses index 0

        if (isNterCap && !isCterCap) return 'N-cap';
        if (!isNterCap && isCterCap) return 'C-cap';
        if (isNterCap && isCterCap) return 'Cap'; // both present (fallback label)

        // Fallback heuristics (name/capSide) if m_RgroupIdx is absent
        const name = (m?.m_name || '').toLowerCase();
        if (name.includes('n-cap') || name.includes('ncap') || m?.capSide === 'N' || m?.cap_side === 'N') return 'N-cap';
        if (name.includes('c-cap') || name.includes('ccap') || m?.capSide === 'C' || m?.cap_side === 'C') return 'C-cap';
        return 'Cap';
    }

    // Natural / non-natural
    if (m?.m_subtype === 'natural' || m?.natural === true) return 'Natural';
    if (m?.m_subtype === 'non-natural' || m?.nonNatural === true) return 'Non-natural';

    return null;
}

/**
 * Tag palette: colors for each monomer tag.
 * Returns { color, bg } with hex/rgba strings for text and background.
 * This is the raw color palette (without MUI theme awareness).
 */
export const TAG_PALETTE = {
    'Natural': {
        color: '#8FB3A5',       // green-800
        bg: 'rgba(22,101,52,0.10)',
        bgSolid: '#e8f5e9',     // light green tint
    },
    'Non-natural': {
        color: '#E0A387',       // orange-900
        bg: 'rgba(124,45,18,0.10)',
        bgSolid: '#fff3e0',     // light orange tint
    },
    'N-cap': {
        color: '#6B7B8C',       // slate-700
        bg: 'rgba(51,65,85,0.10)',
        bgSolid: '#eceff1',     // light slate tint
    },
    'C-cap': {
        color: '#6B7B8C',       // slate-700
        bg: 'rgba(51,65,85,0.10)',
        bgSolid: '#eceff1',
    },
    'Cap': {
        color: '#6B7B8C',
        bg: 'rgba(51,65,85,0.10)',
        bgSolid: '#eceff1',
    },
    'default': {
        color: '#1e293b',       // slate-800
        bg: 'rgba(30,41,59,0.08)',
        bgSolid: '#f8fafc',     // slate-50
    },
};

/**
 * Get tag styles for a label (MUI theme-aware version).
 * @param {string|null} tag - one of: Natural, Non-natural, N-cap, C-cap, Cap, or null
 * @param {object} [theme] - MUI theme (optional; used for dark mode adaptation)
 * @returns {{ color: string, bg: string, bgSolid: string }}
 */
export function getMonomerTagStyles(tag, theme) {
    const palette = TAG_PALETTE[tag] || TAG_PALETTE.default;
    const isDark = theme?.palette?.mode === 'dark';

    // In dark mode, we soften the background and keep text legible
    if (isDark) {
        return {
            color: palette.color,
            bg: alpha(palette.color, 0.12),
            bgSolid: alpha(palette.color, 0.18),
        };
    }

    return palette;
}

/**
 * Build MUI sx object for a side-tag stripe (vertical bar on the left of a card).
 * Used by the Monomer Library cards.
 * @param {string|null} label
 * @param {number} sidebarW - width in px
 * @param {object} [theme]
 */
export function sideTagSx(label, sidebarW = 22, theme) {
    const styles = getMonomerTagStyles(label, theme);
    return {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: sidebarW,
        zIndex: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        userSelect: 'none',
        pointerEvents: 'none',
        borderTopRightRadius: 8,
        borderBottomRightRadius: 8,
        transform: 'translateY(10%) rotate(180deg)',
        color: styles.color,
        backgroundColor: styles.bg,
    };
}

/**
 * Build MUI sx object for sequence-track monomer item background based on tag.
 * Returns sx props to spread onto the monomer item container.
 * @param {string|null} tag
 * @param {object} [theme]
 * @param {{ isHovered?: boolean, isSelected?: boolean }} [state]
 */
export function getSequenceMonomerTagSx(tag, theme, state = {}) {
    if (!tag) return {};

    const styles = getMonomerTagStyles(tag, theme);
    const { isHovered, isSelected } = state;

    // Subtle background tint; slightly stronger on hover/selection
    let bgAlpha = 0.10;
    if (isHovered) bgAlpha = 0.16;
    if (isSelected) bgAlpha = 0.20;

    // Use inset box-shadow for the left stripe so it doesn't mask the container's border
    const stripeColor = alpha(styles.color, isSelected ? 0.65 : isHovered ? 0.55 : 0.45);

    return {
        backgroundColor: alpha(styles.color, bgAlpha),
        boxShadow: `inset 3px 0 0 ${stripeColor}`,
    };
}
