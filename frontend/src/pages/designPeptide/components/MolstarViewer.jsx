import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

import { useMolstarPlugin } from '../../../hooks/useMolstarPlugin';
import { useMolstarStructure } from '../../../hooks/useMolstarStructure';
import { useMolstarSelection } from '../../../hooks/useMolstarSelection';

import { RepresentationSelector } from "./molstar/RepresentationSelector";
import { ColorSchemeSelector } from "./molstar/ColorSchemeSelector";
import { BackgroundSelector } from "./molstar/BackgroundSelector";


const MolStarViewer = ({
    pdbFile,
    blobFile,
    pdbId,
    pdbURL,
    pdbRawData,
    hoveredMonomer,
    handleMonomerHover,
    defaultRepresentation = 'ball-and-stick',
    defaultColorScheme = 'chain-id',
    height = '400px',
    width = '400px'
}) => {

    const [representation, setRepresentation] = useState(defaultRepresentation);
    const [colorScheme, setColorScheme] = useState(defaultColorScheme);
    const [background, setBackground] = useState(() => {
        try {
            const raw = window?.localStorage?.getItem('pp-editor:molstar-background:v1');
            const v = String(raw || '').trim().toLowerCase();
            return v === 'dark' ? 'dark' : 'light';
        } catch {
            return 'light';
        }
    });

    useEffect(() => {
        try {
            window?.localStorage?.setItem('pp-editor:molstar-background:v1', String(background));
        } catch {
            // ignore
        }
    }, [background]);

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
        defaultRepresentation: representation,
        defaultColorScheme: colorScheme
    });

    useMolstarSelection({
        pluginRef,
        pluginInitialized,
        hoveredMonomer,
        handleMonomerHover,
    });

    // Load structure once the plugin is initialized and whenever the source props change.
    useEffect(() => {
        if (pluginInitialized) {
            if (pdbId) loadFromPdbId(pdbId);
            else if (pdbFile) loadFromPdbFile(pdbFile);
            else if (blobFile) loadFromBlob(blobFile);
            else if (pdbURL) loadFromURL(pdbURL);
            else if (pdbRawData) loadFromRawData(pdbRawData);
        }
    }, [pluginInitialized, pdbId, pdbFile, blobFile, pdbURL, pdbRawData]);

    return (
        <div className="molstar-viewer mx-auto text-center">
            {/* <h3 className="text-lg font-medium mb-2">Mol* Viewer</h3> */}

            {/* <div>
                <input
                    type="text"
                    value={seqId}
                    onChange={(e) => setSeqId(e.target.value)}
                    placeholder="Residue ID to select"
                    className="w-64 p-2 border rounded text-sm mb-2"
                />
            </div> */}

            <div
                ref={containerRef}
                style={{
                    position: 'relative',
                    width: width,
                    height: height,
                    margin: '0 auto',
                    display: 'block',
                    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)',
                }}
            >
                <canvas
                    ref={canvasRef}
                    style={{
                        // position: 'absolute',
                        // top: 0,
                        // left: 0,
                        width: '100%',
                        height: '100%'
                    }}
                />

                {structureLoading && (
                    <div className="loading-overlay" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        zIndex: 10
                    }}>
                        <span>Loading structure...</span>
                    </div>
                )}

                {pluginError && (
                    <div className="error-overlay" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 200, 200, 0.7)',
                        zIndex: 10
                    }}>
                        <span>Error: {pluginError}</span>
                    </div>
                )}
            </div>

            {/* Controls placed *outside* the viewer box to avoid stretching */}
            <div className="absolute controls mt-2 flex gap-4 justify-center -top-2 left-0">
                <RepresentationSelector value={representation} onChange={setRepresentation} />
                <ColorSchemeSelector value={colorScheme} onChange={setColorScheme} />
                <BackgroundSelector value={background} onChange={setBackground} />
            </div>
        </div>
    );
};

export { MolStarViewer };
