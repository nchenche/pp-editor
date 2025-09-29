import React from "react";
import { DragDropContext, Droppable } from '@hello-pangea/dnd';


import { MonomerSequence } from './MonomerSequence';

export const MonomerTrack = ({
    rowMonomerLists,
    activeSeqIdx,
    handleAddingMonomer,
    onSetActiveSeqIdx,
    linkMap,
    hoveredMonomer,
    handleDeleteMonomerItem,
    onDragEnd,
    handleMonomerEnter,
    handleMonomerLeave,
    onDragStart,
}) => {
    return (
        <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
            {rowMonomerLists.map((list, seqIdx) => (
                <div
                    key={seqIdx}
                    onClick={() => onSetActiveSeqIdx(seqIdx)}
                    className={seqIdx === activeSeqIdx ? 'ring-1 ring-slate-300 rounded-md' : ''}
                >
                    <Droppable droppableId={`${seqIdx}`} direction='horizontal' className='border border-stone-500'>
                        {(provided, snapshot) => (
                            <MonomerSequence
                                {...provided.droppableProps}
                                droppableRef={provided.innerRef}
                                monomers={list}
                                linkMap={linkMap}
                                isActive={seqIdx === activeSeqIdx}
                                hoveredMonomer={hoveredMonomer}
                                onDelete={handleDeleteMonomerItem}
                                handleMonomerEnter={handleMonomerEnter}
                                handleMonomerLeave={handleMonomerLeave}
                                label={`Sequence ${seqIdx + 1}`}
                            >
                                {provided.placeholder}
                            </MonomerSequence>
                        )}
                    </Droppable>
                </div>
            ))}
        </DragDropContext>
    )
};


// export const MonomerTrack = (props) => {
//   console.log("MonomerTrack rowMonomerLists:", props.rowMonomerLists);
//   return <pre>{JSON.stringify(props.rowMonomerLists, null, 2)}</pre>;
// };
