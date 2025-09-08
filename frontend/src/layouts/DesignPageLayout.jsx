import React from "react";

// Accepts any slot-like children for each zone
export const DesignPageLayout = ({
    leftPanel,  // e.g. MonomerLibrary
    mainPanel,  // main app content
    mobileTopPanel, // for mobile-specific stuff if needed
    ...rest
}) => (
    <div className="flex flex-col md:flex-row-reverse m-4" {...rest}>
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



export const DesignPageLayout2 = ({
    sidebar,
    sequenceEditor,
    viewerContainer,
    outputPanel,
    ...rest
}) => (
    <div
        className="
            grid
            grid-cols-1
            lg:grid-cols-[550px_1fr_400px
            lg:grid-cols-3
            h-[85vh] min-h-0
            gap-4 p-2 bg-gray-50
        "
    >
        {/* Sidebar */}
        <aside
            className="
                flex flex-col
                overflow-hidden
                border-2 border-blue-400 bg-slate-100 rounded-lg p-0 shadow-sm
                order-1 lg:col-span-1 lg:row-span-2 lg:order-none
                "
        >
            {/* Only this child will scroll */}
            <div className="flex-1 overflow-y-auto p-2">
                {sidebar}
            </div>
        </aside>

        {/* Center main interface */}
        <section
            className="
                flex flex-col gap-4 min-h-0
                order-2
                lg:col-start-2 lg:col-end-3 lg:row-span-2 lg:order-none resize-x
            "
        >
            <div className="border-2 border-yellow-400 rounded-lg p-4 shadow-sm flex-1 min-h-0 min-w-[480px]">
                {viewerContainer}
            </div>
        </section>

        {/* Output panel */}
        <aside
            className="
                h-full min-h-0
                border-2 border-purple-400 bg-purple-50 rounded-lg p-4 shadow-sm overflow-auto
                order-3
                lg:col-start-3 lg:col-end-4 lg:row-span-2 lg:order-none min-w-[300px]
            "
        >
            {outputPanel}
        </aside>
    </div>
);
