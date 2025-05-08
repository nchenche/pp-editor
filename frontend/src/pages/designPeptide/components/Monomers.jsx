import { useEffect, useState, useRef } from 'react';
import { log } from '../../../utils/dev';

import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    arrayMove,
    horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';



export const _MonomerItem = ({
    monomer,
    hoveredMonomer,
    handleMonomerHover,
    extrema,
    selectedMonomer,
    setSelectedMonomer,
    handleMonomerLinking
}) => {
    const isHovered = monomer['res-idx'] === hoveredMonomer;
    const isSelected = selectedMonomer ? selectedMonomer['res-idx'] === monomer['res-idx'] : false;
    const [hoveredBranch, setHoveredBranch] = useState(null);

    // Determine whether branching groups are present:
    const hasR3 = monomer.m_RgroupIdx && monomer.m_RgroupIdx[2] != null;
    const hasR4 = monomer.m_RgroupIdx && monomer.m_RgroupIdx[3] != null;

    console.log(monomer);


    // Build container class names.
    let containerClasses =
        "relative text-md border border-slate-500 h-fit min-w-8 text-center w-fit py-1 px-2 rounded-lg font-medium text-[0.8rem] select-none cursor-pointer";
    if (isHovered) containerClasses += " outline outline-2";
    if (isSelected) containerClasses += " selected-monomer bg-yellow-200/50 ";
    if (extrema.isNter) containerClasses += " is-n-ter";
    if (extrema.isCter) containerClasses += " is-c-ter";
    if (hasR3) containerClasses += " has-r3";
    if (hasR4) containerClasses += " has-r4";

    const handleR3Click = (e) => {
        if (!selectedMonomer) {
            setSelectedMonomer(monomer);
        } else {
            handleMonomerLinking(selectedMonomer, monomer);
            setSelectedMonomer(null);
        }
    };

    const handleClick = (e) => {
        // console.log(monomer.m_abbr, monomer.m_attachmentPointIdx);
        console.log(monomer.m_abbr, monomer.m_attachmentPointIdx.map((idx) => idx !== null ? idx + monomer.offset : null));
        console.log(monomer);
    };

    return (
        <div
            className={containerClasses}
            onMouseEnter={() => handleMonomerHover(monomer['res-idx'])}
            onMouseLeave={() => handleMonomerHover('')}
            onClick={handleClick}
        >
            {monomer.m_abbr}

            {/* N-terminal indicator: two spans for circle and line */}
            {extrema && extrema.isNter && (
                <>
                    <span className="absolute nter-circle" />
                    <span className="absolute nter-line" />
                </>
            )}
            {/* C-terminal indicator: two spans for circle and line */}
            {extrema && extrema.isCter && (
                <>
                    <span className="absolute cter-circle" />
                    <span className="absolute cter-line" />
                </>
            )}
            {/* R3 indicator with its own hover logic */}
            {hasR3 && (
                <div
                    className=""
                    onMouseEnter={(e) => {
                        setHoveredBranch('r3');
                    }}
                    onMouseLeave={(e) => {
                        setHoveredBranch(null);
                    }}
                    onClick={handleR3Click}
                >
                    <span
                        className={`absolute r3-circle ${hoveredBranch === 'r3' ? 'branch-highlight' : ''}`}
                    />
                    <span
                        className={`absolute r3-line ${hoveredBranch === 'r3' ? 'branch-highlight' : ''}`}
                    />
                </div>
            )}
            {/* R4 indicator with its own hover logic */}
        </div>
    );
}


export const MonomerItem = ({
    monomer,
    hoveredMonomer,
    handleMonomerHover,
    onDelete,
    dragListeners = {},
    dragAttributes = {}
}) => {
    const isHovered = monomer['res-idx'] === hoveredMonomer;

    const handleOnDelete = () => {
        onDelete(monomer);
    }

    // Build container class names.
    let containerClasses =
        "relative text-md border border-slate-500 h-fit min-w-8 text-center w-fit py-[0.05rem] px-[0.4rem] rounded-md  text-[0.75rem] select-none cursor-pointer";
    if (isHovered) containerClasses += " outline outline-2 outline-slate-500";

    return (
        <div
            className={containerClasses}
            onMouseEnter={() => handleMonomerHover(monomer['res-idx'])}
            onMouseLeave={() => handleMonomerHover('')}
        >
            {/* Draggable area */}
            <div
                className="cursor-grab text-center"
                {...dragAttributes}
                {...dragListeners}
            >
                {monomer.pdbName}
            </div>

            {/* ✕ icon appears only on hover */}
            {isHovered && (
                <button
                    className="absolute -top-[18px] -right-1 p-1 text-slate-500 hover:text-slate-900 hover:scale-110 "
                    aria-label="Delete monomer"
                    onClick={(e) => {
                        e.stopPropagation();   // keep parent click/drag unaffected
                        handleOnDelete();
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 pointer-events-none">
                        <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                    </svg>

                </button>
            )}
        </div>
    );
}



export const _MonomerList = ({
    monomers,
    monomerListRef,
    handleMonomerHover,
    hoveredMonomer,
    selectedMonomer,
    setSelectedMonomer,
    handleMonomerLinking,
    onDelete
}) => {
    return (
        <div
            ref={monomerListRef}
            className='flex min-h-12 border p-2 gap-x-1 m-1'
        >
            {monomers.map((monomer, index) => {
                const isNter = index === 0 ? true : false;
                const isCter = index === monomers.length - 1 ? true : false;
                return (
                    <MonomerItem
                        key={monomer['res-idx']}
                        monomer={monomer}
                        hoveredMonomer={hoveredMonomer}
                        handleMonomerHover={handleMonomerHover}
                        extrema={{ isNter, isCter }}
                        selectedMonomer={selectedMonomer}
                        setSelectedMonomer={setSelectedMonomer}
                        handleMonomerLinking={handleMonomerLinking}
                        onDelete={onDelete}
                    />
                )
            })}
        </div>
    );
}


function SortableMonomerItem(props) {
    const { monomer } = props;
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: monomer['res-idx'],
        disabled: false,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    };

    return (
        <div ref={setNodeRef} style={style}>
            <MonomerItem {...props} dragListeners={listeners} dragAttributes={attributes} />
        </div>
    );
}


export const MonomerList = ({
    monomers,
    monomerListRef,
    handleMonomerHover,
    hoveredMonomer,
    selectedMonomer,
    setSelectedMonomer,
    handleMonomerLinking,
    onDelete,
    onReorder
}) => {

    const sensors = useSensors(useSensor(PointerSensor));

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = monomers.findIndex((m) => m['res-idx'] === active.id);
        const newIndex = monomers.findIndex((m) => m['res-idx'] === over.id);

        const newOrder = arrayMove(monomers, oldIndex, newIndex);
        console.log('Reordered monomers:', oldIndex, newIndex, newOrder.map((m) => m['res-idx']));
        onReorder(newOrder);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={monomers.map((m) => m['res-idx'])}
                strategy={horizontalListSortingStrategy}
            >
                <div ref={monomerListRef} className="flex min-h-12 border p-2 gap-x-1 m-1">
                    {monomers.map((monomer, idx) => (
                        <SortableMonomerItem
                            key={monomer['res-idx']}
                            monomer={monomer}
                            hoveredMonomer={hoveredMonomer}
                            handleMonomerHover={handleMonomerHover}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
