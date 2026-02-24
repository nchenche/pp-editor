import { Fragment, useEffect, useMemo, useState } from 'react';

import Grid from '@mui/material/Grid2';
import {
    Box,
    Collapse,
    Link,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import {
    MolNameForm,
    MolSymbolForm,
    MolAnalogForm,
    MolPDBForm,
    MolTypeForm,
    MolSubTypeForm,
    GroupLabelForm,
    GroupLeavingForm
} from './MoleculeSettingForms/Forms'


/* ── Collapsible explainer for R-group assignment ─────────────────────────── */

/* Color tokens for visual cross-referencing */
const R1_COLOR = '#1976d2'; /* blue  */
const R2_COLOR = '#e65100'; /* orange */

const Rc = ({ n, children }) => (
    <strong style={{ color: n === 1 ? R1_COLOR : R2_COLOR }}>{children ?? `R${n}`}</strong>
);

const RGroupExplainer = () => {
    const [open, setOpen] = useState(false);
    return (
        <Box sx={{ mt: 0.5, mb: 0.5 }}>
            <Link
                component="button"
                variant="caption"
                underline="hover"
                onClick={() => setOpen((v) => !v)}
                sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.3,
                    color: 'text.secondary',
                    cursor: 'pointer',
                    fontWeight: 500,
                }}
            >
                <ExpandMoreIcon
                    sx={{
                        fontSize: 16,
                        transition: 'transform 0.2s',
                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                />
                How does R-group assignment affect my monomer?
            </Link>

            <Collapse in={open} timeout="auto">
                <Box
                    sx={{
                        mt: 1,
                        px: 2,
                        py: 1.5,
                        borderLeft: 3,
                        borderColor: 'info.main',
                        bgcolor: 'action.hover',
                        borderRadius: 1,
                        textAlign: 'left',
                    }}
                >
                    <Typography variant="caption" component="div" sx={{ color: 'text.secondary', lineHeight: 1.75, mb: 1.5 }}>
                        <strong>R-group labels (R1–R4)</strong> define where a monomer can form
                        bonds with its neighbors. The label you choose directly controls how
                        the dash shorthand (<code>-</code>) in BILN works.
                    </Typography>

                    <Typography variant="caption" component="div" sx={{ color: 'text.secondary', lineHeight: 1.75, mb: 1 }}>
                        Writing <code>m1-m2</code> is shorthand for{' '}
                        <code>m1(1,<strong style={{ color: R2_COLOR }}>2</strong>).m2(1,<strong style={{ color: R1_COLOR }}>1</strong>)</code>
                        {' '}; it connects <Rc n={2} /> of the left monomer
                        to <Rc n={1} /> of the right monomer.
                    </Typography>

                    <Box component="ul" sx={{ mt: 1, mb: 1.5, pl: 2.5, '& li': { mb: 0.75 } }}>
                        <Typography component="li" variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.75 }}>
                            For <strong>amino acids</strong> (2 R-groups), the standard convention
                            is <Rc n={1} /> = N-terminus bond
                            and <Rc n={2} /> = C-terminus bond,
                            so the dash chain works naturally.
                        </Typography>

                        <Typography component="li" variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.75 }}>
                            A <strong>cap</strong> with <Rc n={1} /> will sit on the
                            C-terminal side (right of the dash), while a cap
                            with <Rc n={2} /> will sit on the N-terminal side (left).
                        </Typography>

                        <Typography component="li" variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.75 }}>
                            <strong>R3 / R4</strong> are for additional attachment points
                            (e.g. side-chain branching). They are <em>not</em> reachable
                            via the dash shorthand — use explicit BILN notation instead,
                            e.g. <code>m1(1,<strong style={{ color: R2_COLOR }}>2</strong>).m2(1,<strong>3</strong>)</code>.
                        </Typography>
                    </Box>

                    <Typography variant="caption" component="div" sx={{ color: 'text.secondary', lineHeight: 1.75 }}>
                        <strong>Leaving group</strong> (H or OH) indicates which atom(s) are
                        removed from the attachment point when the bond forms.
                    </Typography>
                </Box>
            </Collapse>
        </Box>
    );
};


