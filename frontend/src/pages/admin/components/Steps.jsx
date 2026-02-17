import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, memo } from 'react';

import { useForm, Controller } from "react-hook-form"

import { Box, IconButton, Paper, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import InputContainer from './InputContainer';
import { MolDisplayer, MoleculeDisplayContainer, computePreferredSizeFromSmiles } from './MolDisplayer';

import { NewMonomerSettingForm } from './AddNewMoleculeForm';


export const TabStep1 = memo(({ smiles, handleChangeSmiles }) => {
    const debounceMs = 450;
    const [renderSmiles, setRenderSmiles] = useState(smiles);
    const [previewStatus, setPreviewStatus] = useState({ isLoading: false, error: null, isEmptySmiles: true });
    const debounceTimerRef = useRef(null);

    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        debounceTimerRef.current = setTimeout(() => {
            setRenderSmiles(smiles);
        }, debounceMs);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
        };
    }, [smiles]);

    const commitRenderNow = (nextSmiles) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        setRenderSmiles(nextSmiles);
    };

    return (
        <Box
            sx={{
                width: '100%',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'stretch',
                // On narrow widths (single column), center the card.
                // On wide widths, spread the two cards across the row.
                justifyContent: { xs: 'center', md: 'space-between' },
            }}
        >
            <Box sx={{ flex: '1 1 420px', minWidth: 320, maxWidth: { xs: '100%', md: '48%' } }}>
                <InputContainer
                    smiles={smiles}
                    handleChangeSmiles={handleChangeSmiles}
                    onCommitSmiles={commitRenderNow}
                    smilesStatus={previewStatus}
                />
            </Box>
            <Box sx={{ flex: '1 1 420px', minWidth: 320, maxWidth: { xs: '100%', md: '48%' } }}>
                <MoleculeDisplayContainer
                    smiles={renderSmiles}
                    onStatusChange={setPreviewStatus}
                />
            </Box>
        </Box>
    );
});

export const TabStep2 = memo(({ smiles, handleSelectedBonds, selectedBonds, fragments }) => {

    const queryParams = {
        h_explicit_only: false,
        add_bond_indices: true,
        format_svg: true,
    };

    const preferredSize = computePreferredSizeFromSmiles(smiles);

    const onBondClick = (event) => {
        const target = event?.target;
        if (!(target instanceof Element)) return;

        // Resolve the bond group from either the highlight overlay path or the visible bond path.
        const groupBond = target.closest?.('g.group-bond') || target.closest?.('g');
        if (!(groupBond instanceof Element)) return;
        const classes = groupBond.classList;

        // Determine bond index from group class (preferred).
        const bondGroupClass = Array.from(classes).find((c) => /^group-bond-\d+$/.test(c));

        // Fallback: determine bond index from the clicked path class (e.g. "bond-2 atom-2 atom-3").
        const bondPath = target.closest?.('path') || target;
        const bondPathClass = bondPath instanceof Element
            ? Array.from(bondPath.classList || []).find((c) => /^bond-\d+$/.test(c))
            : null;

        const match = (bondGroupClass || bondPathClass || '').match(/(group-bond|bond)-(\d+)/);
        if (!match) return;
        const bondIndex = match[2];

        // Toggle 'selected' class
        classes.toggle('selected');
        handleSelectedBonds(bondIndex);
    };

    return (
        <Box
            sx={{
                width: '100%',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'stretch',
                justifyContent: { xs: 'center', md: 'space-between' },
            }}
        >
            <Box sx={{ flex: '1', minWidth: 320, maxWidth: { xs: '100%' } }}>
                <MoleculeDisplayContainer
                    smiles={smiles}
                    queryParams={queryParams}
                    onBondClick={onBondClick}
                    selectedBonds={selectedBonds}
                    selectableBonds={true}
                    defaultSize={preferredSize}
                />
            </Box>

            <Box sx={{ flex: '1', minWidth: 320, maxWidth: { xs: '100%'} }}>
                <MoleculeDisplayContainer
                    smiles={fragments}
                    queryParams={{ mols_per_row: 2 }}
                    selectedBonds={selectedBonds}
                    defaultSize={preferredSize}
                />
            </Box>
        </Box>
    );
});


