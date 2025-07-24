import React from "react";

export const ViewerPanel = ({
    svgSection,
    controlsSection,
    structureSection,
    ...rest
}) => (
    <div className="flex flex-col lg:flex-row items-start gap-x-2 mt-4 w-full" {...rest}>
        {/* SVG + Controls */}
        <div className="flex-1 flex flex-col items-center border p-4 mx-auto w-full">
            {svgSection}
            {controlsSection}
        </div>
        {/* 3D structure */}
        <div className="w-[400px] h-[400px] lg:mt-12 mx-auto border border-slate-400 bg-white rounded-md overflow-hidden flex items-center justify-center relative">
            {structureSection}
        </div>
    </div>
);

