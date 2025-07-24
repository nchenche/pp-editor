import TextField from '@mui/material/TextField';

export const InputBiln = ({ value, onChangeValue }) => (
    <div className='p-2 w-2/4 mx-auto'>
        <TextField
            id="outlined-required"
            label="Enter BILN sequence"
            fullWidth
            value={value}
            onChange={onChangeValue}
        />
    </div>
);

export const InputSearch = ({ value, onChangeValue }) => (
    <div className='p-2 w-2/4 mx-auto'>
        <TextField
            id="outlined-required"
            label="Search monomers"
            fullWidth
            value={value}
            onChange={onChangeValue}
        />
    </div>
);
