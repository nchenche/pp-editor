import { useCallback } from "react";

import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Box } from "@mui/material";

import { useOverlayPortal } from "../../../components/common/OverlayPortalContext";
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
    handleDeleteSequence,
    constraintsMode = false,
    constraintsBySeq = [],
    onEditConstraint = () => { },
}) => {

    const { overlayActive } = useOverlayPortal();
    const makeDeleteHandler = useCallback((idx) => () => handleDeleteSequence(idx), [handleDeleteSequence]);

    return (
        <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
            {rowMonomerLists.map((list, seqIdx) => (
                <Box
                    key={seqIdx}
                    onClick={() => onSetActiveSeqIdx(seqIdx)}
                    className={seqIdx === activeSeqIdx ? 'ring-1 ring-slate-300 rounded-md' : ''}
                    sx={{
                        position: 'relative',
                        // Put the active sequence above the overlay (modal ~1300)
                        zIndex: (t) => (overlayActive && seqIdx === activeSeqIdx) ? t.zIndex.modal + 2 : 'auto',
                        // Smooth visual lift; z-index itself can’t animate
                        transform: (overlayActive && seqIdx === activeSeqIdx) ? 'translateY(-2px) scale(1.01)' : 'none',
                        boxShadow: (overlayActive && seqIdx === activeSeqIdx)
                            ? '0 8px 18px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.18)'
                            : 'none',
                        transition: 'transform 180ms ease, box-shadow 180ms ease',
                        // willChange: 'transform, box-shadow',
                    }}
                >
                    <Droppable
                        droppableId={`${seqIdx}`}
                        direction='horizontal'
                        className='border border-stone-500'
                        isDropDisabled={overlayActive}
                    >
                        {(provided, snapshot) => (
                            <MonomerSequence
                                {...provided.droppableProps}
                                droppableRef={provided.innerRef}
                                monomers={list}
                                linkMap={linkMap}
                                isActive={seqIdx === activeSeqIdx}
                                hoveredMonomer={overlayActive ? null : hoveredMonomer}
                                onDelete={handleDeleteMonomerItem}
                                handleMonomerEnter={overlayActive ? () => { } : handleMonomerEnter}
                                handleMonomerLeave={overlayActive ? () => { } : handleMonomerLeave}
                                onDeleteSequence={makeDeleteHandler(seqIdx)}
                                label={`Chain ${seqIdx + 1}`}
                                dndDisabled={overlayActive}
                                constraintsMode={constraintsMode}
                                constraints={constraintsBySeq?.[seqIdx] ?? []}
                                onEditConstraint={(idx, val) => onEditConstraint?.(seqIdx, idx, val)}
                            >
                                {provided.placeholder}
                            </MonomerSequence>
                        )}
                    </Droppable>
                </Box>
            ))}
        </DragDropContext>
    )
};


// export const MonomerTrack = (props) => {
//   console.log("MonomerTrack rowMonomerLists:", props.rowMonomerLists);
//   return <pre>{JSON.stringify(props.rowMonomerLists, null, 2)}</pre>;
// };
