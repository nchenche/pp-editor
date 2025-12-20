import { Fragment, memo, forwardRef, useImperativeHandle, useMemo, useEffect, useState } from 'react';
import { log } from '../../../utils/dev'

import { useForm, Controller } from "react-hook-form"

import Grid from '@mui/material/Grid2';

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

import createPalette from "@mui/material/styles/createPalette";


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

    // Keep selectSubType in sync when type changes to "cap"
    useEffect(() => {
        if (selectedType === 'cap') {
            // When type is cap, force subtype to 'cap'
            setValue('selectSubType', 'cap', {
                shouldValidate: true,
                shouldDirty: true,
            });
        } else if (selectedType) {
            // For any non-cap type (e.g. amino-acid), default to 'natural'
            setValue('selectSubType', 'natural', {
                shouldValidate: true,
                shouldDirty: true,
            });
        } else {
            // No type selected yet -> keep it empty so required rule can fire later
            setValue('selectSubType', '', {
                shouldValidate: true,
                shouldDirty: true,
            });
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
                    // disabled={selectedType === 'cap'} // optional: make it read-only when cap
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

            </Grid>

        </>
    )
};