export const countFragmentRGroups = (smiles) => {
    if (!smiles) return 0;
    const matches = String(smiles).match(/\[(\d+)\*\]|\*/g);
    return matches ? matches.length : 0;
};

export const isFragmentAllowed = (smiles, maxRGroups = 4) => {
    return countFragmentRGroups(smiles) <= maxRGroups;
};

export const TabStep3 = memo(({ fragments, selectedFragmentIndex, handleSelectedFragment, onInvalidFragment }) => {

    const queryParams = {
        h_explicit_only: true,
        add_bond_indices: false,
        format_svg: true,
    };

    const list = Array.isArray(fragments) ? fragments : (fragments ? [fragments] : []);
    if (list.length === 0) return null;

    const scrollerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollButtons = () => {
        const el = scrollerRef.current;
        if (!el) {
            setCanScrollLeft(false);
            setCanScrollRight(false);
            return;
        }

        const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
        const left = el.scrollLeft;
        const epsilon = 2;
        setCanScrollLeft(left > epsilon);
        setCanScrollRight(left < maxScrollLeft - epsilon);
    };

    useEffect(() => {
        updateScrollButtons();

        const el = scrollerRef.current;
        if (!el) return;

        const onScroll = () => updateScrollButtons();
        el.addEventListener('scroll', onScroll, { passive: true });

        let ro;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(() => updateScrollButtons());
            ro.observe(el);
        } else {
            window.addEventListener('resize', updateScrollButtons);
        }

        return () => {
            el.removeEventListener('scroll', onScroll);
            if (ro) ro.disconnect();
            else window.removeEventListener('resize', updateScrollButtons);
        };
    }, [list.length]);

    const selectFragment = (idx) => {
        const fragSmiles = list?.[idx];
        if (!isFragmentAllowed(fragSmiles, 4)) {
            onInvalidFragment?.('This fragment has more than 4 attachment points (R-groups). Please select a different fragment.');
            return;
        }
        onInvalidFragment?.('');
        handleSelectedFragment(idx);
    };

    const scrollByPage = (direction) => {
        const el = scrollerRef.current;
        if (!el) return;
        const delta = Math.round(el.clientWidth * 0.9);
        el.scrollBy({ left: direction * delta, behavior: 'smooth' });
    };

    return (
        <Box sx={{ position: 'relative', width: '100%' }}>
            {canScrollLeft ? (
                <IconButton
                    aria-label="Previous fragment"
                    onClick={() => scrollByPage(-1)}
                    size="small"
                    sx={{
                        position: 'absolute',
                        left: 4,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 2,
                        bgcolor: 'background.paper',
                        border: 1,
                        borderColor: 'divider',
                    }}
                >
                    <ChevronLeftIcon fontSize="small" />
                </IconButton>
            ) : null}

            {canScrollRight ? (
                <IconButton
                    aria-label="Next fragment"
                    onClick={() => scrollByPage(1)}
                    size="small"
                    sx={{
                        position: 'absolute',
                        right: 4,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 2,
                        bgcolor: 'background.paper',
                        border: 1,
                        borderColor: 'divider',
                    }}
                >
                    <ChevronRightIcon fontSize="small" />
                </IconButton>
            ) : null}

            <Box
                ref={scrollerRef}
                sx={{
                    width: '100%',
                    display: 'flex',
                    gap: 2,
                    overflowX: 'auto',
                    pb: 1,
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch',
                    // Keep content from going under overlay arrows.
                    px: { xs: 0, sm: 0 },
                }}
            >
                {list.map((fragSmiles, idx) => {
                    const isSelected = idx === selectedFragmentIndex;

                    return (
                        <Box
                            key={`${idx}-${String(fragSmiles).slice(0, 32)}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => selectFragment(idx)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    selectFragment(idx);
                                }
                            }}
                            sx={{
                                flex: '0 0 auto',
                                scrollSnapAlign: 'start',
                                width: {
                                    xs: '85%',
                                    sm: '70%',
                                    md: '48%',
                                },
                                outline: 'none',
                                cursor: 'pointer',
                                borderRadius: 1,
                                border: 2,
                                borderColor: isSelected ? 'primary.main' : 'transparent',
                            }}
                        >
                            <MoleculeDisplayContainer
                                smiles={fragSmiles}
                                queryParams={queryParams}
                                selectableMolecules={false}
                                enablePanZoom={true}
                                defaultSize={420}
                            />
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
});


/**
 * Combined step: select bond(s) on the left, pick the core fragment in a carousel on the right.
 */
export const TabStepBondsAndFragment = memo(({ smiles, handleSelectedBonds, selectedBonds, fragments, selectedFragmentIndex, handleSelectedFragment, onInvalidFragment }) => {

    const bondQueryParams = {
        h_explicit_only: false,
        add_bond_indices: true,
        format_svg: true,
    };

    const preferredSize = computePreferredSizeFromSmiles(smiles);

    const onBondClick = (event) => {
        const target = event?.target;
        if (!(target instanceof Element)) return;

        const groupBond = target.closest?.('g.group-bond') || target.closest?.('g');
        if (!(groupBond instanceof Element)) return;
        const classes = groupBond.classList;

        const bondGroupClass = Array.from(classes).find((c) => /^group-bond-\d+$/.test(c));
        const bondPath = target.closest?.('path') || target;
        const bondPathClass = bondPath instanceof Element
            ? Array.from(bondPath.classList || []).find((c) => /^bond-\d+$/.test(c))
            : null;

        const match = (bondGroupClass || bondPathClass || '').match(/(group-bond|bond)-(\d+)/);
        if (!match) return;
        const bondIndex = match[2];

        classes.toggle('selected');
        handleSelectedBonds(bondIndex);
    };

    // --- Fragment carousel (reuses TabStep3 logic inline) ---
    const fragQueryParams = {
        h_explicit_only: true,
        add_bond_indices: false,
        format_svg: true,
    };

    const list = Array.isArray(fragments) ? fragments : (fragments ? [fragments] : []);

    const scrollerRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollButtons = () => {
        const el = scrollerRef.current;
        if (!el) {
            setCanScrollLeft(false);
            setCanScrollRight(false);
            return;
        }
        const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
        const left = el.scrollLeft;
        const epsilon = 2;
        setCanScrollLeft(left > epsilon);
        setCanScrollRight(left < maxScrollLeft - epsilon);
    };

    useEffect(() => {
        updateScrollButtons();
        const el = scrollerRef.current;
        if (!el) return;

        const onScroll = () => updateScrollButtons();
        el.addEventListener('scroll', onScroll, { passive: true });

        let ro;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(() => updateScrollButtons());
            ro.observe(el);
        } else {
            window.addEventListener('resize', updateScrollButtons);
        }

        return () => {
            el.removeEventListener('scroll', onScroll);
            if (ro) ro.disconnect();
            else window.removeEventListener('resize', updateScrollButtons);
        };
    }, [list.length]);

    const selectFragment = (idx) => {
        const fragSmiles = list?.[idx];
        if (!isFragmentAllowed(fragSmiles, 4)) {
            onInvalidFragment?.('This fragment has more than 4 attachment points (R-groups). Please select a different fragment.');
            return;
        }
        onInvalidFragment?.('');
        handleSelectedFragment(idx);
    };

    const scrollByPage = (direction) => {
        const el = scrollerRef.current;
        if (!el) return;
        const delta = Math.round(el.clientWidth * 0.9);
        el.scrollBy({ left: direction * delta, behavior: 'smooth' });
    };

    return (
        <Box
            sx={{
                width: '100%',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 2,
                alignItems: 'stretch',
                justifyContent: { xs: 'center', md: 'space-between' },
            }}
        >
            {/* Left: bond selection sketch */}
            <Box sx={{ flex: '1', minWidth: 320, maxWidth: { xs: '100%', md: '48%' } }}>
                <MoleculeDisplayContainer
                    smiles={smiles}
                    queryParams={bondQueryParams}
                    onBondClick={onBondClick}
                    selectedBonds={selectedBonds}
                    selectableBonds={true}
                    defaultSize={preferredSize}
                />
            </Box>

            {/* Right: fragment carousel */}
            <Box sx={{ flex: '1', minWidth: 320, maxWidth: { xs: '100%', md: '48%' }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {list.length === 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'action.hover' }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', px: 2 }}>
                            Select one or more bonds on the left to generate fragments.
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ position: 'relative', width: '100%' }}>
                        {canScrollLeft ? (
                            <IconButton
                                aria-label="Previous fragment"
                                onClick={() => scrollByPage(-1)}
                                size="small"
                                sx={{
                                    position: 'absolute',
                                    left: 4,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 2,
                                    bgcolor: 'background.paper',
                                    border: 1,
                                    borderColor: 'divider',
                                }}
                            >
                                <ChevronLeftIcon fontSize="small" />
                            </IconButton>
                        ) : null}

                        {canScrollRight ? (
                            <IconButton
                                aria-label="Next fragment"
                                onClick={() => scrollByPage(1)}
                                size="small"
                                sx={{
                                    position: 'absolute',
                                    right: 4,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    zIndex: 2,
                                    bgcolor: 'background.paper',
                                    border: 1,
                                    borderColor: 'divider',
                                }}
                            >
                                <ChevronRightIcon fontSize="small" />
                            </IconButton>
                        ) : null}

                        <Box
                            ref={scrollerRef}
                            sx={{
                                width: '100%',
                                display: 'flex',
                                gap: 2,
                                overflowX: 'auto',
                                pb: 1,
                                scrollSnapType: 'x mandatory',
                                WebkitOverflowScrolling: 'touch',
                                px: { xs: 0, sm: 0 },
                            }}
                        >
                            {list.map((fragSmiles, idx) => {
                                const isSelected = idx === selectedFragmentIndex;

                                return (
                                    <Box
                                        key={`${idx}-${String(fragSmiles).slice(0, 32)}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => selectFragment(idx)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                selectFragment(idx);
                                            }
                                        }}
                                        sx={{
                                            flex: '0 0 auto',
                                            scrollSnapAlign: 'start',
                                            width: '100%',
                                            outline: 'none',
                                            cursor: 'pointer',
                                            borderRadius: 1,
                                            border: 2,
                                            borderColor: isSelected ? 'primary.main' : 'transparent',
                                        }}
                                    >
                                        <MoleculeDisplayContainer
                                            smiles={fragSmiles}
                                            queryParams={fragQueryParams}
                                            selectableMolecules={false}
                                            enablePanZoom={true}
                                            defaultSize={420}
                                        />
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    );
});


const extractSmilesIndices = (str) => {
    const regex = /\[(\d+)\*\]|\*/g;
    const indices = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
        if (match[1]) {
            indices.push(parseInt(match[1], 10));
        } else {
            indices.push('*');
        }
    }
    return indices;
};

