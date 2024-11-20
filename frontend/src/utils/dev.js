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