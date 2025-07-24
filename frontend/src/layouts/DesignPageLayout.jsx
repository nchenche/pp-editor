import React from "react";

// Accepts any slot-like children for each zone
export const DesignPageLayout = ({
    leftPanel,  // e.g. MonomerLibrary
    mainPanel,  // main app content
    mobileTopPanel, // for mobile-specific stuff if needed
    ...rest
}) => (
    <div className="flex flex-col md:flex-row-reverse m-4 max-h-[85vh]" {...rest}>
        {/* Side panel (right on desktop, top on mobile if you want) */}
        <div className="hidden md:block w-full md:w-1/3 border p-4 rounded-md shadow-sm max-h-[80vh] overflow-hidden">
            {leftPanel}
        </div>
        {/* Mobile top panel (visible only on mobile) */}
        {mobileTopPanel && (
            <div className="block md:hidden mb-4 w-full">{mobileTopPanel}</div>
        )}
        {/* Main content */}
        <div className="flex-1 overflow-hidden">
            {mainPanel}
        </div>
    </div>
);


