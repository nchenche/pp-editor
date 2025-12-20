import { useLayoutEffect, useRef, useState, useCallback } from 'react';

export function useSplitLayout({
    initialEditorHeight = 320,
    minEditorHeight = 240,
    minViewerPanelWidth = 200,
    initialViewerSplitRatio = 0.5,
} = {}) {
    const [editorAreaHeight, setEditorAreaHeight] = useState(initialEditorHeight);
    const [viewerSplitRatio, setViewerSplitRatio] = useState(initialViewerSplitRatio);

    const mainAreaRef = useRef(null);
    const viewerRowRef = useRef(null);
    const isDraggingRef = useRef({ type: null });

    useLayoutEffect(() => {
        if (!mainAreaRef.current) return;
        const { height } = mainAreaRef.current.getBoundingClientRect();
        setEditorAreaHeight(Math.max(minEditorHeight, height * 0.5));
    }, [minEditorHeight]);

    const onDrag = useCallback(
        (e) => {
            const { type } = isDraggingRef.current;
            if (!type) return;

            if (type === 'horizontal') {
                if (!mainAreaRef.current) return;
                const rect = mainAreaRef.current.getBoundingClientRect();
                const next = Math.min(
                    Math.max(e.clientY - rect.top, 140),
                    rect.height - 140,
                );
                setEditorAreaHeight(next);
            } else if (type === 'vertical') {
                if (!viewerRowRef.current) return;
                const rect = viewerRowRef.current.getBoundingClientRect();
                const x = Math.min(
                    Math.max(e.clientX - rect.left, minViewerPanelWidth),
                    rect.width - minViewerPanelWidth,
                );
                setViewerSplitRatio(x / rect.width);
            }
        },
        [minViewerPanelWidth],
    );

    const stopDrag = useCallback(() => {
        isDraggingRef.current = { type: null };
        window.removeEventListener('mousemove', onDrag);
        window.removeEventListener('mouseup', stopDrag);
    }, [onDrag]);

    const startDrag = useCallback(
        (type) => (e) => {
            e.preventDefault();
            isDraggingRef.current = { type };
            window.addEventListener('mousemove', onDrag);
            window.addEventListener('mouseup', stopDrag);
        },
        [onDrag, stopDrag],
    );

    return {
        editorAreaHeight,
        viewerSplitRatio,
        setViewerSplitRatio,
        mainAreaRef,
        viewerRowRef,
        startDrag,
    };
}