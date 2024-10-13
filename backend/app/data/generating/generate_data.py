from importlib.resources import files
from pathlib import Path

from app.data.generating.utils import get_full_smiles, get_descriptors, get_isotope_index, draw_from_smiles, set_rgroup_labels
from pyPept.sequence import get_monomer_info, SequenceConstants
from rdkit import Chem

import pandas as pd


from pyPept.interfaces import map_monomers


def draw_2d_molecule(mol: Chem.Mol, outpath: str|Path, basename: str):
    # Create directory if not exists 
    Path(outpath).mkdir(exist_ok=True)

    # Get "isotope" indices
    indices = get_isotope_index(mol=mol)

    # Set R group label(s)
    if sum(indices) != -4:
        rgroups = [f"R<sub>{i+1}</sub>" if x != -1 else None for i,x in enumerate(indices) ]
        # rgroups = ['H', 'OH', 'H', None]
        mol = set_rgroup_labels(mol=mol, indices=indices, labels=rgroups)

    draw_from_smiles(mol=mol, outdir=outpath, out_basename=basename, is_alpha_background=True)


def get_monomer_dataframe() -> pd.DataFrame:
    # Read the monomer dataframe
    default_monomer_df_filepath = files(SequenceConstants.def_path).joinpath(SequenceConstants.def_lib_filename)
    monomer_df_filepath = files(SequenceConstants.def_path).joinpath(SequenceConstants.def_lib_filename)

    if monomer_df_filepath.is_file() is False:
        monomer_df_filepath = default_monomer_df_filepath

    df = get_monomer_info(str(monomer_df_filepath))

    return df


if __name__ == "__main__":

    # Generate png images
    root_path = Path(__file__).parent
    img_path = root_path / 'images'
    json_path = root_path / 'json'
    json_path.mkdir(exist_ok=True)

    df = get_monomer_dataframe()

    # Create the 'smiles' column
    df['smiles'] = df['m_romol'].apply(Chem.MolToSmiles)
    df['full_smiles'] = df['m_abbr'].apply(get_full_smiles)

    # Get rdkit descriptors
    descriptors = df['m_romol'].apply(get_descriptors)

    # Generate png images
    df.apply(lambda row: draw_2d_molecule(mol=row['m_romol'], outpath=img_path, basename=row['m_abbr']), axis=1)  # Use df.apply with axis=1 to apply the function row-wise

    # Delete m_romol object column
    df.drop('m_romol', axis=1, inplace=True)

    # Write monomer infos in json format
    out_description = json_path / "monomer_description.json"
    df.transpose().to_json(path_or_buf=out_description)

    # Write monomer descriptors in json format
    out_properties = json_path / "monomer_properties.json"
    descriptors.to_json(path_or_buf=out_properties)



    writer = Chem.rdmolfiles.SDWriter(str(root_path / "test.sdf"))
    mol = df['m_romol']["A"]
    writer.write(mol)


    from io import StringIO

    m = Chem.MolFromSmiles('C1CCC1')
    sio = StringIO()

    with Chem.SDWriter(sio) as w:
        w.write(mol)

    print(sio.getvalue())

    # Get df where index 2 list value of m_rgroups is not None
    # is_r3_groups = df['m_Rgroups'].apply(lambda x: x[2] is not None)
    # filtered_df = df[is_r3_groups]
    # has_natural_analog = df['natAnalog'].apply(lambda x: x == "X")
    # df[has_natural_analog]

    # capped = df['m_type'].apply(lambda x: x == "cap")
    # df[capped]






