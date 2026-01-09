import math

from flask import Blueprint, request, jsonify

from rdkit import Chem
from rdkit.Chem import Draw, rdDepictor
from rdkit.Chem.Draw import rdMolDraw2D

from app.lib.utils import format_svg
from app.services.molecules import annotate_dummy_atoms, get_molblock

bp = Blueprint('rdkit', __name__, url_prefix='/api/molecules')


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
    is_atom_indices = request.args.get('add_atom_indices', 'false').lower() == 'true'
    is_annotate_dummy_atoms = request.args.get('is_annotate_dummy_atoms', 'false').lower() == 'true'
    is_add_h = request.args.get("is_add_h", 'true').lower() == 'true'
    metadata = {}
    
    # Access JSON data if available
    data = request.json or {}
    
    # Try to get 'smiles' from JSON body or query parameters
    smiles = data.get('smiles') or request.args.get('smiles')

    if not smiles:
        return jsonify({'error': 'SMILES string is required'}), 400

    if isinstance(smiles, str):
        smiles = [smiles]

    # Generate the molecule(s) from the SMILES strings
    mols = [Chem.MolFromSmiles(x) for x in smiles]
    if any(m is None for m in mols):
        # Identify first invalid entry to help the user.
        try:
            invalid_idx = next(i for i, m in enumerate(mols) if m is None)
            invalid_smiles = smiles[invalid_idx]
        except Exception:
            invalid_smiles = None

        msg = 'Invalid SMILES string'
        if invalid_smiles:
            msg = f"Invalid SMILES string: '{invalid_smiles}'"
        return jsonify({'error': msg}), 400

    if is_add_h:
        try:
            mols = [Chem.AddHs(x, explicitOnly=is_explicit_only) for x in mols]
        except Exception:
            return jsonify({'error': 'Failed to add hydrogens (check SMILES input)'}), 400

    if is_annotate_dummy_atoms:
        try:
            modified_mols = [annotate_dummy_atoms(x) for x in smiles]
            metadata['r_groups'], mols = zip(*[(x['r_groups'], x['modified_mol']) for x in modified_mols])
        except Exception:
            return jsonify({'error': 'Failed to annotate dummy atoms (check SMILES input)'}), 400

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
    drawer_options.addAtomIndices = is_atom_indices
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


@bp.route('/generate-molblock', methods=['POST'])
def generate_molblock():
    import json    

    # Access JSON data if available
    data = request.json or {}

    smiles =  data.get('smiles')
    form_data = data.get('form')

    molblock = get_molblock(smiles=smiles, data=form_data)

    response = {'data': molblock}
    print(json.dumps(response, indent=2))

    return jsonify(response), 200

