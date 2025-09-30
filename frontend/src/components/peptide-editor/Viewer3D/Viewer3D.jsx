import { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';

import { useMolstarPlugin } from '../../../hooks/useMolstarPlugin';
import { useMolstarStructure } from '../../../hooks/useMolstarStructure';
import { useMolstarSelection } from '../../../hooks/useMolstarSelection';

import { RepresentationSelector } from "./molstar/RepresentationSelector";
import { ColorSchemeSelector } from "./molstar/ColorSchemeSelector";

import { CircularProgress } from '@mui/material';

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
    height = '20rem',
    width = '100%',
    isGenerating3D = false,
    error,
}, ref) => {
    const [representation, setRepresentation] = useState(defaultRepresentation);
    const [colorScheme, setColorScheme] = useState(defaultColorScheme);

    const { pluginRef, canvasRef, containerRef, pluginInitialized, error: pluginError } = useMolstarPlugin();
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
        defaultRepresentation: representation,
        defaultColorScheme: colorScheme
    });

    useMolstarSelection({
        pluginRef,
        pluginInitialized,
        hoveredMonomer,
        handleMonomerHover,
    });

    // Imperative API
    useImperativeHandle(ref, () => ({
        resetView: () => pluginRef.current?.canvas3d?.requestCameraReset?.(),
        resize: () => pluginRef.current?.canvas3d?.requestResize?.(),
        setRepresentation: (type) => setRepresentation(type),
        setColorScheme: (scheme) => setColorScheme(scheme),
        clear: async () => {
            try { await pluginRef.current?.clear?.(); } catch { }
        },
    }), [pluginRef]);

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

                {/* Overlays */}
                {isGenerating3D && !pdbRawData && (
                    <Overlay>
                        <div className="flex items-center gap-3 text-slate-800">
                            <CircularProgress size={40} thickness={5} />
                            <span>Generating 3D structure...</span>
                        </div>
                    </Overlay>
                )}

                {/* {structureLoading && (
                    <Overlay>
                        <div className="flex items-center gap-3 text-slate-900">
                            <CircularProgress size={40} thickness={5} />
                        </div>
                    </Overlay>
                )} */}

                {showNoStructure && (
                    <Overlay bg="transparent">
                        <div className="text-xl text-slate-500">No structure</div>
                    </Overlay>
                )}

                {combinedError && (
                    <Overlay bg="rgba(255, 200, 200, 0.7)">
                        <span className="text-red-700">Error: {String(combinedError)}</span>
                    </Overlay>
                )}
            </div>

            {/* Controls placed outside the viewer box */}
            {/* <div className="absolute controls mt-2 flex gap-4 justify-center -top-2 left-0">
                <RepresentationSelector value={representation} onChange={setRepresentation} />
                <ColorSchemeSelector value={colorScheme} onChange={setColorScheme} />
            </div> */}
        </div>
    );
};

const Viewer3D = forwardRef(Viewer3DInner);
export { Viewer3D };