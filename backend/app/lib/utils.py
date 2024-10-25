import re
from typing import List, Tuple

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


def _format_svg(svg_content: str) -> str:
    """Format original SVG content generated from rdkit to an restructured SVG with additional classes and components.

    The restructuration includes:
    - bundling of all related bonds inside an SVG group tag
    - adding of a new path for each grouped bonds. That path is dedicated to highlight bonds on hovering over them
    - bundling different molecules inside an SVG group

    Args:
        svg_content (str): Original SVG content from rdkit

    Raises:
        ValueError: _description_
        ValueError: _description_

    Returns:
        str: Restructured SVG content
    """


    # Regular expression to find all path elements
    path_regex = re.compile(r'(\s*<path[^>]*>)', re.MULTILINE)

    # Find all paths in the SVG content
    paths = path_regex.findall(svg_content)

    # Variables to keep track of molecules
    molecules = []
    current_molecule_paths = []
    collecting_atoms = False  # Flag to indicate we're collecting atom paths

    # Iterate over all paths
    for path_str in paths:
        # Check if the path is a bond or atom path
        class_match = re.search(r'class=[\'"]([^\'"]+)[\'"]', path_str)
        if class_match:
            class_attr = class_match.group(1)
            classes = class_attr.split()
            is_bond = any(cls.startswith('bond-') for cls in classes)
            is_atom = any(cls.startswith('atom-') for cls in classes)
            
            if is_bond:
                if collecting_atoms:
                    # We've encountered a bond after atoms; start a new molecule
                    molecules.append(current_molecule_paths)
                    current_molecule_paths = []
                    collecting_atoms = False
                # Add the bond path to the current molecule
                current_molecule_paths.append(path_str)
            elif is_atom:
                collecting_atoms = True  # We're now collecting atoms
                current_molecule_paths.append(path_str)
            else:
                # Non-bond/atom path, add to current molecule
                current_molecule_paths.append(path_str)
        else:
            # Path without class, add to current molecule
            current_molecule_paths.append(path_str)

    # Add the last molecule if any paths remain
    if current_molecule_paths:
        molecules.append(current_molecule_paths)

    # Now, process each molecule
    processed_molecules = []
    for mol_index, mol_paths in enumerate(molecules):
        # Process the molecule's paths
        # Group bond paths, add highlight paths, and wrap in a <g> element
        bond_groups = {}
        other_paths = []
        for path in mol_paths:
            class_match = re.search(r'class=[\'"]([^\'"]+)[\'"]', path)
            if class_match:
                class_attr = class_match.group(1)
                classes = class_attr.split()
                bond_classes = [cls for cls in classes if cls.startswith('bond-')]
                if bond_classes:
                    bond_class = bond_classes[0]
                    bond_index = bond_class.split('-')[1]
                    if bond_index not in bond_groups:
                        bond_groups[bond_index] = []
                    bond_groups[bond_index].append(path)
                else:
                    other_paths.append(path)
            else:
                # Path without class, add to other paths
                other_paths.append(path)
        # Build the molecule content
        molecule_content = []
        # Process bond groups
        for bond_index, paths in bond_groups.items():
            group_class = f'group-bond-{bond_index}'
            # Collect 'd' attributes
            d_attributes = []
            for path in paths:
                d_match = re.search(r"d=['\"](.*?)['\"]", path)
                if d_match:
                    d_attributes.append(d_match.group(1))
            # Combine 'd' attributes
            combined_d = ' '.join(d_attributes)
            # Create highlight path
            highlight_path = f'<path class="bond-highlight-path" d="{combined_d}" />'
            # Build bond group content
            bond_group_content = '\n'.join([highlight_path] + paths)
            bond_group = f'<g class="group-bond {group_class}">\n{bond_group_content}\n</g>'
            molecule_content.append(bond_group)
        # Add other paths (atoms and any non-bond paths)
        molecule_content.extend(other_paths)
        # Wrap molecule content in a <g> element
        molecule_group = f'<g class="molecule-{mol_index}">\n' + '\n'.join(molecule_content) + '\n</g>'
        processed_molecules.append(molecule_group)

    # Now, reconstruct the SVG content
    # Remove all paths from the original SVG content
    svg_content_no_paths = path_regex.sub('', svg_content)


    # Find the end of the opening <svg> tag
    svg_start_match = re.search(r'<svg[^>]*>', svg_content_no_paths)
    if svg_start_match:
        svg_start_end = svg_start_match.end()
        # Insert the style block
        svg_content_no_paths = svg_content_no_paths[:svg_start_end] + svg_content_no_paths[svg_start_end:]
    else:
        raise ValueError("No opening <svg> tag found.")

    # Reconstruct the SVG content
    # Insert the processed molecules before the closing </svg> tag
    insertion_point = svg_content_no_paths.rfind('</svg>')
    if insertion_point == -1:
        raise ValueError("No closing </svg> tag found.")

    modified_svg = svg_content_no_paths[:insertion_point] + '\n' + '\n'.join(processed_molecules) + '\n' + svg_content_no_paths[insertion_point:]

    return modified_svg


