from rdkit import Chem
from rdkit.Chem import AllChem, Draw
from rdkit.Chem.Draw import rdMolDraw2D

# Step 1: Build the peptide molecule
peptide_smiles = 'NCC(=O)NCC(=O)NCC(=O)O'  # Tri-glycine
mol = Chem.MolFromSmiles(peptide_smiles)
mol = Chem.AddHs(mol)
AllChem.EmbedMolecule(mol)

# Step 2: Identify backbone atoms
N_indices = []
Ca_indices = []
C_indices = []

for atom in mol.GetAtoms():
    idx = atom.GetIdx()
    atomic_num = atom.GetAtomicNum()
    
    if atomic_num == 7:  # Nitrogen atoms
        # Check if nitrogen is connected to a carbonyl carbon
        for neighbor in atom.GetNeighbors():
            if neighbor.GetAtomicNum() == 6:
                for bond in neighbor.GetBonds():
                    if bond.GetBondType() == Chem.rdchem.BondType.DOUBLE and bond.GetOtherAtom(neighbor).GetAtomicNum() == 8:
                        N_indices.append(idx)
                        break
    elif atomic_num == 6:  # Carbon atoms
        # Identify carbonyl carbons (C')
        is_carbonyl = False
        for bond in atom.GetBonds():
            neighbor = bond.GetOtherAtom(atom)
            if bond.GetBondType() == Chem.rdchem.BondType.DOUBLE and neighbor.GetAtomicNum() == 8:
                is_carbonyl = True
                break
        if is_carbonyl:
            C_indices.append(idx)
        else:
            # Identify alpha carbons (Cα)
            connected_to_nitrogen = any(n.GetAtomicNum() == 7 for n in atom.GetNeighbors())
            connected_to_carbonyl = any(
                n.GetAtomicNum() == 6 and any(
                    b.GetBondType() == Chem.rdchem.BondType.DOUBLE and b.GetOtherAtom(n).GetAtomicNum() == 8
                    for b in n.GetBonds()
                ) for n in atom.GetNeighbors()
            )
            if connected_to_nitrogen and connected_to_carbonyl:
                Ca_indices.append(idx)

# Step 3: Pair up atoms to define dihedral angles
N_indices.sort()
Ca_indices.sort()
C_indices.sort()

dihedrals_phi = []
dihedrals_psi = []

for i in range(len(Ca_indices)):
    if i > 0:
        # Phi angle
        dihedral_phi = (C_indices[i - 1], N_indices[i], Ca_indices[i], C_indices[i])
        dihedrals_phi.append(dihedral_phi)
    if i < len(Ca_indices) - 1:
        # Psi angle
        dihedral_psi = (N_indices[i], Ca_indices[i], C_indices[i], N_indices[i + 1])
        dihedrals_psi.append(dihedral_psi)

# Step 4: Set dihedral angles to 180°
conf = mol.GetConformer()

for dihedral in dihedrals_phi:
    AllChem.SetDihedralDeg(conf, *dihedral, 180.0)

for dihedral in dihedrals_psi:
    AllChem.SetDihedralDeg(conf, *dihedral, 180.0)

# Step 5: Visualize atom indices (optional)
for atom in mol.GetAtoms():
    atom.SetProp('molAtomMapNumber', str(atom.GetIdx()))

drawer = rdMolDraw2D.MolDraw2DCairo(500, 500)
drawer.DrawMolecule(mol)
drawer.FinishDrawing()
with open('peptide_with_indices.png', 'wb') as f:
    f.write(drawer.GetDrawingText())

# Step 6: Generate a 2D depiction
AllChem.Compute2DCoords(mol, clearConfs=False)
Draw.MolToFile(mol, 'extended_peptide.png')
