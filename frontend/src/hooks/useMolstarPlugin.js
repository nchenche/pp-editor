import { useRef, useEffect, useState } from "react";
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { DefaultPluginSpec } from 'molstar/lib/mol-plugin/spec';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { Color } from 'molstar/lib/mol-util/color';

function normalizeBackgroundColor(value) {
    if (value == null) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return Color(value);

    const v = String(value).trim().toLowerCase();
    if (!v) return null;
    if (v === 'light' || v === 'white') return Color(0xffffff);
    if (v === 'dark' || v === 'black') return Color(0x000000);
    return null;
}

export function useMolstarPlugin(options = {}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const pluginRef = useRef(null);
    const [pluginInitialized, setPluginInitialized] = useState(false);
    const [error, setError] = useState(null);

    const backgroundColor = options?.backgroundColor;

    useEffect(() => {
        let disposed = false;

        const initPlugin = async () => {
            try {
                // Custom spec disables volume streaming for lighter load.
                const spec = DefaultPluginSpec();
                spec.config = [
                    [PluginConfig.VolumeStreaming.Enabled, false],
                    [PluginConfig.Viewport.ShowControls, 'right'], // 'compact' | 'right' | 'left'
                    [PluginConfig.Viewport.ShowExpand, true],
                    [PluginConfig.Viewport.ShowSettings, true],
                    [PluginConfig.Viewport.ShowSelectionMode, true],
                    [PluginConfig.Viewport.ShowScreenshot, true],
                ];
                spec.layout = { initial: { isExpanded: true, showControls: true } };

                const plugin = new PluginContext(spec);
                await plugin.init();

                const initViewer = plugin.initViewer(canvasRef.current, containerRef.current);
                if (!initViewer) {
                    throw new Error('Failed to initialize MolStar viewer');
                } 

                pluginRef.current = plugin;
                window.plugin = plugin; // for debugging

                if (!disposed) setPluginInitialized(true);
            } catch (err) {
                if (!disposed) setError(err.message);
            }
        };

        if (canvasRef.current && containerRef.current) {
            initPlugin();
        }

        return () => {
            disposed = true;
            if (pluginRef.current) {
                try {
                    pluginRef.current.dispose();
                    pluginRef.current = null;
                } catch (e) {
                    // ignore
                }
            }
        };
    }, []);

    useEffect(() => {
        if (!pluginInitialized) return;
        const plugin = pluginRef.current;
        if (!plugin?.canvas3d?.setProps) return;

        const bg = normalizeBackgroundColor(backgroundColor);
        if (bg == null) return;

        try {
            const prevRenderer = plugin.canvas3d.props?.renderer || {};
            plugin.canvas3d.setProps({
                transparentBackground: false,
                renderer: {
                    ...prevRenderer,
                    backgroundColor: bg,
                },
            });
        } catch {
            // ignore
        }
    }, [pluginInitialized, backgroundColor]);

    return { pluginRef, canvasRef, containerRef, pluginInitialized, error };
}
