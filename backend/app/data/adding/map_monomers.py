"""
Script to format the monomer SDF file to be used in pyPept

From publication: pyPept: a python library to generate atomistic 2D and 3D representations of peptides
Journal of Cheminformatics, 2023

Instructions:

This script uses as input a set of monomers in SDF format with tags required
to index relevant atoms involved in the peptide bonds. For pyPept, we use
the public HELM monomer dataset available at: 
    https://github.com/PistoiaHELM/HELMMonomerSets

The required tags are:
- name: Name of the monomer
- monomerType: Type of the monomer (AA, cap)
- polymerType: We require the type PEPTIDE
- symbol: Symbol to represent the monomer
- naturalAnalog: If the monomer has a natural AA analog
- label: Label of the R group
- capGroupName: Name of the R1 group (if exist)

The following tags optional but will be checked for when a monomer contains
the corresponding R-groups.
- capGroupName (#1): Name of the R2 group (if exist)
- capGroupName (#2): Name of the R3 group (if exist)
- capGroupName (#3): Name of the R4 group (if exist)

To run the script please provide the names of the input and out SDF files
"""

_required_tags = ("name", "monomerType", "polymerType", "symbol",
    "naturalAnalog", "label", "capGroupName", 
    )

########################################################################################
# Authorship
########################################################################################

__credits__ = ["Rodrigo Ochoa", "J.B. Brown", "Thomas Fox"]
__license__ = "MIT"
__version__ = "1.0"

########################################################################################
# Modules
########################################################################################

# System libraries
import argparse
import logging
import re
from string import ascii_uppercase as alc
import sys

# RDKit
from rdkit import Chem
from rdkit.Chem import PandasTools
from rdkit.Chem import SDWriter

import pandas as pd


# Constants expected in input SDF file:
_tag_capGroupR2 = 'capGroupName (#1)'
_tag_capGroupR3 = 'capGroupName (#2)'
_tag_capGroupR4 = 'capGroupName (#3)'

########################################################################################
# Pipeline
########################################################################################

class MonomerGenerator:
    def __init__(self, writer, label_cols):
        self.writer = writer
        self.list_pdbs = []
        self.label_cols = label_cols

    def process_row(self, row):

        mol = row['ROMol']
        name = row['name']
        m_type = row['monomerType']
        p_type = row['polymerType']
        symbol = row['symbol'].replace("-", "_")
        natural_a = row['naturalAnalog']

        # Atom order
        order = list(range(mol.GetNumAtoms()))
        indices = []
        if p_type == "PEPTIDE":
            for atom_val in mol.GetAtoms():
                if atom_val.GetSymbol().startswith('R'):
                    indices.append(atom_val.GetIdx())
                    order.remove(atom_val.GetIdx())
            for idx in indices:
                order.append(idx)
            # Renumber the atoms
            mol = Chem.RenumberAtoms(mol, newOrder=order)

        # Assign the categories required for the pyPept monomer dictionary
        if m_type == "Backbone":
            cat_type = 'aa'
            cat_sub = 'natural' if symbol == natural_a else 'non-natural'
        else:
            cat_type = 'cap'
            cat_sub = 'cap'

        # Get R groups
        r_groups = get_r_groups(row, self.label_cols)

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
            self.writer.write(mol)
    


def get_r_groups(row, label_cols):
    r_groups_dict = {}

    for label_col in label_cols:
        # Find the corresponding capGroupName column
        capGroupName_col = label_col.replace('label', 'capGroupName')
        label = row[label_col]
        cap_name = row.get(capGroupName_col, None)
        if pd.notnull(label) and pd.notnull(cap_name):
            # Extract R number from label
            match = re.match(r'R(\d+)', label)
            if match:
                r_num = int(match.group(1))
                if 1 <= r_num <= 4:
                    r_groups_dict[r_num] = cap_name
        else:
            continue
    # Build r_groups list
    r_groups = [None]*4

    for i in range(1, 5):
        r_groups[i-1] = r_groups_dict.get(i, None)

    return r_groups


