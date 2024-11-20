import { Fragment, forwardRef, useImperativeHandle, useEffect, useState } from 'react';
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

const extractSmilesIndices = (str) => {
    const regex = /\[(\d+)\*\]|\*/g;
    const indices = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
        if (match[1]) {
            indices.push(parseInt(match[1], 10));
        } else {
            indices.push('*');
        }
    }
    return indices;
};


const createRGroupObject = (baseName, groupIndices) => {
    return groupIndices.reduce((accumulator, currentValue) => {
        accumulator[baseName + currentValue] = '';
        return accumulator;
    }, {});
};


export const NewMonomerSettingForm = forwardRef(({ smiles, initialData, onChange }, ref) => {

    const sxOptions = { margin: 0.85, width: 180 }
    const groupIndices = extractSmilesIndices(smiles);

    const defaultValues = {
        name: "",
        symbol: "",
        selectType: "",
        selectSubType: "",
        naturalAnalog: "",
        pdb: "",
    };
    const groupLabelValues = createRGroupObject("groupLabel", groupIndices);
    const groupLeavingValues = createRGroupObject("groupLeaving", groupIndices);

    const methods = useForm({
        defaultValues: { ...defaultValues, ...groupLabelValues, ...groupLeavingValues },
        mode: 'onBlur',
    });


    const { control, formState: { errors }, } = methods;

    // Reset form values on component mount
    useEffect(() => {
        methods.reset({ ...methods.defaultValues, ...initialData });
    }, []);

    // Watch form values and notify parent on changes
    useEffect(() => {
        const subscription = methods.watch((value) => {
            if (onChange) {
                onChange(value);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    // Expose methods to the parent via ref
    useImperativeHandle(ref, () => ({
        getFormData: async () => {
            return methods.getValues();
        },
        isValid: async () => {
            await methods.trigger(); // Ensure validation is up-to-date
            return methods.formState.isValid;
        },
        submitForm: async () => {
            return await methods.handleSubmit(
                async (data) => {
                    // Handle successful submission
                    console.log(data);
                    // Return data to caller
                    return data;
                },
                async (errors) => {
                    // Handle submission errors
                    console.log(errors);
                    // Optionally throw an error or return null
                    throw errors;
                }
            )();
        },
        validateForm: async () => {
            const valid = await methods.trigger();
            return valid;
        },
    }));

    return (
        <>

            <Grid container rowSpacing={0.5} columnSpacing={{ xs: 0.5, sm: 1, md: 2 }}>

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
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <MolTypeForm
                        sxOptions={sxOptions}
                        control={control}
                        error={errors.selectType}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <MolSubTypeForm
                        sxOptions={sxOptions}
                        control={control}
                        error={errors.selectSubType}
                    />
                </Grid>

                {groupIndices.map((index) => (
                    <Fragment key={index}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <GroupLabelForm
                                sxOptions={sxOptions}
                                control={control}
                                error={errors[`groupLabel${index}`]}
                                index={index}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <GroupLeavingForm
                                sxOptions={sxOptions}
                                control={control}
                                error={errors[`groupLeaving${index}`]}
                                index={index}
                            />
                        </Grid>
                    </Fragment>
                ))}

            </Grid>

        </>
    )
});