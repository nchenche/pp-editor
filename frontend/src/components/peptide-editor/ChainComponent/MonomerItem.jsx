import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Close';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Box, Tooltip } from "@mui/material";
import QuestionMarkSharpIcon from '@mui/icons-material/QuestionMarkSharp';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { LINK_COLORS } from './linkColors';
import { getMonomerTag, getSequenceMonomerTagSx } from '../../../utils/monomerTagStyles';
import { CELL_WIDTH, CELL_HEIGHT } from './cellSizeTokens';

// Style helpers (use classnames library if you want more dynamic combinations)
// Uses CSS variables set by parent (ChainSlots) for width/height; falls back to tokens.
const containerBase = [
    "monomer-item", "relative", "flex", "items-center", "justify-center",
    "border", "border-slate-400", "rounded-md", "text-[0.6rem]",
    "select-none", "cursor-pointer", "shadow-md",
].join(" ");

// Inline style for cell sizing (applied in MonomerContent)
const cellSizeStyle = {
    width: `var(--pp-cell-w, ${CELL_WIDTH}px)`,
    height: `var(--pp-cell-h, ${CELL_HEIGHT}px)`,
};



const capBase = [
    "absolute", "flex", "items-center", "justify-center", "bottom-0", "translate-y-[90%]",
    "text-white", "text-[0.4rem]", "font-medium", "rounded-full", "w-6"
].join(" ");

