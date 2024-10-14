from rdkit import Chem
from rdkit.Chem import Draw

Temp = []
fragments = []
i = 0
SMILES_Input = ['NCCCC[C@H](N)C(=O)O']

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

image = Draw.MolsToGridImage(fragments)

from app.prototypes import ROOT_PATH
outpath = ROOT_PATH / "tmp"

image.save(outpath / 'lysine_fragments.png')
Draw.MolToFile(Molecule, outpath / 'lysine.svg')
