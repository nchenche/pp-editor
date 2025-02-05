import { useState, useEffect } from 'react';

import { log10ScaleDifference } from '../../utils/dev';


export const RangeSlider = ({ initialMin, initialMax, min, max, step, onChange, label, classNames }) => {
    const [minValue, setMinValue] = useState(initialMin);
    const [maxValue, setMaxValue] = useState(initialMax);

    const spacer = log10ScaleDifference(maxValue, minValue);

    useEffect(() => {
        setMinValue(initialMin);
        setMaxValue(initialMax);
    }, [initialMin, initialMax]);

    const handleMinChange = (e) => {        
        const value = Math.min(Number(e.target.value), maxValue - (step + 10*spacer)  );
        setMinValue(value);
        onChange({ min: value, max: maxValue });
    };

    const handleMaxChange = (e) => {
        const value = Math.max(Number(e.target.value), minValue + (step + 10*spacer));
        setMaxValue(value);
        onChange({ min: minValue, max: value });
    };

    const minPos = ((minValue - min) / (max - min)) * 100;
    const maxPos = ((maxValue - min) / (max - min)) * 100;

    return (

        <div className={`flex flex-col ${classNames.parent}`}>
            {label && <label className="text-center block mb-4 text-sm font-medium text-gray-700">{label}</label>}

            <div className="relative">
                {/* Custom style for range inputs */}
                <style>
                    {`
                        input[type="range"] {
                        -webkit-appearance: none;
                        appearance: none;
                        height: 4px;
                        width: 100%;
                        position: absolute;
                        background-color: transparent;
                        pointer-events: none;
                        }
            
                        input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        height: 12px;
                        width: 12px;
                        background-color: rgb(96, 110, 129);
                        border: 1px solid darkslategray;
                        border-radius: 50%;
                        cursor: pointer;
                        pointer-events: auto;
                        }
            
                        input[type="range"]::-moz-range-thumb {
                        height: 12px;
                        width: 12px;
                        background-color: rgb(96, 110, 129);
                        border: 1px solid darkslategray;
                        border-radius: 50%;
                        cursor: pointer;
                        pointer-events: auto;
                        }
          `}
                </style>



                {/* Track line */}
                <div className="h-[3px] bg-gray-200 rounded-full" />

                {/* Colored range between thumbs */}
                <div
                    className="absolute h-[3px] bg-slate-500 rounded-full top-0.5 transform -translate-y-1/2"
                    style={{ left: `${minPos}%`, right: `${100 - maxPos}%` }}
                />

                {/* Minimum input */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={minValue}
                    onChange={handleMinChange}
                    className="absolute top-0"
                />

                {/* Maximum input */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={maxValue}
                    onChange={handleMaxChange}
                    className="absolute top-0"
                />

                {/* Display values */}
                <div className="flex justify-between mt-2 text-[12px] text-gray-600">
                    <span>{minValue}</span>
                    <span>{maxValue}</span>
                </div>
            </div>

        </div>
    );
};
