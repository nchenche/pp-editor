import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';


// import { log, initializeRangeFilter } from '../../utils/dev'
// import './styles.css'

import { Box, Typography, CircularProgress } from "@mui/material";

import { MonomerLibraryHeader } from './monomerLibraryHeader';

const sizeStyles = {
    sm: {
        container: "w-24 h-28",
        image: "w-16",
        symbolSize: "text-sm",
        nameSize: "text-xs",
    },
    md: {
        container: "w-40 h-48",
        image: "w-28",
        symbolSize: "text-md",
        nameSize: "text-sm",
    },
    lg: {
        container: "w-52 h-60",
        image: "w-36",
        symbolSize: "text-lg",
        nameSize: "text-base",
    },
};


const MonomerLibraryItem = ({
    monomer,
    size = "md",        // "sm" | "md" | "lg"
    onClick = null,
    handleOnDoubleClick
}) => {
    const styles = sizeStyles[size];


    const addMonomerOnDoubleClick = useCallback((event) => {
        event.stopPropagation();
        event.preventDefault();
        handleOnDoubleClick(monomer);
    }, [handleOnDoubleClick]);

    const handleOnMouseEnter = useCallback((event) => {
        event.stopPropagation();
        event.preventDefault();
        console.log("Mouse enter", event.currentTarget);
    }, []);

    return (
        <div className="relative w-20 rounded-lg shadow-md border border-slate-300 duration-200 hover:scale-105 transform-gpu bg-white">
            {/* Tooltip layer outside clipping */}
            <div className="absolute top-0 left-0 w-full h-5 flex justify-between px-1 z-50 bg-slate-800 rounded-t-lg">
                {/* Add tooltip */}
                <div className="relative group">
                    <button
                        onClick={addMonomerOnDoubleClick}
                        className="text-green-600/90 hover:text-lime-300 p-[0.1rem]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-[0.9rem] w-[0.9rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.6rem] px-1.5 py-[0.1rem] rounded bg-black text-white opacity-0 group-hover:opacity-60 transition pointer-events-none">
                        Add monomer
                    </div>
                </div>

                {/* Info tooltip */}
                <div className="relative group">
                    <button
                        onClick={() => console.log("More info")}
                        className="text-neutral-200/80 hover:text-white p-[0.1rem]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z" />
                        </svg>
                    </button>
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.6rem] px-1.5 py-[0.1rem] rounded bg-black text-white opacity-0 group-hover:opacity-60 transition pointer-events-none">
                        View details
                    </div>
                </div>
            </div>

            {/* Main card with overflow hidden */}
            <div
                className="w-full h-20"
                onMouseDown={(e) => e.preventDefault()}
            >
                <div className='flex flex-col items-center justify-center border-slate-300 h-[78%] w-full mb-[0.1rem] mt-5'>
                    <img
                        src={`data:image/png;base64,${monomer.image_url}`}
                        alt={`Structure of ${monomer.symbol}`}
                        className="mx-auto w-[67%]"
                    />
                </div>
                <div className="flex flex-col text-center">
                    <span className="text-[0.65rem] font-bold text-slate-700 user-select-none cursor-default">{monomer.pdbName}</span>
                </div>
            </div>
        </div>
    );
};


export const MonomerLibraryItems = ({ monomers, handleOnDoubleClick }) => {
    return (
        <div className="relative flex flex-wrap justify-center gap-2">
            {monomers.map((monomer) => (
                <MonomerLibraryItem
                    key={monomer._id}
                    monomer={monomer}
                    size="sm"
                    handleOnDoubleClick={handleOnDoubleClick}
                />
            ))}
        </div>
    )
}
