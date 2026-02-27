/**
 * Global MUI theme — compact, native-feeling menus & dropdowns.
 *
 * Goal: approximate the density & crispness of native OS menus (macOS / Windows)
 * while keeping enough padding for comfortable web use.
 *
 * Key metrics (vs MUI defaults):
 *   MenuItem  — 30 px min-height  (was 48),  13 px font  (was 16)
 *   Select    — inner padding tightened to match
 *   ListItem* — proportionally smaller icons & text inside menus
 */

import { createTheme } from '@mui/material/styles';

const compactMenuItemStyle = {
  minHeight: 30,
  fontSize: '0.8125rem',   // 13 px
  paddingTop: 3,
  paddingBottom: 3,
  paddingLeft: 12,
  paddingRight: 12,
};

const muiTheme = createTheme({
  components: {
    // ── Menu (popup) ──────────────────────────────────────────────
    MuiMenu: {
      defaultProps: {
        // All menus are "dense" by default
        MenuListProps: { dense: true },
      },
      styleOverrides: {
        paper: {
          // Slightly tighter internal padding on the popup paper
          paddingTop: 2,
          paddingBottom: 2,
        },
      },
    },

    // ── MenuList (inside Menu & Select popups) ────────────────────
    MuiMenuList: {
      defaultProps: { dense: true },
      styleOverrides: {
        root: {
          paddingTop: 2,
          paddingBottom: 2,
        },
      },
    },

    // ── MenuItem ──────────────────────────────────────────────────
    MuiMenuItem: {
      defaultProps: { dense: true },
      styleOverrides: {
        root: {
          ...compactMenuItemStyle,
          // Dense variant (when explicit `dense` prop or inherited from MenuList)
          '&.MuiMenuItem-dense': {
            minHeight: 28,
            paddingTop: 2,
            paddingBottom: 2,
          },
        },
      },
    },

    // ── Select (the trigger + its dropdown list) ──────────────────
    MuiSelect: {
      styleOverrides: {
        select: {
          fontSize: '0.8125rem',
          // Comfortable but not oversized
          paddingTop: 6,
          paddingBottom: 6,
        },
      },
    },

    // ── ListItemText (used inside MenuItems) ──────────────────────
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.8125rem',
        },
        secondary: {
          fontSize: '0.7rem',
        },
      },
    },

    // ── ListItemIcon (shrink to match compact items) ──────────────
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 30,   // was 36
        },
      },
    },

    // ── Autocomplete dropdown (if added later) ────────────────────
    MuiAutocomplete: {
      styleOverrides: {
        option: {
          minHeight: 30,
          fontSize: '0.8125rem',
          paddingTop: 3,
          paddingBottom: 3,
        },
        listbox: {
          paddingTop: 2,
          paddingBottom: 2,
        },
      },
    },
  },
});

export default muiTheme;
