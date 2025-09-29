import { memo, useState, useCallback, useMemo } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Close';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

// Use outside the component, only defined once
const LINK_COLORS = [
    "#3A86FF", "#FFBE0B", "#E63946", "#F1A208", "#2A9D8F",
    "#457B9D", "#8E44AD", "#F4A261", "#6D6875", "#43AA8B",
    "#386641", "#B5179E", "#FF006E", "#8338EC", "#264653",
    "#1FAB89", "#EF476F", "#06D6A0", "#118AB2", "#FFD166"
];

// Style helpers (use classnames library if you want more dynamic combinations)
const containerBase = [
    "monomer-item", "relative", "flex", "items-center", "justify-center",
    "border", "border-slate-600", "h-5", "w-8", "rounded-md", "text-[0.67rem]",
    "select-none", "bg-lime-50", "cursor-pointe", "shadow-sm", 
].join(" ");

const capBase = [
    "absolute", "flex", "items-center", "justify-center", "bottom-0", "translate-y-[80%]",
    "text-white", "text-[0.5rem]", "font-medium", "rounded-full", "w-6"
].join(" ");

// Main component
const MonomerItemComponent = (props) => {
    // console.log("Rendering MonomerItem:");

    const {
        monomer,
        index,
        onDelete,
        isNterCap = false,
        isCterCap = false,
        setSelectedMonomer, // <-- assumed to be passed if you want selection logic!
        isHovered = false, // <-- default to false if not passed
        handleMonomerEnter,
        handleMonomerLeave,
    } = props;

    const [isSelected, setIsSelected] = useState(false);

    const isCapped = isNterCap || isCterCap;

    const containerClasses = [
        containerBase,
        isHovered && "outline outline-1 outline-slate-600",
        isSelected && "outline outline-1 outline-slate-400 shadow-lg bg-lime-100"
    ].filter(Boolean).join(" ");

    const capClassName = [
        capBase,
        isNterCap ? "bg-green-400" : "bg-blue-400"
    ].join(" ");

    const dragAreaClasses = [
        "relative", "text-center", !isCapped && "cursor-grab"
    ].filter(Boolean).join(" ");

    const handleDelete = useCallback((e) => {
        e.stopPropagation();
        onDelete(monomer);
    }, [onDelete, monomer]);

    const handleReplace = useCallback((e) => {
        e.stopPropagation();
        setIsSelected((s) => !s);
        setSelectedMonomer && setSelectedMonomer(monomer);
    }, [setSelectedMonomer, monomer]);

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
            style={provided && snapshot ? getStyle(provided.draggableProps, snapshot) : {}}
            onPointerEnter={() => handleMonomerEnter(monomer['res-idx'])}
            onPointerLeave={() => handleMonomerLeave(monomer['res-idx'])}
        >
            {/* Monomer label (grab handle if draggable) */}
            <div className={dragAreaClasses} {...(!isCapped ? provided.dragHandleProps : {})}>
                {monomer.pdbName}
            </div>

            {/* Cap tag */}
            {isCapped && <span className={capClassName}>CAP</span>}

            {/* Bond indices display */}
            {Array.isArray(monomer.bond_idx) && monomer.bond_idx.length > 0 && !snapshot.isDropAnimating && (
                <div className='flex items-center justify-around absolute bottom-0 translate-y-[50%] w-7 h-3 gap-x-[0.2em]'>
                    {monomer.bond_idx.map(linkId => (
                        <span
                            key={linkId}
                            style={{ background: LINK_COLORS[linkId % LINK_COLORS.length] }}
                            className="rounded w-[0.47em] h-[0.47em] mx-[1px] border border-stone-800"
                        />
                    ))}
                </div>
            )}

            {/* Actions: delete and replace, shown on hover */}
            {isHovered && (
                <>
                    <IconButton
                        size="small"
                        aria-label="Delete monomer"
                        onClick={handleDelete}
                        tabIndex={-1}
                        style={{ position: 'absolute', bottom: 0, right: 0, transform: 'translateY(-55%) translateX(30%)', pointerEvents: 'auto' }}
                    >
                        <DeleteIcon
                            style={{ fontSize: '0.9rem' }}
                        />
                    </IconButton>

                    <IconButton
                        size="small"
                        aria-label="Replace monomer"
                        onClick={handleReplace}
                        tabIndex={-1}
                        style={{ position: 'absolute', bottom: 0, left: 0, transform: 'translateY(-55%) translateX(-30%)', pointerEvents: 'auto' }}
                    >
                        <SwapHorizIcon
                            style={{ fontSize: '0.9rem' }}
                        />
                    </IconButton>
                </>
            )}
        </div>
    ), [containerClasses, dragAreaClasses, capClassName, isCapped, isHovered, monomer, handleMonomerEnter, handleMonomerLeave, handleDelete, handleReplace]);

    // If capped, not draggable
    if (isCapped) return <MonomerContent />;

    return (
        <Draggable draggableId={monomer['res-idx'].toString()} index={index}>
            {(provided, snapshot) => <MonomerContent provided={provided} snapshot={snapshot} />}
        </Draggable>
    );
};

export const MonomerItem = memo(MonomerItemComponent);
