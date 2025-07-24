import React from "react";
import { Droppable } from '@hello-pangea/dnd';
import { MonomerList } from './Monomers';

export const MonomerRows = ({
    rowMonomerLists,
    activeSeqIdx,
    onSetActiveSeqIdx,
    linkMap,
    handleMonomerHover,
    hoveredMonomer,
    handleDeleteMonomerItem,
}) => (
    <>
        {rowMonomerLists.map((list, seqIdx) => (
            <div
                key={seqIdx}
                onMouseEnter={() => onSetActiveSeqIdx(seqIdx)}
                className={seqIdx === activeSeqIdx ? 'ring-1 ring-blue-300 rounded-md' : ''}
            >
                <Droppable droppableId={`${seqIdx}`} direction='horizontal' className='border border-stone-500'>
                    {(provided, snapshot) => (
                        <MonomerList
                            {...provided.droppableProps}
                            droppableRef={provided.innerRef}
                            monomers={list}
                            linkMap={linkMap}
                            handleMonomerHover={handleMonomerHover}
                            hoveredMonomer={hoveredMonomer}
                            onDelete={handleDeleteMonomerItem}
                        >
                            {provided.placeholder}
                        </MonomerList>
                    )}
                </Droppable>
            </div>
        ))}
    </>
);
