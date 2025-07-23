import { useEffect, useState, useRef, useMemo } from 'react';
import { log } from '../../../utils/dev';

import { Draggable } from '@hello-pangea/dnd';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';



export const MonomerItem = ({
    monomer,
    index,
    hoveredMonomer,
    handleMonomerHover,
    onDelete,
    isNterCap = false,
    isCterCap = false,
    linkIndices = [],
}) => {
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
    const [selectedMonomer, setSelectedMonomer] = useState(null);
    const [isSelectedMonomer, setIsSelectedMonomer] = useState(false);


    // const getLinkColor = (linkId) => linkColors[(parseInt(linkId, 10) - 1) % linkColors.length];

    const isHovered = monomer['res-idx'] === hoveredMonomer;
    const isCapped = isNterCap || isCterCap;

    // Build container class names.
    let containerClasses =
        "relative flex items-center justify-center border border-slate-600 h-5 w-8 rounded-md text-[0.67rem] select-none bg-lime-50 cursor-pointe shadow-sm";
    if (isHovered) containerClasses += " outline outline-1 outline-slate-600";
    if (isSelectedMonomer) containerClasses += " outline outline-1 outline-slate-400 shadow-lg bg-lime-100";

    let capClassName = "absolute flex items-center justify-center bottom-0 translate-y-[80%] bg-blue-400 text-white text-[0.5rem] font-medium rounded-full w-6";
    capClassName += isNterCap ? " bg-green-400" : " bg-blue-400";

    let dragAreaClasses = "relative text-center";
    if (!isCapped) dragAreaClasses += " cursor-grab";

    const handleOnDelete = () => {
        onDelete(monomer);
    }


    function getStyle(draggableProps, snapshot) {
        const style = draggableProps?.style;

        // If not drop-animating, or there is no transform, just return as is
        if (!snapshot.isDropAnimating || !style || !style.transform) {
            return style;
        }

        let newStyle = {
            ...style,
            transition: 'transform 0.001s ease-in-out',
        };

        // fallback if transform not as expected
        return {
            ...newStyle
        };
    }

    const MonomerContent = ({ provided = {}, snapshot = {} }) => {

        const style = provided && snapshot ? getStyle(provided.draggableProps, snapshot) : {};

        return (
            <div
                className={containerClasses}
                onMouseEnter={() => handleMonomerHover(monomer['res-idx'])}
                onMouseLeave={() => handleMonomerHover('')}
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


export const MonomerList = ({
    monomers,
    linkMap,
    handleMonomerHover,
    hoveredMonomer,
    onDelete,
    children,  // placeholder will be passed here
    droppableRef,
}) => {

    return (
        <div
            ref={droppableRef}
            className='flex min-h-12 border p-2 gap-x-1 m-1'
        >
            {monomers.map((monomer, index) => {
                const isNterCap = monomer.m_subtype === 'cap' && monomer.m_RgroupIdx[1] !== null;
                const isCterCap = monomer.m_subtype === 'cap' && monomer.m_RgroupIdx[0] !== null;

                const monomerIdx = parseInt(monomer['res-idx'].split('-')[1]);

                // Find all link IDs where this monomerIdx appears
                const linkIndices = Object.entries(linkMap)
                    .filter(([linkId, pairs]) => pairs.some(p => p.monomerIdx === monomerIdx))
                    .map(([linkId]) => linkId);

                return (
                    <MonomerItem
                        key={monomer['res-idx']}
                        index={index}
                        monomer={monomer}
                        hoveredMonomer={hoveredMonomer}
                        handleMonomerHover={handleMonomerHover}
                        onDelete={onDelete}
                        isNterCap={isNterCap}
                        isCterCap={isCterCap}
                        linkIndices={linkIndices}
                    />
                )
            })}
            {children}
        </div>
    );
};