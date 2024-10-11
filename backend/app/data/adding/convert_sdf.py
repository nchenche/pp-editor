from pathlib import Path
from rdkit import Chem
from rdkit.Chem import AllChem
import datetime

import requests



# Construct the URL for the MOL file
CHEMBL_URL = 'https://www.ebi.ac.uk/chembl/api/data/molecule/{}{}'



def get_molecule_by_id(id: str, query: str=""):
    """_summary_

    Args:
        id (str): CHEMBL id
        query (str, optional): query parameters in the form '?format=mol'
    """
    mol = None
    # Make the GET request to the ChEMBL API
    response = requests.get(CHEMBL_URL.format(id, query))


    # Check if the request was successful
    if response.status_code == 200:
        molfile_content = response.text
        # Load the molecule using RDKit
        mol = Chem.MolFromMolBlock(molfile_content)
        if mol is not None:
            print('Molecule loaded successfully.')
        else:
            print('Failed to load molecule from MOL block.')
    else:
        print(f'Error fetching data: HTTP {response.status_code}')

    return mol


# Define the ChEMBL molecule ID
chembl_id = "CHEMBL297569"  # 'CHEMBL1906423'

mol = get_molecule_by_id(id=chembl_id, query='?format=mol')


def get_carboxyl_acid_group(mol: Chem.Mol):
    """_summary_

    Args:
        mol (Chem.Mol): _description_

    Raises:
        ValueError: _description_

    Returns:
        _type_: _description_
    """
    # SMARTS pattern for carboxylic acid group: C(=O)O
    # [CX3](=O)[OX2H1] matches a carbon atom with three connections (CX3), double-bonded to an oxygen (=O), and single-bonded to an oxygen with one hydrogen ([OX2H1]).
    carboxylic_acid_smarts = '[CX3](=O)[OX2H1]'

    # Find the carboxylic acid group
    pattern = Chem.MolFromSmarts(carboxylic_acid_smarts)
    matches = mol.GetSubstructMatches(pattern)

    if not matches:
        raise ValueError("No matches found for the carboxylic acid group.")

    return matches


def get_amine_group(mol: Chem.Mol):
    # SMARTS pattern for primary amine: [N;X3;H2][C]
    # [N;X3;H2][C] matches a nitrogen atom (N) with three connections (X3) and two hydrogens (H2) connected to a carbon atom ([C]).
    amine_nitrogen_smarts = '[N;X3;H2][C]'

    # Find the primary amine nitrogen atom
    pattern = Chem.MolFromSmarts(amine_nitrogen_smarts)
    matches = mol.GetSubstructMatches(pattern)

    if not matches:
        raise ValueError("No matches found for the primary amine nitrogen.")

    return matches


carboxyl_carbon_idx, carbonyl_oxygen_idx, hydroxyl_oxygen_idx = get_carboxyl_acid_group(mol=mol)[0]
nitrogen_idx, connected_carbon_idx = get_amine_group(mol=mol)[0]

# Create an editable molecule
rw_mol = Chem.RWMol(mol)

# Replace the hydroxyl oxygen with R2
hydroxyl_oxygen_atom = rw_mol.GetAtomWithIdx(hydroxyl_oxygen_idx)
hydroxyl_oxygen_atom.SetAtomicNum(0)
hydroxyl_oxygen_atom.SetSymbol('R#')
hydroxyl_oxygen_atom.SetProp('atomLabel', 'R2')

# Add a dummy atom R1 connected to the nitrogen
dummy_atom_R1 = Chem.Atom(0)
dummy_atom_R1.SetSymbol('R#')
dummy_atom_R1.SetProp('atomLabel', 'R1')
dummy_idx_R1 = rw_mol.AddAtom(dummy_atom_R1)

# Add a bond between the nitrogen and the dummy atom
rw_mol.AddBond(nitrogen_idx, dummy_idx_R1, Chem.BondType.SINGLE)

# Adjust the nitrogen's implicit hydrogens
nitrogen_atom = rw_mol.GetAtomWithIdx(nitrogen_idx)
nitrogen_atom.SetNumExplicitHs(1)
nitrogen_atom.SetNoImplicit(True)

