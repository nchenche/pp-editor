import { useRef, useEffect, useState } from "react";
import { PluginContext } from 'molstar/lib/mol-plugin/context';
import { DefaultPluginSpec } from 'molstar/lib/mol-plugin/spec';
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { Color } from 'molstar/lib/mol-util/color';

export function useMolstarPlugin() {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const pluginRef = useRef(null);
    const [pluginInitialized, setPluginInitialized] = useState(false);
    const [error, setError] = useState(null);

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

                if (!plugin.initViewer(canvasRef.current, containerRef.current)) {
                    throw new Error('Failed to initialize MolStar viewer');
                }                

                pluginRef.current = plugin;

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

    return { pluginRef, canvasRef, containerRef, pluginInitialized, error };
}
