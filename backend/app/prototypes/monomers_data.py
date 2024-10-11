from importlib.resources import files
from typing import Dict

from rdkit import Chem
from rdkit.Chem import rdMolDescriptors, Descriptors

from pyPept.sequence import correct_pdb_atoms, get_monomer_info, Sequence, SequenceConstants
from pyPept.molecule import Molecule


def get_full_smiles(abbr: str) -> str:
    """Computes and returns a complete SMILE of the abbr monomer.

    Args:
        abbr (str): Valid abbreviation name of a pyPept monomer

    Returns:
        str: SMILES of the monomer abbr

    Examples:
        >>> from rdkit import Chem
        >>> smiles = "[1*]N[C@@H](CS[3*])C([2*])=O"
        >>> mol = Chem.MolFromSmiles(smiles)
        >>> indices = [0, 5, 8]  # Atom indices for [1*], [2*], and [3*]
        >>> labeled_mol = set_rgroup_labels(mol, indices)
        >>> # The atoms at indices 0, 5, and 8 are now labeled as R₁, R₂, and R₃

    """
    
    print(f"smiles from {abbr}...")
    # Start the Sequence object
    seq = Sequence(abbr)

    # Generate the complete SMILES
    mol = Molecule(seq)
    smiles = mol.get_molecule(fmt='Smiles')

    return smiles


def get_descriptors(mol: Chem.Mol) -> Dict:
    """Computes all RDkit descriptors

    Args:
        mol (Chem.Mol): Instance od RDkit Mol class

    Returns:
        Dict: Dictionary with rdkit descriptors as keys and their values
    """

    # # Calculate various descriptors
    # descriptor_values['Molecular Weight'] = Descriptors.MolWt(mol)
    # descriptor_values['Exact Molecular Weight'] = Descriptors.ExactMolWt(mol)
    # descriptor_values['LogP'] = Descriptors.MolLogP(mol)
    # descriptor_values['Number of H-bond Donors'] = Descriptors.NumHDonors(mol)
    # descriptor_values['Number of H-bond Acceptors'] = Descriptors.NumHAcceptors(mol)
    # descriptor_values['Topological Polar Surface Area'] = Descriptors.TPSA(mol)
    # descriptor_values['Number of Rotatable Bonds'] = Descriptors.NumRotatableBonds(mol)
    # descriptor_values['Number of Aromatic Rings'] = Descriptors.NumAromaticRings(mol)
    # descriptor_values['Number of Aliphatic Rings'] = Descriptors.NumAliphaticRings(mol)
    # descriptor_values['Formal Charge'] = Descriptors.MolMR(mol)

    # vals = Descriptors.CalcMolDescriptors(mol)
    # for desc_name, value in vals.items():
    #     print(f"{desc_name}: {value}")

    # Create a dictionary to hold descriptor values
    descriptor_values = {}

    # Loop over all descriptors in the _descList
    for desc_name, function in Descriptors._descList:
        try:
            descriptor_values[desc_name] = function(mol)
        except:
            descriptor_values[desc_name] = None

    return descriptor_values



if __name__ == "__main__":

    # Read the monomer dataframe
    default_monomer_df_filepath = files(SequenceConstants.def_path).joinpath(SequenceConstants.def_lib_filename)
    monomer_df_filepath = files(SequenceConstants.def_path).joinpath(SequenceConstants.def_lib_filename)

    if monomer_df_filepath.is_file() is False:
        monomer_df_filepath = default_monomer_df_filepath

    df = get_monomer_info(str(monomer_df_filepath))

    # Get df where index 2 list value of m_rgroups is not None
    is_r3_groups = df['m_Rgroups'].apply(lambda x: x[2] is not None)
    filtered_df = df[is_r3_groups]
    has_natural_analog = df['natAnalog'].apply(lambda x: x == "X")
    df[has_natural_analog]

    capped = df['m_type'].apply(lambda x: x == "cap")
    df[capped]


    data = filtered_df.transpose().to_dict()


    mol = df['m_romol']['C']

    # Create the 'smiles' column
    df['smiles'] = df['m_romol'].apply(Chem.MolToSmiles)
    df['full_smiles'] = df['m_abbr'].apply(get_full_smiles)

