import React, { useEffect, useRef, useState } from 'react';

import { Network } from "vis-network";



const VisNetwork = () => {
    const containerRef = useRef(null);
    const networkRef = useRef(null);
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
        { id: 1, label: "MET", group: 1 },
        { id: 2, label: "ALA", group: 1 },
        { id: 3, label: "TYR", group: 1 },
    ];

	const initialEdges = [
		{ id: '1,2', from: 1, to: 2, color: 'black', length: 1 },
		{ id: '2,3', from: 2, to: 3, color: 'black', length: 1 },
		{ id: '3,4', from: 3, to: 4, color: 'black', length: 1 },
	];

    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdges);
    const [selectedNode, setSelectedNode] = useState(null);
  

    useEffect(() => {
        networkRef.current = containerRef.current && new Network(containerRef.current, { nodes, edges }, options);

        console.log("%c EFFECT INIT", "background: red");

    }, [containerRef]);


    useEffect(() => {
        if (!networkRef.current) return;

        networkRef.current.on('click', function (params) {
            if (params.nodes.length === 1) {
                const clickedNodeId = params.nodes[0];
                if (selectedNode === null) {
                    // First node selected
                    console.log("First node selected");
                    setSelectedNode(clickedNodeId);
                    highlightNodes(clickedNodeId);
                } else {
                    // Second node selected, create a connection
                    console.log("Second node selected, create a connection");
                    const newEdge = { from: clickedNodeId, to: selectedNode, color: 'orange', length: 1 };
                    setEdges([...edges, newEdge]);
                    // networkRef.current.body.data.edges.add(newEdge);
                    setSelectedNode(null);
                    clearHighlight();
                }
            } else {
                // Clicked on empty space, reset selection
                setSelectedNode(null);
                clearHighlight();
            }
        });

    }, [selectedNode]);
    


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


  
    return <div ref={containerRef} className='h-[500px] w-[800px] border border-slate-500 mx-auto mt-4' />;
  };
    


// function VisNetwork() {
//     console.log("%c RENDER", "background: blue; color: white");

//     const containerRef = useRef(null);


//     const options = {
//         physics: {
//             enabled: true,
//             solver: 'barnesHut',
//             barnesHut: {
//                 gravitationalConstant: -900,
//                 centralGravity: 0.01,
//                 springLength: 100,
//                 springConstant: 0.04,
//                 damping: 0.09,
//                 avoidOverlap: 0.5
//             },
//             stabilization: {
//                 enabled: true,
//                 iterations: 1000,
//                 updateInterval: 25
//             }
//         },
//         edges: {
//             smooth: {
//                 type: 'continuous',
//                 roundness: 0.5
//             }
//         }
//     };

//     const initialNodes = [
//         { id: 1, label: "MET", group: 1 },
//         { id: 2, label: "ALA", group: 1 },
//         { id: 3, label: "TYR", group: 1 },
//     ];

// 	const initialEdges = [
// 		{ id: '1,2', from: 1, to: 2, color: 'black', length: 1 },
// 		{ id: '2,3', from: 2, to: 3, color: 'black', length: 1 },
// 		{ id: '3,4', from: 3, to: 4, color: 'black', length: 1 },
// 	];



//     useEffect(() => {
//         const network = containerRef.current && new Network(containerRef.current, { initialNodes, initialEdges }, options);


//       }, [containerRef, initialNodes, initialEdges]);

// 	return <div ref={containerRef} className='h-[500px] w-[800px] border border-slate-500 mx-auto mt-4' />;
// };

export default VisNetwork;