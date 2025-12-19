import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, memo } from 'react';

import { useForm, Controller } from "react-hook-form"

import InputContainer from './InputContainer';
import { MolDisplayer, MoleculeDisplayContainer } from './MolDisplayer';

import { NewMonomerSettingForm } from './AddNewMoleculeForm';
import { log } from '../../../utils/dev'


export const TabStep1 = memo(({ smiles, handleChangeSmiles }) => {
    return (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-start'>
            <InputContainer smiles={smiles} handleChangeSmiles={handleChangeSmiles} />
            <MoleculeDisplayContainer smiles={smiles} />
        </div>
    );
});

export const TabStep2 = memo(({ smiles, handleSelectedBonds, selectedBonds, fragments }) => {

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
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-start'>
            <MoleculeDisplayContainer
                smiles={smiles}
                queryParams={queryParams}
                onBondClick={onBondClick}
                selectedBonds={selectedBonds}
                selectableBonds={true}
            />

            <MoleculeDisplayContainer
                smiles={fragments}
                queryParams={{ mols_per_row: 2 }}
                selectedBonds={selectedBonds}
            />

        </div>
    )
});


export const countFragmentRGroups = (smiles) => {
    if (!smiles) return 0;
    const matches = String(smiles).match(/\[(\d+)\*\]|\*/g);
    return matches ? matches.length : 0;
};

export const isFragmentAllowed = (smiles, maxRGroups = 4) => {
    return countFragmentRGroups(smiles) <= maxRGroups;
};

export const TabStep3 = memo(({ fragments, selectedFragmentIndex, handleSelectedFragment, onInvalidFragment }) => {

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

        const idx = parseInt(fragmentIndex);
        const fragSmiles = fragments?.[idx];
        if (!isFragmentAllowed(fragSmiles, 4)) {
            if (onInvalidFragment) {
                onInvalidFragment('This fragment has more than 4 attachment points (R-groups). Please select a different fragment.');
            }
            return;
        }

        if (onInvalidFragment) onInvalidFragment('');
        handleSelectedFragment(idx);
    };

    if (!fragments.length) return;

    return (
        <MoleculeDisplayContainer
            smiles={fragments}
            queryParams={queryParams}
            onBondClick={onBondClick}
            selectableMolecules={true}
            selectedFragment={selectedFragmentIndex}
        />
    )
});



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

export const TabStep4 = memo(
    forwardRef(({ fragmentSmiles, initialData, onFormDataChange }, ref) => {
        if (!fragmentSmiles) return null;

        const groupIndices = useMemo(() => extractSmilesIndices(fragmentSmiles), [fragmentSmiles]);
        const groupLabelValues = useMemo(() => createRGroupObject("groupLabel_", groupIndices || []), [groupIndices]);
        const groupLeavingValues = useMemo(() => createRGroupObject("groupLeaving_", groupIndices || []), [groupIndices]);

        const defaultValues = useMemo(
            () => {
                const rGroupCount = Array.isArray(groupIndices) ? groupIndices.length : 0;
                const selectType = rGroupCount === 1 ? 'cap' : 'aa';
                const selectSubType = selectType === 'cap' ? 'cap' : 'natural';
                return {
                    name: '',
                    symbol: '',
                    selectType,
                    selectSubType,
                    naturalAnalog: selectType === 'cap' ? 'X' : '',
                    pdb: '',
                    ...groupLabelValues,
                    ...groupLeavingValues,
                    ...initialData,
                };
            },
            [groupIndices, groupLabelValues, groupLeavingValues, initialData]
        );

        // Initialize useForm outside render cycles
        const methods = useForm({
            defaultValues, // Use memoized defaultValues
            mode: 'onBlur',
        })

        // Reset form values only when `initialData` changes
        useEffect(() => {
            if (initialData) {
                methods.reset({ ...defaultValues, ...initialData });
            }
        }, []);

        // Watch form values and notify parent
        useEffect(() => {
            const subscription = methods.watch((value) => {
                if (onFormDataChange) {
                    onFormDataChange(value);
                }
            });
            return () => subscription.unsubscribe();
        }, []);

        // Expose methods to parent
        useImperativeHandle(ref, () => ({
            getFormData: () => methods.getValues(),
            isValid: async () => {
                await methods.trigger();
                return methods.formState.isValid;
            },
            validateForm: () => methods.trigger(),
        }), []);

        const queryParams = {
            h_explicit_only: true,
            // add_atom_indices: true,
            is_remove_h: true,
            format_svg: true,
        }

        return (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-start'>
                <MoleculeDisplayContainer smiles={fragmentSmiles} queryParams={queryParams} />
                <div className='p-2 md:p-3'>
                    <h3 className='text-xl font-medium border-b-2 border-cyan-800/35 pb-2 mb-2'>Molecule setting</h3>
                    <NewMonomerSettingForm formMethods={methods} groupIndices={groupIndices} />
                </div>
            </div>
        );
    })
);