def format_svg(svg_content: str, size: Tuple|List=(300, 300), grid: Tuple|List=(1, 1)) -> str:
    """Format original SVG content generated from rdkit to a restructured SVG with additional classes and components.

    The restructuring includes:
    - Bundling of all related bonds inside an SVG group tag.
    - Adding a new path for each grouped bonds. That path is dedicated to highlight bonds on hovering over them.
    - Bundling different molecules inside an SVG group.
    - Adding a rect element just below each molecule group.

    Args:
        svg_content (str): Original SVG content from rdkit.

    Raises:
        ValueError: If opening or closing SVG tags are not found.

    Returns:
        str: Restructured SVG content.
    """

    import re

    # Regular expression to find all path elements
    path_regex = re.compile(r'(\s*<path[^>]*>)', re.MULTILINE)

    # Find all paths in the SVG content
    paths = path_regex.findall(svg_content)

    # Variables to keep track of molecules
    molecules = []
    current_molecule_paths = []
    collecting_atoms = False  # Flag to indicate we're collecting atom paths

    # Iterate over all paths
    for path_str in paths:
        # Check if the path is a bond or atom path
        class_match = re.search(r'class=[\'"]([^\'"]+)[\'"]', path_str)
        if class_match:
            class_attr = class_match.group(1)
            classes = class_attr.split()
            is_bond = any(cls.startswith('bond-') for cls in classes)
            is_atom = any(cls.startswith('atom-') for cls in classes)
            
            if is_bond:
                if collecting_atoms:
                    # We've encountered a bond after atoms; start a new molecule
                    molecules.append(current_molecule_paths)
                    current_molecule_paths = []
                    collecting_atoms = False
                # Add the bond path to the current molecule
                current_molecule_paths.append(path_str)
            elif is_atom:
                collecting_atoms = True  # We're now collecting atoms
                current_molecule_paths.append(path_str)
            else:
                # Non-bond/atom path, add to current molecule
                current_molecule_paths.append(path_str)
        else:
            # Path without class, add to current molecule
            current_molecule_paths.append(path_str)

    # Add the last molecule if any paths remain
    if current_molecule_paths:
        molecules.append(current_molecule_paths)

    # Set molecule rect parameters
    n_rows, n_cols = grid
    rect_width, rect_height = size

    # Process each molecule
    processed_molecules = []
    for mol_index, mol_paths in enumerate(molecules):
        # Group bond paths, add highlight paths, and wrap in a <g> element
        bond_groups = {}
        other_paths = []
        for path in mol_paths:
            class_match = re.search(r'class=[\'"]([^\'"]+)[\'"]', path)
            if class_match:
                class_attr = class_match.group(1)
                classes = class_attr.split()
                bond_classes = [cls for cls in classes if cls.startswith('bond-')]
                if bond_classes:
                    bond_class = bond_classes[0]
                    bond_index = bond_class.split('-')[1]
                    if bond_index not in bond_groups:
                        bond_groups[bond_index] = []
                    bond_groups[bond_index].append(path)
                else:
                    other_paths.append(path)
            else:
                # Path without class, add to other paths
                other_paths.append(path)
        # Build the molecule content
        molecule_content = []

        # Calculate the x position for the rect element
        x_position = (mol_index % n_cols) * rect_width
        y_position = (mol_index // n_cols) * rect_height

        # Create the rect element
        rect_element = f"<rect style='opacity:1.0;fill:#FFFFFF;stroke:none' width='{rect_width*0.99}' height='{rect_height*0.99}' x='{x_position}' y='{y_position}'> </rect>"

        # Insert the rect element into molecule_content
        molecule_content.append(rect_element)

        # Process bond groups
        for bond_index, paths in bond_groups.items():
            group_class = f'group-bond-{bond_index}'
            # Collect 'd' attributes
            d_attributes = []
            for path in paths:
                d_match = re.search(r"d=['\"](.*?)['\"]", path)
                if d_match:
                    d_attributes.append(d_match.group(1))
            # Combine 'd' attributes
            combined_d = ' '.join(d_attributes)
            # Create highlight path
            highlight_path = f'<path class="bond-highlight-path" d="{combined_d}" />'
            # Build bond group content
            bond_group_content = '\n'.join([highlight_path] + paths)
            bond_group = f'<g class="group-bond {group_class}">\n{bond_group_content}\n</g>'
            molecule_content.append(bond_group)
        # Add other paths (atoms and any non-bond paths)
        molecule_content.extend(other_paths)
        # Wrap molecule content in a <g> element
        molecule_group = f'<g class="molecule-{mol_index}">\n' + '\n'.join(molecule_content) + '\n</g>'
        processed_molecules.append(molecule_group)

    # Now, reconstruct the SVG content
    # Remove all paths from the original SVG content
    svg_content_no_paths = path_regex.sub('', svg_content)

    # Find the insertion point before the closing </svg> tag
    insertion_point = svg_content_no_paths.rfind('</svg>')
    if insertion_point == -1:
        raise ValueError("No closing </svg> tag found.")

    # Insert the processed molecules before the closing </svg> tag
    modified_svg = svg_content_no_paths[:insertion_point] + '\n' + '\n'.join(processed_molecules) + '\n' + svg_content_no_paths[insertion_point:]

    return modified_svg