def generate_pdb_code(symbol, list_codes):
    """
    Function to assign PDB codes to the monomers
    :param symbol: Symbol of the monomers
    :param list_codes: List with the generated codes

    :return pdb_code: PDB code to assign
    """

    totalchar = alc + '0123456789'
    monomers = {"A": "ALA", "D": "ASP", "E": "GLU", "F": "PHE", "H": "HIS",
                "I": "ILE", "K": "LYS", "L": "LEU", "M": "MET", "G": "GLY",
                "N": "ASN", "P": "PRO", "Q": "GLN", "R": "ARG", "S": "SER", 
                "T": "THR",
                "V": "VAL", "W": "TRP", "Y": "TYR", "C": "CYS", "ac": "ACE",
                "Aib": "AIB", "am": "NH2", "Iva": "6ZS"}

    if symbol in monomers:
        pdb_code = monomers[symbol]
    else:
        new_symbol = symbol.replace('_','')

        if len(new_symbol)>=3:
            pdb_code = new_symbol[:3].upper()
            count = 0
            while pdb_code in list_codes:
                pdb_code = pdb_code[:2] + totalchar[count]
                count += 1
        else:
            pdb_code = new_symbol.upper()
            if len(pdb_code) == 2:
                for ch_val in totalchar:
                    new_code = pdb_code + ch_val
                    if new_code not in list_codes:
                        pdb_code = new_code
                        break

    return pdb_code


def generate_monomers(input_file, output_file):
    """
    Function to generate the monomer SDF file for pyPept

    :param input_file: Name of the HELM monomer SDF file
    :param output_file: Name of the generated SDF file
    """

    # Reading input file
    sdf_file = input_file
    df_value = PandasTools.LoadSDF(sdf_file)
    if any([t not in df_value.columns for t in _required_tags]):
        missing_tags = [t for t in _required_tags if t not in df_value.columns]
        raise RuntimeError("Cannot find these required tags in SDF: " +
                           " ".join(missing_tags) +
                           ". Tags were: " + " ".join(df_value.columns))

    # Creating output file
    writer = SDWriter(output_file)

    # Extract all 'label' columns
    label_cols = [col for col in df_value.columns if col.startswith('label')]

    # Create an instance of MonomerGenerator
    generator = MonomerGenerator(writer, label_cols)

    # Apply the process_row function to each row
    df_value.apply(generator.process_row, axis=1)

    # Close the SDF writer
    writer.close()



