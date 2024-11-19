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
        h_explicit_only: false,
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


export const TabStep4 = ({ fragments, selectedFragmentIndex }) => {
    const queryParams = {
        is_annotate_dummy_atoms: false,
    }

    if (!fragments[selectedFragmentIndex]) return;

    return (
        <div className='grid grid-cols-2 border'>

            <MolDisplayer smiles={fragments[selectedFragmentIndex]} queryParams={queryParams} />
            <div className='p-2 m-2 border'>
                <h3 className='text-xl font-medium border-b-2 border-cyan-800/35 pb-2 mb-2'>Molecule setting</h3>
                <NewMonomerSettingForm smiles={fragments[selectedFragmentIndex]} />
            </div>
        </div>
    )
}
