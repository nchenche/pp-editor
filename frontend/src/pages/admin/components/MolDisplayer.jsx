/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react';
import { useFetchData } from '../../../hooks/Fetchers'
import { useFetchMolecule } from '../../../hooks/Fetchers'

import { API_URL } from '../../../config';

import { Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import CloseIcon from '@mui/icons-material/Close';
import usePanZoom from '../../../hooks/usePanZoom';


// MolDisplayer.js
import PropTypes from 'prop-types';
import { computePreferredSizeFromSmiles as computePreferredSizeFromSmilesImpl } from '../../../utils/moleculeRendering';

// Keep the existing named export for backwards compatibility with admin steps.
export const computePreferredSizeFromSmiles = computePreferredSizeFromSmilesImpl;



export const MoleculeDisplay = ({
    data,
    isLoading,
    error,
    selectedBonds = [],
    onBondClick = null,
    selectableBonds = false,
    selectableMolecules = false,
    selectedFragment = -1,
    enablePanZoom = true,
}) => {

    const svgContainer = useRef(null);
    const panZoomApi = useRef(null);

    // Utility functions to add/remove class names
    const addClassName = (targetSelector, newClassName) => {
        if (!svgContainer.current) return;
        const targets = svgContainer.current.querySelectorAll(targetSelector);
        targets.forEach((element) => {
            element.classList.add(newClassName);
        });
    };

    const removeClassName = (targetSelector, className) => {
        if (!svgContainer.current) return;
        const targets = svgContainer.current.querySelectorAll(targetSelector);
        targets.forEach((element) => {
            element.classList.remove(className);
        });
    };

    // Handle bond click events
    useEffect(() => {
        if (svgContainer.current && onBondClick) {
            svgContainer.current.addEventListener('click', onBondClick, true);
        }

        return () => {
            if (svgContainer.current && onBondClick) {
                svgContainer.current.removeEventListener('click', onBondClick, true);
            }
        };
    }, [onBondClick, data]);

    // Make bonds selectable
    useEffect(() => {
        if (!svgContainer.current || !selectableBonds) return;
        // Make both the (often invisible) highlight overlay and the visible bond paths clickable/hoverable.
        // Some SVG generators place the highlight path below the bond strokes, so the visible bond path
        // becomes the hit target; ensure it still gets a pointer cursor and click handler.
        addClassName('g.group-bond path', 'selectable');

        return () => {
            removeClassName('g.group-bond path', 'selectable');
        };
    }, [selectableBonds, data]);

    // Make molecules selectable
    useEffect(() => {
        if (!svgContainer.current || !selectableMolecules) return;
        addClassName('g.group-molecule', 'selectable');

        return () => {
            removeClassName('g.group-molecule', 'selectable');
        };
    }, [selectableMolecules, data]);

    // Highlight selected bonds
    useEffect(() => {
        if (!selectedBonds.length || !svgContainer.current) return;

        selectedBonds.forEach((idx) => {
            const bondGroup = svgContainer.current.querySelector(`g.group-bond-${idx}`);
            if (bondGroup) {
                bondGroup.classList.add('selected');
            }
        });

        return () => {
            if (!selectedBonds.length || !svgContainer.current) return;

            const allBondGroups = svgContainer.current.querySelectorAll('g.group-bond');
            allBondGroups.forEach((group) => {
                group.classList.remove('selected');
            });
        };
    }, [selectedBonds, data]);

    // Highlight selected fragment
    useEffect(() => {
        if (selectedFragment === -1 || !svgContainer.current) return;
        addClassName(`.molecule-${selectedFragment}`, 'selected');

        return () => {
            removeClassName(`.molecule-${selectedFragment}`, 'selected');
        };
    }, [selectedFragment, data]);

    usePanZoom(svgContainer, enablePanZoom ? [data?.data] : [], enablePanZoom ? panZoomApi : undefined);

    // if (isLoading) {
    //     return <p>Loading...</p>;
    // }

    const errorMessage = error ? String(error) : '';

    return (
        <Box
            sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
            }}
        >
            {isLoading ? (
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'rgba(255,255,255,0.6)',
                        zIndex: 2,
                        pointerEvents: 'none',
                    }}
                >
                    <CircularProgress size={28} />
                </Box>
            ) : null}

            {errorMessage ? (
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                    <Typography variant="body2" color="error" sx={{ textAlign: 'center' }}>
                        {errorMessage}
                    </Typography>
                </Box>
            ) : data?.data ? (
                <Box
                    ref={svgContainer}
                    sx={{
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden',
                        '& svg': { width: '100%', height: '100%', display: 'block' },
                    }}
                    dangerouslySetInnerHTML={{ __html: data.data }}
                />
            ) : (
                <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                        No molecule to display
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

MoleculeDisplay.propTypes = {
    data: PropTypes.object,
    isLoading: PropTypes.bool,
    error: PropTypes.string,
    selectedBonds: PropTypes.array,
    onBondClick: PropTypes.func,
    selectableBonds: PropTypes.bool,
    selectableMolecules: PropTypes.bool,
    selectedFragment: PropTypes.number,
};




export const MoleculeDisplayContainer = ({
    smiles,
    selectedBonds = [],
    queryParams = {},
    onStatusChange = null,
    onBondClick = null,
    selectableBonds = false,
    selectableMolecules = false,
    selectedFragment = -1,
    enablePanZoom = true,

    // Layout
    defaultSize = 360,
    reserveSpaceWhenEmpty = true,
}) => {

    const isEmptySmiles =
        smiles == null ||
        (typeof smiles === 'string' && smiles.trim().length === 0) ||
        (Array.isArray(smiles) && smiles.length === 0);

    // Layout sizing: keep the container square and responsive.
    // Do not size the container based on the SVG request width/height.
    const layoutSize = Math.max(260, Number(defaultSize) || 360);

    const { data, isLoading, error } = useFetchMolecule(isEmptySmiles ? null : smiles, queryParams);

    const lastStatusRef = useRef({ isLoading: null, error: null, isEmptySmiles: null });
    useEffect(() => {
        if (typeof onStatusChange !== 'function') return;
        const next = {
            isLoading: Boolean(!isEmptySmiles && isLoading),
            error: !isEmptySmiles ? (error || null) : null,
            isEmptySmiles: Boolean(isEmptySmiles),
        };
        const prev = lastStatusRef.current;
        const changed =
            prev.isLoading !== next.isLoading ||
            prev.error !== next.error ||
            prev.isEmptySmiles !== next.isEmptySmiles;

        if (changed) {
            lastStatusRef.current = next;
            onStatusChange(next);
        }
    }, [onStatusChange, isLoading, error, isEmptySmiles]);

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    if (isEmptySmiles && !reserveSpaceWhenEmpty) {
        return null;
    }

    return (
        <Box sx={{ position: 'relative', width: '100%', maxWidth: { xs: '100%', sm: layoutSize }, mx: 'auto' }}>
            <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 3, display: 'flex', gap: 1 }}>
                <Tooltip title="Enlarge view">
                    <span>
                        <IconButton
                            size="small"
                            onClick={() => setIsPreviewOpen(true)}
                            disabled={isEmptySmiles}
                            sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}
                        >
                            <ZoomInIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>

            <Box
                sx={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                }}
            >
                <MoleculeDisplay
                    data={isEmptySmiles ? null : data}
                    isLoading={isEmptySmiles ? false : isLoading}
                    error={isEmptySmiles ? null : error}
                    selectedBonds={selectedBonds}
                    onBondClick={onBondClick}
                    selectableBonds={selectableBonds}
                    selectableMolecules={selectableMolecules}
                    selectedFragment={selectedFragment}
                    enablePanZoom={enablePanZoom}
                />
            </Box>

            {isPreviewOpen ? (
                <EnlargedMoleculePreviewDialog
                    open={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    smiles={smiles}
                    queryParams={queryParams}
                    selectedBonds={selectedBonds}
                    onBondClick={onBondClick}
                    selectableBonds={selectableBonds}
                    selectableMolecules={selectableMolecules}
                    selectedFragment={selectedFragment}
                    enablePanZoom={enablePanZoom}
                />
            ) : null}
        </Box>
    );
};


