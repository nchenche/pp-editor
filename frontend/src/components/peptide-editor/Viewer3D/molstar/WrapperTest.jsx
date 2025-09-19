import { useEffect, useRef, useState } from 'react';

import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { renderReact18 } from "molstar/lib/mol-plugin-ui/react18";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { PluginConfig } from 'molstar/lib/mol-plugin/config';
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec';
import { PluginSpec } from 'molstar/lib/mol-plugin/spec';

// BasicMolstarWrapper.jsx
import React, { useImperativeHandle, forwardRef } from 'react';

// Mol* imports (UI build; adjust paths if you use a different bundle layout)
import { PluginCommands } from 'molstar/lib/mol-plugin/commands';
// import { BuiltInTrajectoryFormat } from 'molstar/lib/mol-plugin-state/formats/trajectory';
import { AnimateModelIndex } from 'molstar/lib/mol-plugin-state/animation/built-in/model-index';

import { Script } from 'molstar/lib/mol-script/script';
import { Color } from 'molstar/lib/mol-util/color';
import { Asset } from 'molstar/lib/mol-util/assets';

import { EmptyLoci } from 'molstar/lib/mol-model/loci';
import { StructureSelection } from 'molstar/lib/mol-model/structure';

// Optional PDBe behavior (safe to omit if not needed)
// import { PDBeStructureQualityReport } from 'molstar/lib/extensions/pdbe';

// Mol* UI styles
import "molstar/lib/mol-plugin-ui/skin/light.scss";
import 'molstar/build/viewer/molstar.css';

/**
 * Props:
 * - showControls (boolean): whether to show the Mol* left control panel
 * - initialExpanded (boolean): start expanded layout
 * - registerThemes (function): optional fn(plugin) to register custom color themes/providers
 * - onReady (function): called with plugin instance once ready
 * - className / style: container styles
 */
