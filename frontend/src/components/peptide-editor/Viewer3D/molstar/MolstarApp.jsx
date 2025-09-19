import { useRef, useState } from 'react';
import BasicMolstarWrapper from './WrapperTest';

function registerMyThemes(plugin) {
    // optional; keep empty
}

export function MolstarApp() {
    const viewerRef = useRef(null);
    const [loading, setLoading] = useState(false);

    const load1CRN = async () => {
        try {
            setLoading(true);
            await viewerRef.current.load({
                url: 'https://files.rcsb.org/download/1CRN.cif',
                format: 'mmcif',
                isBinary: false,
                assemblyId: '',
            });
            viewerRef.current.setBackground(0xFFFFFF);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>
            <h2>Mol* in React (Basic Wrapper)</h2>

            <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                <button onClick={load1CRN} disabled={loading}>
                    {loading ? 'Loading…' : 'Load 1CRN (mmCIF)'}
                </button>

                <button onClick={() => viewerRef.current?.toggleSpin()}>
                    Toggle Spin
                </button>

                <button onClick={() => viewerRef.current?.animate.modelIndex.playOnceForward(8)}>
                    Animate Model Index → (once)
                </button>
                <button onClick={() => viewerRef.current?.animate.modelIndex.loop(6)}>
                    Animate Model Index (loop @ 6 fps)
                </button>
                <button onClick={() => viewerRef.current?.animate.modelIndex.stop()}>
                    Stop Animation
                </button>

                <button onClick={() => viewerRef.current?.coloring.applyDefault()}>
                    Default Colors
                </button>
                <button onClick={() => viewerRef.current?.coloring.applyThemeByName('illustrative')}>
                    Custom Theme by Name (e.g. "illustrative")
                </button>

                <button onClick={() => viewerRef.current?.interactivity.highlightSeqId(7)}>
                    Highlight seq_id = 7
                </button>
                <button onClick={() => viewerRef.current?.interactivity.clearHighlight()}>
                    Clear Highlight
                </button>
            </div>

            <BasicMolstarWrapper
                ref={viewerRef}
                showControls={false}
                initialExpanded={false}
                registerThemes={registerMyThemes}
                onReady={() => console.log('Mol* ready')}
                style={{ width: '100%', height: 600, border: '1px solid #ddd', borderRadius: 8 }}
            />
        </div>
    );
}