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
    Tooltip,
    Typography,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import Grid from '@mui/material/Grid2';

import {
    TabContext,
    TabList,
    TabPanel
} from '@mui/lab';

import createPalette from "@mui/material/styles/createPalette";

/* ── Shared style: subtle placeholder ────────────────────────────────────── */
const PLACEHOLDER_SX = {
    '& input::placeholder, & textarea::placeholder': {
        fontSize: '0.78rem',
        opacity: 0.55,
    },
};

/* ── FieldLabel: distinct label row above the input with optional ⓘ tooltip */
const FieldLabel = ({ text, help, error }) => (
    <Typography
        variant="caption"
        component="label"
        sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.4,
            mb: 0.25,
            fontWeight: 500,
            fontSize: '0.8rem',
            color: error ? 'error.main' : 'text.secondary',
        }}
    >
        {text}
        {help && (
            <Tooltip title={help} placement="top" arrow>
                <HelpOutlineIcon
                    sx={{ fontSize: 13, color: 'text.disabled', cursor: 'help' }}
                />
            </Tooltip>
        )}
    </Typography>
);

const NATURAL_ANALOG_OPTIONS = [
    'A', 'C', 'D', 'E', 'F',
    'G', 'H', 'I', 'K', 'L',
    'M', 'N', 'P', 'Q', 'R',
    'S', 'T', 'V', 'W', 'Y',
    'X',
];


export const MolNameForm = ({ sxOptions, control }) => {
    return (
        <FormControl sx={sxOptions} fullWidth margin="dense" size="small">
            <FieldLabel text="Name" help="Full name of the monomer (e.g. Alanine, N-Methyl-Alanine)" />
            <Controller
                name="name"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        size="small"
                        fullWidth
                        placeholder="e.g. Alanine"
                        sx={PLACEHOLDER_SX}
                    />
                )}
            />
        </FormControl>
    )
}

export const MolSymbolForm = ({ sxOptions, control }) => {
    return (
        <FormControl sx={sxOptions} fullWidth margin="dense" size="small">
            <FieldLabel text="BILN Symbol" help='Short unique identifier used in BILN notation (e.g. "Ala", "meA"). Must not collide with existing symbols.' />
            <Controller
                name="symbol"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        size="small"
                        fullWidth
                        placeholder="e.g. Ala"
                        sx={PLACEHOLDER_SX}
                    />
                )}
            />
        </FormControl>
    )
}

