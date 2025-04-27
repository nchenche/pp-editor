/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useGetData } from '../../../../hooks/Fetchers'

// import { log, initializeRangeFilter } from '../../utils/dev'
// import './styles.css'


const sizeStyles = {
    sm: {
        container: "w-24 h-28",
        image: "w-20",
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


const MonomerItem = ({
    image,
    name,
    label,
    size = "md",        // "sm" | "md" | "lg"
    onClick = null,
}) => {
    const styles = sizeStyles[size];

    return (
        <div
            className={`group relative ${styles.container} rounded-lg overflow-hidden shadow-lg hover:scale-105 transform transition-all cursor-pointer`}
            onClick={onClick}
        >
            <img
                src={`data:image/png;base64,${image}`}
                alt={name}
                className={`${styles.image} object-contain rounded-lg mx-auto p-1`}
            />

            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-end ">
                <div className="text-slate-600 text-center mx-auto my-[0.2rem]">
                    <h3 className={`${styles.symbolSize} text-[0.72rem] text-slate-700 font-bold`}>{label}</h3>
                    {name && <p className={`${styles.nameSize} text-gray-600 overflow-hidden text-ellipsis whitespace-nowrap max-w-[5rem]`}>
                        {name}
                    </p>}
                </div>
            </div>
        </div>
    );
};


const ListMonomerLibrary = ({ monomers }) => {
    return (
        <div className="flex flex-wrap justify-center gap-6">
            {monomers.map((monomer) => (
                <MonomerItem
                    key={monomer._id}
                    image={monomer.image_url}
                    name={monomer.m_name}
                    label={monomer.pdbName}
                    size="sm"
                />
            ))}
        </div>
    )
}


export const MonomerLibraryContainer = () => {
    const { data, isLoading, error } = useGetData('http://0.0.0.0:5000/api/db/monomers/images');
    const dataRef = useRef(null);
    const [filteredMonomers, setFilteredMonomers] = useState([]);

    useEffect(() => {
        if (!isLoading && !error && data) {
            dataRef.current = data.data || data;
            setFilteredMonomers(dataRef.current);  // Initialize filteredMonomers with fetched data
        }
    }, [data, isLoading, error]);


    if (error) return <p>Error: {error}</p>;
    if (!data) return null;

    return (
        <>
            {/* Main content area */}
            <main className="flex-1 p-6 border-2">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="loader">Loading...</div>
                    </div>
                ) : (
                    <ListMonomerLibrary monomers={filteredMonomers} />
                )}
            </main>
        </>
    );
};


export default MonomerLibraryContainer;