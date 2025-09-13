// src/hooks/usePanZoom.js
import { useEffect, useRef } from "react";
import panzoom from "panzoom";

/**
 * Adds panzoom functionality to the SVG element in svgRef.
 * Optionally exposes an API via apiRef: { reset(), getInstance() }
 * @param {object} svgRef - React ref pointing to a container with an <svg>
 * @param {Array} deps - dependencies to recreate panzoom
 * @param {object} apiRef - optional ref object to expose API
 */
export default function usePanZoom(svgRef, deps = [], apiRef) {
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current.querySelector("svg");
    if (!svgElement) return;

    const panZoomInstance = panzoom(svgElement, {
      minZoom: 0.1,
      bounds: true,
      boundsPadding: 0.1,
      zoomSpeed: 0.1,
      zoomDoubleClickSpeed: 1
    });
    instanceRef.current = panZoomInstance;

    const reset = (event) => {
      if (event?.preventDefault) event.preventDefault();
      panZoomInstance.moveTo(0, 0);
      panZoomInstance.zoomAbs(0, 0, 1);
    };

    // expose API if requested
    if (apiRef) {
      apiRef.current = {
        reset,
        getInstance: () => instanceRef.current
      };
    }

    // double-click resets too
    svgElement.addEventListener("dblclick", reset);

    return () => {
      svgElement.removeEventListener("dblclick", reset);
      panZoomInstance.dispose();
      instanceRef.current = null;
      if (apiRef) apiRef.current = null;
    };
  }, [svgRef, ...deps]);
}