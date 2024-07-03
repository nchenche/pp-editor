// Initialization for ES Users
import {
    Tab,
    initTWE,
  } from "tw-elements";
  
//   twe.initTWE(twe.Tab, twe.Modal, twe.Ripple);


var stage = new NGL.Stage("viewport");
window.stage = stage;
stage.setParameters({backgroundColor: "white"});

var NGLRepresentation = {
    default: [        
        {
            name: "ball+stick",
            params: {}
        },
    ],
    ss: [        
        {
            name: "cartoon",
            params: {
                aspectRatio: 3.0,
                scale: 1.5
            }        
        },
        {
            name: "ball+stick",
            // name: "hyperball",    
            params: {}
        },
    ]
}


// Function to load a structure from a string
function loadStructureFromString(pdbData, params) {

    // Create a Blob from the PDB data string
    var stringBlob = new Blob([pdbData], {type: 'text/plain'});

    // Clear stage
    if (stage.compList.length) { stage.removeAllComponents() }

    // Load PDB from Blob
    stage.loadFile(stringBlob, {ext: "pdb", defaultRepresentation: false}).then(function(component) {
        params.forEach(representation => {
            console.log(representation);
            component.addRepresentation(representation.name, representation.params);
        })

        component.autoView();
    });
}


async function fetchStructureData(sequence) {
    const apiUrl = "http://localhost:5000/api/pdb_from_seq";
    const postData = { sequence: sequence };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }BBBBB

        const result = await response.json();
        if (result.error) {
            throw new Error('Error from API: ' + result.error);
        }

        // Return the data part of the result
        return result.data;
    } catch (error) {
        console.error('Error fetching structure data:', error);
        return null; // Return null or appropriate error handling
    }
}


async function loadDataAndDisplay(sequence) {
    const spinner = document.getElementById("spinner");
    spinner.classList.remove("hidden");

    // Wait for the data to be fetched
    let pdbData = await fetchStructureData(sequence);

    if (pdbData) {
        loadStructureFromString(pdbData, NGLRepresentation.default);
        spinner.classList.add("hidden");

    } else {
        console.error("Failed to load PDB data");
    }
}


async function fetchSecondaryStructure(sequence) {
    const apiUrl = "http://localhost:5000/api/predict_secondary_structure";
    const postData = { sequence: sequence };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        if (result.error) {
            throw new Error('Error from API: ' + result.error);
        }

        // Return the data part of the result
        return result.data;
    } catch (error) {
        console.error('Error fetching structure data:', error);
        return null; // Return null or appropriate error handling
    }
}


async function predictSecondaryStructure(sequence) {
    const spinner = document.getElementById("spinner-ss");
    spinner.classList.remove("hidden");

    // Wait for the data to be fetched
    let secondaryStructure = await fetchSecondaryStructure(sequence);

    if (secondaryStructure) {
        let textArea = document.querySelector("#container-secondary-structure textarea");
        textArea.value = secondaryStructure;
        spinner.classList.add("hidden");

    } else {
        console.error("Failed to predict secondary structure...");
    }
}



async function fetchPDBSecondaryStructure(sequence, seqStruct) {
    const apiUrl = "http://localhost:5000/api/generate_secondary_structure";
    const postData = { sequence: sequence, ss_value: seqStruct };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        if (result.error) {
            throw new Error('Error from API: ' + result.error);
        }

        // Return the data part of the result
        return result.data;
    } catch (error) {
        console.error('Error fetching structure data:', error);
        return null; // Return null or appropriate error handling
    }
}


async function generateSecondaryStructure(sequence, secStruct) {
    const spinner = document.getElementById("spinner");
    spinner.classList.remove("hidden");
    
    // Wait for the data to be fetched
    let pdbSecStruct = await fetchPDBSecondaryStructure(sequence, secStruct);

    if (pdbSecStruct) {
        loadStructureFromString(pdbSecStruct, NGLRepresentation.ss);
        spinner.classList.add("hidden");
    
    } else {
        console.error("Failed to load PDB scondary structure...");
    }
    
}



const btnLoadSequence = document.querySelector("#container-sequence button");
btnLoadSequence.addEventListener("click", (e) => {
        e.preventDefault()

        let sequenceInput = document.querySelector("#container-sequence textarea");
        // console.log(seqInput.value);

        loadDataAndDisplay(sequenceInput.value);
    })


    const BtnPredictSS = document.querySelector("#container-secondary-structure label button");
BtnPredictSS.addEventListener("click", (e) => {
        e.preventDefault()

        let sequenceInput = document.querySelector("#container-sequence textarea");
        predictSecondaryStructure(sequenceInput.value);
    })

const BtnGenerateSS = document.querySelector("#container-secondary-structure #generate-ss");
BtnGenerateSS.addEventListener("click", (e) => {
        e.preventDefault()

        let sequence = document.querySelector("#container-sequence textarea");
        let secStruct = document.querySelector("#container-secondary-structure textarea");

        generateSecondaryStructure(sequence.value, secStruct.value);
    })



// const tabs = document.getElementById('tab-headers');

// tabs.addEventListener("click", (e) => {
//         e.preventDefault();

//         if (e.target.tagName != "A") { return }

//         console.log(e);
//     })
    


