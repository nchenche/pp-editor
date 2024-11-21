from collections import defaultdict
from typing import Dict, List, Tuple
import re


from rdkit import Chem

def annotate_dummy_atoms(smiles: str):  
    if not smiles:
        raise ValueError("Invalid SMILES string.")

    # Convert SMILES to an RDKit molecule object
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError("Error converting SMILES to Chem.Mol object.")

    # Identify the dummy atoms (atomic number 0 represents dummy atoms in RDKit)
    dummy_atom_indices = [atom.GetIdx() for atom in mol.GetAtoms() if atom.GetAtomicNum() == 0]

    if len(dummy_atom_indices) > 4:
        raise ValueError(f"Unexpected number of dummy atoms created: {len(dummy_atom_indices)}. No more than 4 are expected.")

    # Assign R group labels to each dummy atom
    r_groups_dict = {}
    for i, atom_idx in enumerate(dummy_atom_indices, start=1):
        atom = mol.GetAtomWithIdx(atom_idx)
        r_group_label = f'R{i}'  # e.g., R1, R2, etc.

        # Modify the atom's properties to reflect the R-group label
        atom.SetAtomicNum(0)  # Atomic number 0 is used to indicate dummy atoms
        atom.SetIsotope(i)  # Use isotope to give a unique number (e.g., R1, R2)
        atom.SetProp('atomLabel', r_group_label)

        r_groups_dict[r_group_label] = {
            "label": r_group_label,
            "group_idx": atom_idx,
            "attachment_idx": atom.GetNeighbors()[0].GetIdx()
        }        
        atom.SetProp('_displayLabel', r_group_label)  # This will be used when generating SVGs

    result = {'modified_mol': mol, 'r_groups': r_groups_dict}
    
    return result


def get_molblock(smiles: str, data: Dict):
    """
    
    {
    "data": {
        "name": "Alanine",
        "symbol": "A",
        "naturalAnalog": "A",
        "pdb": "ALA",
        "selectType": "aminoAcid",
        "selectSubType": "natural",
        "groupLabel_2": "r1",
        "groupLeaving_2": "OH"
        }
    }

    Args:
        smiles (str): _description_
        data (Dict): _description_
    """
    leaving_groups = extract_groups(data=data)
    atom_idx_mapping = {}

    # Generate the molecule from the SMILES string
    mol = Chem.MolFromSmiles(smiles)
    mol = reorder_atoms(mol=mol)

    # Get mapping of group indices
    ## indices refer to the imput smiles which is hydrogenated; mol in not hydrogenated, so a group atom mapping is required 
    atom_idx_mapping = map_group_indices(mol=mol)


    # Generate group 'matrices'
    r_group_idx, attachment_idx, leaving_group_idx = generate_group_matrices(
        mol=mol,
        groups=leaving_groups, 
        mapping=atom_idx_mapping
    )

    molblock = set_molblock(
        mol=mol,
        leaving_groups=leaving_groups,
        mapping=atom_idx_mapping,
        data=data,
        leaving_idx=leaving_group_idx,
        group_idx=r_group_idx,
        attachment_idx=attachment_idx
    )

    return molblock


def extract_groups(data):
    # Compile a regex pattern to match keys like 'groupLabel_x' or 'groupLeaving_x'
    group_pattern = re.compile(r'group(Label|Leaving)_(\*|\d+)')
    
    # Use defaultdict to automatically handle missing keys
    groups = defaultdict(dict)
    
    for key, value in data.items():
        match = group_pattern.match(key)
        if match:
            kind, x = match.groups()
            
            # Handle the special case where x is '*'
            x_int = 0 if x == '*' else int(x)
            
            if kind == 'Label':
                # Convert groupLabel_x value to int, default to 0 if conversion fails
                groups[x_int]['label'] = int(value) if value.isdigit() else 0
            elif kind == 'Leaving':
                # Assign the groupLeaving_x value directly
                groups[x_int]['leaving'] = value
    
    # Compile the final list of tuples
    result = []
    for x, group in sorted(groups.items()):
        label = group.get('label', 0)       # Default to 0 if not present
        leaving = group.get('leaving', '')  # Default to empty string if not present
        result.append((x, label, leaving))
    
    return result


def reorder_atoms(mol: Chem.Mol) -> Chem.Mol:
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

    return mol

def map_group_indices(mol: Chem.Mol) -> Dict:
    """Map indices of leaving groups (isotope) from smiles with hydrogen to 
    the same smiles with non-added hydrogens

    Args:
        mol (Chem.Mol): RDkit Chem.Mol instance

    Returns:
        Dict: Dictionary with H mol indices as keys and non-H mol indices as values
    """    
    atom_idx_mapping = {}
    for atom in mol.GetAtoms():
        if atom.GetAtomicNum() != 0:
            continue
        atom_idx_mapping[atom.GetIsotope()] = atom.GetIdx()
    
    return atom_idx_mapping


def generate_group_matrices(mol: Chem.Mol, groups: List[Tuple], mapping: Dict) -> Tuple[Dict]:
    r_group_idx = [None, None, None, None]
    attachment_idx = [None, None, None, None]
    leaving_group_idx = [None, None, None, None]

    for idx, label, group in groups:
        atom = mol.GetAtomWithIdx(mapping[idx])
        root_atom = atom.GetNeighbors()[0]

        attachment_idx[label - 1] = root_atom.GetIdx()
        r_group_idx[label - 1] = mapping[idx]
        leaving_group_idx[label - 1] = group
        # atom.SetIsotope(idx)
        # atom.SetProp('atomLabel', f"R#")  # Assign R-group label

    return r_group_idx, attachment_idx, leaving_group_idx


def set_molblock(
        mol: Chem.Mol,
        leaving_groups: List[Tuple],
        mapping: Dict,
        data: Dict,
        leaving_idx: List,
        group_idx: List,
        attachment_idx: List
    ) -> str:
    
    # Add the R-group labels to the molecule's property dictionary
    # This is necessary for the 'M  RGP' line in the MOL block
    rgp_list = []
    for idx, label, _ in leaving_groups:
        rgp_list.append(f"{mapping[idx] + 1}   {attachment_idx[label - 1]+1}")  # Atom indices in MOL files are one-based
    rgp_line = f"M  RGP {len(leaving_groups)}   " + "   ".join(rgp_list)

    # Add additional molecular properties
    mol.SetProp('m_name', data.get('name', ''))
    mol.SetProp('symbol', data.get('symbol', ''))
    mol.SetProp('m_abbr', data.get('name', ''))
    mol.SetProp('m_type', data.get('selectType', ''))
    mol.SetProp('m_subtype', data.get('selectSubType', ''))
    mol.SetProp('m_Rgroups', ','.join(map(str, leaving_idx)))
    mol.SetProp('m_RgroupIdx', ','.join(map(str, group_idx)))
    mol.SetProp('m_attachmentPointIdx', ','.join(map(str, attachment_idx)))
    mol.SetProp('natAnalog', data.get('naturalAnalog', ''))
    mol.SetProp('pdbName', data.get('pdb', ''))

    # Get mol block string
    mol_block = Chem.MolToMolBlock(mol)

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
    mol_block += "\n"
    for prop in properties:
        prop_value = mol.GetProp(prop)
        mol_block += f">  <{prop}>\n{prop_value}\n\n"    
    mol_block += "$$$$\n"  # Add the SDF end delimiter

    return mol_block


