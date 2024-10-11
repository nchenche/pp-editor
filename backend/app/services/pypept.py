from pyPept.sequence import Sequence
from pyPept.sequence import correct_pdb_atoms, get_monomer_info
from pyPept.molecule import Molecule
from pyPept.converter import Converter
from pyPept.conformer import Conformer
from pyPept.conformer import SecStructPredictor


# RDKit modules
from rdkit import Chem
from rdkit.Chem import Draw

from app.lib import utils


def format_to(sequence: str, format_dest: str):
    result, error = None, None

    if format_dest == "biln":
        try:
            result = Converter(helm=sequence).get_biln()
        except Exception as error:
            print("Error in converting helm to biln...")
            print("Error description: {}".format(error))
    elif format_dest == "helm":
        try:
            result = Converter(biln=sequence).get_helm()
        except Exception as error:
            print("Error in converting biln to helm...")
            print("Error description: {}".format(error))
    elif format_dest == "smiles":
        try:
            seq = Sequence(sequence)            
            seq = correct_pdb_atoms(seq)  # Correct atom names in the sequence object

            # Generate the RDKit object
            mol = Molecule(seq)
            romol = mol.get_molecule(fmt='ROMol')

            result = Chem.MolToSmiles(romol)
        except Exception as error:
            print("Error in converting biln to SMILES...")
            print("Error description: {}".format(error))

    return result, error


def get_pdb(biln_sequence: str):
    # Instantiate Sequence object and correct atom names
    seq = Sequence(biln_sequence)
    seq = correct_pdb_atoms(seq)

    # Generate the RDKit object
    mol = Molecule(seq)
    romol = mol.get_molecule(fmt='ROMol')

    # get pdb string from rdkit.Chem Mol instance
    pdb_string, error = utils.get_pdb_from_mol(romol)

    return pdb_string, error


def predict_secondary_structure(sequence: str, type: str=""):
    # get sequence in fasta format (non-natural amino-acids are converted into Alanine)
    fasta = Conformer.get_peptide(sequence)

    # predict secondary structure
    secondary_structure, error = None, None
    try:
        secondary_structure = SecStructPredictor.predict_active_ss(fasta)
    except Exception as error:
        print("Error in predicting the secondary structure...")
        print("Error description: {}".format(error))

    return secondary_structure, error


def generate_secondary_structure(sequence, sec_struct: str):
    
    sequence = Sequence(sequence)
    sequence = correct_pdb_atoms(sequence)

    # Generate the RDKit object
    molecule = Molecule(sequence)
    romol = molecule.get_molecule(fmt='ROMol')

    # Generate the conformer
    mol, error = None, None
    try:
        mol = Conformer.generate_conformer(romol, ss_value=sec_struct, generate_pdb=False)
    except Exception as error:
        print("Error in predicting the secondary structure...")
        print("Error description: {}".format(error))

    # get pdb string from rdkit.Chem Mol instance
    pdb_string, _ = utils.get_pdb_from_mol(mol)

    return pdb_string, _









if __name__ == "__main__":

    # Start the Sequence object
    biln = "Ac-C(1,3)-A-A-A-C(1,3)"
    biln = "N-Iva-F-D-I-meT-N-A-L-W-Y-Aib-K"

    biln = "C(1,3)-A-A-A-C(1,3)"
    helm = "PEPTIDE1{C.A.A.A.C}$PEPTIDE1,PEPTIDE1,1:R3-5:R3$$$V2.0"
    fasta = "CAAAC"

    # Converter
    helm = Converter(biln=biln)
    helm.get_helm()

    seq = Sequence(biln)
    # Correct atom names in the sequence object
    seq = correct_pdb_atoms(seq)

    # # Loop wit the included monomers
    mm_list = seq.s_monomers
    for i, monomer in enumerate(mm_list):
        mon = monomer['m_romol']


    # Generate the RDKit object
    mol = Molecule(seq)
    romol = mol.get_molecule(fmt='ROMol')
    # print("The SMILES of the peptide is: {}".format(Chem.MolToSmiles(romol)))
    # Draw.MolToFile(romol, 'peptide.png', size=(1200, 1200))

    Chem.MolToSmiles(romol)
    # Chem.MolToHELM(romol)
    # Chem.MolToJSON(romol)
    # Chem.MolToSmarts(romol)
    # pdb_string = Chem.MolToPDBBlock(romol)
    # with open("test.pdb","w") as pdb_out:
    #     pdb_out.write(pdb_string)



    # # Create the peptide conformer with corrected atom names and secondary structure
    # # Obtain peptide main chain to predict the secondary structure
    # fasta = Conformer.get_peptide(biln)
    # secstruct = SecStructPredictor.predict_active_ss(fasta)
    # # Generate the conformer
    # romol = Conformer.generate_conformer(romol, secstruct, generate_pdb=False)