const EnlargedMoleculePreviewDialog = ({
    open,
    onClose,
    smiles,
    queryParams,
    selectedBonds,
    onBondClick,
    selectableBonds,
    selectableMolecules,
    selectedFragment,
    enablePanZoom,
}) => {
    const isEmptySmiles =
        smiles == null ||
        (typeof smiles === 'string' && smiles.trim().length === 0) ||
        (Array.isArray(smiles) && smiles.length === 0);

    const preferredSize = computePreferredSizeFromSmiles(typeof smiles === 'string' ? smiles : '');
    const previewSize = Math.min(1600, Math.max(900, Math.round(preferredSize * 1.8)));

    const { data, isLoading, error } = useFetchMolecule((open && !isEmptySmiles) ? smiles : null, queryParams);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
            <DialogTitle sx={{ pr: 6 }}>
                Enlarged view
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ width: '100%', maxWidth: previewSize, mx: 'auto' }}>
                    <Box sx={{ width: '100%', aspectRatio: '1 / 1' }}>
                        <MoleculeDisplay
                            data={data}
                            isLoading={isLoading}
                            error={error}
                            selectedBonds={selectedBonds}
                            onBondClick={onBondClick}
                            selectableBonds={selectableBonds}
                            selectableMolecules={selectableMolecules}
                            selectedFragment={selectedFragment}
                            enablePanZoom={enablePanZoom}
                        />
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
};


