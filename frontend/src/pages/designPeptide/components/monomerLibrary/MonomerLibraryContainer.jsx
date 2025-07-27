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


export const MonomerLibraryContainer = ({ filterValue, onMonomerItemDoubleClick }) => {
    const [searchValue, setSearchValue] = useState("");
    const [quickFilters, setQuickFilters] = useState({
        caps: false, natural: false, nonNatural: false
    });


    // Debounce the search value
    const debouncedSearch = useDebouncedValue(searchValue || filterValue || '', 220);

    // Use the new hook
    const { data: filteredMonomers, isLoading, error } = useLibraryFetching({
        search: debouncedSearch,
        ...quickFilters
    });

    // ...rest of your component remains the same...
    if (error) return <p>Error: {error}</p>;
    if (!filteredMonomers) return null;

    return (
        <Box display="flex" flexDirection="column" height="100%">
            <MonomerLibraryHeader
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                quickFilter={quickFilters}
                onQuickFilterChange={setQuickFilters}
                onOpenDrawer={() => setDrawerOpen(true)}
            />
            <Box
                flex={1}
                minHeight={0}
                overflow="auto"
                // bgcolor="white"
                // borderRadius={1}
                // p={1}
                // border={1}
                // borderColor="grey.200"
                pt={1}
                pb={2}
                display="flex"
                flexDirection="column"
                justifyContent="flex-start"
                alignItems="center"
                position="relative"
            >
                {isLoading && (
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
                    handleOnDoubleClick={onMonomerItemDoubleClick}
                />
            </Box>
        </Box>
    );
};


export default MonomerLibraryContainer;