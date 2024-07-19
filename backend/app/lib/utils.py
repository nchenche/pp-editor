from rdkit.Chem import MolToPDBBlock
from rdkit.Chem.rdchem import Mol


def get_pdb_from_mol(mol: Mol):
    pdb_string, error = None, None
    try:
        pdb_string = MolToPDBBlock(mol)
    except Exception as e:
        error = e
        print("Error in converting molecule to PDB string...")
        print("Error description: {}".format(e))

    return pdb_string, error