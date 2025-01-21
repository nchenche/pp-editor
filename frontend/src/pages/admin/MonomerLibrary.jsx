/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
// import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useGetData } from '../../hooks/Fetchers'

import { log } from '../../utils/dev'
import './styles.css'



const MonomerItem = ({ image, name, symbol }) => {
    return (
        <div className="group relative w-40 h-60 p-2 rounded-lg overflow-hidden shadow-lg hover:scale-105 transform transition-all duration-300">
            <img
                src={`data:image/png;base64,${image}`}
                alt={name}
                className="w-full h-/4 object-cover rounded-t-lg"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-300 flex items-end p-4">
                <div className="text-slate-600 text-center">
                    <h3 className="text-md font-bold">{name}</h3>
                    <p className="text-sm">{symbol}</p>
                </div>
            </div>
        </div>
    );
};



const MonomerLibrary = () => {
    const { data, isLoading, error } = useGetData(
        'http://0.0.0.0:5000/api/db/monomers/images?limit=50&filter=m_subtype:non-natural'
    );

    if (isLoading) return <p>Loading...</p>;
    if (error) return <p>Error: {error}</p>;
    if (!data) return null;

    // If storing entire JSON, access data.data. Otherwise, access data directly.
    const monomers = data.data || data;

    return (
        <>
            <div className='m-2 w-8/12 mx-auto'>
                <div className="flex flex-wrap justify-center gap-6 p-6">
                    {monomers.map((monomer) => (
                        <MonomerItem key={monomer._id} image={monomer.image_url} name={monomer.m_name} symbol={monomer.symbol} />
                    ))}
                </div>
            </div>

        </>

    );
}

export default MonomerLibrary;