import math

from flask import Blueprint, request, jsonify

from rdkit import Chem
from rdkit.Chem import Draw, rdDepictor
from rdkit.Chem.Draw import rdMolDraw2D

from app.lib.utils import format_svg

bp = Blueprint('rdkit', __name__, url_prefix='/api/rdkit')


@bp.route('/generate-svg', methods=['POST'])
def generate_svg():
    """

    Usage:
        - with query params:
            POST /generate-svg?smiles=C1=CC=CC=C1&width=400&height=400&addBondIndices=false
        - with json body:
            {"smiles": "C1=CC=CC=C1"}
    Returns:
        _type_: _description_
    """
    is_explicit_only = request.args.get("h_explicit_only", 'true').lower() == 'true'
    is_bond_indices = request.args.get('add_bond_indices', 'false').lower() == 'true'
    is_annotate_dummy_atoms = request.args.get('is_annotate_dummy_atoms', 'false').lower() == 'true'
    metadata = {}
    
    # Access JSON data if available
    data = request.json or {}
    
    # Try to get 'smiles' from JSON body or query parameters
    smiles = data.get('smiles') or request.args.get('smiles')

    if not smiles:
        return jsonify({'error': 'SMILES string is required'}), 400

    if isinstance(smiles, str):
        smiles = [smiles]

    # Generate the molecule from the SMILES string
    try:
        mols = [Chem.MolFromSmiles(x) for x in smiles]
    except:
        return jsonify({'error': 'Invalid SMILES string'}), 400

    mols = [Chem.AddHs(x, explicitOnly=is_explicit_only) for x in mols]

    if is_annotate_dummy_atoms:
        modified_mols = [annotate_dummy_atoms(x) for x in smiles]
        metadata['r_groups'], mols = zip(*[(x['r_groups'], x['modified_mol']) for x in modified_mols])

    # Instantiate a drawer object
    n_cols = int(request.args.get('mols_per_row', 1))
    n_rows = math.ceil(len(mols) / n_cols)
    # width = int(request.args.get('width', 300 / n_cols))
    # height = int(request.args.get('height', 300 / n_rows))
    width = int(request.args.get('width', 200))
    height = int(request.args.get('height', 200))

    drawer = rdMolDraw2D.MolDraw2DSVG(width=width, height=height)
    drawer_options = drawer.drawOptions()

    # Handle additional query parameters for drawing options
    drawer_options.addBondIndices = is_bond_indices
    drawer_options.minFontSize = int(request.args.get('min_font_size', 8))
    drawer_options.maxFontSize = int(request.args.get('max_font_size', 16))

    # Generate the SVG image
    svg = Draw.MolsToGridImage(
        mols,
        useSVG=True,
        molsPerRow=n_cols,
        subImgSize=(width, height),
        drawOptions=drawer_options
    )
    
    if request.args.get("format_svg"):
        kwargs = {
            'size': (width, height),
            'grid': (n_rows, n_cols),
        }
        svg = format_svg(svg_content=svg, **kwargs)

    response = {'data': svg, 'metadata': metadata}

    return jsonify(response), 200


@bp.route('/fragment-molecule', methods=['POST'])
def fragment_molecule():

    # Access JSON data if available
    data = request.json or {}
    
    # Try to get 'smiles' and 'bond' from JSON body or query parameters
    smiles = data.get('smiles') or request.args.get('smiles')
    bond_list = data.get('bonds') or request.args.get('bonds')

    try:
        bond_list = list(map(int, bond_list))
    except:
        return jsonify({'error': 'Bonds integer list is required'}), 400

    if not smiles:
        return jsonify({'error': 'SMILES string is required'}), 400

    # Generate the molecule from the SMILES string
    mol = Chem.MolFromSmiles(smiles)
    mol = Chem.AddHs(mol, explicitOnly=request.args.get("h_explicit_only", 'false').lower() == 'true')

    if mol is None:
        return jsonify({'error': 'Invalid SMILES string'}), 400    

    fragments = Chem.FragmentOnBonds(mol, bondIndices=bond_list, addDummies=True)
    splitted_fragments = Chem.GetMolFrags(fragments, asMols=True)

    response = {'data': [Chem.MolToSmiles(x) for x in splitted_fragments]}

    return jsonify(response), 200


import json
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

    sdf = generate_sdf_string(mol=mol)
    print(sdf)
    
    # print(Chem.MolToMolBlock(mol))
    print(json.dumps(r_groups_dict, indent=2))
    
    return result


def generate_sdf_string(mol: Chem.Mol):
    mol = set_props(mol=mol)
    # Generate the MOL block representation
    mol_block = Chem.MolToMolBlock(mol)

    # Retrieve all properties set on the molecule
    properties = mol.GetPropNames()

    # Append the properties to the MOL block in SDF format
    sdf_str = mol_block + "\n"
    for prop in properties:
        prop_value = mol.GetProp(prop)
        sdf_str += f">  <{prop}>\n{prop_value}\n\n"
    
    # Add the SDF end delimiter
    sdf_str += "$$$$\n"
    
    return sdf_str


def set_props(mol: Chem.Mol):
    print("Setting props...")
    Chem.SanitizeMol(mol)

    # Add the SDF tags
    mol.SetProp('m_name', "test")
    mol.SetProp('symbol', "Xt")
    mol.SetProp('m_abbr', "Xt")
    mol.SetProp('m_type', "cap")
    mol.SetProp('m_subtype', "cap")
    # mol.SetProp('m_Rgroups', ','.join(map(str, r_groups)))
    # mol.SetProp('m_RgroupIdx', ','.join(map(str, r_group_idx)))
    # mol.SetProp('m_attachmentPointIdx', ','.join(map(str, attachment_idx)))
    mol.SetProp('natAnalog', "X")
    mol.SetProp('pdbName', "XXX")

    return mol

"""


        # Extract the indices
        r_group_idx = [None, None, None, None]
        attachment_idx = [None, None, None, None]

        if p_type == "PEPTIDE":
            for atom_val in mol.GetAtoms():
                if atom_val.GetSymbol().startswith('R'):
                    label = int(atom_val.GetSymbol()[1])
                    root_atom = atom_val.GetNeighbors()[0]
                    r_group_idx[label - 1] = atom_val.GetIdx()
                    attachment_idx[label - 1] = root_atom.GetIdx()

            # Generate a PDB code for the monomer
            pdb_code = generate_pdb_code(symbol, self.list_pdbs)
            self.list_pdbs.append(pdb_code)

            # Add the SDF tags
            mol.SetProp('m_name', name)
            mol.SetProp('symbol', symbol)
            mol.SetProp('m_abbr', symbol)
            mol.SetProp('m_type', cat_type)
            mol.SetProp('m_subtype', cat_sub)
            mol.SetProp('m_Rgroups', ','.join(map(str, r_groups)))
            mol.SetProp('m_RgroupIdx', ','.join(map(str, r_group_idx)))
            mol.SetProp('m_attachmentPointIdx', ','.join(map(str, attachment_idx)))
            mol.SetProp('natAnalog', natural_a)
            mol.SetProp('pdbName', pdb_code)

rgp_list = []
for idx, rlabel in leaving_groups:
    rgp_list.append(f"{idx + 1}   {rlabel}")  # Atom indices in MOL files are one-based
mol.SetProp("M  RGP", f"{len(leaving_groups)}   " + "   ".join(rgp_list))



"""
