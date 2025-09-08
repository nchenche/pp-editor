import { useEffect, useState, useRef, useMemo, memo } from 'react';

import { Draggable } from '@hello-pangea/dnd';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';


const MonomerItemComponent = (props) => {
    const {
        monomer,
        index,
        hoveredMonomer,
        handleMonomerHover,
        onDelete,
        isNterCap = false,
        isCterCap = false,
    } = props;


    const linkColors = [
        "#3A86FF", // Vivid Blue
        "#FFBE0B", // Vivid Yellow
        "#E63946", // Red
        "#F1A208", // Gold
        "#2A9D8F", // Teal
        "#457B9D", // Blue
        "#8E44AD", // Purple
        "#F4A261", // Orange
        "#6D6875", // Muted Lavender
        "#43AA8B", // Greenish Teal
        "#386641", // Dark Green
        "#B5179E", // Magenta
        "#FF006E", // Pink
        "#8338EC", // Vivid Purple
        "#264653", // Dark Slate
        "#1FAB89", // Mint Green
        "#EF476F", // Bright Pink
        "#06D6A0", // Soft Teal
        "#118AB2", // Blue Gray
        "#FFD166", // Pastel Yellow
    ];

    const monomerBondIndices = monomer.bond_idx;
    const [isSelectedMonomer, setIsSelectedMonomer] = useState(false);

    const isHovered = monomer['res-idx'] === hoveredMonomer;
    const isCapped = isNterCap || isCterCap;

    // Build container class names.
    let containerClasses =
        "monomer-item relative flex items-center justify-center border border-slate-600 h-5 w-8 rounded-md text-[0.67rem] select-none bg-lime-50 cursor-pointe shadow-sm";
    if (isHovered) containerClasses += " outline outline-1 outline-slate-600";
    if (isSelectedMonomer) containerClasses += " outline outline-1 outline-slate-400 shadow-lg bg-lime-100";

    let capClassName = "absolute flex items-center justify-center bottom-0 translate-y-[80%] bg-blue-400 text-white text-[0.5rem] font-medium rounded-full w-6";
    capClassName += isNterCap ? " bg-green-400" : " bg-blue-400";

    let dragAreaClasses = "relative text-center";
    if (!isCapped) dragAreaClasses += " cursor-grab";

    const handleOnDelete = () => onDelete(monomer);

    function getStyle(draggableProps, snapshot) {
        const style = draggableProps?.style;
        if (!snapshot.isDropAnimating || !style || !style.transform) {
            return style;
        }
        return {
            ...style,
            transition: 'transform 0.001s ease-in-out',
        };
    }

    const MonomerContent = ({ provided = {}, snapshot = {} }) => {
        const style = provided && snapshot ? getStyle(provided.draggableProps, snapshot) : {};

        return (
            <div
                className={containerClasses}
                onMouseEnter={(e) => {
                    // Only hover if not already hovered
                    if (hoveredMonomer !== monomer['res-idx']) {
                        handleMonomerHover(monomer['res-idx']);
                    }
                }}
                onMouseLeave={(e) => {
                    if (hoveredMonomer) {
                        handleMonomerHover('');
                    }
                }}

                ref={provided.innerRef}
                {...provided.draggableProps}
                style={style}
            >
                <div className={dragAreaClasses} {...(isCapped ? {} : provided.dragHandleProps)} >
                    {monomer.pdbName}
                </div>

                {isCapped && <span className={capClassName}>CAP</span>}

                {/* Pellet connection flag */}
                {monomerBondIndices.length > 0 && !snapshot.isDropAnimating && (
                    <div className='flex items-center justify-around absolute bottom-0 translate-y-[50%] w-7 h-3 ap-x-[0.2em]'>
                        {monomerBondIndices.map((linkId) => (

                            <span
                                key={linkId}
                                style={{ background: linkColors[linkId] }}
                                className="rounded w-[0.47em] h-[0.47em] mx-[1px] border border-stone-800"
                            />
                        ))}
                    </div>
                )}


                {/* Delete button */}
                {isHovered && (
                    <button
                        className="absolute top-0 translate-y-[-110%] right-0 translate-x-[25%] text-slate-500 hover:text-slate-900 hover:scale-110"
                        aria-label="Delete monomer"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOnDelete();
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 pointer-events-none">
                            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                        </svg>
                    </button>
                )}

                {isHovered && (
                    <button
                        className="absolute top-0 left-0 translate-x-[-0%] translate-y-[-100%]"
                        aria-label="Replace monomer"
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log(monomer);
                            setIsSelectedMonomer(!isSelectedMonomer);
                            setSelectedMonomer(monomer);
                        }}
                    >
                        <SwapHorizIcon sx={{ fontSize: 14 }} className="text-slate-500 hover:text-slate-900" />
                    </button>
                )}
            </div>
        );
    };

    // Return non-draggable when capped
    if (isCapped) {
        return <MonomerContent />;
    }

    // Return draggable when not capped
    return (
        <Draggable draggableId={monomer['res-idx'].toString()} index={index}>
            {(provided, snapshot) => <MonomerContent provided={provided} snapshot={snapshot} />}
        </Draggable>
    );
}


export const MonomerItem = memo(MonomerItemComponent);