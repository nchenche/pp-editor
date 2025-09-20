/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useLibraryFetching } from '../../../../hooks/useLibraryFetching';
import { MonomerLibraryHeader } from './monomerLibraryHeader';
import { MonomerLibraryItems } from './monomerLibraryItems';

import { Box, Typography, CircularProgress } from "@mui/material";


// Simple debounce hook
function useDebouncedValue(value, delay = 200) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}


function buildHaystack(monomer) {
    return [
        monomer.m_name,
        monomer.symbol,
        monomer.pdbName,
        monomer.m_subtype,
        monomer.natAnalog
    ].filter(Boolean).join(' ').toLowerCase();
}


export const MonomerLibraryContainer = ({ filterValue, handleAddingMonomer, activeSeqIdx }) => {
    console.log("Rendering MonomerLibraryContainer");

    const [searchValue, setSearchValue] = useState("");
    const [quickFilters, setQuickFilters] = useState({
        caps: false, natural: false, nonNatural: false
    });

    // Fetch once (full list), then filter locally
    const { data: allResp, isLoading, error } = useLibraryFetching({});
    const allMonomers = useMemo(() => (allResp?.data || allResp || []), [allResp]);

    // Debounce the search value
    const debouncedSearch = useDebouncedValue(searchValue || filterValue || '', 220);


    const filteredMonomers = useMemo(() => {
        if (!Array.isArray(allMonomers) || allMonomers.length === 0) return [];
        let out = allMonomers;

        const s = debouncedSearch?.trim().toLowerCase();
        if (s) {
            out = out.filter(m => buildHaystack(m).includes(s));
        }
        if (quickFilters.caps) out = out.filter(m => m.m_type === 'cap' || m.m_subtype === 'cap');
        if (quickFilters.natural) out = out.filter(m => m.m_subtype === 'natural');
        if (quickFilters.nonNatural) out = out.filter(m => m.m_subtype === 'non-natural');

        return out;
    }, [allMonomers, debouncedSearch, quickFilters]);

    if (error) return <p>Error: {String(error)}</p>;
    const initialLoading = isLoading && (!allMonomers || allMonomers.length === 0);

    return (
        <Box display="flex" flexDirection="column" height="100%">
            <MonomerLibraryHeader
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                quickFilter={quickFilters}
                onQuickFilterChange={setQuickFilters}
                onOpenDrawer={() => { }}
            />
            <Box
                flex={1}
                minHeight={0}
                overflow="auto"
                pt={1}
                pb={2}
                display="flex"
                flexDirection="column"
                justifyContent="flex-start"
                alignItems="center"
                position="relative"
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

                <MonomerLibraryItems
                    monomers={filteredMonomers}
                    handleAddingMonomer={handleAddingMonomer}
                    activeSeqIdx={activeSeqIdx}
                />
            </Box>
        </Box>
    );
};


export default MonomerLibraryContainer;