EnlargedMoleculePreviewDialog.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
    smiles: PropTypes.any,
    queryParams: PropTypes.object,
    selectedBonds: PropTypes.array,
    onBondClick: PropTypes.func,
    selectableBonds: PropTypes.bool,
    selectableMolecules: PropTypes.bool,
    selectedFragment: PropTypes.number,
    enablePanZoom: PropTypes.bool,
};


MoleculeDisplayContainer.propTypes = {
    smiles: PropTypes.any,
    selectedBonds: PropTypes.array,
    queryParams: PropTypes.object,
    onBondClick: PropTypes.func,
    selectableBonds: PropTypes.bool,
    selectableMolecules: PropTypes.bool,
    selectedFragment: PropTypes.number,
    enablePanZoom: PropTypes.bool,
    defaultSize: PropTypes.number,
    reserveSpaceWhenEmpty: PropTypes.bool,
};




export const MolDisplayer = ({
    smiles,
    selectedBonds = [],
    queryParams = {},
    onBondClick = null,
    selectableBonds = false,
    selectableMolecules = false,
    selectedFragment = -1,
}) => {
    const baseURL = `${API_URL}/molecules/svg-rendering`;
    const params = new URLSearchParams();
    const payload = JSON.stringify({ smiles });
    const isSelectableBonds = selectableBonds;
    const isSelectableMolecules = selectableMolecules;

    // Update queryParams
    for (const [key, value] of Object.entries(queryParams)) {
        if (Array.isArray(value)) {
            value.forEach(val => params.append(key, val));
        } else if (value !== undefined && value !== null) {
            params.append(key, value);
        }
    }

    const url = `${baseURL}?${params.toString()}`;
    const { data, isLoading, error } = useFetchData(url, payload);
    const svgContainer = useRef(null);


    const addClassName = (targetSelector, newClassName) => {
        const targets = svgContainer.current.querySelectorAll(targetSelector);
        targets.forEach((bond) => {
            bond.classList.add(newClassName);
        });
    }

    const removeClassName = (targetSelector, className) => {
        const targets = svgContainer.current.querySelectorAll(targetSelector);
        targets.forEach((bond) => {
            bond.classList.remove(className);
        });
    }

    useEffect(() => {
        // Add event listeners if the SVG is rendered and the handlers are provided
        if (svgContainer.current && onBondClick) {
            svgContainer.current.addEventListener('click', onBondClick, true);
        };

        // Cleanup: Remove the event listeners when SVG changes or the component unmounts
        return () => {
            if (svgContainer.current && onBondClick) {
                svgContainer.current.removeEventListener('click', onBondClick, true);
            }
        };
    }, [smiles, onBondClick]);


    useEffect(() => {  // make bonds visually selectable
        if (!svgContainer.current || !isSelectableBonds) return;
        addClassName('.bond-highlight-path', 'selectable');

        return () => {
            if (!svgContainer.current) return
            removeClassName('.bond-highlight-path', 'selectable');
        };
    })

    useEffect(() => {   // make molecules visually selectable
        if (!svgContainer.current || !isSelectableMolecules) return;
        addClassName('g.group-molecule', 'selectable');

        return () => {
            if (!svgContainer.current) return
            removeClassName('g.group-molecule', 'selectable');
        };
    })

    useEffect(() => {
        // Select the SVG container
        if (!selectedBonds.length || !svgContainer.current) return;

        // Add 'selected' class to groups matching selectedBonds indices
        selectedBonds.forEach((idx) => {
            const bondGroup = svgContainer.current.querySelector(`g.group-bond-${idx}`);
            if (bondGroup) {
                bondGroup.classList.add('selected');
            }
        });

        return () => {
            if (svgContainer.current) {
                // Remove 'selected' class from all <g> elements to reset
                const allBondGroups = svgContainer.current.querySelectorAll('g.group-bond');
                allBondGroups.forEach((group) => {
                    group.classList.remove('selected');
                });
            }
        };
    });

    useEffect(() => {
        // Select the SVG container
        if (selectedFragment === -1 || !svgContainer.current) return;
        addClassName(`.molecule-${selectedFragment}`, 'selected');

        return () => {
            if (!svgContainer.current) return
            removeClassName(`g.molecule-${selectedFragment}`, 'selected');
        };
    });

    if (!smiles.length) return;

    return (
        <>
            {isLoading && <p>Loading...</p>}

            {/* Render the SVG if available */}
            {data && (
                <div className="w-80 h-80 border mx-auto mt-2 bg-white">
                    <div
                        ref={svgContainer}
                        className='w-full h-full overflow-hidden'
                        dangerouslySetInnerHTML={{ __html: data.data }} /> {/* Inject SVG into the DOM */}
                </div>
            )}

            {/* Error handling */}
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </>
    )
}
