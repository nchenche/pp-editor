import React, { useEffect, useRef, useState } from 'react';

import { Network } from "vis-network";


function VisNetwork() {
    console.log("%c RENDER", "background: blue; color: white");

    const options = {
        physics: {
            enabled: true,
            solver: 'barnesHut',
            barnesHut: {
                gravitationalConstant: -900,
                centralGravity: 0.01,
                springLength: 100,
                springConstant: 0.04,
                damping: 0.09,
                avoidOverlap: 0.5
            },
            stabilization: {
                enabled: true,
                iterations: 1000,
                updateInterval: 25
            }
        },
        edges: {
            smooth: {
                type: 'continuous',
                roundness: 0.5
            }
        }
    };

    const initialNodes = [
        { id: 1, label: "MET", group: 1, },
        { id: 2, label: "ALA", group: 1 },
        { id: 3, label: "TYR", group: 1 },
    ];

	const initialEdges = [
		{ id: '1,2', from: 1, to: 2, color: 'black', length: 1 },
		{ id: '2,3', from: 2, to: 3, color: 'black', length: 1 },
		{ id: '3,4', from: 3, to: 4, color: 'black', length: 1 },
	];

    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdges)
    const [selectedNode, setSelectedNode] = useState(null);
	const visJsRef = useRef(null);
    const networkRef = useRef(null);


	useEffect(() => {
		networkRef.current = visJsRef.current && new Network(visJsRef.current, { nodes, edges }, options || {} );

        // Adding a slight delay to ensure the DOM is fully updated
        setTimeout(() => {
            if (networkRef.current) {
                networkRef.current.redraw();
                networkRef.current.fit();
            }
        }, 50);              

        return () => {
            if (visJsRef.current) {
                console.log("%c CLEANUP", "background: yellow")
                networkRef.current.destroy();    
            }
        }

	}, []);

    useEffect(() => {
        networkRef.current.on('click', function (params) {
            if (params.nodes.length === 1) {
                const clickedNodeId = params.nodes[0];
                if (selectedNode === null) {
                    // First node selected
                    setSelectedNode(clickedNodeId);
                    highlightNodes(clickedNodeId);

                } else {
                    // Second node selected, create a connection
                    const newEdge = { from: clickedNodeId, to: selectedNode, color: 'orange', length: 1 };
                    setEdges([...edges, newEdge]);
                    networkRef.current.body.data.edges.add(newEdge);
                    setSelectedNode(null);
                    clearHighlight();
                }
            } else {
                // Clicked on empty space, reset selection
                setSelectedNode(null);
                clearHighlight();
            }
        });
    }, [edges])

    const highlightNodes = (nodeId) => {
        console.log(nodeId)
        const allNodes = networkRef.current.body.data.nodes.get();
        const updateNodes = allNodes.map(node => {
            if (node.id !== nodeId) {
                return { id: node.id, borderWidth: 2, borderWidthSelected: 2, color: { border: 'red' }, shapeProperties: { borderDashes: [5, 5] } };
            } else {
                return { id: node.id, borderWidth: 2, borderWidthSelected: 2, color: { border: 'black' }, shapeProperties: { borderDashes: [1, 1] } };
            }
        });
        networkRef.current.body.data.nodes.update(updateNodes);
    };

    const clearHighlight = () => {
        const allNodes = networkRef.current.body.data.nodes.get();
        const resetNodes = allNodes.map(node => {
            return { id: node.id, borderWidth: 1, color: { border: 'black' }, shapeProperties: { borderDashes: false } };
        });
        networkRef.current.body.data.nodes.update(resetNodes);
    };


	return <div ref={visJsRef} className='h-[600px] border border-slate-500 mx-2'/>;
};

export default VisNetwork;



        // network.on('dragStart', function (params) {
        //     console.log("dragStart");
        //     network.setOptions({ physics: { enabled: true } });
        // });

        // network.on('dragEnd', function (params) {
        //     console.log("dragEnd");
        //     setTimeout(() => {                
        //         network.setOptions({ physics: { enabled: false } });
        //     }, 300); // Allow some time for nodes to settle
        // });

        // network.once('stabilized', function () {
        //     console.log("stabilized");
        //     network.setOptions({ physics: false });
        // });