########################################################################################
def _generate_monomers(input_file, output_file):
    """
    Function to generate the monomer SDF file for pyPept

    :param input_file: Name of the HELM monomer SDF file
    :param output_file: Name of the generated SDF file
    """

    # Reading input file
    sdf_file = input_file
    df_value = PandasTools.LoadSDF(sdf_file)
    if any([t not in df_value.columns for t in _required_tags]):
        raise RuntimeError("Cannot find these required tags in SDF: " +
            " ".join([t for t in _required_tags if t not in df_value.columns]) +
            ". Tags were: " + " ".join(df_value.columns))

    # Creating output file
    writer = SDWriter(output_file)

    # List of generated PDB codes
    list_pdbs = []

    # Read the tags
    for idx, row in df_value.iterrows():
        mol = df_value.at[idx, 'ROMol']
        name = df_value.at[idx, 'name']
        m_type = df_value.at[idx, 'monomerType']
        p_type = df_value.at[idx, 'polymerType']
        symbol = df_value.at[idx, 'symbol']
        symbol = symbol.replace("-","_")
        natural_a = df_value.at[idx, 'naturalAnalog']

        # Atom order
        order = list(range(mol.GetNumAtoms()))
        indices = []
        if p_type == "PEPTIDE":
            for atom_val in mol.GetAtoms():
                if atom_val.GetSymbol()[0]=='R':
                    indices.append(atom_val.GetIdx())
                    order.remove(atom_val.GetIdx())
        for j in indices:
            order.append(j)
        # Renumber the atoms
        new_mol = Chem.RenumberAtoms(mol, newOrder=order)
        mol=new_mol

        # Assign the categories required for the pyPept monomer dictionary
        if m_type == "Backbone":
            cat_type = 'aa'
            if symbol == natural_a:
                cat_sub = 'natural'
            else:
                cat_sub = 'non-natural'
        else:
            cat_type = 'cap'
            cat_sub = 'cap'

        # Extract all 'label' columns
        label_cols = [col for col in df_value.columns if col.startswith('label')]

        # Apply the function to each row in the DataFrame
        r_groups = get_r_groups(row, label_cols)

        # Extract the indices
        r_group_idx = [None, None, None, None]
        attachment_idx = [None, None, None, None]
        # r_groups=[r1_group,r2_group,r3_group,r4_group]

        if p_type == "PEPTIDE":
            for atom_val in mol.GetAtoms():
                if atom_val.GetSymbol()[0]=='R':
                    label=int(atom_val.GetSymbol()[1])
                    root_atom = atom_val.GetNeighbors()[0]
                    r_group_idx[label-1]=atom_val.GetIdx()
                    attachment_idx[label-1]=root_atom.GetIdx()

            # Generate a PDB code for the monomer
            pdb_code = generate_pdb_code(symbol, list_pdbs)
            list_pdbs.append(pdb_code)

            # Add the SDF tags
            mol.SetProp('m_name', name)
            mol.SetProp('symbol', symbol)
            mol.SetProp('m_abbr', symbol)
            mol.SetProp('m_type', cat_type)
            mol.SetProp('m_subtype', cat_sub)
            new_r_groups=[str(x) for x in r_groups]
            mol.SetProp('m_Rgroups', ','.join(new_r_groups))
            new_r_group_idx=[str(x) for x in r_group_idx]
            mol.SetProp('m_RgroupIdx', ','.join(new_r_group_idx))
            new_attachment_idx=[str(x) for x in attachment_idx]
            mol.SetProp('m_attachmentPointIdx', ','.join(new_attachment_idx))
            mol.SetProp('natAnalog', natural_a)
            mol.SetProp('pdbName', pdb_code)
            writer.write(mol)

    # Close the SDF writer
    writer.close()
# end of function generate_monomers()


##########################################################################
def get_inputs_parser():
    """Constructs parser for inputs."""

    parser = argparse.ArgumentParser(add_help=False)

    additional_type_group = parser.add_argument_group('Main options')
    additional_type_group.add_argument(
        '--input', type=str, metavar='filename',
        required=True,
        help="SDF file used as input to extract basic monomer information.")
    additional_type_group.add_argument(
        '--output', type=str, metavar='filename',
        required=True,
        help="Name of the output SDF file used in pyPept.")

    # A repeated-use log option parser.
    log_options = parser.add_argument_group('Logging options')
    log_options.add_argument(
        '--logfile', type=str, metavar='filename',
        required=False, default=None,
        help="Output messages to given logfile, default is stderr.")
    log_options.add_argument(
        "-v", "--verbose", action="store_true",
        help="Increase output verbosity")

    return parser

##########################################################################
# Main function
##########################################################################
def main():
    # Read arguments
    use_parser = argparse.ArgumentParser(
        description="""Generate monomer SDF file for pyPept""",
        epilog="The input SDF must have at least the following tags: " + \
            " ".join(["'"+t+"'" for t in _required_tags]),
        parents=(get_inputs_parser(),
                 ))
    args = use_parser.parse_args()

    # Setup typical logger for messages to stderr.
    log_stream = logging.StreamHandler(
        open(args.logfile, "w") if args.logfile else sys.stderr)
    log_stream.setFormatter(logging.Formatter(
        "%(asctime)-10s %(levelname)s:%(message)s",
        datefmt="%H:%M:%S"))
    logger = logging.Logger(name="Program")
    logger.setLevel(logging.DEBUG if args.verbose else logging.INFO)
    logger.addHandler(log_stream)
    logger.debug("Invocation arguments: %s", args)

    # Run the main function
    logger.info("Generating a new monomer SDF file from %s" % args.input)
    generate_monomers(args.input, args.output)
    logger.info("Completed generation of %s" % args.output)

if __name__ == "__main__":
    main()




