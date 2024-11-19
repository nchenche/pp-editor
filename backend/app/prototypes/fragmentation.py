from rdkit import Chem
from rdkit.Chem import Draw

Temp = []
fragments = []
i = 0
SMILES_Input = ['NCCCC[C@H](N)C(=O)O']
SMILES_Input = ['NC(=O)O']


def RemoveDummyIsotopes(m):
    for atom in m.GetAtoms():
        if atom.GetAtomicNum() == 0:
            atom.SetIsotope(0)
    return m

print('SMILES #{}: {}'.format(i, SMILES_Input[i]))

Molecule = Chem.AddHs(Chem.MolFromSmiles(SMILES_Input[i]))
print(Chem.MolToSmiles(Molecule))

for bond in Molecule.GetBonds():
    SwapBond = [str(bond.GetBeginAtom().GetSymbol()), str(bond.GetEndAtom().GetSymbol())]
    SwapBond.sort()
    TestMol = Chem.FragmentOnBonds(Molecule, bondIndices=[bond.GetIdx()], addDummies=True)
    try:
        RadicalA, RadicalB = [RemoveDummyIsotopes(x) for x in Chem.GetMolFrags(TestMol, asMols=True)]
        #print(RadicalB.GetNumAtoms())
        RadicalA = str(Chem.MolToSmiles(Chem.MolFromSmiles(Chem.MolToSmiles(RadicalA))))
        RadicalB = str(Chem.MolToSmiles(Chem.MolFromSmiles(Chem.MolToSmiles(RadicalB))))
        Temp.append([SMILES_Input[i], RadicalA, RadicalB, SwapBond[0] + '-' + SwapBond[1]])
        fragments.append(TestMol)
    except ValueError or TypeError:
        pass

for r in Temp:
    print(r)

image = Draw.MolsToGridImage(fragments[:2], useSVG=True)
image = Draw.MolsToGridImage(Chem.GetMolFrags(fragments[0], asMols=True), useSVG=True)

from app.prototypes import ROOT_PATH
outpath = ROOT_PATH / "tmp"

if not isinstance(image, str):
    image.save(outpath / 'mol_fragments.png')
else:
    with open(outpath / 'mol_fragments.svg', "w+") as out_svg:
        out_svg.write(image)

Draw.MolToFile(Molecule, outpath / 'lysine.svg')
