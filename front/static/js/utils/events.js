// Initialization for ES Users
import {
    loadDataAndDisplay,
    setHelmFromBiln,
    setBilnFromHelm,
    convertBilnToSmiles
  } from "./ngl";
  


// load sequence as PDB in NGL viewport
const btnLoadSequence = document.querySelector("#btn-sequence");
btnLoadSequence.addEventListener("click", (e) => {
    e.preventDefault()

    const sequenceTabTarget = document.querySelector("#container-sequence a[data-twe-nav-active]").dataset.tweTarget;
    const seqValue = document.querySelector(`${sequenceTabTarget} textarea`).value;

    console.log(seqValue);

    loadDataAndDisplay(seqValue);
})


const tabsTextAreas = document.querySelectorAll("#container-tabs-sequence textarea");
tabsTextAreas.forEach( (textArea) => {
    textArea.addEventListener("input", async (e) => {
        const format = e.target.id;
        const sequence = e.target.value.trim();

        if (format === "biln") {
            await setHelmFromBiln(sequence);
        } else {
            await setBilnFromHelm(sequence);
        }


        let biln = document.getElementById("biln")
        let smiles = await convertBilnToSmiles(biln.value.trim());
        console.log(smiles);
        var mol = RDKit.get_mol(smiles);
        var svg = mol.get_svg();

        var canvas = document.getElementById("rdkit-drawing");
        canvas.innerHTML = svg;
    })
})

