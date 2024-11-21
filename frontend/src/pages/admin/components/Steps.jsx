import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import { useForm, Controller } from "react-hook-form"

import InputContainer from './InputContainer';
import { MolDisplayer } from './MolDisplayer';
import { NewMonomerSettingForm } from './AddNewMoleculeForm';


export const TabStep1 = ({ smiles, handleChangeSmiles }) => {
    return (
        <>
            <InputContainer smiles={smiles} handleChangeSmiles={handleChangeSmiles} />
            <MolDisplayer smiles={smiles} />
        </>
    )
}

export const TabStep2 = ({ smiles, handleSelectedBonds, selectedBonds }) => {
    const queryParams = {
        h_explicit_only: false,
        add_bond_indices: true,
        format_svg: true
    }

    const onBondClick = (event) => {
        if (!event.target.classList.contains('bond-highlight-path')) return;

        const groupBond = event.target.parentNode;
        const classes = groupBond.classList;

        // Toggle 'selected' class
        classes.toggle('selected');

        // Get selected bond indices
        const bondClassName = Array.from(classes).find(ele => ele.includes('group-bond-'));
        if (!bondClassName) return;
        const bondIndex = bondClassName.split("group-bond-")[1];

        handleSelectedBonds(bondIndex);
    };

    return (
        <MolDisplayer smiles={smiles} queryParams={queryParams} onBondClick={onBondClick} selectedBonds={selectedBonds} selectableBonds={true} />
    )
}


export const TabStep3 = ({ fragments, selectedFragmentIndex, handleSelectedFragment }) => {
    const queryParams = {
        h_explicit_only: true,
        add_bond_indices: false,
        format_svg: true,
        mols_per_row: 2
    }

    const onBondClick = (event) => {
        const target = event.target.parentNode;
        if (!target.classList.contains("group-molecule")) return;

        const classes = target.classList;

        // Remove 'selected' class to every 'group-molecule" class and add it to target only
        document.querySelectorAll('.group-molecule').forEach(ele => ele.classList.remove('selected'));
        classes.add('selected');

        // Get fragment index
        const moleculeClassName = Array.from(classes).find(ele => ele.includes('molecule-'));
        if (!moleculeClassName) return;
        const fragmentIndex = moleculeClassName.split("molecule-")[1];

        handleSelectedFragment(parseInt(fragmentIndex));
    };

    if (!fragments.length) return;

    return (
        <MolDisplayer smiles={fragments} queryParams={queryParams} onBondClick={onBondClick} selectableMolecules={true} selectedFragment={selectedFragmentIndex} />
    )
}



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

export const TabStep4 = forwardRef(({ fragmentSmiles, initialData, onFormDataChange }, ref) => {
    if (!fragmentSmiles) return;

    const queryParams = {
        // is_annotate_dummy_atoms: false,
    }

    const groupIndices = extractSmilesIndices(fragmentSmiles);

    const defaultValues = {
        name: "Alanine",
        symbol: "A",
        selectType: "aa",
        selectSubType: "natural",
        naturalAnalog: "A",
        pdb: "ALA",
    };
    const groupLabelValues = createRGroupObject("groupLabel_", groupIndices);
    const groupLeavingValues = createRGroupObject("groupLeaving_", groupIndices);

    const methods = useForm({
        defaultValues: { ...defaultValues, ...groupLabelValues, ...groupLeavingValues },
        mode: 'onBlur',
    });


    // Reset form values on component mount
    useEffect(() => {
        methods.reset({ ...methods.defaultValues, ...initialData });
    }, []);

    // Watch form values and notify parent on changes
    useEffect(() => {
        const subscription = methods.watch((value) => {
            if (onFormDataChange) {
                onFormDataChange(value);
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
        <div className='grid grid-cols-2 border'>

            <MolDisplayer smiles={fragmentSmiles} queryParams={queryParams} />
            <div className='p-2 m-2 border'>
                <h3 className='text-xl font-medium border-b-2 border-cyan-800/35 pb-2 mb-2'>Molecule setting</h3>
                <NewMonomerSettingForm
                    formMethods={methods}
                    groupIndices={groupIndices}
                />
            </div>
        </div>
    )
});
