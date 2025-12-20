import { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';

import { useMolstarPlugin } from '../../../hooks/useMolstarPlugin';
import { useMolstarStructure } from '../../../hooks/useMolstarStructure';
import { useMolstarSelection } from '../../../hooks/useMolstarSelection';


const Viewer3DInner = ({
    pdbFile,
    blobFile,
    pdbId,
    pdbURL,
    pdbRawData,
    hoveredMonomer,
    handleMonomerHover,
    defaultRepresentation = 'ball-and-stick',
    defaultColorScheme = 'chain-id',
    background = 'light',
    height = '20rem',
    width = '100%',
    isGenerating3D = false,
    error,
}, ref) => {
    const [enabledRepresentations, setEnabledRepresentations] = useState(() => [defaultRepresentation].filter(Boolean));
    const [colorScheme, setColorScheme] = useState(defaultColorScheme);
    const [labelsEnabled, setLabelsEnabled] = useState({ element: false, residue: false, chain: false });
    const [representationAlphaByRep, setRepresentationAlphaByRep] = useState({});

    const { pluginRef, canvasRef, containerRef, pluginInitialized, error: pluginError } = useMolstarPlugin({
        backgroundColor: background,
    });
    const {
        structure,
        loading: structureLoading,
        error: structureError,
        loadFromPdbId,
        loadFromPdbFile,
        loadFromRawData,
        loadFromBlob,
        loadFromURL,
    } = useMolstarStructure(pluginRef, {
        enabledRepresentations,
        defaultColorScheme: colorScheme,
        labelsEnabled,
        representationAlphaByRep,
    });

    useMolstarSelection({
        pluginRef,
        pluginInitialized,
        hoveredMonomer,
        handleMonomerHover,
    });

    // Imperative API
    useImperativeHandle(ref, () => ({
        resetZoom: () => pluginRef.current?.canvas3d?.requestCameraReset?.(),
        orientAxes: () => pluginRef.current?.managers.camera.orientAxes(undefined, 0),
        resetAxes: () => pluginRef.current?.managers.camera.resetAxes(),
        resize: () => pluginRef.current?.canvas3d?.requestResize?.(),
        // Legacy: exclusive representation (kept for compatibility)
        setRepresentation: (type) => setEnabledRepresentations([type].filter(Boolean)),
        // New: multi-representation control
        setRepresentationEnabled: (type, enabled) => {
            const rep = String(type || '').trim();
            if (!rep) return;
            setEnabledRepresentations(prev => {
                const arr = Array.isArray(prev) ? prev : [];
                const has = arr.includes(rep);
                if (enabled && has) return arr;
                if (!enabled && !has) return arr;
                if (enabled) return [...arr, rep];
                return arr.filter(x => x !== rep);
            });
        },
        toggleRepresentation: (type) => {
            const rep = String(type || '').trim();
            if (!rep) return;
            setEnabledRepresentations(prev => {
                const arr = Array.isArray(prev) ? prev : [];
                return arr.includes(rep) ? arr.filter(x => x !== rep) : [...arr, rep];
            });
        },
        getEnabledRepresentations: () => enabledRepresentations,
        setLabelEnabled: (level, enabled) => {
            if (!level) return;
            setLabelsEnabled((prev) => ({ ...prev, [String(level)]: !!enabled }));
        },
        getLabelsEnabled: () => labelsEnabled,
        // Back-compat: treat "atom labels" as element labels
        setAtomLabelsEnabled: (enabled) => setLabelsEnabled((prev) => ({ ...prev, element: !!enabled })),
        toggleAtomLabels: () => setLabelsEnabled((prev) => ({ ...prev, element: !prev.element })),
        getAtomLabelsEnabled: () => !!labelsEnabled.element,
        setColorScheme: (scheme) => setColorScheme(scheme),
        setRepresentationAlphaFor: (type, alpha) => {
            const rep = String(type || '').trim();
            if (!rep) return;
            const a = Number(alpha);
            if (!Number.isFinite(a)) return;
            const clamped = Math.min(1, Math.max(0, a));
            setRepresentationAlphaByRep((prev) => ({ ...prev, [rep]: clamped }));
        },
        getRepresentationAlphaFor: (type) => {
            const rep = String(type || '').trim();
            if (!rep) return 1;
            const v = representationAlphaByRep?.[rep];
            return typeof v === 'number' && Number.isFinite(v) ? v : 1;
        },
        takeScreenshot: () => {
            try {
                // Mol* defaults the filename to a placeholder; pass an explicit name.
                pluginRef.current?.helpers?.viewportScreenshot?.download?.('pep-edit_3d.png');
            } catch {
                // ignore
            }
        },
        clear: async () => {
            try { await pluginRef.current?.clear?.(); } catch { }
        },
    }), [pluginRef, enabledRepresentations, labelsEnabled, representationAlphaByRep]);

    // Keep enabled representations in sync when defaultRepresentation prop changes
    useEffect(() => {
        setEnabledRepresentations([defaultRepresentation].filter(Boolean));
    }, [defaultRepresentation]);

    // Load structure once the plugin is initialized and whenever the source props change.
    useEffect(() => {
        if (!pluginInitialized) return;
        if (pdbId) loadFromPdbId(pdbId);
        else if (pdbFile) loadFromPdbFile(pdbFile);
        else if (blobFile) loadFromBlob(blobFile);
        else if (pdbURL) loadFromURL(pdbURL);
        else if (pdbRawData) loadFromRawData(pdbRawData);
        // if nothing provided, do nothing (shows "No structure")
    }, [pluginInitialized, pdbId, pdbFile, blobFile, pdbURL, pdbRawData, loadFromPdbId, loadFromPdbFile, loadFromBlob, loadFromURL, loadFromRawData]);

    // Helper overlay
    const Overlay = ({ children, bg = 'rgba(255,255,255,0.7)' }) => (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            // backgroundColor: bg,
            zIndex: 10
        }}>
            {children}
        </div>
    );

    const showNoStructure = !pdbRawData && !isGenerating3D && !structureLoading;
    const combinedError = error || pluginError || structureError;

    return (
        <div className="molstar-viewer mx-auto text-center absolute inset-0">
            {/* Host container for Mol* plugin */}
            <div
                ref={containerRef}
                className="relative w-full h-full overflow-hidden border border-dashed rounded-lg"
                style={{ width, height }}
            >
                {/* Canvas is always present */}
                <canvas
                    ref={canvasRef}
                    style={{ width: '100%', height: '100%'}}
                />

                {/* {showNoStructure && (
                    <Overlay bg="transparent">
                        <div className="text-xl text-slate-500">No structure</div>
                    </Overlay>
                )} */}

                {/* {combinedError && (
                    <Overlay bg="rgba(255, 200, 200, 0.7)">
                        <span className="text-red-700">Error: {String(combinedError)}</span>
                    </Overlay>
                )} */}
            </div>
        </div>
    );
};

const Viewer3D = forwardRef(Viewer3DInner);
export { Viewer3D };