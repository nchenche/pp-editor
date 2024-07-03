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
    textArea.addEventListener("change", (e) => {
        const format = e.target.id;
        const sequence = e.target.value;

        if (format === "biln") {
            setHelmFromBiln(sequence);
            convertBilnToSmiles(sequence).
                then(response => {console.log(response)})
                ;
            // console.log(smiles)
        } else {
            setBilnFromHelm(sequence);
        }

        var mol = RDKit.get_mol('C[C@@H]1NC(=O)[C@H](C)NC(=O)[C@@H](N)CSSC[C@@H](C(=O)O)NC(=O)[C@H](C)NC1=O');
        var svg = mol.get_svg();

        var canvas = document.getElementById("rdkit-drawing");
        canvas.insertAdjacentHTML('beforeend', svg);
    })
})