export const MolAnalogForm = ({ sxOptions, control, error, disabled }) => {
    return (
        <FormControl sx={sxOptions} fullWidth margin="dense" size="small" error={!!error}>
            <FieldLabel
                text="Natural analog"
                help="Closest natural amino acid (one-letter code). Use X if none applies."
                error={!!error}
            />
            <Controller
                name="naturalAnalog"
                control={control}
                defaultValue=""
                rules={{ required: 'Natural analog is required (use X for none).' }}
                render={({ field }) => (
                    <Select
                        {...field}
                        size="small"
                        fullWidth
                        displayEmpty
                        error={!!error}
                        disabled={!!disabled}
                    >
                        <MenuItem value="" disabled>
                            <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: '0.78rem' }}>
                                Select…
                            </Typography>
                        </MenuItem>
                        {NATURAL_ANALOG_OPTIONS.map((aa) => (
                            <MenuItem key={aa} value={aa}>
                                {aa}
                            </MenuItem>
                        ))}
                    </Select>
                )}
            />
            {error && (
                <FormHelperText error>{error.message}</FormHelperText>
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
                    .replace(/[^A-Z0-9]/g, '')
                    .slice(0, inputMaxLength);

    const requiredMessage = cfg.requiredMessage || 'PDB is required';
    const minLengthMessage = cfg.minLengthMessage || `Minimum length is ${inputMinLength} characters`;
    const maxLengthMessage = cfg.maxLengthMessage || `Maximum length is ${inputMaxLength} characters`;

    return (
        <FormControl sx={sxOptions} fullWidth margin="dense" size="small" error={!!error}>
            <FieldLabel
                text={label}
                help={`PDB residue code — up to ${inputMaxLength} uppercase alphanumeric characters (e.g. "ALA")`}
                error={!!error}
            />
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
                        error={!!error}
                        {...field}
                        onChange={(e) => {
                            field.onChange(normalize(e.target.value));
                        }}
                        size="small"
                        fullWidth
                        placeholder={`e.g. ${placeholder}`}
                        inputProps={{ maxLength: inputMaxLength }}
                        sx={PLACEHOLDER_SX}
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
        <FormControl sx={sxOptions} fullWidth margin="dense" size="small" error={!!error}>
            <FieldLabel
                text="Type"
                help="Classification: amino acid, cap (chain terminator), or other."
                error={!!error}
            />
            <Controller
                name="selectType"
                control={control}
                defaultValue=""
                rules={{ required: 'Selection is required' }}
                render={({
                    field
                }) => (
                    <Select
                        {...field}
                        size="small"
                        displayEmpty
                        error={!!error}
                    >
                        <MenuItem value="" disabled>
                            <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: '0.78rem' }}>
                                Select…
                            </Typography>
                        </MenuItem>
                        <MenuItem value="aa" disabled={!!aaDisabled}>Amino acid</MenuItem>
                        <MenuItem value="cap" disabled={!!capDisabled}>Cap</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                    </Select>
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
        <FormControl sx={sxOptions} fullWidth margin="dense" size="small" error={!!error}>
            <FieldLabel
                text="Subtype"
                help='Natural or non-natural variant. Forced to "cap" when type is cap.'
                error={!!error}
            />
            <Controller
                name="selectSubType"
                control={control}
                defaultValue=""
                rules={{ required: 'Selection is required' }}
                render={({ field }) => (
                    <Select
                        {...field}
                        size="small"
                        fullWidth
                        displayEmpty
                        error={!!error}
                        disabled={!!disabled}
                    >
                        <MenuItem value="" disabled>
                            <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: '0.78rem' }}>
                                Select…
                            </Typography>
                        </MenuItem>
                        {options.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </MenuItem>
                        ))}
                    </Select>
                )}
            />
            {error && (
                <FormHelperText error>{error.message}</FormHelperText>
            )}
        </FormControl>
    )
}

export const GroupLabelForm = ({ sxOptions, control, error, index }) => {
    const name = `groupLabel_${index}`;

    return (
        <FormControl sx={sxOptions} fullWidth margin="dense" size="small" error={!!error}>
            <FieldLabel
                text={`R-group ${index}`}
                help="Which R-group position (R1–R4) this attachment point maps to."
                error={!!error}
            />
            <Controller
                name={name}
                control={control}
                defaultValue=""
                rules={{ required: 'Selection is required' }}
                render={({
                    field
                }) => (
                    <Select
                        {...field}
                        size="small"
                        displayEmpty
                        error={!!error}
                    >
                        <MenuItem value="" disabled>
                            <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: '0.78rem' }}>
                                Select…
                            </Typography>
                        </MenuItem>
                        <MenuItem value="1">R1</MenuItem>
                        <MenuItem value="2">R2</MenuItem>
                        <MenuItem value="3">R3</MenuItem>
                        <MenuItem value="4">R4</MenuItem>
                    </Select>
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

    return (
        <FormControl sx={sxOptions} fullWidth margin="dense" size="small" error={!!error}>
            <FieldLabel
                text={`Leaving group ${index}`}
                help="Atom(s) removed when this monomer bonds to a neighbor (H or OH)."
                error={!!error}
            />
            <Controller
                name={name}
                control={control}
                defaultValue=""
                rules={{ required: 'Leaving group is required' }}
                render={({ field }) => (
                    <Select
                        {...field}
                        size="small"
                        fullWidth
                        displayEmpty
                        error={!!error}
                    >
                        <MenuItem value="" disabled>
                            <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: '0.78rem' }}>
                                Select…
                            </Typography>
                        </MenuItem>
                        <MenuItem value="H">H</MenuItem>
                        <MenuItem value="OH">OH</MenuItem>
                    </Select>
                )}
            />
            {error && (
                <FormHelperText error>{error.message}</FormHelperText>
            )}
        </FormControl>
    )
}


