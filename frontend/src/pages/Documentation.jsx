import { useState } from "react";

import {
    Box,
    Typography,
    List,
    ListItemButton,
    ListItemText,
    Divider,
    Link as MUILink,
    Dialog,
    IconButton
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const sections = [
    { id: "introduction", label: "Introduction" },
    { id: "foundations", label: "Foundations: pyPept & BILN" },
    { id: "pepedit-differences", label: "What PepEdit adds vs pyPept" },
    { id: "concepts-biln", label: "Concepts & BILN" },
    { id: "monomer-library", label: "Monomer library & R-groups" },
    { id: "ui-overview", label: "User interface overview" },
    { id: "editing-biln", label: "Editing a BILN sequence" },
    { id: "linking-chains", label: "Linking chains" },
    { id: "constraints-3d", label: "Imposing 3D constraints" },
    { id: "conformer-generation", label: "Conformer generation (under the hood)" },
    { id: "protonation", label: "Protonation model (pH)" },
    { id: "output-formats", label: "Output & export" },
    { id: "monomer-editor", label: "Monomer editor" },
    { id: "use-cases", label: "Examples & use cases" },
    { id: "limitations-tips", label: "Limitations & tips" },
    { id: "policies", label: "Accessibility and cookie consent" },
];

const Documentation = () => {

    const [lightbox, setLightbox] = useState({
        open: false,
        src: "",
        alt: "",
    });

    const openLightbox = (src, alt) => {
        setLightbox({ open: true, src, alt });
    };

    const closeLightbox = () => {
        setLightbox(prev => ({ ...prev, open: false }));
    };

    return (
        <Box className="flex h-[95%] w-[100%] mx-auto ml-12">
            {/* Side navigation */}
            <Box
                component="nav"
                className="w-64 shrink-0 border-r border-gray-200 bg-white sticky top-0 h-screen overflow-y-auto hidden lg:block"
                sx={{ p: 2 }}
            >
                <Typography variant="h6" gutterBottom>
                    Documentation
                </Typography>
                <List dense>
                    {sections.map((section) => (
                        <ListItemButton
                            key={section.id}
                            component="a"
                            href={`#${section.id}`}
                            className="rounded-lg"
                        >
                            <ListItemText primary={section.label} />
                        </ListItemButton>
                    ))}
                </List>
            </Box>

            {/* Main content */}
            <Box
                component="main"
                className="flex-1 overflow-y-auto max-w-[100%]"
                sx={{ p: { xs: 2, md: 4 }, mx: "auto" }}
            >
                <Box sx={{ maxWidth: "80%", mx: "auto" }}>
                    <Typography variant="h3" gutterBottom>
                        PEP-EDIT Documentation
                    </Typography>

                    <Divider sx={{ my: 4 }} />

                    {/* Introduction */}
                    <section id="introduction">
                        <Typography variant="h5" gutterBottom>
                            Introduction to PEP-EDIT
                        </Typography>

                        <Typography variant="body1" component="p">
                            PEP-EDIT is a web application for the easy and rapid online preparation and generation of peptide
                            representations in 1D (SMILES, BILN, HELM), 2D (SDF/MOL2) and 3D (PDB/SDF/XYZ). PEP-EDIT is not a peptide structure prediction tool, but it helps preparing realistic conformations to undergo further processing (molecular dynamics simulations, docking, etc). It supports
                            standard and non-standard monomers (amino acids, caps and peptidomimetics), including linear, cyclic and
                        branched peptides. 
                        </Typography>

                        <Typography variant="body1" component="p">
                            PEP-EDIT is designed for interactive peptide design and editing. It can:
                        </Typography>

                        <ul className="list-disc ml-6 mb-4">
                            <li>Build peptides from scratch from a BILN sequence.</li>
                            <li>
                                Edit existing structures by substituting/modifying monomers while preserving the overall backbone
                                conformation as much as possible.
                            </li>
                            <li>
                                Apply conformational constraints (secondary-structure presets or a 3D template) to guide conformer generation.
                            </li>
                            <li>Control protonation of exported molecules using a pH model (default: pH 7.4).</li>
                           
                            <li>Manage both public and user private monomer library. The public monomer library monomer can be updated in a collaborative/moderated mode.</li>
                            <li>Support collaborative peptide design and/or didactic use of PEP-EDIT. In addition to the standard web instance, a n.eko instance of the service is available at {" "}
                            <MUILink
                                    href="https://neko.rpbs.univ-paris-diderot.fr?usr=guest&pwd=rpbs"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                 https://neko.rpbs.univ-paris-diderot.fr?usr=guest&pwd=rpbs. 
                            </MUILink>
                                
                            </li>
                            <li> PEP-EDIT can handle peptides with up to 40 monomers.</li>
                        </ul>
                    </section>

                    <Divider sx={{ my: 4 }} />

                    {/* Foundations */}
                    <section id="foundations">
                        <Typography variant="h5" gutterBottom>
                            Foundations: pyPept and BILN
                        </Typography>

                        <Typography variant="body1" component="p">
                            PEP-EDIT is built upon <strong>pyPept</strong>, a Python toolkit for peptide representation and
                            conversion, which itself relies on the <strong>BILN</strong> notation (Boehringer Ingelheim Line Notation)
                            to define peptides at the monomer level.
                        </Typography>

                        <ul className="list-disc ml-6 mb-3">
                            <li>
                                pyPept paper:{" "}
                                <MUILink
                                    href="https://link.springer.com/article/10.1186/s13321-023-00748-2"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    https://link.springer.com/article/10.1186/s13321-023-00748-2
                                </MUILink>
                            </li>
                            <li>
                                BILN paper (concepts and rules used here):{" "}
                                <MUILink
                                    href="https://pubs.acs.org/doi/10.1021/acs.jcim.2c00703"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    https://pubs.acs.org/doi/10.1021/acs.jcim.2c00703
                                </MUILink>    
                            </li>
                        </ul>

                        <Typography variant="body1" component="p">
                            In practice, BILN describes a peptide as an ordered list of monomers plus explicit connections between
                            their attachment points (R-groups). The BILN paper recommends the convention <strong>R1 = backbone N</strong>{" "}
                            and <strong>R2 = backbone carbonyl C</strong> for amino acids (for readability and N→C order).
                        </Typography>
                    </section>

                    <Divider sx={{ my: 4 }} />

                    {/* PepEdit differences */}
                    <section id="pepedit-differences">
                        <Typography variant="h5" gutterBottom>
                            What PEP-EDIT adds vs pyPept
                        </Typography>

                        <Typography variant="body1" component="p">
                            PEP-EDIT relies on pyPept, but uses a modified version where several major changes were introduced
                            to support an interactive web workflow and structure-aware peptide design:
                        </Typography>

                        <ul className="list-disc ml-6 mb-3">
                            <li>
                                <strong>Web interface:</strong> PEP-EDIT provides a web acces to complex peptide modeling using an enhanced interface to pyPept. 
                            </li>
                            <li>
                                <strong>Monomer storage:</strong> monomer metadata is stored in a <strong>MongoDB</strong> database
                                (instead of CSV files in initial pypept) to enable richer querying, editing and moderation workflows. This flexible management allows PEP-EDIT to handle both public and user specific monomer libraries, as well as facilities to migrate monomers from the user library to the public one in a moderated mode.
                            </li>
                            <li>
                                <strong>Monomer naming rule:</strong> monomers containing the <code>-</code> character are renamed using
                                <code>_</code> to avoid conflicts with BILN’s hyphen shorthand for backbone connections.
                            </li>
                            <li>
                                <strong>Conformer generation with structural constraints:</strong> PEP-EDIT can generate 3D conformers
                                from secondary-structure presets or PDB template constraints (see “Imposing 3D constraints” and
                                “Conformer generation” below).
                            </li>
                            <li>
                                <strong>PDB atom naming fixes:</strong> atom names were corrected for some amino acids to improve
                                downstream compatibility (visualization, tooling, MD pipelines).
                            </li>
                            <li>
                                <strong>Interactive 2D SVG:</strong> the RDKit 2D sketch SVG is post-processed to expose interactive
                                elements (monomers, R-groups, extra bonds) so that the UI can attach JS-driven interactions.
                            </li>
                            <li>
                                <strong>pH-aware protonation:</strong> final molecules (SMILES/PDB/exports) include protonation predicted
                                from the peptide-derived SMILES using Dimorphite-DL (default pH 7.4).
                            </li>
                            <li>
                                <strong>Collaborative/didactic facilities:</strong>
                                <ul>
                                    <li> a n.eko instance of PEP-EDIT enables multiuser design of a peptide. </li>
                                    {/* <li> the monomer library can be enhanced though a dedicated interface. </li> */}
                                </ul>
                            </li>
                        </ul>
                    </section>

                    <Divider sx={{ my: 4 }} />

                    {/* Concepts & BILN */}
                    <section id="concepts-biln">
                        <Typography variant="h5" gutterBottom>
                            Concepts: BILN and monomer-based peptide design
                        </Typography>

                        <Typography variant="body1" component="p">
                            BILN represents a peptide as monomers and connections. In its explicit form, each monomer can carry
                            one or more connection pairs <code>(bondId, RgroupId)</code>. The BILN rules are: monomers separated by dots,
                            connections defined by integer pairs, and a hyphen shorthand when connecting R2→R1 along the backbone.
                        </Typography>

                        <Typography variant="body1" component="p">
                            Examples from the BILN rules (adapted):
                        </Typography>

                        <ul className="list-disc ml-6 mb-3">
                            <li>
                                Explicit backbone connections: <code>A(1,2).G(1,1)(2,2).C(2,1)</code>
                            </li>
                            <li>
                                Shorthand for linear peptide: <code>P-E-P-T-I-D-E</code>
                            </li>
                        </ul>

                        <Typography variant="body1" component="p">
                            If a monomer abbreviation contains a hyphen, BILN requires brackets for disambiguation (e.g. <code>A-[2-Cl-Phe]-C</code>),
                            and the BILN paper notes that avoiding hyphens improves readability. PEP-EDIT therefore uses <code>_</code> in such
                            monomer names.
                        </Typography>
                    </section>

                    <Divider sx={{ my: 4 }} />

                    {/* Monomer library */}
                    <section id="monomer-library">
                        <Typography variant="h5" gutterBottom>
                            The monomer library and R-groups
                        </Typography>

                        <Box component="figure" className="my-4">
                            <Box
                                component="img"
                                src="/assets/documentation/Monomer6.png"
                                alt="Monomer detail view with identified R-groups"
                                className="max-w-xs w-full mx-auto rounded-xl shadow"
                                onClick={() =>
                                    openLightbox(
                                        "/assets/documentation/Monomer6.png",
                                        "Monomer detail view with identified R-groups"
                                    )
                                }
                            />
                            <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
                                Figure 1. Example monomer with labeled R-groups (R1, R2). Also note that each monomer is associated with three labels: its name, the BILN symbol to use in the BILN sequence and a 3 letter identifier used in the PDB representation.
                            </Typography>
                        </Box>

                        <Typography variant="body1" component="p">
                            Attachment points are specified as R-groups (<code>R1</code>, <code>R2</code>, <code>R3</code>, …). In BILN:
                            a monomer with one R-group acts as a capping group; a monomer with more than two R-groups can be a branching
                            or cyclization site.
                        </Typography>

                        <Typography variant="body1" component="p">
                            To fully define an attachment point, each R-group must have an associated <strong>leaving group</strong>.
                            If an R-group is not used in a connection, it is replaced by its leaving group in the final structure.
                            The BILN paper describes leaving groups such as H and OH as a minimal set, extensible to other chemistries.
                        </Typography>

                        <Typography variant="body1" component="p">
                            Recommended convention (for readability): for amino acids (amide-bond monomers), use <strong>R1 for backbone N </strong>
                            and <strong>R2 for backbone carbonyl C</strong>. Additional attachment points should be <code>R3</code>, <code>R4</code>, etc.
                        </Typography>
                    </section>

                    <Divider sx={{ my: 4 }} />

                    {/* UI Overview */}
                    <section id="ui-overview">
                        <Typography variant="h5" gutterBottom>
                            PEP-EDIT user interface overview
                        </Typography>

                        <Box component="figure" className="my-4">
                            <Box
                                component="img"
                                src="/assets/documentation/PEP-EDIT-Interface-v2.png"
                                alt="Overview of the PEP-EDIT interface"
                                className="w-full max-w-2xl mx-auto rounded-xl shadow"
                                onClick={() =>
                                    openLightbox(
                                        "/assets/documentation/PEP-EDIT-Interface-v2.png",
                                        "Overview of the PEP-EDIT interface"
                                    )
                                }
                            />
                            <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
                                Figure 2. Overview of the PEP-EDIT interface.
                            </Typography>
                        </Box>

                        <Typography variant="body1" component="p">
                            The interface is organized into:
                        </Typography>

                        <ol className="list-decimal ml-6 mb-3">
                            <li><strong>BILN editor</strong> (sequence + actions)</li>
                            <li><strong>Constraints panel</strong> (secondary structure + template)</li>
                            <li><strong>2D viewer</strong> (interactive SVG)</li>
                            <li><strong>3D viewer</strong> (conformer visualization)</li>
                            <li><strong>Monomer library</strong> (search/filter/add)</li>
                            <li><strong>Output files</strong> (1D/2D/3D - BILN/HELM/SMILES/InChi/InChiKey/PDB/SDF/MOL2/XYZ)</li>
                        </ol>
                    </section>

                    <Divider sx={{ my: 4 }} />

                    {/* Editing BILN */}
                    <section id="editing-biln">
                        <Typography variant="h5" gutterBottom>
                            Editing a BILN sequence
                        </Typography>

                        <Typography variant="body1" component="p">
                            You can define a peptide either by typing a BILN sequence directly (e.g. <code>P-E-P-T-I-D-E</code>), by specifying a peptide sequencein a FASTA format (limited to the 20 standard amino acids) or by inserting
                            monomers from the library using the <code>+</code> button (Append / Prepend / New chain). Search (textfield) and filters (class) are proposed ease the identification of the monomer. 
                        </Typography>

                        <Box component="figure" className="my-4">
                            <Box
                                component="img"
                                src="/assets/documentation/MonomerSelection.png"
                                alt="Monomer selection and insertion panel"
                                className="max-w-md w-full mx-auto rounded-xl shadow"
                                onClick={() =>
                                    openLightbox(
                                        "/assets/documentation/MonomerSelection.png",
                                        "Monomer selection and insertion panel"
                                    )
                                }
                            />
                            <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
                                Figure 3. Monomer search and selection.
                            </Typography>
                        </Box>
                        <Typography variant="body1" component="p">
                            Several "Chains" can be defined independently using the "New Chain" Mode, to ease the generation of complex peptides branched or bonded non linearly.
                        </Typography>

                        <ol className="list-decimal ml-6 mb-3">
                            <li><strong>BILN sequence</strong> Each chain is separated by a "." in the BILN sequence.</li>
                            <li><strong>3D constraints</strong> Each chain is associated with a specific BILN sequence, Secondary structure and 3D Template constraint in the 3D constraint section.</li>
                            <li><strong>2D viewer</strong> Each chain has a 2D depiction.</li>
                            <li><strong>3D viewer</strong> Each chain has a 3D conformation.</li>
                        </ol>
                    </section>

                    <Divider sx={{ my: 4 }} />

                    {/* Linking chains */}
                    <section id="linking-chains">
                        <Typography variant="h5" gutterBottom>
                            Linking chains and non-standard bonds
                        </Typography>

                        <Box component="figure" className="my-4">
                            <Box
                                component="img"
                                src="/assets/documentation/Linking-Unlinking.png"
                                alt="Linking and unlinking chains using R-groups"
                                className="max-w-xs w-full mx-auto rounded-xl shadow"
                                onClick={() =>
                                    openLightbox(
                                        "/assets/documentation/Linking-Unlinking.png",
                                        "Linking and unlinking chains using R-groups"
                                    )
                                }
                            />
                            <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
                                Figure 4. Linking and unlinking chains via R-groups.
                            </Typography>
                        </Box>

                        <Typography variant="body1" component="p">
                            PEP-EDIT supports extra bonds beyond the backbone (e.g. disulfides, side-chain linkers, lipidation attachments).
                            You can create them via explicit BILN connectivity or graphically (Link mode) by selecting compatible R-groups
                            in the 2D viewer.
                        </Typography>

                        <Typography variant="body1" component="p">
                            Note: extra bonds are flexible by design — PEP-EDIT does not automatically validate whether a given link is
                            chemically meaningful (that remains the user’s responsibility).
                        </Typography>
                    </section>

                    <Divider sx={{ my: 4 }} />

                    {/* Constraints */}
                    <section id="constraints-3d">
                        <Typography variant="h5" gutterBottom>
                            Imposing 3D conformational constraints
                        </Typography>

                        <Typography variant="body1" component="p">
                            PEP-EDIT can guide conformer generation using:
                        </Typography>

                        <ul className="list-disc ml-6 mb-3">
                            <li><strong>Secondary structure presets</strong> (H / E / -) applied to the peptide backbone.</li>
                            <li><strong>3D template constraints</strong> from a PDB structure (user-uploaded or fetched by PDB ID).</li>
                            <li>Secondary structure presets and 3D template constraints are mutually exclusive.</li>
                        </ul>

                        <Typography variant="body1" component="p">
                            <strong>Secondary-structure presets</strong> in PEP-EDIT are implemented by setting backbone <strong>dihedral angles</strong>
                            (φ/ψ, plus ω) using reference values for helices and extended conformations. The target angles are adjusted
                            depending on residue chirality (L vs D), mirroring in Ramachandran space for D residues.
                        </Typography>
                        <Box component="figure" className="my-4">
                            <Box
                                component="img"
                                src="/assets/documentation/SecondaryStructure.png"
                                alt="Linking and unlinking chains using R-groups"
                                className="max-w-xs w-full mx-auto rounded-xl shadow"
                                onClick={() =>
                                    openLightbox(
                                        "/assets/documentation/SecondaryStructure.png",
                                        "Linking and unlinking chains using R-groups"
                                    )
                                }
                            />
                            <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
                                Figure 5. Imposing Secondary structure constraints.
                            </Typography>
                        </Box>

                        <Typography variant="body1" component="p">
                            <strong>3D template constraints</strong> apply backbone coordinate constraints by mapping the peptide backbone atoms onto the corresponding
                            backbone atoms in the template, then performing constrained embedding using those mapped coordinates. Specifying a 3D template (PDB format) is made using the <strong>Upload Scaffold</strong> facility. It is possible to specify a template by its PDB identifier (in which case, the template is directly loaded from the PDB), or as a local PDB file to upload. From it, it is possible to select the fragment of the template to use to constrain the conformation of the backbone. In the case where the peptide has different chains, it is possible to select fragments from different PDB chains to constrain each of them.
                        </Typography>
                        <Typography variant="body1" component="p">
                            The mapping configuration allows to define the exact fragment of the PDB entry to use (chain, residue index), and how it is mapped onto the BILN sequence (in a contiguous manner from an offset position). It is possible to finely tune the mapping usage on a per residue basis by masking residues (constraints not taken into account). 
                        </Typography>
                   
                        <Box component="figure" className="my-4">
                            <Box
                                component="img"
                                src="/assets/documentation/3DTemplateProcess.png"
                                alt="Linking and unlinking chains using R-groups"
                                className="max-w-xs w-full mx-auto rounded-xl shadow"
                                onClick={() =>
                                    openLightbox(
                                        "/assets/documentation/3DTemplateProcess.png",
                                        "Linking and unlinking chains using R-groups"
                                    )
                                }
                            />
                            <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
                                Figure 6. Imposing 3D template constraints.
                            </Typography>
                        </Box>

                    </section>

                    <Divider sx={{ my: 4 }} />

                    {/* Conformer generation */}
                    <section id="conformer-generation">
                        <Typography variant="h5" gutterBottom>
                            Conformer generation (under the hood)
                        </Typography>

                        <Typography variant="body1" component="p">
                            PEP-EDIT uses RDKit embedding with optional coordinate maps. When constraints are provided (from secondary-structure
                            presets or a PDB template), backbone coordinates are used as reference to bias embedding toward the desired backbone,
                            while side chains and unconstrained atoms are generated more freely.
                        </Typography>

                        <Typography variant="body1" component="p">
                            To increase robustness, constrained embedding is performed iteratively using partial coordinate maps: for each mapping ratio,
                            a random subset of mapped atoms is selected and multiple attempts are run with different random seeds. This improves the likelihood
                            of finding a valid conformer even when a fully constrained embedding is too strict.
                        </Typography>

                        <Typography variant="body2" component="pre" sx={{ p: 1.5, bgcolor: "grey.100", borderRadius: 1, overflowX: "auto" }}>
                            {`mapping_ratios = [(1.0, 5), (0.9, 5), (0.8, 10), (0.5, 50)]
# (ratio_of_mapped_atoms_to_keep, number_of_attempts)`}
                        </Typography>

                        <Typography variant="body1" component="p">
                            Practically, mapping ratios as low as 0.5 can still preserve the global backbone conformation while allowing enough flexibility
                            for RDKit to embed successfully (especially for complex peptides or multi-fragment systems).
                        </Typography>
                    </section>

                    <Divider sx={{ my: 4 }} />

                    {/* Protonation */}
                    <section id="protonation">
                        <Typography variant="h5" gutterBottom>
                            Protonation model (pH-dependent)
                        </Typography>

                        <Typography variant="body1" component="p">
                            Protonation is handled after building the peptide-derived SMILES. The SMILES is submitted to {" "}
                            <MUILink
                                    href="https://link.springer.com/article/10.1186/s13321-019-0336-9"
                                    target="_blank"
                                    rel="noreferrer"
                            >
                                Dimorphite-DL {" "}
                            </MUILink>
                            
                            to predict a protonated form at a chosen pH (default: 7.4), and the protonated state is propagated to exports (SMILES, PDB, etc.).
                        </Typography>

                        <ul className="list-disc ml-6 mb-3">
                            <li>
                                PEP-EDIT uses a <strong>modified Dimorphite-DL</strong> where selected SMARTS pKa values were adjusted
                                (file: <code>site_substructures.smarts</code>) to better match known amino-acid pKa behavior. In brief:
                            neutral phenol, neutral imide and neutral amide at physiological pH. 
                            </li>
                        </ul>
                    </section>

                    <Divider sx={{ my: 4 }} />

                    {/* Output */}
                    <section id="output-formats">
                        <Typography variant="h5" gutterBottom>
                            Output and export formats
                        </Typography>

                        <ul className="list-disc ml-6 mb-3">
                            <li><strong>1D:</strong> BILN, SMILES, InChi, InChiKey (and HELM when available). These formats are widely used by the chemoinformatics community, and allow for similarity search, substructure search, pharmacophore identification, etc. The SMILES format can also be used as an input to AlphaFold 3.</li>
                            <li><strong>2D:</strong> SDF / MOL2 (useful for cheminformatics pipelines). These formats are widely used by the chemoinformatics community for fingerprints based similarity search and pharmacophore identification.</li>
                            <li><strong>3D:</strong> PDB / XYZ / SDF / MOL2 (starting conformers for modeling / MD). These formats can be used as starting conformations to undergo 3D conformational sampling, using molecular dynamics simulations approaches (PDB + SMILES - openmm), or quantum calculation approaches (XYZ - ORCA) for instance.</li>
                        </ul>

                        <Typography variant="body1" component="p">
                            Exported representations include the protonation state predicted for the chosen pH (default 7.4).
                        </Typography>
                    </section>

                    <Divider sx={{ my: 4 }} />

                    {/* Monomer editor */}
                    <section id="monomer-editor">
                        <Typography variant="h5" gutterBottom>
                            Monomer editor: extending the library
                        </Typography>

                        <Typography variant="body1" component="p">
                            In order to preserve its ability to evolve, PEP-EDIT provides a monomer editor
                            that allows users to define new monomers and extend the library in a moderated manner.
                            This mechanism enables the introduction of novel amino acids, caps, linkers or
                            peptidomimetic building blocks while remaining compatible with the BILN formalism.
                        </Typography>

                        <Typography variant="body1" component="p">
                            The monomer definition workflow is organized into the following steps:
                        </Typography>

                        <ol className="list-decimal ml-6 mb-4">
                            <li>
                                <strong>Monomer structure definition:</strong> the monomer is first described
                                using a SMILES string. Protonation details are not required at this stage.
                                Alternatively, a <strong>ChEMBL identifier</strong> can be provided to
                                automatically retrieve the corresponding SMILES.
                            </li>

                            <li>
                                <strong>R-group identification:</strong> the user specifies the attachment
                                points by selecting one or more bonds to be broken. Each selected bond defines
                                an R-group (R1, R2, R3, …) according to the BILN formalism.
                            </li>

                            <li>
                                <strong>Fragment selection:</strong> breaking bonds produces two or more
                                molecular fragments. The user must select the fragment that corresponds to
                                the monomer core once it is connected to other monomers in a peptide.
                            </li>

                            <li>
                                <strong>Monomer annotation:</strong> the user then specifies:
                                <ul className="list-disc ml-6 mt-1">
                                    <li>the full monomer name,</li>
                                    <li>the BILN label (used in BILN sequences),</li>
                                    <li>the 3-letter code used for PDB export,</li>
                                    <li>
                                        optionally, a <em>natural analog</em> if the monomer corresponds to a
                                        modified version of a standard amino acid.
                                    </li>
                                </ul>
                            </li>

                            <li>
                                <strong>Submission:</strong> the monomer definition is submitted for inclusion.
                                Depending on the platform configuration, it can be added to the current session
                                library or stored in a shared, moderated library.
                            </li>
                        </ol>

                        <Typography variant="body1" component="p">
                            Once validated, newly defined monomers behave exactly like built-in ones and can
                            be used in BILN sequences, linked via their R-groups, visualized in 2D/3D, and
                            exported in all supported formats.
                        </Typography>
                    </section>
                    <Divider sx={{ my: 4 }} />

                    {/* Use cases */}
                    <section id="use-cases">
                        <Typography variant="h5" gutterBottom>
                            Examples and use cases
                        </Typography>

                        {/* Microcin J25 */}
                        <Typography variant="h6" gutterBottom>
                            Microcin J25 (lasso peptide)
                        </Typography>

                        <Box component="figure" className="my-4">
                            <Box
                                component="img"
                                src="/assets/documentation/mccJ25templateUsage.png"
                                alt="Using a 3D template to preserve the lasso topology of Microcin J25"
                                className="w-full max-w-2xl mx-auto rounded-xl shadow"
                                onClick={() =>
                                    openLightbox(
                                        "/assets/documentation/mccJ25templateUsage.png",
                                        "Using a 3D template to preserve the lasso topology of Microcin J25"
                                    )
                                }
                            />
                            <Typography
                                variant="caption"
                                display="block"
                                align="center"
                                sx={{ mt: 1 }}
                            >
                                Figure 7. Using a PDB template (PDB ID: <code>1Q71</code>) to preserve the lasso
                                topology of Microcin J25 during conformer generation.
                                Left: 3D conformation generated without contraints. Right:3D conformation generated using the PDB entry 1Q71 as template.
                            </Typography>
                        </Box>


                        <Typography variant="body1" component="p">
                            Microcin J25 (MccJ25) is a lasso peptide produced by <em>Escherichia coli</em>,
                            with the following amino-acid sequence:
                        </Typography>

                        <Typography
                            variant="body2"
                            component="pre"
                            sx={{ p: 1, bgcolor: "grey.100", borderRadius: 1 }}
                        >
                            {`GGAGHVPEYFVGIGTPISFYG`}
                        </Typography>

                        <Typography variant="body1" component="p">
                            MccJ25 adopts a characteristic lasso topology, in which the C-terminal tail
                            is threaded through a macrolactam ring. This ring is formed by a bond between
                            the side chain of Glu8 and the backbone amine of the N-terminal Gly.
                        </Typography>

                        <Typography variant="body1" component="p">
                            Here, we aim to generate the 3D structure of a variant in which Phe19 is
                            substituted with a 3-chloro-L-phenylalanine
                            (<code>Phe_3Cl</code> in the PEP-EDIT monomer library).
                        </Typography>

                        <Typography variant="body1" component="p">
                            From the primary sequence, it is straightforward to generate the
                            corresponding BILN sequence using the <strong>Upload sequence</strong> button , substitute residue 19, and define the
                            side-chain-to-backbone cyclization. However, a generic 3D builder cannot
                            spontaneously recover the lasso topology: the C-terminal segment does not
                            naturally thread through the ring.
                        </Typography>

                        <Typography variant="body1" component="p">
                            This limitation is resolved by using the <strong>3D template</strong> facility.
                            Providing the experimental structure (PDB identifier <code>1Q71</code>) as a
                            template enforces the correct backbone topology and results in a lasso-like
                            conformation for the modified peptide.
                        </Typography>

                        <Divider sx={{ my: 3 }} />

                        {/* Semaglutide */}
                        <Typography variant="h6" gutterBottom>
                            Generating a starting conformation for semaglutide
                        </Typography>

                        <Typography variant="body1" component="p">
                            Semaglutide is a therapeutic peptide consisting of a linear peptide backbone
                            to which a fatty diacid chain is attached via a lysine side chain. Its peptide
                            backbone can be represented in BILN format as:
                        </Typography>

                        <Typography
                            variant="body2"
                            component="pre"
                            sx={{ p: 1, bgcolor: "grey.100", borderRadius: 1 }}
                        >
                            {`H-Aib-E-G-T-F-T-S-D-V-S-S-Y-L-E-G-Q-A-A-K-E-F-I-A-W-L-V-R-G-R-G`}
                        </Typography>

                        <Typography variant="body1" component="p">
                            The lipid moiety (1,18-octadecanedioic acid) is available in the PEP-EDIT
                            monomer library under the name <code>SemaB</code>. A complete BILN
                            description is therefore:
                        </Typography>

                        <Typography
                            variant="body2"
                            component="pre"
                            sx={{ p: 1, bgcolor: "grey.100", borderRadius: 1 }}
                        >
                            {`H-Aib-E-G-T-F-T-S-D-V-S-S-Y-L-E-G-Q-A-A-K-E-F-I-A-W-L-V-R-G-R-G.SemaB`}
                        </Typography>

                        <Typography variant="body1" component="p">
                            After entering this sequence, <code>SemaB</code> can be linked to the
                            side chain of Lys20 using the graphical linking tool or explicit BILN
                            connectivity.
                        </Typography>
                        <Typography
                            variant="body2"
                            component="pre"
                            sx={{ p: 1, bgcolor: "grey.100", borderRadius: 1 }}
                        >
                            {`H-Aib-E-G-T-F-T-S-D-V-S-S-Y-L-E-G-Q-A-A-K(1,3)-E-F-I-A-W-L-V-R-G-R-G.SemaB(1,2)`}
                        </Typography>

                        <Box component="figure" className="my-4">
                            <Box
                                component="img"
                                src="/assets/documentation/Semaglutide.png"
                                alt="Generating a 3D structure for the semaglutide"
                                className="w-full max-w-2xl mx-auto rounded-xl shadow"
                                onClick={() =>
                                    openLightbox(
                                        "/assets/documentation/Semaglutide.png",
                                        "Generating a 3D structure for the semaglutide"
                                    )
                                }
                            />
                            <Typography
                                variant="caption"
                                display="block"
                                align="center"
                                sx={{ mt: 1 }}
                            >
                                Figure 8. Generation of an octopeptide (L-amino acids) with head-to-tail cyclization.
                            </Typography>
                        </Box>


                        <Typography variant="body1" component="p">
                            While PEP-EDIT can generate a valid initial conformation for this construct,
                            the resulting structure is not expected to be fully realistic, especially
                            for the peptide backbone.
                            {/* // A practical strategy is to generate a backbone
                            // conformation for residues 3–31 using an external tool such as PEP-FOLD4,
                            // and then use this model as a <strong>3D template</strong> within PEP-EDIT
                            // to build the full lipidated structure. */}
                        </Typography>

                       {/* <Typography variant="body2" color="text.secondary" component="p">
                            Note: this workflow is currently experimental and may require manual
                            adjustments.
                        </Typography> */}

                        <Divider sx={{ my: 3 }} />

                        {/* Cyclic peptides */}
                        <Typography variant="h6" gutterBottom>
                            Cyclic peptides with L- and D-amino acids
                        </Typography>

                        <Typography variant="body1" component="p">
                            PEP-EDIT supports the generation of head-to-tail cyclic peptides, including
                            sequences containing mixtures of L- and D-amino acids. Examples of BILN
                            sequences include:
                        </Typography>

                        <ul className="list-disc ml-6 mb-3">
                            <li>
                                Head-to-tail octapeptide with standard L-amino acids:
                                <Typography
                                    variant="body2"
                                    component="pre"
                                    sx={{ p: 1, bgcolor: "grey.100", borderRadius: 1, mt: 1 }}
                                >
                                    {`G(1,1)-T-V-A-V-Q-F-L(1,2)`}
                                </Typography>
                            </li>
                            <Box component="figure" className="my-4">
                                <Box
                                    component="img"
                                    src="/assets/documentation/OctaL.png"
                                    alt="Using a 3D template to preserve the lasso topology of Microcin J25"
                                    className="w-full max-w-2xl mx-auto rounded-xl shadow"
                                    onClick={() =>
                                        openLightbox(
                                            "/assets/documentation/OctaL.png",
                                            "Using a 3D template to preserve the lasso topology of Microcin J25"
                                        )
                                    }
                                />
                                <Typography
                                    variant="caption"
                                    display="block"
                                    align="center"
                                    sx={{ mt: 1 }}
                                >
                                    Figure 9. Generation of an octopeptide (L-amino acids) with head-to-tail cyclization.
                                </Typography>
                            </Box>
                            
                            <li>
                                Head-to-tail octapeptide containing three D-amino acids:
                                <Typography
                                    variant="body2"
                                    component="pre"
                                    sx={{ p: 1, bgcolor: "grey.100", borderRadius: 1, mt: 1 }}
                                >
                                    {`D(1,1)-D-P-T-dP-dR-Q-dQ(1,2)`}
                                </Typography>
                            </li>
                            
                            <li>
                                Head-to-tail octapeptide containing four D-amino acids:
                                <Typography
                                    variant="body2"
                                    component="pre"
                                    sx={{ p: 1, bgcolor: "grey.100", borderRadius: 1, mt: 1 }}
                                >
                                    {`dR(1,1)-Q-dP-dQ-R-dE-P-Q(1,2)`}
                                </Typography>
                            </li>
                            <Box component="figure" className="my-4">
                                <Box
                                    component="img"
                                    src="/assets/documentation/OctaD4L.png"
                                    alt="Using a 3D template to preserve the lasso topology of Microcin J25"
                                    className="w-full max-w-2xl mx-auto rounded-xl shadow"
                                    onClick={() =>
                                        openLightbox(
                                            "/assets/documentation/OctaD4L.png",
                                            "Using a 3D template to preserve the lasso topology of Microcin J25"
                                        )
                                    }
                                />
                                <Typography
                                    variant="caption"
                                    display="block"
                                    align="center"
                                    sx={{ mt: 1 }}
                                >
                                    Figure 10. Generation of an octopeptide (containing four D-amino acids) with head-to-tail cyclization.
                                </Typography>
                            </Box>
                        </ul>

                        <Typography variant="body1" component="p">
                            These examples illustrate how explicit BILN connectivity allows precise
                            control over cyclization and chirality, enabling the construction of
                            non-canonical cyclic peptides that would be difficult to describe using
                            sequence-only representations.
                        </Typography>

                        <Divider sx={{ my: 3 }} />

                        {/* Conformer search with ORCA */}
                        <Typography variant="h6" gutterBottom>
                            Conformer search with ORCA
                        </Typography>

                        <Typography variant="body1" component="p">
                            When dealing with flexible molecules such as peptides, it is important to consider
                            the conformational space they can occupy for reliable quantum chemistry calculations.
                            The XYZ file generated by PEP-EDIT is suitable to be used as input for the{" "}
                            <MUILink
                                href="https://www.faccts.de/docs/orca/6.0/tutorials/prop/goat.html"
                                target="_blank"
                                rel="noreferrer"
                            >
                                global optimizer algorithm (GOAT) in ORCA
                            </MUILink>
                            . For instance, the orphan cyclic peptide drug cilengitide can be generated in PEP-EDIT using the following BILN sequence:
                        </Typography>

                        <Typography
                            variant="body2"
                            component="pre"
                            sx={{ p: 1, bgcolor: "grey.100", borderRadius: 1 }}
                        >
                            {`R(1,1)-G-D-dF-meV(1,2)`}
                        </Typography>

                        <Typography variant="body1" component="p">
                            Then, using the XYZ file as input for ORCA's global optimizer
                            allows to start exploring various conformations of cilengitide.
                            
                            In this example, we used the semi-empirical method GFN2-xTB combined with the implicit water solvent model
                            ALPB, but any level of theory available in ORCA can be used.
                        </Typography>

                        <Typography variant="body1" component="p">
                            The scripts used for ORCA input preparation and the conversion of the ORCA xyz output into PDB are available {" "}
                            <MUILink
                                href="https://github.com/alexisdougha/goat-pep"
                                target="_blank"
                                rel="noreferrer"
                            >
                                here. {" "}
                            </MUILink>
                        </Typography>
                        
                        <Box component="figure" className="my-4">
                            <Box
                                component="img"
                                src="/assets/documentation/cilengitide.png"
                                alt="Ensemble of conformers generated by ORCA's GOAT algorithm for cilengitide"
                                className="w-full max-w-2xl mx-auto rounded-xl shadow"
                                onClick={() =>
                                    openLightbox(
                                        "/assets/documentation/cilengitide.png",
                                        "Ensemble of conformers generated by ORCA's GOAT algorithm for cilengitide"
                                    )
                                }
                            />
                            <Typography
                                variant="caption"
                                display="block"
                                align="center"
                                sx={{ mt: 1 }}
                            >
                                Figure 11. Starting from the geometry given by PEP-EDIT, an ensemble of conformers is generated
                                to explore the conformational space of cilengitide. Compared with a reference structure (PDB ID: <code>1L5G</code>), new
                                conformers have been identified with lower backbone RMSD. The backbone of the PEP-EDIT conformation and the lowest-rmsd conformer
                                are shown in purple and green, respectively, while the reference PDB structure is shown in gray.
                            </Typography>
                        </Box>

                        <Typography variant="body1" component="p">
                            PEP-EDIT proves to be a suitable tool for generating initial XYZ coordinates of modified and cyclic peptides to be studied further with quantum chemistry methods.
                            

                        </Typography>

                        <Divider sx={{ my: 3 }} />

                        {/* Protein-peptide structure prediction */}
                        <Typography variant="h6" gutterBottom>
                            Protein-peptide structure prediction
                        </Typography>

                        <Typography variant="body1" component="p">
                            Diffusion-based structure prediction models like AlphaFold 3 make it possible to directly perform
                            co-folding (i.e. simultaneous prediction of protein and peptide structures). SMILES can be used as input to predict
                            the binding pose of a modified peptide in interaction with a protein.
                            Here, we predict such complexes using the SMILES generated by PEP-EDIT as an input to AlphaFold 3
                            together with the sequence of a protein.
                        </Typography>

                        <ul>
                            <li>
                                Doubly sulfated CCR2 N-terminal peptide (PDB ID: <code>7P8X</code>):
                                <Typography
                                    variant="body2"
                                    component="pre"
                                    sx={{ p: 1, bgcolor: "grey.100", borderRadius: 1, mt: 1 }}
                                >
                                    {`ac-D-Tyr_SO3H-D-Tyr_SO3H-G with corresponding SMILES CC(=O)N[C@@H](CC(=O)[O-])C(=O)N[C@@H](Cc1ccc(OS(=O)(=O)[O-])cc1)C(=O)N[C@@H](CC(=O)[O-])C(=O)N[C@@H](Cc1ccc(OS(=O)(=O)[O-])cc1)C(=O)NCC(=O)[O-]`}
                                </Typography>
                            </li>
                            
                            <li>
                                Histone H3K27ac(24-27) peptide (PDB ID: <code>7X88</code>):
                                <Typography
                                    variant="body2"
                                    component="pre"
                                    sx={{ p: 1, bgcolor: "grey.100", borderRadius: 1, mt: 1 }}
                                >
                                    {`A-A-R-Lys_Ac with corresponding SMILES CC(=O)NCCCC[C@H](NC(=O)[C@H](CCCNC(N)=[NH2+])NC(=O)[C@H](C)NC(=O)[C@H](C)[NH3+])C(=O)[O-]`}
                                </Typography>
                            </li>
                            
                        </ul>
                        
                        <Box component="figure" className="my-4">
                            <Box
                                component="img"
                                src="/assets/documentation/7P8X_top_7X88_bottom.png"
                                alt="Protein-peptide complexes predicted with AlphaFold 3 using PEP-EDIT generated SMILES"
                                className="w-full max-w-2xl mx-auto rounded-xl shadow"
                                onClick={() =>
                                    openLightbox(
                                        "/assets/documentation/7P8X_top_7X88_bottom.png",
                                        "Protein-peptide complexes predicted with AlphaFold 3 using PEP-EDIT generated SMILES"
                                    )
                                }
                            />
                            <Typography
                                variant="caption"
                                display="block"
                                align="center"
                                sx={{ mt: 1 }}
                            >
                                Figure 12. Based on the SMILES given by PEP-EDIT (and the sequence of the proteins), both protein-peptide complexes were predicted with AlphaFold 3.
                                The experimental (dark and light green) and the predicted structures (purple and magenta) are superimposed.
                                AlphaFold 3 fails to recover the experimental structure for 7P8X but it accurately predicts the binding pose in 7X88.
                                Top: <code>7P8X</code>. Bottom: <code>7X88</code>.
                            </Typography>
                        </Box>

                        <Typography variant="body1" component="p">
                            PEP-EDIT can be used to help prepare inputs for AlphaFold 3 (or other similar models like Chai or Boltz) to model protein-peptide interactions involving modified peptides.
                            However, the predicted structures should be interpreted with caution.

                            <Typography variant="body1" component="p">
                                    The scripts used to prepare the input for AlphaFold3 from SMILES are available {" "}
                                <MUILink
                                        href="https://github.com/alexisdougha/smiles-fold-input-builder"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        here. {" "}
                                    </MUILink>
                            </Typography>

                        </Typography>

                        <Divider sx={{ my: 3 }} />

                        {/* Simulated tempering for Cilengitide */}
                        <Typography variant="h6" gutterBottom>
                            Sampling Cilengitide conformational space using Simulated Tempering
                        </Typography>

                        <Typography variant="body1" component="p">
                            Cilengitide is a head-to-tail cyclized pentapeptide corresponding to the BILN sequence:

                               <Typography
                                    variant="body2"
                                    component="pre"
                                    sx={{ p: 1, bgcolor: "grey.100", borderRadius: 1, mt: 1 }}
                                >
                                    {`R(1,1)-G-D-dF-meV(1,2)`}
                                </Typography>
                            To sample its conformational space, PEP-EDIT was used to generate a SMILES and a PDB representation that could directly be used to launch the simulations using OpenMM.
                        </Typography>

                        
                        <Box component="figure" className="my-4">
                            <Box
                                component="img"
                                src="/assets/documentation/ST-cilengitide.png"
                                alt="ST simulation of Cilengitide using SMILES and PDB as input of OpenMM"
                                className="w-full max-w-2xl mx-auto rounded-xl shadow"
                                onClick={() =>
                                    openLightbox(
                                        "/assets/documentation/ST-cilengitide.png",
                                        "ST simulation of Cilengitide using SMILES and PDB as input of OpenMM"
                                    )
                                }
                            />
                            <Typography
                                variant="caption"
                                display="block"
                                align="center"
                                sx={{ mt: 1 }}
                            >
                                Figure 13. Based on the SMILES and PDB given by PEP-EDIT, Cilengitide conformationnal space was sampled using OpenMM.
                                The RMSD to the experimental conformation (left) is around 1 Angtroem. The sampling includes the experimental conformation of the Cilengitide in complex with the extracellular segment of integrin avb3 (PDB: <code>1L5G</code>) (black dot, center image), the closest conformation is at 0.7 Angstroem from the experimental one (right).
                            </Typography>
                        </Box>


                        <Typography variant="body1" component="p">
                            The scripts used to prepare/run the ST simulations are available {" "}
                            <MUILink
                                href="https://github.com/samuelmurail/Pep-Edit_ST"
                                target="_blank"
                                rel="noreferrer"
                            >
                                here. {" "}
                            </MUILink>
                        </Typography>

                        <Divider sx={{ my: 3 }} />

                        {/* Docking a 25-residue BAD peptide with Bcl-xL */}
                        <Typography variant="h6" gutterBottom>
                            Docking a 25-residue with Bcl-xL
                        </Typography>
                        
                        <Typography variant="body1" component="p">
                            The anti-apoptotic protein Bcl-xL binds to a 25-residue peptide from the death-promoting region of the pro-apoptotic protein BAD, which corresponds to its BH3 domain. 
                            The structure of the Bcl-xL protein–BAD peptide complex has been solved by nuclear magnetic resonance (NMR) (PDB ID: 1G5J)
                            The BAD peptide is folded into an alpha helix.
                            The BAD peptide was generated based on the primary sequence, imposing the alpha-helix secondary structure.
                        </Typography>
                        
                        
                        <Box component="figure" className="my-4">
                            <Box
                                component="img"
                                src="/assets/documentation/PEP-EDIT-BadPepetideAsHelix.png"
                                alt="BAD peptide genration using S2 constraints"
                                className="w-full max-w-2xl mx-auto rounded-xl shadow"
                                onClick={() =>
                                    openLightbox(
                                        "/assets/documentation/PEP-EDIT-BadPepetideAsHelix.png",
                                        "BAD peptide genration using S2 constraints"
                                    )
                                }
                            />
                            <Typography
                                variant="caption"
                                display="block"
                                align="center"
                                sx={{ mt: 1 }}
                            >
                                Figure 14. Based on the FASTA sequence of the BAD peptide, PEP-EDIT can be used to generate an all helical conformation of the 25 residue BAD peptide.
                            </Typography>
                        </Box>
                        
                        <Box component="figure" className="my-4">
                            <Box
                                component="img"
                                src="/assets/documentation/BAD_docking_2.png"
                                alt="BAD docking using using AutoDock CrankPep"
                                className="w-full max-w-2xl mx-auto rounded-xl shadow"
                                onClick={() =>
                                    openLightbox(
                                        "/assets/documentation/BAD_docking_2.png",
                                        "BAD docking using using AutoDock CrankPep"
                                    )
                                }
                            />
                            <Typography
                                variant="caption"
                                display="block"
                                align="center"
                                sx={{ mt: 1 }}
                            >
                                Figure 15. Bcl-xl is colored in cyan, experimental BH3 peptide in magenta and the docked BH3 peptide is in green.
                            </Typography>
                        </Box>
                        
                        <Typography variant="body1" component="p">
                            
                            The BAD peptide was saved in PDB format.
                            We performed the redocking of the BAD peptide in the 1G5J Bcl-xl protein structure using the AutoDock CrankPep (ADCP) version 1 program (https://doi.org/10.1093/bioinformatics/btz459).
                            The best energy model (ΔG = -41.4 kcal/mol) closely matches the position and orientation of the experimentally solved peptide, with an RMSD of less than 1 Å for the central residues.
                            This example illustrates how PEP-EDIT can rapidly generate a 3D peptide structure that can be used to predict protein-peptide complexes through computational docking.  
                        </Typography>
                        
                    </section>


                    <Divider sx={{ my: 4 }} />

                    {/* Limitations */}
                    <section id="limitations-tips">
                        <Typography variant="h5" gutterBottom>
                            Limitations and practical tips
                        </Typography>

                        <ul className="list-disc ml-6 mb-3">
                            <li>
                                No more than 40 monomers are allowed for the whole peptide (due to RDKit embedding limits).
                            </li>
                            <li>
                                For large, branched, or multi-fragment constructs, constrained embedding may require multiple attempts; the iterative
                                mapping strategy is designed to improve success rates.
                            </li>
                            <li>
                                Extra bonds are not chemically validated automatically (use domain knowledge to ensure plausibility).
                            </li>
                            <li>
                                Secondary-structure presets provide a controlled backbone bias (φ/ψ/ω), but realistic conformations often benefit from
                                template constraints or downstream refinement (minimization / MD).
                            </li>
                        </ul>
                    </section>

                                    {/* Limitations */}
                    <section id="policies">
                        <Typography variant="h5" gutterBottom>
                            Accessibility and cookie consent.
                        </Typography>

                        <ul className="list-disc ml-6 mb-3">
                            <li>
                                This website is free and open to all and there is no login requirement.
                            </li>
                            <li>
                                This web site does not make use of tracking cookies. Cookie usage is restricted to strictily necessary cookies.
                            </li>
                        </ul>
                    </section>
</Box>
            </Box>

            {/* Image lightbox */}
            <Dialog
                open={lightbox.open}
                onClose={closeLightbox}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        backgroundColor: "inherit", // "rgba(0,0,0,0.15)",
                        boxShadow: "none",
                    },
                }}
            >
                <Box
                    sx={{
                        position: "relative",
                        p: 2,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        maxHeight: "90vh",
                    }}
                >
                    <IconButton
                        aria-label="Close"
                        onClick={closeLightbox}
                        sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            color: "grey.100",
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    {lightbox.src && (
                        <Box
                            component="img"
                            src={lightbox.src}
                            alt={lightbox.alt}
                            sx={{
                                maxWidth: "100%",
                                maxHeight: "80vh",
                                borderRadius: 2,
                                boxShadow: 4,
                            }}
                        />
                    )}
                </Box>
            </Dialog>

        </Box>
    );
};

export default Documentation;