export const NewMonomerSettingForm = ({ formMethods, groupIndices, pdbConfig }) => {

    const sxOptions = { mt: 0.5, mb: 0.5, width: '100%' };
    const {
        control,
        formState: { errors },
        watch,
        setValue
    } = formMethods;

    // Watch the selected type to drive subtype logic
    const selectedType = watch('selectType');

    const rGroupCount = Array.isArray(groupIndices) ? groupIndices.length : 0;
    const capRequired = rGroupCount === 1;
    const capForbidden = rGroupCount > 1;

    // Derive subtype options based on type
    const subtypeOptions = useMemo(() => {
        if (selectedType === 'cap') {
            // When type is "cap", subtype must be "cap"
            return [{ label: 'Cap', value: 'cap' }];
        }
        // Default options for amino-acid and others
        return [
            { label: 'Natural', value: 'natural' },
            { label: 'Non-natural', value: 'non-natural' },
        ];
    }, [selectedType]);

    // Keep selectSubType in sync when type changes
    useEffect(() => {
        if (selectedType === 'cap') {
            setValue('selectSubType', 'cap', { shouldValidate: true, shouldDirty: true });
        } else if (selectedType) {
            setValue('selectSubType', 'non-natural', { shouldValidate: true, shouldDirty: true });
        } else {
            setValue('selectSubType', '', { shouldValidate: true, shouldDirty: true });
        }
    }, [selectedType, setValue]);

    // Enforce "cap" rules based on R-group count:
    // - If exactly 1 R-group exists => type must be cap
    // - If >1 R-group exists => type cannot be cap
    useEffect(() => {
        if (capRequired && selectedType !== 'cap') {
            setValue('selectType', 'cap', { shouldValidate: true, shouldDirty: true });
            return;
        }
        if (capForbidden && selectedType === 'cap') {
            setValue('selectType', 'aa', { shouldValidate: true, shouldDirty: true });
        }
    }, [capRequired, capForbidden, selectedType, setValue]);

    return (
        <>

            <Grid container rowSpacing={0.5} columnSpacing={{ xs: 0.5, sm: 1, md: 2 }} sx={{ width: '100%' }}>

                <Grid size={{ xs: 12, md: 6 }}>
                    <MolNameForm
                        sxOptions={sxOptions}
                        control={control}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <MolSymbolForm
                        sxOptions={sxOptions}
                        control={control}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <MolAnalogForm
                        sxOptions={sxOptions}
                        control={control}
                        error={errors.naturalAnalog}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <MolPDBForm
                        sxOptions={sxOptions}
                        control={control}
                        error={errors.pdb}
                        pdbConfig={pdbConfig}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <MolTypeForm
                        sxOptions={sxOptions}
                        control={control}
                        error={errors.selectType}
                        capDisabled={capForbidden}
                        aaDisabled={capRequired}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <MolSubTypeForm
                        sxOptions={sxOptions}
                        control={control}
                        error={errors.selectSubType}
                        options={subtypeOptions}
                    />
                </Grid>

                {groupIndices.map((index) => (
                    <Fragment key={index}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <GroupLabelForm
                                sxOptions={sxOptions}
                                control={control}
                                error={errors[`groupLabel_${index}`]}
                                index={index}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <GroupLeavingForm
                                sxOptions={sxOptions}
                                control={control}
                                error={errors[`groupLeaving_${index}`]}
                                index={index}
                            />
                        </Grid>
                    </Fragment>
                ))}

                {groupIndices.length > 0 && (
                    <Grid size={12}>
                        <RGroupExplainer />
                    </Grid>
                )}

            </Grid>

        </>
    );
};