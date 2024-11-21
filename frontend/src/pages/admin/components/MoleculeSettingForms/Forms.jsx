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


export const MolNameForm = ({ sxOptions, control }) => {
    return (
        <FormControl sx={sxOptions} variant="outlined" margin="normal" size="small">
            <Controller
                name="name"
                control={control}
                render={({ field }) => (
                    <>
                        <TextField
                            label="Name"
                            {...field}
                            size="small"
                        />
                    </>
                )}
            />
        </FormControl>
    )
}

export const MolSymbolForm = ({ sxOptions, control }) => {
    return (
        <FormControl sx={sxOptions} variant="outlined" margin="normal" size="small">
            <Controller
                name="symbol"
                control={control}
                render={({ field }) => (
                    <TextField
                        label="Symbol"
                        {...field}
                        size="small"
                    />
                )}
            />
        </FormControl>
    )
}

export const MolAnalogForm = ({ sxOptions, control }) => {
    return (
        <FormControl sx={sxOptions} variant="outlined" margin="normal" size="small">
            <Controller
                name="naturalAnalog"
                control={control}
                render={({ field }) => (
                    <TextField
                        label="Natural analog"
                        {...field}
                        size="small"
                    />
                )}
            />
        </FormControl>
    )
}

export const MolPDBForm = ({ sxOptions, control, error }) => {
    return (
        <FormControl sx={sxOptions} variant="outlined" margin="normal" size="small" error={!!error}>
            <Controller
                name="pdb"
                control={control}
                rules={{
                    required: 'PDB is required',
                    minLength: { value: 3, message: 'Minimum length is 3 characters' },
                    maxLength: { value: 3, message: 'Maximum length is 3 characters' },
                }}
                render={({
                    field
                }) => (
                    <TextField
                        label="PDB"
                        error={!!error}
                        {...field}
                        size="small"
                    />
                )}
            />
            {error && (
                <FormHelperText error>{error.message}</FormHelperText>
            )}
        </FormControl>
    )
}

export const MolTypeForm = ({ sxOptions, control, error }) => {
    return (
        <FormControl sx={sxOptions} variant="outlined" margin="normal" size="small" error={!!error}>
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
                            <MenuItem value="aa">Amino acid</MenuItem>
                            <MenuItem value="cap">Cap</MenuItem>
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

export const MolSubTypeForm = ({ sxOptions, control, error }) => {
    return (
        <FormControl sx={sxOptions} variant="outlined" margin="normal" size="small">
            <InputLabel id="select-subtype" error={!!error}>Select Subtype</InputLabel>
            <Controller
                name="selectSubType"
                control={control}
                defaultValue=""
                rules={{ required: 'Selection is required' }}
                render={({
                    field
                }) => (
                    <>
                        <Select
                            {...field}
                            labelId="select-subtype"
                            label="Select subtype"
                            error={!!error}
                        >
                            <MenuItem value="natural">Natural</MenuItem>
                            <MenuItem value="nonNatural">Non natural</MenuItem>
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

export const GroupLabelForm = ({ sxOptions, control, error, index }) => {
    const labelId = `select-rgroup-${index}`;
    const label = `Group ${index} label`;
    const name = `groupLabel_${index}`;

    return (
        <FormControl sx={sxOptions} variant="outlined" margin="normal" size="small">
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
        <FormControl sx={sxOptions} variant="outlined" margin="normal" size="small" error={!!error}>
            <Controller
                name={name}
                control={control}
                rules={{ required: 'Leaving group is required' }}
                render={({ field }) => (
                    <TextField
                        label={label}
                        error={!!error}
                        {...field}
                        size="small"
                    />
                )}
            />
            {error && (
                <FormHelperText error>{error.message}</FormHelperText>
            )}
        </FormControl>
    )
}