const BasicMolstarWrapper = forwardRef(function BasicMolstarWrapper(
    {
        showControls = false,
        initialExpanded = false,
        registerThemes, // optional: (plugin: PluginUIContext) => void
        onReady,
        className = '',
        style = { width: '100%', height: 500 },
    },
    ref
) {
    const hostRef = useRef(null);
    const pluginRef = useRef(null);

    // init once
    useEffect(() => {
        let cancelled = false;

        (async () => {
            const target = hostRef.current;
            if (!target) return;

            const plugin = await createPluginUI({
                target,
                render: renderReact18,
                // spec: {
                //     ...DefaultPluginUISpec(),
                //     layout: {
                //         initial: {
                //             isExpanded: initialExpanded,
                //             showControls,
                //         },
                //     },
                //     components: {
                //         remoteState: 'none',
                //     },
                // },
            });

            if (cancelled) return;

            pluginRef.current = plugin;

            // Optionally register custom themes/providers/labels etc.
            if (typeof registerThemes === 'function') {
                try { registerThemes(plugin); } catch (e) { console.warn('registerThemes failed:', e); }
            }

            if (onReady) onReady(plugin);
        })();

        return () => { cancelled = true; };
    }, [showControls, initialExpanded, registerThemes, onReady]);

    // --- Imperative API exposed to parent via ref ---
    useImperativeHandle(ref, () => {
        const plugin = () => {
            if (!pluginRef.current) throw new Error('Mol* plugin not ready yet.');
            return pluginRef.current;
        };

        const animateModelIndexTargetFps = (fps = 8) => Math.max(1, fps | 0);

        return {
            /** Clear and load a structure/trajectory */
            load: async ({ url, format = ('mmcif'), isBinary = false, assemblyId = '' }) => {
                const p = plugin();
                await p.clear();

                const data = await p.builders.data.download(
                    { url: Asset.Url(url), isBinary },
                    { state: { isGhost: true } }
                );
                const traj = await p.builders.structure.parseTrajectory(data, format);

                await p.builders.structure.hierarchy.applyPreset(traj, 'default', {
                    structure: assemblyId
                        ? { name: 'assembly', params: { id: assemblyId } }
                        : { name: 'model', params: {} },
                    showUnitcell: false,
                    representationPreset: 'auto',
                });
            },

            /** Set canvas background color from a 0xRRGGBB number */
            setBackground: (rgbNumber) => {
                const p = plugin();
                PluginCommands.Canvas3D.SetSettings(p, {
                    settings: props => {
                        props.renderer.backgroundColor = Color(rgbNumber);
                    },
                });
            },

            /** Toggle trackball spin */
            toggleSpin: () => {
                const p = plugin();
                if (!p.canvas3d) return;

                const tb = p.canvas3d.props.trackball;
                PluginCommands.Canvas3D.SetSettings(p, {
                    settings: {
                        trackball: {
                            ...tb,
                            animate: tb.animate.name === 'spin'
                                ? { name: 'off', params: {} }
                                : { name: 'spin', params: { speed: 1 } },
                        },
                    },
                });
                if (p.canvas3d.props.trackball.animate.name !== 'spin') {
                    PluginCommands.Camera.Reset(p, {});
                }
            },

            /** Model-index animations */
            animate: {
                modelIndex: {
                    playOnceForward: (fps = 8) => {
                        const p = plugin();
                        p.managers.animation.play(AnimateModelIndex, {
                            duration: { name: 'computed', params: { targetFps: animateModelIndexTargetFps(fps) } },
                            mode: { name: 'once', params: { direction: 'forward' } },
                        });
                    },
                    playOnceBackward: (fps = 8) => {
                        const p = plugin();
                        p.managers.animation.play(AnimateModelIndex, {
                            duration: { name: 'computed', params: { targetFps: animateModelIndexTargetFps(fps) } },
                            mode: { name: 'once', params: { direction: 'backward' } },
                        });
                    },
                    palindrome: (fps = 8) => {
                        const p = plugin();
                        p.managers.animation.play(AnimateModelIndex, {
                            duration: { name: 'computed', params: { targetFps: animateModelIndexTargetFps(fps) } },
                            mode: { name: 'palindrome', params: {} },
                        });
                    },
                    loop: (fps = 8) => {
                        const p = plugin();
                        p.managers.animation.play(AnimateModelIndex, {
                            duration: { name: 'computed', params: { targetFps: animateModelIndexTargetFps(fps) } },
                            mode: { name: 'loop', params: { direction: 'forward' } },
                        });
                    },
                    stop: () => plugin().managers.animation.stop(),
                },
            },

            /** Coloring helpers */
            coloring: {
                // Apply default color theme to all components
                applyDefault: async () => {
                    const p = plugin();
                    await p.dataTransaction(async () => {
                        for (const s of p.managers.structure.hierarchy.current.structures) {
                            await p.managers.structure.component
                                .updateRepresentationsTheme(s.components, { color: 'default' });
                        }
                    });
                },
                // Apply a custom color theme by name (must be registered)
                applyThemeByName: async (themeName) => {
                    const p = plugin();
                    await p.dataTransaction(async () => {
                        for (const s of p.managers.structure.hierarchy.current.structures) {
                            await p.managers.structure.component
                                .updateRepresentationsTheme(s.components, { color: themeName });
                        }
                    });
                },
            },

            /** Interactivity helpers */
            interactivity: {
                // Highlight residue(s) by seq_id (example uses seq_id & groups by residue)
                highlightSeqId: (seq_id = 7, structureIndex = 0) => {
                    const p = plugin();
                    const data = p.managers.structure.hierarchy.current.structures[structureIndex]?.cell.obj?.data;
                    if (!data) return;

                    const sel = Script.getStructureSelection(Q =>
                        Q.struct.generator.atomGroups({
                            'residue-test': Q.core.rel.eq([Q.struct.atomProperty.macromolecular.label_seq_id(), seq_id]),
                            'group-by': Q.struct.atomProperty.macromolecular.residueKey(),
                        }), data);

                    const loci = StructureSelection.toLociWithSourceUnits(sel);
                    p.managers.interactivity.lociHighlights.highlightOnly({ loci });
                },
                clearHighlight: () => {
                    const p = plugin();
                    p.managers.interactivity.lociHighlights.highlightOnly({ loci: EmptyLoci });
                },
            },

            /** Misc. tests & toasts (trim/add as you like) */
            tests: {
                showToast: (title = 'Hello', message = 'This is a toast', key = 'toast-1', timeoutMs = 3000) => {
                    const p = plugin();
                    PluginCommands.Toast.Show(p, { title, message, key, timeoutMs });
                },
                hideToast: (key = 'toast-1') => {
                    const p = plugin();
                    PluginCommands.Toast.Hide(p, { key });
                },
                // toggleValidationTooltip: () => {
                //   const p = plugin();
                //   return p.state.updateBehavior(PDBeStructureQualityReport, params => {
                //     params.showTooltip = !params.showTooltip;
                //   });
                // },
            },

            /** Access the raw plugin if you need it */
            getPlugin: () => pluginRef.current,
        };
    }, []);

    return (
        // <div
        //     ref={hostRef}
        //     className={className}
        //     style={style}
        // />
        <div className="molstar-viewer mx-auto text-center relative">
            <div ref={hostRef} style={{ width: 400, height: 400 }} />
        </div>
    );
});

export default BasicMolstarWrapper;



export function MolStarWrapper() {
    const parent = useRef(null);

    const defaultSpec = DefaultPluginUISpec();

    const molstarSpec = {
        ...defaultSpec,

        layout: {
            initial: {
                isExpanded: false,
                showControls: true,
                controlsDisplay: 'reactive',
                regionState: {
                    top: 'full',
                    bottom: 'hidden',
                    left: 'collapsed',
                    right: 'full',
                },
            },
        },
        components: {
            remoteState: 'none',
            disableDragOverlay: true,
        },
        behaviors: [
            ...defaultSpec.behaviors,
        ],
        config: [
            [PluginConfig.VolumeStreaming.Enabled, false],
        ],
    };


    // In debug mode of react's strict mode, this code will
    // be called twice in a row, which might result in unexpected behavior.
    useEffect(() => {
        async function init() {
            window.molstar = await createPluginUI({
                target: parent.current,
                // spec: molstarSpec,
                render: renderReact18,
            });

            const data = await window.molstar.builders.data.download(
                { url: "https://files.rcsb.org/download/3PTB.pdb" }, /* replace with your URL */
                { state: { isGhost: true } }
            );
            const trajectory = await window.molstar.builders.structure.parseTrajectory(data, "pdb");
            await window.molstar.builders.structure.hierarchy.applyPreset(
                trajectory,
                "default"
            );
        }
        init();
        return () => {
            window.molstar?.dispose();
            window.molstar = undefined;
        };
    }, []);

    return (
        <div className="molstar-viewer mx-auto text-center relative">
            <div ref={parent} style={{ width: 400, height: 400 }} />
        </div>
    );
}