const createRGroupObject = (baseName, groupIndices) => {
    return groupIndices.reduce((accumulator, currentValue) => {
        accumulator[baseName + currentValue] = '';
        return accumulator;
    }, {});
};

export const TabStep4 = memo(
    forwardRef(({ fragmentSmiles, initialData, onFormDataChange, pdbConfig }, ref) => {
        if (!fragmentSmiles) return null;

        const groupIndices = useMemo(() => extractSmilesIndices(fragmentSmiles), [fragmentSmiles]);
        const groupLabelValues = useMemo(() => createRGroupObject("groupLabel_", groupIndices || []), [groupIndices]);
        const groupLeavingValues = useMemo(() => createRGroupObject("groupLeaving_", groupIndices || []), [groupIndices]);

        const defaultValues = useMemo(
            () => {
                const rGroupCount = Array.isArray(groupIndices) ? groupIndices.length : 0;
                // If initialData already has a classify-based type, respect it;
                // otherwise fall back to rGroup heuristic (cap if 1, aa otherwise).
                const selectType = initialData?.selectType
                    ? initialData.selectType
                    : (rGroupCount === 1 ? 'cap' : 'aa');
                const selectSubType = selectType === 'cap' ? 'cap' : 'non-natural';
                return {
                    name: '',
                    symbol: '',
                    selectType,
                    selectSubType,
                    naturalAnalog: selectType === 'cap' ? 'X' : '',
                    pdb: '',
                    ...groupLabelValues,
                    ...groupLeavingValues,
                    ...initialData,
                };
            },
            [groupIndices, groupLabelValues, groupLeavingValues, initialData]
        );

        // Initialize useForm outside render cycles
        const methods = useForm({
            defaultValues, // Use memoized defaultValues
            mode: 'onBlur',
        })

        // Reset form values only when `initialData` changes
        useEffect(() => {
            if (initialData) {
                methods.reset({ ...defaultValues, ...initialData });
            }
        }, []);

        // Watch form values and notify parent
        useEffect(() => {
            const subscription = methods.watch((value) => {
                if (onFormDataChange) {
                    onFormDataChange(value);
                }
            });
            return () => subscription.unsubscribe();
        }, []);

        // Expose methods to parent
        useImperativeHandle(ref, () => ({
            getFormData: () => methods.getValues(),
            isValid: async () => {
                const fieldNames = Array.isArray(groupIndices)
                    ? groupIndices.map((idx) => `groupLabel_${idx}`)
                    : [];

                // Clear any previous manual errors so trigger() can re-populate required errors.
                if (fieldNames.length > 0) methods.clearErrors(fieldNames);

                const baseOk = await methods.trigger();
                if (!baseOk) return false;

                // Custom validation: R-group labels must be unique.
                const values = fieldNames.length > 0 ? methods.getValues(fieldNames) : [];
                const seen = new Map();
                for (let i = 0; i < fieldNames.length; i += 1) {
                    const raw = Array.isArray(values) ? values[i] : methods.getValues(fieldNames[i]);
                    const v = String(raw || '').trim();
                    if (!v) continue;
                    if (!seen.has(v)) seen.set(v, []);
                    seen.get(v).push(fieldNames[i]);
                }

                let uniqueOk = true;
                for (const [, fields] of seen.entries()) {
                    if (fields.length <= 1) continue;
                    uniqueOk = false;
                    for (const name of fields) {
                        methods.setError(name, {
                            type: 'validate',
                            message: 'R-group labels must be unique (no duplicates).',
                        });
                    }
                }

                return uniqueOk;
            },
            validateForm: async () => {
                const fieldNames = Array.isArray(groupIndices)
                    ? groupIndices.map((idx) => `groupLabel_${idx}`)
                    : [];
                if (fieldNames.length > 0) methods.clearErrors(fieldNames);
                const baseOk = await methods.trigger();
                if (!baseOk) return false;

                const values = fieldNames.length > 0 ? methods.getValues(fieldNames) : [];
                const seen = new Map();
                for (let i = 0; i < fieldNames.length; i += 1) {
                    const raw = Array.isArray(values) ? values[i] : methods.getValues(fieldNames[i]);
                    const v = String(raw || '').trim();
                    if (!v) continue;
                    if (!seen.has(v)) seen.set(v, []);
                    seen.get(v).push(fieldNames[i]);
                }

                let uniqueOk = true;
                for (const [, fields] of seen.entries()) {
                    if (fields.length <= 1) continue;
                    uniqueOk = false;
                    for (const name of fields) {
                        methods.setError(name, {
                            type: 'validate',
                            message: 'R-group labels must be unique (no duplicates).',
                        });
                    }
                }

                return uniqueOk;
            },
        }), [methods, groupIndices]);

        const queryParams = {
            h_explicit_only: true,
            // add_atom_indices: true,
            is_remove_h: true,
            format_svg: true,
        }

        return (
            <Box
                sx={{
                    width: '100%',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    alignItems: 'flex-start',
                    justifyContent: { xs: 'center', md: 'space-between' },
                }}
            >
                <Box sx={{ flex: '1 1 420px', minWidth: 320, maxWidth: { xs: '100%', md: '48%' } }}>
                    <MoleculeDisplayContainer
                        smiles={fragmentSmiles}
                        queryParams={queryParams}
                        defaultSize={420}
                    />
                </Box>
                <Box sx={{ flex: '1 1 420px', minWidth: 320, maxWidth: { xs: '100%', md: '48%' }, p: 1 }}>
                    <h3 className='text-xl font-medium border-b-2 border-cyan-800/35 pb-2 mb-2'>Molecule setting</h3>
                    <NewMonomerSettingForm formMethods={methods} groupIndices={groupIndices} pdbConfig={pdbConfig} />
                </Box>
            </Box>
        );
    })
);
