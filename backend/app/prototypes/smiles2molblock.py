from pathlib import Path
from rdkit import Chem
from rdkit.Chem import AllChem, rdqueries
from app.prototypes import ROOT_PATH

"""
>  <m_Rgroups>  (1) 
H,OH,None,None

>  <m_RgroupIdx>  (1) 
6,5,None,None

>  <m_attachmentPointIdx>  (1) 
0,3,None,None
"""

# input values
smiles = "[4*]C(=O)[C@@]([H])(N([12*])[H])C([H])([H])[H]"
leaving_groups = [(4, 2, "OH"), (12, 1, "H")]  # (atom index, R-group label, leaving group)
atom_idx_mapping = {}
name = "MolTest"
symbol = "M"
_type = "cap"
subtype = "cap"
natural_analog = "X"
pdb = "MMM"


# Generate the molecule from the SMILES string
mol = Chem.MolFromSmiles(smiles)
# mol = Chem.AddHs(mol, explicitOnly=False)  # required for atom indices consistency

# reorder atoms
order = list(range(mol.GetNumAtoms()))
indices = []
for atom_val in mol.GetAtoms():
    if atom_val.GetAtomicNum() == 0:
        indices.append(atom_val.GetIdx())
        order.remove(atom_val.GetIdx())
for idx in indices:
    order.append(idx)
# Renumber the atoms
mol = Chem.RenumberAtoms(mol, newOrder=order)

# map atom indices of leaving groups with their original isotope since no Hs are added
for atom in mol.GetAtoms():
    if atom.GetAtomicNum() != 0:
        continue
    print(atom.GetIsotope())
    atom_idx_mapping[atom.GetIsotope()] = atom.GetIdx()


# process input values
r_group_idx = [None, None, None, None]
attachment_idx = [None, None, None, None]
leaving_group_idx = [None, None, None, None]

for idx, label, group in leaving_groups:
    # atom = mol.GetAtomWithIdx(idx-1)
    atom = mol.GetAtomWithIdx(atom_idx_mapping[idx])

    root_atom = atom.GetNeighbors()[0]
    attachment_idx[label - 1] = root_atom.GetIdx()
    r_group_idx[label - 1] = atom_idx_mapping[idx]
    leaving_group_idx[label - 1] = group
    atom.SetIsotope(idx)
    atom.SetProp('atomLabel', f"R#")  # Assign R-group label


# Add the R-group labels to the molecule's property dictionary
# This is necessary for the 'M  RGP' line in the MOL block
rgp_list = []
for idx, label, _ in leaving_groups:
    rgp_list.append(f"{atom_idx_mapping[idx] + 1}   {attachment_idx[label - 1]+1}")  # Atom indices in MOL files are one-based
rgp_line = f"M  RGP {len(leaving_groups)}   " + "   ".join(rgp_list)


mol_block = Chem.MolToMolBlock(mol)

# Add additional molecular properties
mol.SetProp('m_name', name)
mol.SetProp('symbol', symbol)
mol.SetProp('m_abbr', symbol)
mol.SetProp('m_type', _type)
mol.SetProp('m_subtype', subtype)
mol.SetProp('m_Rgroups', ','.join(map(str, leaving_group_idx)))
mol.SetProp('m_RgroupIdx', ','.join(map(str, r_group_idx)))
mol.SetProp('m_attachmentPointIdx', ','.join(map(str, attachment_idx)))
mol.SetProp('natAnalog', "X")
mol.SetProp('pdbName', pdb)


# Replace the M  ISO line with M  RGP line
lines = mol_block.split('\n')
for i, line in enumerate(lines):
    if " R " in line:
        lines[i] = line.replace(" R ", " R#")

    if line.startswith('M  ISO'):
        lines[i] = rgp_line

        # Parse the RGP line to determine which atoms to label with 'V' lines
        rgp_tokens = rgp_line.split()
        num_r_groups = int(rgp_tokens[2])
        
        for j in range(num_r_groups):
            atom_index = rgp_tokens[3 + j * 2]  # Extract atom index
            lines.insert(i + j + 1, f'V    {atom_index} *')
        break


mol_block = '\n'.join(lines)

# Retrieve all properties set on the molecule
properties = mol.GetPropNames()

# Append the properties to the MOL block in SDF format
sdf_str = mol_block + "\n"
for prop in properties:
    prop_value = mol.GetProp(prop)
    sdf_str += f">  <{prop}>\n{prop_value}\n\n"

# Add the SDF end delimiter
sdf_str += "$$$$\n"

print(sdf_str)


