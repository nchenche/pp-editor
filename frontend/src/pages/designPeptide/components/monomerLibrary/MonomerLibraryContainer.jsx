/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React, { Fragment, memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Box, Typography, CircularProgress, ToggleButton, ToggleButtonGroup } from "@mui/material";

import { useLibraryFetching } from '../../../../hooks/useLibraryFetching';
import { MonomerLibraryHeader } from './monomerLibraryHeader';
import { MonomerLibraryItems } from './monomerLibraryItems';

export const LINKING_MODES = {
    append: 'append',
    replace: 'replace',
};

export const LINK_CHOICES = {
    peptide: 'peptide',
    other: 'other',
};

const MONOMER_LIBRARY_ITEM_SIZE_STORAGE_KEY = 'pp.monomerLibrary.itemSize';

// Simple debounce hook
function useDebouncedValue(value, delay = 200) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

// Build a haystack string for searching
function buildHaystack(monomer) {
    return [
        monomer.m_name,
        monomer.symbol,
        monomer.pdbName,
        monomer.m_subtype,
        monomer.natAnalog,
        monomer.smiles,
    ].filter(Boolean).join(' ').toLowerCase();
}


export const MonomerLibraryContainer = forwardRef(function MonomerLibraryContainer(
    { filterValue, handleAddingMonomer, uiState, setUiState, replaceSelection },
    ref
) {
    const { activeSeqIdx, seqNumber } = uiState;

    const [searchValue, setSearchValue] = useState("");
    const [quickFilters, setQuickFilters] = useState({
        caps: false, natural: false, nonNatural: false
    });

    const [itemSize, setItemSize] = useState(() => {
        try {
            if (typeof window === 'undefined') return 'sm';
            const raw = window.localStorage?.getItem(MONOMER_LIBRARY_ITEM_SIZE_STORAGE_KEY);
            return raw === 'lg' || raw === 'sm' ? raw : 'sm';
        } catch {
            return 'sm';
        }
    }); // 'sm' | 'lg'

    useEffect(() => {
        try {
            if (typeof window === 'undefined') return;
            window.localStorage?.setItem(MONOMER_LIBRARY_ITEM_SIZE_STORAGE_KEY, itemSize);
        } catch {
            // ignore (private mode / blocked storage)
        }
    }, [itemSize]);

    // Fetch once (full list), then filter locally
    const { data: allResp, isLoading, error } = useLibraryFetching({});
    const allMonomers = useMemo(() => (allResp?.data || allResp || []), [allResp]);
    
    // Debounce the search value
    const debouncedSearch = useDebouncedValue(searchValue || filterValue || '', 220);

    const filteredResult = useMemo(() => {
        if (!Array.isArray(allMonomers) || allMonomers.length === 0) return [];
        let out = allMonomers;

        const replaceActive = !!replaceSelection?.active;
        const replaceMode = replaceSelection?.mode;
        const isAnalogMode = replaceActive && replaceMode === 'analog';

        const s = debouncedSearch?.trim().toLowerCase();
        if (s) {
            out = out.filter(m => buildHaystack(m).includes(s));
        }
        if (quickFilters.caps) out = out.filter(m => m.m_type === 'cap' || m.m_subtype === 'cap');
        if (quickFilters.natural) out = out.filter(m => m.m_subtype === 'natural');
        if (quickFilters.nonNatural) out = out.filter(m => m.m_subtype === 'non-natural');

        // Replace-selection analog filter:
        // Apply only when we actually have matches; otherwise fall back to showing all.
        let analogFilter = { active: false, hasMatches: false };
        if (isAnalogMode && replaceSelection?.sourceMonomer) {
            const srcAnalog = replaceSelection.sourceMonomer?.['natural_analog'] ?? replaceSelection.sourceMonomer?.natAnalog;
            if (srcAnalog != null && String(srcAnalog).trim() !== '') {
                const key = String(srcAnalog).toLowerCase();
                const analogOut = out.filter(m => String(m?.natAnalog ?? m?.natural_analog ?? '').toLowerCase() === key);
                analogFilter = { active: true, hasMatches: analogOut.length > 0 };
                if (analogOut.length > 0) out = analogOut;
            }
        }

        // During replacement, never show the source monomer as a candidate (applies to both analog and other).
        if (replaceActive && replaceSelection?.sourceMonomer) {
            const src = replaceSelection.sourceMonomer;
            const srcId = src?._id != null ? String(src._id) : '';
            const srcPdb = String(src?.pdbName ?? '').toLowerCase();
            const srcSym = String(src?.symbol ?? src?.m_abbr ?? '').toLowerCase();
            out = out.filter((m) => {
                if (!m) return false;
                if (srcId && m._id != null && String(m._id) === srcId) return false;
                const mp = String(m?.pdbName ?? '').toLowerCase();
                if (srcPdb && mp && mp === srcPdb) return false;
                const ms = String(m?.symbol ?? m?.m_abbr ?? '').toLowerCase();
                if (srcSym && ms && ms === srcSym) return false;
                return true;
            });
        }

        return { monomers: out, analogFilter };
    }, [allMonomers, debouncedSearch, quickFilters, replaceSelection]);

    const filteredMonomers = filteredResult?.monomers ?? [];
    const deferredMonomers = useDeferredValue(filteredMonomers);
    const analogFilter = filteredResult?.analogFilter ?? { active: false, hasMatches: false };

    // Keep current linking settings without causing renders
    const linkingRef = useRef({
        mode: 'append',
        activeSequenceIdx: activeSeqIdx,     // numeric index
        link: 'peptide',
    });

    // Keep the ref in sync when the active sequence changes elsewhere
    useEffect(() => {
        linkingRef.current.activeSequenceIdx = activeSeqIdx;
    }, [activeSeqIdx]);

    // Update linking snapshot (no re-render)
    const onLinkingSnapshotChange = useCallback((partial) => {
        linkingRef.current = { ...linkingRef.current, ...partial };
    }, []);

    // Stable add handler – reads latest options from ref
    const handleAdd = useCallback((monomer, options) => {
        handleAddingMonomer?.(monomer, { ...linkingRef.current, ...options });
    }, [handleAddingMonomer]);

    const initialLoading = isLoading && (!allMonomers || allMonomers.length === 0);

    // Header now receives uiState directly and controls the sequence index
    const memoizedLibraryHeader = useMemo(() => (
        <MonomerLibraryHeader
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            quickFilter={quickFilters}
            onQuickFilterChange={setQuickFilters}
            uiState={uiState}
            setUiState={setUiState}
            defaultLinkingSnapshot={linkingRef.current}
            onLinkingSnapshotChange={onLinkingSnapshotChange}
        />
    ), [searchValue, quickFilters, onLinkingSnapshotChange, uiState, setUiState]);

    return (
        <Box display="flex" flexDirection="column" height="100%" minHeight={0}>
            {/* <Box sx={{ flex: '0 0 auto' }}> */}
            {memoizedLibraryHeader}
            {/* </Box> */}
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    height: "80%",
                    pt: 1,
                    pb: 2,
                    position: "relative",
                    overflow: "hidden",
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Box sx={{ flex: '0 0 auto', px: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Showing {Array.isArray(deferredMonomers) ? deferredMonomers.length : 0} of {Array.isArray(allMonomers) ? allMonomers.length : 0} monomers
                    </Typography>

                    {replaceSelection?.active ? (
                        <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.9 }}>
                            {analogFilter.active
                                ? (analogFilter.hasMatches ? '(analogs only)' : '(no analogs found; showing all)')
                                : '(pick replacement from library)'}
                        </Typography>
                    ) : null}

                    <Box sx={{ ml: 'auto' }}>
                        <ToggleButtonGroup
                            size="small"
                            exclusive
                            value={itemSize}
                            onChange={(_, v) => {
                                if (!v) return;
                                setItemSize(v);
                            }}
                            aria-label="monomer item size"
                            sx={{
                                '& .MuiToggleButton-root': {
                                    px: 1,
                                    py: 0.25,
                                    fontSize: 11,
                                    textTransform: 'none',
                                    lineHeight: 1.1,
                                }
                            }}
                        >
                            <ToggleButton value="sm" aria-label="small items">Small</ToggleButton>
                            {/* <ToggleButton value="md" aria-label="medium items">Medium</ToggleButton> */}
                            <ToggleButton value="lg" aria-label="large items">Large</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        position: 'relative',
                        overflowY: 'auto',
                        borderRadius: 1,
                        border: replaceSelection?.active ? 2 : 0,
                        borderColor: replaceSelection?.active ? 'primary.main' : 'transparent',
                        boxShadow: replaceSelection?.active
                            ? '0 10px 22px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.14)'
                            : 'none',
                    }}
                >
                    {initialLoading && (
                        <Box
                            position="absolute"
                            top={0}
                            left={0}
                            width="100%"
                            height="100%"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            bgcolor="rgba(255,255,255,0.6)"
                            zIndex={2}
                        >
                            <CircularProgress size={32} />
                        </Box>
                    )}

                    {error ? (
                        <Box sx={{ px: 2, py: 1 }}>
                            <Typography variant="body2" color="error">
                                Error: {String(error)}
                            </Typography>
                        </Box>
                    ) : null}

                    <MonomerLibraryItems
                        monomers={deferredMonomers}
                        handleAddingMonomer={handleAdd}
                        activeSeqIdx={activeSeqIdx}
                        itemSize={itemSize}
                    />
                </Box>
            </Box>
        </Box>
    );
});


export default MonomerLibraryContainer;