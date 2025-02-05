export const log = (message, opt = {}) => {
    const defaultStyles = {
        background: 'yellow',
        color: 'black',
        'font-weight': 'bold',
        padding: '0.4em',
        'text-transform': 'uppercase'
    };

    // Merge default styles with the options provided
    const styles = { ...defaultStyles, ...opt };

    // Convert the styles object into a CSS string
    const styleString = Object.entries(styles)
        .map(([key, value]) => `${key}: ${value};`)
        .join(' ');

    console.log(`%c ${message}`, styleString);
};


export const initializeRangeFilter = (data, key, setFilters, limitRange) => {
    limitRange.min = Math.round(data.min_max_values[`${key}_min`]);
    limitRange.max = Math.round(data.min_max_values[`${key}_max`]) + 1;
    setFilters((prevFilters) => ({
        ...prevFilters,
        [`range${key}`]: limitRange,
    }));
};


export const log10ScaleDifference = (maxValue, minValue) => {
    // Make sure a and b are positive > 0 to avoid log10 issues
    // (or handle zero/negative edge cases as needed)
    const absoluteDifference = Math.abs(maxValue - minValue)
    const logDiff = Math.floor(Math.log10(absoluteDifference));
    return logDiff
}