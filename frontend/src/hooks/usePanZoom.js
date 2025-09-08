// src/hooks/usePanZoom.js
import { useEffect } from "react";
import panzoom from "panzoom";

/**
 * Adds panzoom functionality to the SVG element in svgRef.
 * @param {object} svgRef - React ref pointing to a container with an <svg>
 */
export default function usePanZoom(svgRef, deps = []) {
  useEffect(() => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current.querySelector("svg");
    if (!svgElement) return;

    const panZoomInstance = panzoom(svgElement, {
      minZoom: 0.1,
      bounds: true,
      boundsPadding: 0.1,
      zoomSpeed: 0.1,
    });

    const dblClickHandler = (event) => {
      event.preventDefault();
      panZoomInstance.moveTo(0, 0);
      panZoomInstance.zoomAbs(0, 0, 0.5);
    };
    svgElement.addEventListener("dblclick", dblClickHandler);

    return () => {
      svgElement.removeEventListener("dblclick", dblClickHandler);
      panZoomInstance.dispose();
    };
    // Re-run effect if svgRef.current or dependencies change
  }, [svgRef, ...deps]);
}
