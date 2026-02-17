import { useState } from 'react';

import { useForm, Controller } from "react-hook-form"

import {
    Box,
    Button,
    FormHelperText,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';

import Grid from '@mui/material/Grid2';

import {
    TabContext,
    TabList,
    TabPanel
} from '@mui/lab';

import createPalette from "@mui/material/styles/createPalette";

const NATURAL_ANALOG_OPTIONS = [
    'A', 'C', 'D', 'E', 'F',
    'G', 'H', 'I', 'K', 'L',
    'M', 'N', 'P', 'Q', 'R',
    'S', 'T', 'V', 'W', 'Y',
    'X',
];


export const MolNameForm = ({ sxOptions, control }) => {
    return (
        <FormControl sx={sxOptions} fullWidth variant="outlined" margin="dense" size="small">
            <Controller
                name="name"
                control={control}
                render={({ field }) => (
                    <>
                        <TextField
                            label="Name"
                            {...field}
                            size="small"
                            fullWidth
                            placeholder="Alanine"
                        />
                    </>
                )}
            />
        </FormControl>
    )
}

export const MolSymbolForm = ({ sxOptions, control }) => {
    return (
        <FormControl sx={sxOptions} fullWidth variant="outlined" margin="dense" size="small">
            <Controller
                name="symbol"
                control={control}
                render={({ field }) => (
                    <TextField
                        label="Symbol"
                        {...field}
                        size="small"
                        fullWidth
                        placeholder="A"
                    />
                )}
            />
        </FormControl>
    )
}

export const MolAnalogForm = ({ sxOptions, control, error, disabled }) => {
    return (
        <FormControl sx={sxOptions} fullWidth variant="outlined" margin="dense" size="small" error={!!error}>
            <Controller
                name="naturalAnalog"
                control={control}
                defaultValue=""
                rules={{ required: 'Natural analog is required (use X for none).' }}
                render={({ field }) => (
                    <TextField
                        select
                        label="Natural analog"
                        {...field}
                        size="small"
                        fullWidth
                        error={!!error}
                        disabled={!!disabled}
                    >
                        {NATURAL_ANALOG_OPTIONS.map((aa) => (
                            <MenuItem key={aa} value={aa}>
                                {aa}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
            />
            {error ? (
                <FormHelperText error>{error.message}</FormHelperText>
            ) : (
                <FormHelperText>
                    {disabled ? 'For type “cap”, natural analog is forced to X.' : 'Use X when no natural analog exists.'}
                </FormHelperText>
            )}
        </FormControl>
    )
}

export const MolPDBForm = ({ sxOptions, control, error, pdbConfig }) => {
    const cfg = pdbConfig || {};
    const label = cfg.label || 'PDB';
    const placeholder = cfg.placeholder || 'ALA';
    const inputMaxLength = Number(cfg.maxLength || 3);
    const inputMinLength = Number(cfg.minLength || 3);
    const isRequired = cfg.required !== false;
    const normalize =
        typeof cfg.normalize === 'function'
            ? cfg.normalize
            : (raw) =>
                String(raw || '')
                    .toUpperCase()
                    .replace(/[^A-Z]/g, '')
                    .slice(0, inputMaxLength);

    const requiredMessage = cfg.requiredMessage || 'PDB is required';
    const minLengthMessage = cfg.minLengthMessage || `Minimum length is ${inputMinLength} characters`;
    const maxLengthMessage = cfg.maxLengthMessage || `Maximum length is ${inputMaxLength} characters`;

    return (
        <FormControl sx={sxOptions} fullWidth variant="outlined" margin="dense" size="small" error={!!error}>
            <Controller
                name="pdb"
                control={control}
                rules={{
                    ...(isRequired ? { required: requiredMessage } : {}),
                    minLength: { value: inputMinLength, message: minLengthMessage },
                    maxLength: { value: inputMaxLength, message: maxLengthMessage },
                }}
                render={({
                    field
                }) => (
                    <TextField
                        label={label}
                        error={!!error}
                        {...field}
                        onChange={(e) => {
                            field.onChange(normalize(e.target.value));
                        }}
                        size="small"
                        fullWidth
                        placeholder={placeholder}
                        inputProps={{ maxLength: inputMaxLength }}
                    />
                )}
            />
            {error && (
                <FormHelperText error>{error.message}</FormHelperText>
            )}
        </FormControl>
    )
}

export const MolTypeForm = ({ sxOptions, control, error, capDisabled, aaDisabled }) => {
    return (
        <FormControl sx={sxOptions} fullWidth variant="outlined" margin="dense" size="small" error={!!error}>
            <InputLabel id="select-type" error={!!error}>Select Type</InputLabel>

            <Controller
                name="selectType"
                control={control}
                defaultValue=""
                rules={{ required: 'Selection is required' }}
                render={({
                    field
                }) => (
                    <>
                        <Select
                            {...field}
                            labelId="select-type"
                            label="Select Type"
                            error={!!error}
                        >
                            <MenuItem value="aa" disabled={!!aaDisabled}>Amino acid</MenuItem>
                            <MenuItem value="cap" disabled={!!capDisabled}>Cap</MenuItem>
                            <MenuItem value="other">Other</MenuItem>
                        </Select>
                    </>
                )}
            />
            {error && (
                <FormHelperText error>{error.message}</FormHelperText>
            )}
        </FormControl>
    )
}

export const MolSubTypeForm = ({ sxOptions, control, error, options, disabled }) => {
    return (
        <FormControl sx={sxOptions} fullWidth variant="outlined" margin="dense" size="small">
            {/* <InputLabel id="select-subtype" error={!!error}>Select Subtype</InputLabel> */}
            <Controller
                name="selectSubType"
                control={control}
                defaultValue=""
                rules={{ required: 'Selection is required' }}
                render={({ field }) => (
                    <TextField
                        select
                        label="Subtype"
                        size="small"
                        fullWidth
                        {...field}
                        error={!!error}
                        disabled={!!disabled}
                    >
                        {options.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
            />
            {error && (
                <FormHelperText error>{error.message}</FormHelperText>
            )}
        </FormControl>
    )
}

export const GroupLabelForm = ({ sxOptions, control, error, index }) => {
    const labelId = `select-rgroup-${index}`;
    const label = `Group ${index} label`;
    const name = `groupLabel_${index}`;

    return (
        <FormControl sx={sxOptions} fullWidth variant="outlined" margin="dense" size="small">
            <InputLabel id={labelId} error={!!error}>{label}</InputLabel>
            <Controller
                name={name}
                control={control}
                defaultValue=""
                rules={{ required: 'Selection is required' }}
                render={({
                    field
                }) => (
                    <>
                        <Select
                            {...field}
                            labelId={labelId}
                            label={label}
                            error={!!error}
                        >
                            <MenuItem value="1">R1</MenuItem>
                            <MenuItem value="2">R2</MenuItem>
                            <MenuItem value="3">R3</MenuItem>
                            <MenuItem value="4">R4</MenuItem>
                        </Select>
                    </>
                )}
            />
            {error && (
                <FormHelperText error>{error.message}</FormHelperText>
            )}
        </FormControl>
    )
}


export const GroupLeavingForm = ({ sxOptions, control, error, index }) => {
    const name = `groupLeaving_${index}`;
    const label = `Leaving group for ${index}`


    return (
        <FormControl sx={sxOptions} fullWidth variant="outlined" margin="dense" size="small" error={!!error}>
            <Controller
                name={name}
                control={control}
                defaultValue=""
                rules={{ required: 'Leaving group is required' }}
                render={({ field }) => (
                    <TextField
                        select
                        label={label}
                        error={!!error}
                        {...field}
                        size="small"
                        fullWidth
                    >
                        <MenuItem value="H">H</MenuItem>
                        <MenuItem value="OH">OH</MenuItem>
                    </TextField>
                )}
            />
            {error && (
                <FormHelperText error>{error.message}</FormHelperText>
            )}
        </FormControl>
    )
}


