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

    mols = [Chem.AddHs(x, explicitOnly=request.args.get("h_explicit_only", 'true').lower() == 'true') for x in mols]


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
    drawer_options.addBondIndices = request.args.get('add_bond_indices', 'false').lower() == 'true'
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

    response = {'data': svg}

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