import React from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
// Add other icons as needed

const ViewerPanel = ({
    children,   // main viewer area (e.g., SvgDepictionContainer or MolStarViewer)
    controls = [], // [{icon, tooltip, onClick}]
    className = "",
}) => (
    <div className={`relative rounded shadow-sm border ${className}`}>
        <div className="w-full h-full">{children}</div>
        <div className="absolute top-2 right-2 flex flex-col gap-2 z-10">
            {controls.map(({ icon, tooltip, onClick }, i) => (
                <Tooltip title={tooltip} key={i} placement="left">
                    <IconButton size="small" onClick={onClick}>{icon}</IconButton>
                </Tooltip>
            ))}
        </div>
    </div>
);

export default ViewerPanel;
