from flask import Blueprint, request, jsonify
from rdkit import Chem
from rdkit.Chem import Draw, rdDepictor
from rdkit.Chem.Draw import rdMolDraw2D


bp = Blueprint('rdkit', __name__, url_prefix='/api/rdkit')


@bp.route('/generate-svg', methods=['POST'])
def generate_svg():
    data = request.json
    smiles = data.get('smiles')

    if not smiles:
        return jsonify({'error': 'SMILES string is required'}), 400

    # Generate the molecule from the SMILES string
    mol = Chem.MolFromSmiles(smiles)
    mol = Chem.AddHs(mol, explicitOnly=False)
    rdDepictor.Compute2DCoords(mol=mol)

    if mol is None:
        return jsonify({'error': 'Invalid SMILES string'}), 400

    # Instantiate a drawer object
    drawer = rdMolDraw2D.MolDraw2DSVG(width=300, height=300)
    drawer_options = drawer.drawOptions()

    drawer_options.addBondIndices = True
    drawer_options.minFontSize = 8
    drawer_options.maxFontSize = 16


    # Prepare and draw the molecule
    rdMolDraw2D.PrepareAndDrawMolecule(drawer, mol)

    # Finish drawing and get the drawing text
    drawer.FinishDrawing()
    svg = drawer.GetDrawingText()    


    # Return the SVG as a response
    return svg, 200