# Finalize the molecule to update valence and connectivity information.
mol_modified = rw_mol.GetMol()
Chem.SanitizeMol(mol_modified)


# Add properties
mol_modified.SetProp('monomerType', 'Backbone')
mol_modified.SetProp('symbol', 'A')
mol_modified.SetProp('author', 'RPBS')
mol_modified.SetProp('name', 'Alanine')
mol_modified.SetProp('naturalAnalog', 'A')
mol_modified.SetProp('polymerType', 'PEPTIDE')
mol_modified.SetProp('createDate', datetime.datetime.now().strftime('%c'))

mol_modified.SetProp('label', 'R2')
mol_modified.SetProp('capGroupName', 'OH')
mol_modified.SetProp('label (#1)', 'R1')
mol_modified.SetProp('capGroupName (#1)', 'H')
mol_modified.SetProp('label (#2)', '')
mol_modified.SetProp('capGroupName (#2)', '')


# Write the modified molecule to an SDF file
out_path = Path('/home/nche/projects/pp-editor/backend/app/data/adding')
out_sdf = out_path / 'output.sdf'


# Prepare the M  RGP line
rgp_line = f"M  RGP  2   {hydroxyl_oxygen_idx + 1}   2   {dummy_idx_R1 + 1}   1"

# Generate the MOL block
mol_block = Chem.MolToMolBlock(mol_modified)

# Insert the M  RGP line before 'M  END'
lines = mol_block.split('\n')
for i, line in enumerate(lines):
    if line.startswith('M  END'):
        m_end_index = i
        break

lines.insert(m_end_index, rgp_line)
modified_mol_block = '\n'.join(lines)


# Write to SDF file
with open(out_sdf, 'w') as f:
    f.write(modified_mol_block + '\n')
    # Write properties
    for prop_name in mol_modified.GetPropNames():
        prop_value = mol_modified.GetProp(prop_name)
        f.write(f'>  <{prop_name}>\n{prop_value}\n\n')
    f.write('$$$$\n')

#################################################



# Load your molecule
mol = Chem.MolFromMolFile('input.sdf')
if mol is None:
    raise ValueError("Failed to load molecule from 'input.sdf'")

# Identify the atoms to replace with R groups
# Replace atoms with indices 5 and 6 with R1 and R2 respectively
# Note: RDKit uses zero-based indexing
leaving_groups = [(5, 1), (6, 2)]  # (atom index, R-group label)

for idx, rlabel in leaving_groups:
    atom = mol.GetAtomWithIdx(idx)
    atom.SetAtomicNum(0)          # Set atomic number to 0 (dummy atom)
    atom.SetIsotope(0)
    atom.SetSymbol('R#')          # Set symbol to 'R#' for R-group
    atom.SetProp('atomLabel', f'R{rlabel}')  # Assign R-group label

# Add the R-group labels to the molecule's property dictionary
# This is necessary for the 'M  RGP' line in the MOL block
rgp_list = []
for idx, rlabel in leaving_groups:
    rgp_list.append(f"{idx + 1}   {rlabel}")  # Atom indices in MOL files are 1-based
mol.SetProp("M  RGP", f"{len(leaving_groups)}   " + "   ".join(rgp_list))

# Add additional molecular properties
mol.SetProp('monomerType', 'Backbone')
mol.SetProp('symbol', 'A')
mol.SetProp('author', 'RPBS')
mol.SetProp('name', 'Alanine')
mol.SetProp('naturalAnalog', 'A')
mol.SetProp('polymerType', 'PEPTIDE')
mol.SetProp('createDate', datetime.datetime.now().strftime('%c'))

# Add cap group names and labels
mol.SetProp('label', 'R2')
mol.SetProp('capGroupName', 'OH')
mol.SetProp('label (#1)', 'R1')
mol.SetProp('capGroupName (#1)', 'H')
mol.SetProp('label (#2)', '')
mol.SetProp('capGroupName (#2)', '')

# Write the modified molecule to an SDF file
writer = Chem.SDWriter('output.sdf')
writer.write(mol)
writer.close()