// Main component
const MonomerItemComponent = (props) => {
    const theme = useTheme();

    const {
        monomer,
        index,
        onDelete,
        residueIndex = null,
        isNterCap = false,
        isCterCap = false,
        chainIdLabel = null,
        aaSeqId = null,
        linkIndices = [],
        linkColorIndexById = {},
        setSelectedMonomer, // <-- assumed to be passed if you want selection logic!
        isHovered = false, // <-- default to false if not passed
        handleMonomerEnter,
        handleMonomerLeave,
        dndDisabled = false,
    } = props;

    const [isSelected, setIsSelected] = useState(false);
    const isCapped = isNterCap || isCterCap;

    // Derive monomer tag for type-based coloring
    const monomerTag = useMemo(() => getMonomerTag(monomer), [monomer]);
    const tagSx = useMemo(
        () => getSequenceMonomerTagSx(monomerTag, theme, { isHovered, isSelected }),
        [monomerTag, theme, isHovered, isSelected]
    );

    // Swap menu state
    const swapBtnRef = useRef(null);
    const [swapAnchorEl, setSwapAnchorEl] = useState(null);
    const swapMenuOpen = Boolean(swapAnchorEl);

    const containerClasses = [
        containerBase,
        isHovered && "outline outline-1 outline-slate-600",
        isSelected && "outline outline-2 outline-slate-800/80 shadow-md bg-slate-300/40 z-20"
    ].filter(Boolean).join(" ");


    const handleOpenSwapMenu = useCallback((e) => {
        e.stopPropagation();
        // Store a function that returns the ref, not the DOM node directly
        setSwapAnchorEl(() => swapBtnRef.current);

    }, []);

    const handleCloseSwapMenu = useCallback(() => {
        setSwapAnchorEl(null);
        handleMonomerLeave(monomer['res-idx']);
    }, []);

    useEffect(() => () => setSwapAnchorEl(null), []);

    // Keep selection in sync with global replace flow
    useEffect(() => {
        const onBegin = (e) => {
            const targetIdx = e.detail?.monomer?.['res-idx'];
            if (targetIdx === monomer['res-idx']) setIsSelected(true);
            else setIsSelected(false);
        };
        const onCancel = () => setIsSelected(false);

        window.addEventListener('pp-begin-replace-selection', onBegin);
        window.addEventListener('pp-replace-selection-cancel', onCancel);
        return () => {
            window.removeEventListener('pp-begin-replace-selection', onBegin);
            window.removeEventListener('pp-replace-selection-cancel', onCancel);
        };
    }, [monomer]);



    const capClassName = [
        capBase,
        isNterCap ? "bg-green-400" : "bg-blue-400"
    ].join(" ");

    const dragAreaClasses = [
        'px-1 py-[2px] rounded select-none flex flex-col items-center justify-center leading-none',
        dndDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        isCapped && 'opacity-60',
    ].filter(Boolean).join(' ');
    const effectiveResidueIndex = useMemo(() => {
        const n = Number(residueIndex);
        if (Number.isFinite(n) && n > 0) return n;

        const raw = monomer?.['res-idx'] != null ? String(monomer['res-idx']) : '';
        if (raw.includes('-')) {
            const parts = raw.split('-');
            const idx = parseInt(parts?.[1], 10);
            if (Number.isFinite(idx)) return idx + 1;
        }

        return null;
    }, [residueIndex, monomer]);

    const handleDelete = useCallback((e) => {
        e.stopPropagation();
        onDelete(monomer);
        setIsSelected(false);
    }, [onDelete, monomer]);

    const handleReplace = useCallback((e) => {
        e.stopPropagation();
        setIsSelected((s) => !s);
        setSelectedMonomer && setSelectedMonomer(monomer);
    }, [setSelectedMonomer, monomer]);

    const handleContextMenuFocus = useCallback((e) => {
        const raw = monomer?.['res-idx'] != null ? String(monomer['res-idx']) : '';
        // Match existing Mol* hover/highlight mapping:
        // label_seq_id = parseInt(resIdx.split('-')[1]) + 1
        let seq = NaN;
        if (raw.includes('-')) {
            const parts = raw.split('-');
            const idx = parseInt(parts?.[1], 10);
            if (Number.isFinite(idx)) seq = idx + 1;
        }
        if (!Number.isFinite(seq)) {
            const maybe = Number(aaSeqId);
            if (Number.isFinite(maybe)) seq = maybe;
        }
        if (!Number.isFinite(seq) || seq < 1) return;

        e.preventDefault();
        e.stopPropagation();

        const debug = {
            source: 'designed-peptide',
            monomerPdbName: monomer?.pdbName,
            monomerResIdx: raw,
            computedLabelSeqId: seq,
            chainIdLabel,
            aaSeqId,
        };
        // User-requested: log which labels we use for focusing
        // eslint-disable-next-line no-console
        console.debug('[pp-focus-residue] dispatch', debug);

        window.dispatchEvent(new CustomEvent('pp-focus-residue', {
            detail: {
                target: 'main',
                seqId: seq,
                debug,
            }
        }));
    }, [chainIdLabel, aaSeqId]);

    // Custom drag style: fast drop animation
    const getStyle = (draggableProps, snapshot) => {
        const style = draggableProps?.style;
        if (!snapshot.isDropAnimating || !style || !style.transform) return style;
        return { ...style, transition: 'transform 0.001s ease-in-out' };
    };

    // Extracted content block, used by both draggable/non-draggable versions
    const MonomerContent = useMemo(() => ({ provided = {}, snapshot = {} }) => (
        <div
            className={containerClasses}
            ref={provided.innerRef}
            {...provided.draggableProps}
            style={(() => {
                const dndStyle = provided && snapshot ? getStyle(provided.draggableProps, snapshot) : {};
                // Merge cell size + tag-based background/stripe with dnd styles
                const tagStyles = {
                    ...cellSizeStyle,
                    backgroundColor: tagSx.backgroundColor,
                    boxShadow: tagSx.boxShadow,
                };
                const merged = { ...tagStyles, ...dndStyle };
                if (!isSelected) return merged;
                const current = Number(merged?.zIndex);
                const boosted = Number.isFinite(current) ? Math.max(current, 3) : 3;
                return { ...merged, zIndex: boosted };
            })()}
            onPointerEnter={() => handleMonomerEnter(monomer['res-idx'])}
            onPointerLeave={() => { if (!swapMenuOpen) handleMonomerLeave(monomer['res-idx']); }}
            onContextMenu={handleContextMenuFocus}
        >
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    inset: -2,                 // show ring cleanly around the card
                    borderRadius: 1,
                    pointerEvents: 'none',
                    opacity: isSelected ? 1 : 0,
                    border: (t) => `2px solid ${alpha(t.palette.primary.dark, t.palette.mode === 'dark' ? 0.55 : 0.5)}`,
                    boxShadow: (t) =>
                        isSelected
                            ? `0 0 0 4px ${alpha(t.palette.primary.dark, 0.16)},
              0 2px 10px ${alpha(t.palette.common.black, 0.22)}`
                            : 'none',
                    backgroundColor: (t) => (isSelected ? alpha(t.palette.primary.light, 0.06) : 'transparent'),
                    transition: 'opacity 140ms ease, box-shadow 140ms ease, background-color 140ms ease',
                    zIndex: 0,
                }}
            />
            {/* Monomer label (grab handle if draggable) */}
            <div className={dragAreaClasses} {...(!isCapped && !dndDisabled ? provided.dragHandleProps : {})}>
                <Typography
                    variant="caption"
                    component="div"
                    sx={{
                        fontWeight: 700,
                        fontSize: '0.62rem',
                        lineHeight: 1.15,
                        color: 'text.primary',
                    }}
                >
                    {monomer.pdbName}
                </Typography>
                {effectiveResidueIndex != null ? (
                    <Typography
                        variant="caption"
                        component="div"
                        sx={{
                            fontSize: '0.46rem',
                            lineHeight: 1,
                            color: 'text.secondary',
                            mt: '1px',
                        }}
                    >
                        {effectiveResidueIndex}
                    </Typography>
                ) : null}
            </div>

            {/* Cap tag */}
            {isCapped && <span className={capClassName}>CAP</span>}

            {/* Bond indices display */}
            {Array.isArray(linkIndices) && linkIndices.length > 0 && (
                <div className='flex items-center justify-around absolute bottom-0 translate-y-[70%] w-7 h-3 gap-x-[0.2em]'>
                    {linkIndices.map((linkId) => {
                        const idx = linkColorIndexById?.[linkId];
                        const colorIdx = Number.isFinite(idx)
                            ? (idx % LINK_COLORS.length)
                            : (Number(linkId) % LINK_COLORS.length);
                        return (
                        <span
                            key={linkId}
                            style={{ background: LINK_COLORS[colorIdx] }}
                            className="rounded w-[0.47em] h-[0.47em] mx-[1px] border border-stone-800"
                        />
                        );
                    })}
                </div>
            )}

            {/* Actions: delete and replace, shown on hover */}
            {(isHovered || swapMenuOpen) && (
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translate(-50%, -75%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.1,
                        p: 0.55,
                        pointerEvents: 'auto',
                    }}
                >
                    <Tooltip title="Replace monomer" arrow placement="top">
                        <span>
                            <IconButton
                                ref={swapBtnRef}
                                size="small"
                                aria-label="Replace monomer"
                                onClick={handleOpenSwapMenu}
                                aria-haspopup="menu"
                                aria-controls={swapMenuOpen ? 'swap-menu' : undefined}
                                aria-expanded={swapMenuOpen ? 'true' : undefined}
                                tabIndex={-1}
                                sx={{ p: 0.2, fontSize: 13 }}
                            >
                                <SwapHorizIcon fontSize="inherit" />
                            </IconButton>
                        </span>
                    </Tooltip>

                    {/* Info */}
                    <Tooltip
                        arrow
                        placement="top"
                        enterDelay={150}
                        title={
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'auto 1fr',
                                    columnGap: 1,
                                    rowGap: 0.25,
                                    fontSize: 12,
                                }}
                            >
                                <Box sx={{ color: 'white', fontWeight: 400 }}>Name:</Box>
                                <Box>{monomer?.m_name ?? '-'}</Box>
                                <Box sx={{ color: 'white', fontWeight: 400 }}>BILN symbol:</Box>
                                <Box>{monomer?.m_abbr ?? '-'}</Box>
                            </Box>
                        }
                    >
                        <span>
                            <IconButton
                                size="small"
                                aria-label="Monomer info"
                                tabIndex={-1}
                                sx={{ p: 0.2, fontSize: 13 }}
                            >
                                <QuestionMarkSharpIcon fontSize="inherit" />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <Tooltip title="Delete monomer" arrow placement="top">
                        <span>
                            <IconButton
                                size="small"
                                aria-label="Delete monomer"
                                onClick={handleDelete}
                                tabIndex={-1}
                                sx={{ p: 0.2, fontSize: 13 }}
                            >
                                <DeleteIcon fontSize="inherit" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>
            )}

            {/* Replace menu - use function anchorEl for safety */}
            <Menu
                id="swap-menu"
                open={swapMenuOpen}
                anchorEl={swapMenuOpen ? (() => swapBtnRef.current) : swapAnchorEl}
                onClose={handleCloseSwapMenu}
                keepMounted
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                MenuListProps={{ dense: true }}
                slotProps={{ paper: { sx: { minWidth: 200, p: 0.5 } } }}
                disablePortal
            >
                <MenuItem disabled sx={{ opacity: 0.85, cursor: 'default', '&:hover': { bgcolor: 'transparent' } }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
                        Replace with...
                    </Typography>
                </MenuItem>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem
                    onClick={() => {
                        setIsSelected(true); // ensure highlight on selection
                        if (props.onBeginReplaceSelection) {
                            // props.onBeginReplaceSelection('analog', monomer);
                        } else {
                            window.dispatchEvent(new CustomEvent('pp-begin-replace-selection', { detail: { mode: 'analog', monomer } }));
                        }
                        handleCloseSwapMenu();
                    }}
                >
                    Analog monomer
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        setIsSelected(true); // ensure highlight on selection
                        if (props.onBeginReplaceSelection) {
                            // props.onBeginReplaceSelection('other', monomer);
                        } else {
                            window.dispatchEvent(new CustomEvent('pp-begin-replace-selection', { detail: { mode: 'other', monomer } }));
                        }
                        handleCloseSwapMenu();
                    }}
                >
                    Other
                </MenuItem>
            </Menu>
        </div>
    ), [
        containerClasses,
        dragAreaClasses,
        capClassName,
        isCapped,
        isHovered,
        monomer,
        effectiveResidueIndex,
        linkIndices,
        linkColorIndexById,
        handleMonomerEnter,
        handleMonomerLeave,
        handleDelete,
        swapMenuOpen,
        handleOpenSwapMenu,
        handleCloseSwapMenu,
        isSelected,
        handleContextMenuFocus,
    ]);

    // If capped, not draggable
    if (isCapped) return <MonomerContent />;

    return (
        <Draggable draggableId={monomer['res-idx'].toString()} index={index} isDragDisabled={dndDisabled}>
            {(provided, snapshot) => <MonomerContent provided={provided} snapshot={snapshot} />}
        </Draggable>
    );
};

export const MonomerItem = memo(MonomerItemComponent);
