import { useLayoutEffect, useRef, useState, useCallback } from 'react';

export function useSplitLayout({
    initialEditorHeight = 320,
    minEditorHeight = 240,
    minViewerRowHeight = 240,  // Minimum height for the viewer row (headers + canvas areas)
    minViewerPanelWidth = 200,
    initialViewerSplitRatio = 0.5,
    storageKey = 'pp-editor:split-layout:v1',
} = {}) {
    const didHydrateFromStorageRef = useRef(false);

    const readStored = useCallback(() => {
        try {
            const raw = window?.localStorage?.getItem(storageKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            return parsed;
        } catch {
            return null;
        }
    }, [storageKey]);

    const [editorAreaHeight, setEditorAreaHeight] = useState(() => {
        const stored = readStored();
        const v = stored?.editorAreaHeight;
        return Number.isFinite(v) ? v : initialEditorHeight;
    });

    const [viewerSplitRatio, setViewerSplitRatio] = useState(() => {
        const stored = readStored();
        const v = stored?.viewerSplitRatio;
        return Number.isFinite(v) ? v : initialViewerSplitRatio;
    });

    // Refs for latest values (used by mouseup handler to persist without stale closures).
    const editorAreaHeightRef = useRef(editorAreaHeight);
    const viewerSplitRatioRef = useRef(viewerSplitRatio);
    useLayoutEffect(() => { editorAreaHeightRef.current = editorAreaHeight; }, [editorAreaHeight]);
    useLayoutEffect(() => { viewerSplitRatioRef.current = viewerSplitRatio; }, [viewerSplitRatio]);

    // Track whether we hydrated from storage (to avoid overwriting on first layout).
    useLayoutEffect(() => {
        const stored = readStored();
        didHydrateFromStorageRef.current = !!stored;
    }, [readStored]);

    const mainAreaRef = useRef(null);
    const viewerRowRef = useRef(null);
    const isDraggingRef = useRef({ type: null });

    const clampViewerSplitRatio = useCallback(() => {
        if (!viewerRowRef.current) return;
        const rect = viewerRowRef.current.getBoundingClientRect();
        const width = rect?.width;
        if (!Number.isFinite(width) || width <= 0) return;
        // Clamp such that both panels are at least minViewerPanelWidth.
        const minX = minViewerPanelWidth;
        const maxX = Math.max(minX, width - minViewerPanelWidth);
        setViewerSplitRatio((prev) => {
            const ratio = Number(prev);
            if (!Number.isFinite(ratio)) return minX / width;
            const x = ratio * width;
            const clampedX = Math.min(Math.max(x, minX), maxX);
            return clampedX / width;
        });
    }, [minViewerPanelWidth]);

    useLayoutEffect(() => {
        if (!mainAreaRef.current) return;

        // If we restored a size from storage, keep it (but clamp to current bounds).
        if (didHydrateFromStorageRef.current) {
            const { height } = mainAreaRef.current.getBoundingClientRect();
            if (!Number.isFinite(height) || height <= 0) return;
            setEditorAreaHeight((prev) => {
                const next = Number(prev);
                if (!Number.isFinite(next)) return Math.max(minEditorHeight, height * 0.5);
                // Clamp: at least minEditorHeight, at most height - minViewerRowHeight
                const clamped = Math.min(Math.max(next, minEditorHeight), Math.max(minEditorHeight, height - minViewerRowHeight));
                return clamped;
            });
            return;
        }

        const { height } = mainAreaRef.current.getBoundingClientRect();
        setEditorAreaHeight(Math.max(minEditorHeight, height * 0.5));
    }, [minEditorHeight, minViewerRowHeight]);

    // Ensure restored split ratio is valid for the current width.
    useLayoutEffect(() => {
        clampViewerSplitRatio();
        const onResize = () => clampViewerSplitRatio();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [clampViewerSplitRatio]);

    const persistToStorage = useCallback(() => {
        try {
            const payload = {
                editorAreaHeight: editorAreaHeightRef.current,
                viewerSplitRatio: viewerSplitRatioRef.current,
            };
            window?.localStorage?.setItem(storageKey, JSON.stringify(payload));
        } catch {
            // ignore
        }
    }, [storageKey]);

    const onDrag = useCallback(
        (e) => {
            const { type } = isDraggingRef.current;
            if (!type) return;

            if (type === 'horizontal') {
                if (!mainAreaRef.current) return;
                const rect = mainAreaRef.current.getBoundingClientRect();
                // Clamp editor height: min editor height, max leaves room for viewer row
                const next = Math.min(
                    Math.max(e.clientY - rect.top, minEditorHeight),
                    rect.height - minViewerRowHeight,
                );
                console.log('Setting editor viewer row height:', rect.height - next);
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

        // Persist the final values after the drag completes.
        persistToStorage();
    }, [onDrag, persistToStorage]);

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