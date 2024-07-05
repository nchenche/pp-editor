from flask import Blueprint, jsonify, request

from app.services import pypept


bp = Blueprint('api', __name__, url_prefix='/api')


@bp.route('/convert/helm/to/biln', methods=['POST'])
def convert_helm_to_biln():
    # Assuming the sequence is sent in the JSON body of the request
    data = request.get_json()
    sequence = data.get('sequence', None)
    
    if sequence is None:
        return jsonify({"error": "No sequence provided"}), 400

    # Your conversion logic here
    conversion, error = pypept.format_to(sequence=sequence, format_dest="biln")

    result = {
        'data': conversion,
        'error': error
    }

    return jsonify(result)


@bp.route('/convert/biln/to/helm', methods=['POST'])
def convert_biln_to_helm():
    # Assuming the sequence is sent in the JSON body of the request
    data = request.get_json()
    sequence = data.get('sequence')
    
    if sequence is None:
        return jsonify({"error": "No sequence provided"}), 400

    # Your conversion logic here
    conversion, error = pypept.format_to(sequence=sequence, format_dest="helm")

    result = {
        'data': conversion,
        'error': error
    }

    return jsonify(result)


@bp.route('/convert/biln/to/smiles', methods=['POST'])
def convert_biln_to_smiles():
    # Assuming the sequence is sent in the JSON body of the request
    data = request.get_json()
    sequence = data.get('sequence', None)
    
    if sequence is None:
        return jsonify({"error": "No sequence provided"}), 400

    # convert to smiles
    conversion, error = pypept.format_to(sequence=sequence, format_dest="smiles")

    result = {
        'data': conversion,
        'error': error
    }

    return jsonify(result)


@bp.route('/pdb_from_seq', methods=['POST'])
def get_pdb_from_sequence():
    # Assuming the sequence is sent in the JSON body of the request
    data = request.get_json()
    sequence = data.get('sequence')
    
    if sequence is None:
        return jsonify({"error": "No sequence provided"}), 400

    # get pdb as a string
    pdb_string, error = pypept.get_pdb(biln_sequence=sequence)

    result = {
        'data': pdb_string,
        'error': error
    }

    return jsonify(result)


@bp.route('/predict_secondary_structure', methods=['POST'])
def predict_secondary_structure():
    # Assuming the sequence is sent in the JSON body of the request
    data = request.get_json()
    sequence = data.get('sequence')
    
    if sequence is None:
        return jsonify({"error": "No sequence provided"}), 400

    # predict secondary structure
    secondary_structure, error = pypept.predict_secondary_structure(sequence=sequence)

    result = {
        'data': secondary_structure,
        'error': error
    }

    return jsonify(result)


@bp.route('/generate_secondary_structure', methods=['POST'])
def generate_secondary_structure():
    # Assuming the sequence is sent in the JSON body of the request
    data = request.get_json()
    print(data)
    sequence = data.get('sequence', None)
    seq_structure = data.get("ss_value", None)
    
    if not sequence:
        return jsonify({"error": "No sequence provided"}), 400
    if not seq_structure:
        print("No secondary structure (ss_value) provided...")
        # predict secondary structure
        try:
            seq_structure, error = pypept.predict_secondary_structure(sequence=sequence)
        except:
            print("Error in predicting the secondary structure...")
            return jsonify({data: "", error: "Error in predicting the secondary structure..."}), 400

    # predict secondary structure
    pdb_string, error = pypept.generate_secondary_structure(sequence=sequence, sec_struct=seq_structure)

    result = {
        'data': pdb_string,
        'error': error
    }

    return jsonify(result)