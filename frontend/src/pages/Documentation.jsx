import { useState, useEffect, useRef, useCallback } from "react";
import {
    Alert,
    Box,
    Typography,
    Divider,
    Link as MUILink,
    Dialog,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Collapse,
    Chip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

/* ─────────────────────────────────────────────
   Hierarchical navigation model
   ───────────────────────────────────────────── */
const NAV_TREE = [
    {
        group: "Getting started",
        children: [
            { id: "introduction", label: "Introduction" },
            { id: "pepedit-vs-pypept", label: "PEP-EDIT vs pyPept" },
            { id: "biln-notation", label: "About BILN notation" },
            {
                id: "interface-overview", label: "Interface overview", children: [
                    { id: "panels", label: "Panels & layout" },
                    { id: "right-panel", label: "Right panel (Library / Output / Jobs)" },
                    { id: "sessions", label: "Sessions" },
                ],
            },
            { id: "protonation", label: "Protonation (pH)" },
            {
                id: "conformer-generation", label: "Conformer generation", children: [
                    { id: "embedding", label: "RDKit-based embedding" },
                    { id: "iterative-process", label: "Iterative process" },
                    {
                        id: "constraints", label: "Setting constraints", children: [
                            { id: "constraints-2d", label: "Secondary structure (2D)" },
                            { id: "constraints-3d", label: "3D template (scaffold)" },
                        ],
                    },
                ],
            },
        ],
    },
    {
        group: "How-to guides",
        children: [
            { id: "editing-biln", label: "Editing a BILN sequence" },
            { id: "editing-library", label: "Editing from monomer library" },
            { id: "linking", label: "Linking monomers" },
            { id: "complex-topologies", label: "Complex topologies" },
            { id: "adding-monomers", label: "Adding monomers to the library" },
        ],
    },
    {
        group: "Examples & use cases",
        children: [
            { id: "example-microcin", label: "Microcin J25 (lasso peptide)" },
            { id: "example-semaglutide", label: "Semaglutide" },
            { id: "example-cyclic", label: "Cyclic peptides (L/D)" },
            { id: "example-orca", label: "Conformer search with ORCA" },
            { id: "example-alphafold", label: "Protein-peptide prediction" },
            { id: "example-st", label: "Simulated tempering" },
            { id: "example-docking", label: "Peptide docking" },
        ],
    },
    {
        group: "Reference",
        children: [
            { id: "output-formats", label: "Output & export formats" },
            { id: "monomer-library-ref", label: "Monomer library & R-groups" },
            { id: "biln-quick-ref", label: "BILN quick reference" },
        ],
    },
    {
        group: "Troubleshooting & policies",
        children: [
            { id: "limitations", label: "Limitations & tips" },
            { id: "policies", label: "Accessibility & cookies" },
        ],
    },
];

/* ─────────────────────────────────────────────
   Sidebar sub-components
   ───────────────────────────────────────────── */
const ArrowIcon = ({ open }) => (
    <Box component="span" sx={{ display: "inline-flex", fontSize: 14, color: "text.disabled", transition: "transform 0.15s", transform: open ? "rotate(0)" : "rotate(-90deg)" }}>
        <ExpandMoreIcon fontSize="inherit" />
    </Box>
);

function NavGroup({ group, activeId, onClick }) {
    const theme = useTheme();
    const [open, setOpen] = useState(true);

    // auto-open if any child is active
    useEffect(() => {
        const ids = flatIds(group.children);
        if (ids.includes(activeId)) setOpen(true);
    }, [activeId, group.children]);

    return (
        <Box sx={{ mb: 0.5 }}>
            <Box
                onClick={() => setOpen((o) => !o)}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1.5,
                    py: 0.6,
                    cursor: "pointer",
                    userSelect: "none",
                    borderRadius: 1,
                    transition: "background 0.12s",
                    "&:hover": { bgcolor: alpha(theme.palette.action.hover, 0.4) },
                }}
            >
                <ArrowIcon open={open} />
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "text.secondary" }}>
                    {group.group}
                </Typography>
            </Box>
            <Collapse in={open} timeout="auto" unmountOnExit>
                {group.children.map((item) => (
                    <NavItem key={item.id} item={item} activeId={activeId} depth={0} onClick={onClick} />
                ))}
            </Collapse>
        </Box>
    );
}

function NavItem({ item, activeId, depth = 0, onClick }) {
    const theme = useTheme();
    const isActive = activeId === item.id;
    const hasChildren = item.children?.length > 0;
    const [open, setOpen] = useState(true);

    // auto-open group if active child
    useEffect(() => {
        if (hasChildren) {
            const ids = flatIds(item.children);
            if (ids.includes(activeId)) setOpen(true);
        }
    }, [activeId, hasChildren, item.children]);

    // depth 0 = direct children of a group → arrow on RIGHT
    // depth 1+ = deeper items → arrow on LEFT
    const arrowOnRight = depth === 0;

    return (
        <>
            <Box
                component="a"
                href={`#${item.id}`}
                onClick={(e) => {
                    if (hasChildren) {
                        setOpen((o) => !o);
                    }
                    onClick?.(item.id);
                }}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    pl: 2.5 + (depth > 0 ? depth * 1.25 : 0),
                    pr: 1,
                    py: 0.45,
                    fontSize: "0.8rem",
                    fontWeight: isActive ? 600 : 400,
                    lineHeight: 1.4,
                    color: isActive ? "primary.main" : "text.secondary",
                    textDecoration: "none",
                    borderLeft: "2px solid",
                    borderColor: isActive ? "primary.main" : "transparent",
                    bgcolor: isActive ? alpha(theme.palette.primary.main, 0.06) : "transparent",
                    borderRadius: "0 6px 6px 0",
                    transition: "all 0.12s",
                    cursor: "pointer",
                    "&:hover": {
                        color: "text.primary",
                        bgcolor: alpha(theme.palette.action.hover, 0.5),
                    },
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                    {hasChildren && !arrowOnRight && <ArrowIcon open={open} />}
                    {item.label}
                </Box>
                {hasChildren && arrowOnRight && <ArrowIcon open={open} />}
            </Box>
            {hasChildren && (
                <Collapse in={open} timeout="auto" unmountOnExit>
                    {item.children.map((child) => (
                        <NavItem key={child.id} item={child} activeId={activeId} depth={depth + 1} onClick={onClick} />
                    ))}
                </Collapse>
            )}
        </>
    );
}

function flatIds(items) {
    const out = [];
    for (const it of items) {
        if (it.id) out.push(it.id);
        if (it.children) out.push(...flatIds(it.children));
    }
    return out;
}

/* ─────────────────────────────────────────────
   Reusable section components
   ───────────────────────────────────────────── */
const SectionTitle = ({ children, id, variant = "h5", ...rest }) => (
    <Typography id={id} variant={variant} sx={{ fontWeight: 700, scrollMarginTop: 24, mt: 5, mb: 1.5, ...rest.sx }} {...rest}>
        {children}
    </Typography>
);

const SubTitle = ({ children, id, ...rest }) => (
    <Typography id={id} variant="h6" sx={{ fontWeight: 600, scrollMarginTop: 24, mt: 3, mb: 1, ...rest.sx }} {...rest}>
        {children}
    </Typography>
);

const Sub2Title = ({ children, id, ...rest }) => (
    <Typography id={id} variant="subtitle1" sx={{ fontWeight: 600, scrollMarginTop: 24, mt: 2.5, mb: 0.75, fontSize: "0.95rem", ...rest.sx }} {...rest}>
        {children}
    </Typography>
);

const P = ({ children, ...rest }) => (
    <Typography variant="body1" component="p" sx={{ mb: 1.5, lineHeight: 1.75, color: "text.primary", ...rest.sx }} {...rest}>
        {children}
    </Typography>
);

const Ul = ({ children }) => (
    <Box component="ul" sx={{ pl: 3, mb: 2, "& > li": { mb: 0.6 }, "& > li:last-of-type": { mb: 0 } }}>
        {children}
    </Box>
);
const Ol = ({ children }) => (
    <Box component="ol" sx={{ pl: 3, mb: 2, "& > li": { mb: 0.6 }, "& > li:last-of-type": { mb: 0 } }}>
        {children}
    </Box>
);
const Li = ({ children }) => (
    <Typography component="li" variant="body2" sx={{ lineHeight: 1.7, display: "list-item", listStyleType: "disc", ml: 2 }}>{children}</Typography>
);

const CodeBlock = ({ children }) => (
    <Typography variant="body2" component="pre" sx={{ p: 1.5, bgcolor: (t) => alpha(t.palette.text.primary, 0.04), border: "1px solid", borderColor: "divider", borderRadius: 1.5, overflowX: "auto", mb: 2, fontFamily: "monospace", fontSize: "0.82rem", lineHeight: 1.55 }}>
        {children}
    </Typography>
);

const Figure = ({ src, alt, caption, openLightbox, maxWidth = "2xl" }) => (
    <Box component="figure" sx={{ my: 3, mx: 0 }}>
        <Box
            component="img"
            src={src}
            alt={alt}
            onClick={() => openLightbox(src, alt)}
            sx={{
                maxWidth: maxWidth === "xs" ? 280 : maxWidth === "sm" ? 380 : maxWidth === "md" ? 480 : 640,
                width: "100%",
                mx: "auto",
                display: "block",
                borderRadius: 2.5,
                boxShadow: 2,
                cursor: "pointer",
                transition: "box-shadow 0.2s",
                "&:hover": { boxShadow: 6 },
            }}
        />
        {caption && (
            <Typography variant="caption" display="block" align="center" sx={{ mt: 1, color: "text.secondary", maxWidth: 640, mx: "auto" }}>
                {caption}
            </Typography>
        )}
    </Box>
);

const InfoBox = ({ children, color = "info" }) => {
    const theme = useTheme();
    const palette = theme.palette[color] || theme.palette.info;
    return (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: palette.main, bgcolor: alpha(palette.main, theme.palette.mode === "dark" ? 0.10 : 0.05), borderRadius: 2 }}>
            {children}
        </Paper>
    );
};

const CardGrid = ({ children }) => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 3 }}>
        {children}
    </Box>
);

const Card = ({ title, children }) => (
    <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
        {children}
    </Box>
);

/* ─────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────── */
const Documentation = () => {
    const theme = useTheme();
    const [activeId, setActiveId] = useState("");
    const mainRef = useRef(null);

    const [lightbox, setLightbox] = useState({ open: false, src: "", alt: "" });
    const openLightbox = useCallback((src, alt) => setLightbox({ open: true, src, alt }), []);
    const closeLightbox = useCallback(() => setLightbox((prev) => ({ ...prev, open: false })), []);

    /* scroll-spy */
    useEffect(() => {
        const allIds = [];
        NAV_TREE.forEach((g) => allIds.push(...flatIds(g.children)));
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                        break;
                    }
                }
            },
            { rootMargin: "-10% 0px -70% 0px", threshold: 0 }
        );
        allIds.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, []);

    const sidebarW = 250;

    return (
        <Box sx={{ display: "flex", height: "100%", width: "100%", mx: "auto" }}>
            {/* ── Sidebar ── */}
            <Box
                component="nav"
                sx={{
                    width: sidebarW,
                    flexShrink: 0,
                    borderRight: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    position: "sticky",
                    top: 0,
                    height: "100vh",
                    overflowY: "auto",
                    display: { xs: "none", lg: "block" },
                    pt: 3,
                    pb: 4,
                    "&::-webkit-scrollbar": { width: 4 },
                    "&::-webkit-scrollbar-thumb": { bgcolor: alpha(theme.palette.text.disabled, 0.25), borderRadius: 2 },
                }}
            >
                <Typography variant="overline" sx={{ display: "block", px: 2, mb: 1.5, fontSize: "0.65rem", letterSpacing: "0.1em", color: "text.disabled" }}>
                    Documentation
                </Typography>

                {NAV_TREE.map((group) => (
                    <NavGroup key={group.group} group={group} activeId={activeId} onClick={setActiveId} />
                ))}
            </Box>

            {/* ── Main content ── */}
            <Box
                ref={mainRef}
                component="main"
                sx={{
                    flex: 1,
                    overflowY: "auto",
                    maxWidth: "100%",
                    bgcolor: "background.default",
                    px: { xs: 2, md: 5 },
                    py: { xs: 2, md: 4 },
                }}
            >
                <Box sx={{ maxWidth: 820, mx: "auto" }}>

                    {/* ════════════════════════════════════════════
                        LANDING
                       ════════════════════════════════════════════ */}
                    <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                        PEP-EDIT
                    </Typography>
                    <Typography variant="h6" sx={{ color: "text.secondary", fontWeight: 400, mb: 3, lineHeight: 1.5 }}>
                        Interactive web application for peptide design, editing and 3D conformer generation — supporting standard, non-standard, cyclic and branched peptides.
                    </Typography>

                    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 4 }}>
                        <Chip component="a" href="#editing-biln" label="Write a BILN sequence →" clickable size="small" color="primary" variant="outlined" />
                        <Chip component="a" href="#editing-library" label="Build from monomer library →" clickable size="small" color="primary" variant="outlined" />
                        <Chip component="a" href="#constraints" label="Apply constraints →" clickable size="small" color="primary" variant="outlined" />
                    </Box>

                    <Divider sx={{ mb: 4 }} />

                    {/* ════════════════════════════════════════════
                        1 · GETTING STARTED
                       ════════════════════════════════════════════ */}

                    {/* ── Introduction ── */}
                    <SectionTitle id="introduction">Introduction</SectionTitle>

                    <P>
                        PEP-EDIT is a web application for the easy and rapid online preparation and generation of peptide
                        representations in 1D (SMILES, BILN, HELM), 2D (SDF/MOL2) and 3D (PDB/SDF/XYZ). It is not a peptide
                        structure prediction tool, but it helps preparing realistic conformations to undergo further processing
                        (molecular dynamics simulations, docking, etc.). It supports standard and non-standard monomers
                        (amino acids, caps and peptidomimetics), including linear, cyclic and branched peptides.
                    </P>

                    <InfoBox>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Core workflow</Typography>
                        <Ol>
                            <Li><strong>Define</strong> a peptide — type a BILN sequence, upload a FASTA, or build from the monomer library.</Li>
                            <Li><strong>Refine</strong> — apply constraints (secondary structure or 3D template), adjust pH, link chains.</Li>
                            <Li><strong>Generate & export</strong> — obtain 1D/2D/3D representations and download them.</Li>
                        </Ol>
                    </InfoBox>

                    <P>PEP-EDIT can:</P>
                    <Ul>
                        <Li>Build peptides from scratch from a BILN sequence.</Li>
                        <Li>Edit existing structures by substituting/modifying monomers while preserving the overall backbone conformation as much as possible.</Li>
                        <Li>Apply conformational constraints (secondary-structure presets or a 3D template) to guide conformer generation.</Li>
                        <Li>Control protonation of exported molecules using a pH model (default: pH 7.4).</Li>
                        <Li>Manage both public and user private monomer libraries. The public library can be updated in a collaborative/moderated mode.</Li>
                        <Li>Handle peptides with up to 40 monomers per construct.</Li>
                    </Ul>

                    <P>
                        In addition to the standard web instance, a collaborative n.eko instance is available at{" "}
                        <MUILink href="https://neko.rpbs.univ-paris-diderot.fr?usr=guest&pwd=rpbs" target="_blank" rel="noreferrer">
                            neko.rpbs.univ-paris-diderot.fr
                        </MUILink>, enabling multi-user real-time peptide design and didactic use.
                    </P>

                    <Divider sx={{ my: 4 }} />

                    {/* ── PEP-EDIT vs pyPept ── */}
                    <SectionTitle id="pepedit-vs-pypept">PEP-EDIT vs pyPept</SectionTitle>

                    <P>
                        PEP-EDIT is built upon <strong>pyPept</strong>, a Python toolkit for peptide representation and conversion,
                        which itself relies on the <strong>BILN</strong> notation (Boehringer Ingelheim Line Notation).
                    </P>

                    <Ul>
                        <Li>
                            pyPept paper:{" "}
                            <MUILink href="https://link.springer.com/article/10.1186/s13321-023-00748-2" target="_blank" rel="noreferrer">
                                Springer — J Cheminform (2023)
                            </MUILink>
                        </Li>
                        <Li>
                            BILN paper:{" "}
                            <MUILink href="https://pubs.acs.org/doi/10.1021/acs.jcim.2c00703" target="_blank" rel="noreferrer">
                                ACS — J Chem Inf Model (2022)
                            </MUILink>
                        </Li>
                    </Ul>

                    <P>
                        PEP-EDIT relies on pyPept, but uses a modified version where several major changes were introduced
                        to support an interactive web workflow and structure-aware peptide design:
                    </P>

                    <Ul>
                        <Li><strong>Web interface:</strong> PEP-EDIT provides a web access to complex peptide modeling using an enhanced interface to pyPept.</Li>
                        <Li><strong>Monomer storage:</strong> monomer metadata is stored in a MongoDB database (instead of CSV files) to enable richer querying, editing and moderation workflows. This supports both public and user-specific monomer libraries, as well as facilities to migrate monomers to the public library in a moderated mode.</Li>
                        <Li><strong>Monomer naming:</strong> monomers containing the hyphen character (<code>-</code>) are renamed using underscores (<code>_</code>) to avoid conflicts with BILN's hyphen shorthand for backbone connections.</Li>
                        <Li><strong>Conformer generation with structural constraints:</strong> PEP-EDIT can generate 3D conformers from secondary-structure presets or PDB template constraints.</Li>
                        <Li><strong>PDB atom naming fixes:</strong> atom names were corrected for some amino acids to improve downstream compatibility (visualization, tooling, MD pipelines).</Li>
                        <Li><strong>Interactive 2D SVG:</strong> the RDKit 2D sketch SVG is post-processed to expose interactive elements (monomers, R-groups, extra bonds) so the UI can attach JS-driven interactions.</Li>
                        <Li><strong>pH-aware protonation:</strong> final molecules include protonation predicted from the peptide-derived SMILES using Dimorphite-DL (default pH 7.4).</Li>
                        <Li><strong>Collaborative/didactic facilities:</strong> a n.eko instance enables multi-user peptide design sessions.</Li>
                    </Ul>

                    <Divider sx={{ my: 4 }} />

                    {/* ── About BILN notation ── */}
                    <SectionTitle id="biln-notation">About BILN notation</SectionTitle>

                    <P>
                        BILN (Boehringer Ingelheim Line Notation) represents a peptide as monomers and connections. In its explicit
                        form, each monomer can carry one or more connection pairs <code>(bondId, RgroupId)</code>. The BILN rules are:
                        monomers separated by dots, connections defined by integer pairs, and a hyphen shorthand when connecting
                        R2→R1 along the backbone.
                    </P>

                    <P>Examples from the BILN rules:</P>
                    <Ul>
                        <Li>Explicit backbone connections: <code>A(1,2).G(1,1)(2,2).C(2,1)</code></Li>
                        <Li>Shorthand for linear peptide: <code>P-E-P-T-I-D-E</code></Li>
                    </Ul>

                    <P>
                        If a monomer abbreviation contains a hyphen, BILN requires brackets for disambiguation
                        (e.g. <code>A-[2-Cl-Phe]-C</code>), and the BILN paper notes that avoiding hyphens improves readability.
                        PEP-EDIT therefore uses <code>_</code> in such monomer names.
                    </P>

                    <P>
                        In practice, BILN describes a peptide as an ordered list of monomers plus explicit connections between
                        their attachment points (R-groups). The BILN paper recommends the convention <strong>R1 = backbone N</strong> and{" "}
                        <strong>R2 = backbone carbonyl C</strong> for amino acids (for readability and N→C order).
                    </P>

                    <Divider sx={{ my: 4 }} />

                    {/* ── Interface overview ── */}
                    <SectionTitle id="interface-overview">Interface overview</SectionTitle>

                    {/* Panels */}
                    <SubTitle id="panels">Panels & layout</SubTitle>

                    <Figure
                        src="/assets/documentation/PEP-EDIT-Interface-v2.png"
                        alt="Overview of the PEP-EDIT interface"
                        caption="Overview of the PEP-EDIT interface. The layout is organized into a left editor area (BILN editor + chains + constraints), central viewers (2D and 3D), and a collapsible right panel."
                        openLightbox={openLightbox}
                    />

                    <P>The interface is organized into the following main areas:</P>

                    <Ol>
                        <Li><strong>Editor interface</strong> — BILN sequence input, chain management and constraint tracks. This is the primary area for defining and editing your peptide.</Li>
                        <Li><strong>2D viewer</strong> — interactive SVG depiction of the molecule, rendered by RDKit. Supports hover highlighting, linking, bond cutting, and monomer replacement.</Li>
                        <Li><strong>3D viewer</strong> — conformer visualization powered by Mol*. Includes toolbar controls for representation, color scheme, labels, background, and camera.</Li>
                        <Li><strong>Right panel</strong> — a collapsible, resizable sidebar with three tabs (see below).</Li>
                    </Ol>

                    {/* Right panel */}
                    <SubTitle id="right-panel">Right panel (Library / Output / Jobs)</SubTitle>

                    <P>
                        The right panel is a collapsible sidebar with three vertical tabs. It can be resized by dragging its left edge.
                    </P>

                    <CardGrid>
                        <Card title="Monomer Library">
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
                                Searchable and filterable monomer catalog. From here you can browse, filter by class, and add monomers
                                to your sequence using the <strong>+</strong> button. Controls for <strong>placement mode</strong> (Append / Prepend / New chain),
                                <strong> linking mode</strong> (Peptide, R3→R1, etc.), and <strong>chain selector</strong> are accessible in the panel header.
                                The library also provides two sub-tabs: <strong>Public</strong> (shared, read-only) and <strong>My monomers</strong> (personal, session-scoped).
                            </Typography>
                        </Card>
                        <Card title="Output">
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
                                Displays all computed output formats (BILN, HELM, SMILES, InChI, InChIKey, SDF 2D, PDB, MMCIF, XYZ, SDF 3D, MOL2, PDBQT).
                                Each format is presented as a collapsible accordion with <strong>Copy</strong> and <strong>Download</strong> buttons.
                                A <strong>Download all</strong> button is available at the top.
                            </Typography>
                        </Card>
                    </CardGrid>
                    <CardGrid>
                        <Card title="Jobs">
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
                                Lists all conformer generation jobs submitted under the current session. Each job shows its status
                                (queued, running, success, failed), creation time, and a name that can be edited inline. Clicking a job
                                loads its result into the 3D viewer. Jobs can also be deleted from this panel.
                            </Typography>
                        </Card>
                    </CardGrid>

                    {/* Sessions */}
                    <SubTitle id="sessions">Sessions</SubTitle>

                    <P>
                        A <strong>Session ID</strong> is the key that ties together your personal monomers, conformer jobs, and editor state.
                        No account or login is required — the session is anonymous and identified only by its unique ID.
                    </P>

                    <Sub2Title>How a session is created</Sub2Title>

                    <Ol>
                        <Li><strong>First visit:</strong> a Session ID is automatically generated and stored in your browser (localStorage) and on the server.</Li>
                        <Li><strong>Subsequent visits:</strong> the stored Session ID is reloaded automatically so your work is restored.</Li>
                        <Li><strong>New session:</strong> click the <strong>+</strong> button (or <strong>Start new session</strong>) to create a fresh session. A confirmation dialog reminds you to save your current Session ID before switching.</Li>
                    </Ol>

                    <Sub2Title>What a session contains</Sub2Title>
                    <Ul>
                        <Li><strong>Personal monomers</strong> — custom monomers you created or uploaded in <em>My monomers</em>.</Li>
                        <Li><strong>Conformer generation jobs</strong> — every 3D job submitted under this session.</Li>
                    </Ul>

                    <Sub2Title>Naming a session</Sub2Title>
                    <P>
                        You can give a session a human-readable name (e.g. <em>"Therapeutic peptides"</em>) and a short description.
                        Click the session name inline in the header, or open Session → <strong>Email</strong> tab → "Session notes".
                    </P>

                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Sessions are automatically deleted after <strong>1 month of inactivity</strong>. Each visit refreshes the expiration timer.
                    </Alert>

                    <Sub2Title>Session dialog (Share / Recover / Email)</Sub2Title>
                    <P>Click the <strong>Session</strong> button in the header to open the Session Management dialog with three tabs:</P>

                    <CardGrid>
                        <Card title="Share">
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 1 }}>
                                Send a Session ID by email. The recipient will be able to load and collaborate on the session.
                            </Typography>
                            <Ul>
                                <Li>Enter the recipient's email address.</Li>
                                <Li>Choose whether to share the current session or a different Session ID.</Li>
                                <Li>Click <strong>Send by Email</strong>.</Li>
                            </Ul>
                        </Card>
                        <Card title="Recover">
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 1 }}>
                                Get back into a session you no longer have in your browser:
                            </Typography>
                            <Ol>
                                <Li><strong>Load by ID</strong> — paste a Session ID and click Load Session.</Li>
                                <Li><strong>Email this session ID</strong> — sends the current ID to your verified email.</Li>
                                <Li><strong>Email all session IDs</strong> — sends every Session ID linked to your email.</Li>
                            </Ol>
                        </Card>
                    </CardGrid>
                    <CardGrid>
                        <Card title="Email">
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 1 }}>
                                Link an email address to enable recovery and sharing features.
                            </Typography>
                            <Ul>
                                <Li><strong>Link email:</strong> enter your email; verify via the link sent to you.</Li>
                                <Li><strong>Change email:</strong> two-step verification (current + new email).</Li>
                                <Li><strong>Session notes:</strong> set or update session name and description.</Li>
                            </Ul>
                        </Card>
                    </CardGrid>

                    <P><strong>Tip:</strong> click the Session ID chip in the header at any time to copy the full ID to your clipboard.</P>

                    <Divider sx={{ my: 4 }} />

                    {/* ── Protonation ── */}
                    <SectionTitle id="protonation">Protonation (pH)</SectionTitle>

                    <P>
                        Protonation is handled after building the peptide-derived SMILES. The SMILES is submitted to{" "}
                        <MUILink href="https://link.springer.com/article/10.1186/s13321-019-0336-9" target="_blank" rel="noreferrer">
                            Dimorphite-DL
                        </MUILink>{" "}
                        to predict a protonated form at the chosen pH (default: 7.4). The protonated state is propagated to all exports
                        (SMILES, PDB, etc.).
                    </P>
                    <Ul>
                        <Li>
                            PEP-EDIT uses a <strong>modified Dimorphite-DL</strong> where selected SMARTS pKa values were adjusted
                            (file: <code>site_substructures.smarts</code>) to better match known amino-acid pKa behavior. In brief:
                            neutral phenol, neutral imide and neutral amide at physiological pH.
                        </Li>
                    </Ul>
                    <P>
                        The pH slider is available in the editor toolbar. Adjusting pH changes how titratable groups are protonated
                        in the exported representations.
                    </P>

                    <Divider sx={{ my: 4 }} />

                    {/* ── Conformer generation ── */}
                    <SectionTitle id="conformer-generation">Conformer generation</SectionTitle>

                    <P>
                        PEP-EDIT generates 3D conformers using RDKit embedding with optional coordinate maps. When constraints are
                        provided (from secondary-structure presets or a PDB template), backbone coordinates are used as reference to bias
                        embedding toward the desired backbone, while side chains and unconstrained atoms are generated more freely.
                    </P>

                    <SubTitle id="embedding">RDKit-based embedding</SubTitle>
                    <P>
                        The conformer generation starts from the SMILES representation of the peptide. RDKit's distance geometry
                        embedding is used to generate initial 3D coordinates. When no constraints are provided, this produces
                        a reasonable starting conformation that can be refined downstream.
                    </P>

                    <SubTitle id="iterative-process">Iterative process</SubTitle>
                    <P>
                        To increase robustness, constrained embedding is performed iteratively using partial coordinate maps:
                        for each mapping ratio, a random subset of mapped atoms is selected and multiple attempts are run with
                        different random seeds. This improves the likelihood of finding a valid conformer even when a fully
                        constrained embedding is too strict.
                    </P>

                    <CodeBlock>
                        {`mapping_ratios = [(1.0, 5), (0.9, 5), (0.8, 10), (0.5, 50)]
# (ratio_of_mapped_atoms_to_keep, number_of_attempts)`}
                    </CodeBlock>

                    <P>
                        Practically, mapping ratios as low as 0.5 can still preserve the global backbone conformation while allowing
                        enough flexibility for RDKit to embed successfully (especially for complex peptides or multi-fragment systems).
                    </P>

                    {/* Constraints */}
                    <SubTitle id="constraints">Setting constraints</SubTitle>
                    <P>PEP-EDIT can guide conformer generation using two mutually exclusive constraint types:</P>
                    <Ul>
                        <Li><strong>Secondary structure constraints (2D)</strong> — per-residue backbone angle presets (H / E / -).</Li>
                        <Li><strong>3D template constraints</strong> — backbone coordinate constraints from a PDB/mmCIF structure.</Li>
                    </Ul>

                    <Sub2Title id="constraints-2d">Secondary structure (2D) constraints</Sub2Title>

                    <Figure
                        src="/assets/documentation/SecondaryStructure.png"
                        alt="Secondary structure constraints"
                        caption="Imposing secondary-structure constraints on a peptide chain. Each residue can be assigned H (helix), E (strand), or - (random coil)."
                        openLightbox={openLightbox}
                        maxWidth="xs"
                    />

                    <P>
                        Secondary-structure presets are implemented by setting backbone dihedral angles (φ/ψ, plus ω) using reference
                        values for helices and extended conformations. The target angles are adjusted depending on residue chirality
                        (L vs D), mirroring in Ramachandran space for D residues.
                    </P>

                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 1.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Structure</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow><TableCell><code><strong>H</strong></code></TableCell><TableCell>Alpha helix</TableCell><TableCell>Constrained to helical conformation.</TableCell></TableRow>
                                <TableRow><TableCell><code><strong>E</strong></code></TableCell><TableCell>Beta strand</TableCell><TableCell>Constrained to extended strand conformation.</TableCell></TableRow>
                                <TableRow><TableCell><code><strong>-</strong></code></TableCell><TableCell>Random / coil</TableCell><TableCell>No structural preference — free to adopt any conformation.</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <P>
                        The constraint track is visible when the constraint mode is set to <strong>Secondary structure</strong> in the
                        chains toolbar. Each residue can be toggled individually, or bulk-set via the ⋮ menu on the constraint row
                        (All alpha, All beta, All random, Clear).
                    </P>

                    <Sub2Title id="constraints-3d">3D template (scaffold) constraints</Sub2Title>

                    <Figure
                        src="/assets/documentation/3DTemplateProcess.png"
                        alt="3D template constraint workflow"
                        caption="Imposing 3D template constraints. A PDB/mmCIF file is uploaded or fetched by ID; the backbone atoms of the designed peptide are mapped onto the template to bias conformer generation."
                        openLightbox={openLightbox}
                        maxWidth="xs"
                    />

                    <P>
                        3D template constraints apply backbone coordinate constraints by mapping the peptide backbone atoms onto
                        the corresponding backbone atoms in the template, then performing constrained embedding using those mapped
                        coordinates. Specifying a 3D template is done using the <strong>Upload Scaffold</strong> facility.
                    </P>
                    <Ul>
                        <Li>Provide a template by its <strong>PDB identifier</strong> (fetched from the PDB) or as a <strong>local file upload</strong> (PDB/mmCIF).</Li>
                        <Li>Select the fragment to use: choose the <strong>chain</strong>, <strong>start/end residue</strong> and optional <strong>offset</strong> (number of leading peptide positions left unconstrained).</Li>
                        <Li>For multi-chain peptides, different PDB chains can be selected for each peptide chain.</Li>
                        <Li>Fine-tune on a per-residue basis by <strong>masking/unmasking</strong> residues (masked = constraint not applied).</Li>
                    </Ul>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        Using a 3D template disables automatic 3D synchronization. You must click the <strong>Generate 3D</strong> button
                        to trigger conformer generation.
                    </Alert>

                    <Divider sx={{ my: 4 }} />

                    {/* ════════════════════════════════════════════
                        2 · HOW-TO GUIDES
                       ════════════════════════════════════════════ */}

                    {/* ── Editing BILN ── */}
                    <SectionTitle id="editing-biln">Editing a BILN sequence</SectionTitle>

                    <P>
                        You can define a peptide by typing a BILN sequence directly in the manual edit field
                        (e.g. <code>P-E-P-T-I-D-E</code>), or by uploading a peptide sequence in FASTA format (limited to the
                        20 standard amino acids). The sequence editor also supports HELM input.
                    </P>
                    <P>
                        Several chains can be defined independently using separate chain slots. Each chain appears as an
                        independent monomer row in the editor, separated by <code>.</code> in the BILN sequence.
                    </P>
                    <Ol>
                        <Li><strong>BILN sequence</strong> — each chain is separated by a "." in the combined BILN string.</Li>
                        <Li><strong>Constraints</strong> — each chain has its own secondary-structure or 3D-template constraint track.</Li>
                        <Li><strong>Viewers</strong> — the 2D and 3D viewers update to reflect all chains.</Li>
                    </Ol>

                    <Divider sx={{ my: 4 }} />

                    {/* ── Editing from library ── */}
                    <SectionTitle id="editing-library">Editing from monomer library</SectionTitle>

                    <Figure
                        src="/assets/documentation/MonomerSelection.png"
                        alt="Monomer selection and insertion panel"
                        caption="Monomer search and selection from the library panel. Use the search field and class filters to find the desired monomer, then click + to add it."
                        openLightbox={openLightbox}
                        maxWidth="md"
                    />

                    <P>
                        Instead of typing BILN manually, you can build your sequence from the <strong>Monomer Library</strong> tab in the right panel.
                        The library provides a searchable, filterable catalog of all available monomers (public + personal).
                    </P>

                    <Sub2Title>Placement mode</Sub2Title>
                    <P>The placement mode (in the library header) controls where a monomer is inserted when you click <strong>+</strong>:</P>
                    <Ul>
                        <Li><strong>Append</strong> — adds the monomer at the C-terminus (end) of the active chain.</Li>
                        <Li><strong>Prepend</strong> — inserts the monomer at the N-terminus (beginning) of the active chain.</Li>
                        <Li><strong>New chain</strong> — starts a brand-new chain (default when the editor is empty).</Li>
                    </Ul>

                    <Sub2Title>Linking mode</Sub2Title>
                    <P>The linking mode controls which bond is formed when the monomer is placed:</P>
                    <Ul>
                        <Li><strong>Peptide</strong> — automatic peptide bond (R2→R1, standard backbone connection).</Li>
                        <Li><strong>R3→R1, R3→R2, R3→R3</strong> — explicit R-group connections for non-standard attachments.</Li>
                    </Ul>

                    <Sub2Title>Monomer replacement</Sub2Title>
                    <P>
                        Hover over any monomer in the chain track and click the <strong>Replace</strong> icon. The library panel opens
                        automatically so you can pick a replacement monomer. The swap preserves existing connections where possible.
                    </P>

                    <Divider sx={{ my: 4 }} />

                    {/* ── Linking ── */}
                    <SectionTitle id="linking">Linking monomers</SectionTitle>

                    <Figure
                        src="/assets/documentation/Linking-Unlinking.png"
                        alt="Linking and unlinking chains using R-groups"
                        caption="Linking and unlinking chains via R-groups. The 2D viewer supports interactive bond creation and removal."
                        openLightbox={openLightbox}
                        maxWidth="xs"
                    />

                    <P>
                        PEP-EDIT supports extra bonds beyond the backbone (e.g. disulfides, side-chain linkers, lipidation attachments).
                        You can create them in two ways:
                    </P>
                    <Ul>
                        <Li><strong>BILN connectivity</strong> — write explicit bond annotations in the BILN sequence, using <code>(bondId, RgroupId)</code> pairs.</Li>
                        <Li><strong>Link mode</strong> — activate the Link tool (chain icon in the editor toolbar), then click two compatible R-groups in the 2D viewer to create a bond.</Li>
                    </Ul>
                    <P>
                        To remove a bond, activate the <strong>Cut mode</strong> (scissors icon) and click a non-backbone bond in the 2D viewer.
                    </P>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        Extra bonds are flexible by design — PEP-EDIT does not automatically validate whether a given link is
                        chemically meaningful (that remains the user's responsibility).
                    </Alert>

                    <Divider sx={{ my: 4 }} />

                    {/* ── Complex topologies ── */}
                    <SectionTitle id="complex-topologies">Complex topologies</SectionTitle>

                    <P>
                        PEP-EDIT supports several non-linear peptide architectures through explicit BILN connectivity
                        and the graphical chain tools:
                    </P>

                    <Sub2Title>Cyclic peptides (head-to-tail)</Sub2Title>
                    <P>
                        Use the <strong>Cyclize</strong> action in the ⋮ menu on a chain row, or write explicit BILN connectivity
                        connecting R1 of the first residue to R2 of the last, e.g.: <code>C(1,1)-Y-C-L-I-C(1,2)</code>.
                    </P>

                    <Sub2Title>Disulfide bridges</Sub2Title>
                    <P>
                        Connect two cysteines via their R3 (side-chain) attachment points:{" "}
                        <code>A-C(1,3)-G-A-G-C(1,3)-D</code>. Bond 1 connects the R3 groups of the two Cys residues.
                    </P>

                    <Sub2Title>Branched peptides</Sub2Title>
                    <P>
                        Use <code>.</code> to separate the main chain from the branch, then connect via bond annotations:{" "}
                        <code>A-G-K(1,3)-G-A-D.E-H-I-A(1,2)</code>. Here bond 1 links R3 of Lys to R2 of Ala in the branch.
                    </P>

                    <Sub2Title>Multi-chain designs</Sub2Title>
                    <P>
                        Each chain is an independent peptide sequence. Create multiple chains using the <strong>+</strong> button
                        in the chains toolbar, then link them as needed. This is useful for building peptides that require
                        inter-chain bonds (e.g. two chains connected by a disulfide).
                    </P>

                    <Sub2Title>Mirror (L/D amino acids)</Sub2Title>
                    <P>
                        The ⋮ menu on a chain row includes a <strong>Mirror</strong> action that swaps L- and D-amino acid forms
                        for all natural amino acids in the chain (e.g. Ala ↔ dAla).
                    </P>

                    <Divider sx={{ my: 4 }} />

                    {/* ── Adding monomers ── */}
                    <SectionTitle id="adding-monomers">Adding monomers to the library</SectionTitle>

                    <P>
                        Beyond the built-in public monomer library, PEP-EDIT lets you build a <strong>personal monomer library</strong> ("My monomers").
                        Personal monomers are tied to your Session ID, so they persist across page refreshes and can be shared
                        by sharing the session.
                    </P>

                    <Sub2Title>Two ways to add monomers</Sub2Title>

                    <CardGrid>
                        <Card title="Create (wizard)">
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 1 }}>
                                Start from a SMILES string and define R-groups interactively. A guided 5-step wizard walks you through the process.
                            </Typography>
                            <Ol>
                                <Li>My monomers → <strong>Create</strong></Li>
                                <Li>Paste a valid SMILES — the molecule renders live</Li>
                                <Li>Click bonds to define attachment points; pick the core fragment</Li>
                                <Li>Fill in metadata (Symbol, PDB, type…); review stereochemistry</Li>
                                <Li>Validate the generated molblock and save</Li>
                            </Ol>
                        </Card>
                        <Card title="Import SDF">
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 1 }}>
                                Import monomers from a pepedit-compatible SDF file — useful for sharing, restoring, or bulk-loading monomers.
                            </Typography>
                            <Ol>
                                <Li>My monomers → <strong>Import SDF</strong></Li>
                                <Li>Choose a <code>.sdf</code> file and upload</Li>
                                <Li>The monomers become available in the library immediately</Li>
                            </Ol>
                        </Card>
                    </CardGrid>

                    <Sub2Title>Create a monomer — step-by-step walkthrough</Sub2Title>

                    <P>
                        The wizard transforms a SMILES string into a validated SDF monomer record containing a molecular core, explicit
                        attachment points (R1–R4), leaving groups, stereochemistry assignments, and the metadata required for BILN integration.
                    </P>

                    {/* Step 1 */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>Step 1 — Choose a molecule (SMILES input)</Typography>
                    <P>
                        Paste a valid SMILES string into the input field. A live 2D depiction appears as you type.
                        Click <strong>Next</strong> once the preview matches the molecule you intend to register.
                    </P>
                    <Figure
                        src="/assets/documentation/create-monomer_step1_smiles.png"
                        alt="Step 1 — SMILES input"
                        caption="Step 1 — SMILES input field with live 2D preview. The example shows N-methyl-alanine."
                        openLightbox={openLightbox}
                    />

                    {/* Step 2 */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>Step 2 — Define attachment points</Typography>
                    <P>
                        Click bonds in the 2D depiction to select cleavage sites. At least one bond must be selected.
                        For amino-acid-like monomers: cut the N-terminal bond (→ R1) and C-terminal bond (→ R2).
                        A capping group needs only one bond cut.
                    </P>
                    <P>
                        After bond selection, the molecule is split into fragments displayed in a carousel. Click a card to select
                        the core fragment — PEP-EDIT automatically pre-fills metadata fields based on the chosen fragment.
                    </P>
                    <Figure
                        src="/assets/documentation/create-monomer_step2_attachment-points.png"
                        alt="Step 2 — Attachment points"
                        caption="Step 2 — Bond selection and core fragment carousel."
                        openLightbox={openLightbox}
                    />

                    {/* Step 3 */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>Step 3 — Fill in monomer metadata</Typography>
                    <P>A form appears alongside the selected fragment. Each field describes a property PEP-EDIT needs:</P>

                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 1.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Field</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>What to enter</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Constraints</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow><TableCell><strong>Name</strong></TableCell><TableCell>Human-readable name (e.g. <em>Alanine</em>)</TableCell><TableCell>Free text.</TableCell></TableRow>
                                <TableRow><TableCell><strong>Symbol</strong></TableCell><TableCell>Short BILN identifier (e.g. <em>Ala</em>)</TableCell><TableCell>Must be unique.</TableCell></TableRow>
                                <TableRow><TableCell><strong>Natural analog</strong></TableCell><TableCell>Single-letter code of closest natural AA</TableCell><TableCell>A–Y or X (no analog).</TableCell></TableRow>
                                <TableRow><TableCell><strong>PDB</strong></TableCell><TableCell>3-letter PDB residue code</TableCell><TableCell>Exactly 3 uppercase letters.</TableCell></TableRow>
                                <TableRow><TableCell><strong>Type</strong></TableCell><TableCell>Monomer category</TableCell><TableCell>Amino acid, Cap, or Other.</TableCell></TableRow>
                                <TableRow><TableCell><strong>Subtype</strong></TableCell><TableCell>Refinement of type</TableCell><TableCell>Natural / Non-natural / Cap.</TableCell></TableRow>
                                <TableRow><TableCell><strong>R-group label</strong></TableCell><TableCell>R-group number (R1–R4)</TableCell><TableCell>Must be unique per attachment point.</TableCell></TableRow>
                                <TableRow><TableCell><strong>Leaving group</strong></TableCell><TableCell>Atom at unconnected attachment point</TableCell><TableCell>H or OH only.</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Figure
                        src="/assets/documentation/create-monomer_step3_fill-metadata.png"
                        alt="Step 3 — Metadata form"
                        caption="Step 3 — Monomer metadata form with auto-filled fields."
                        openLightbox={openLightbox}
                    />

                    {/* Step 4 */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>Step 4 — Review stereochemistry</Typography>
                    <P>
                        If the fragment contains stereocenters, this step lets you review and modify their configuration (R/S).
                        Stereocenters are highlighted in the 2D depiction. You may override assignments if necessary.
                    </P>
                    <Figure
                        src="/assets/documentation/create-monomer_step4_stereochemistry.png"
                        alt="Step 4 — Stereochemistry"
                        caption="Step 4 — Stereochemistry review and override."
                        openLightbox={openLightbox}
                    />

                    {/* Step 5 */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>Step 5 — Validate and complete</Typography>
                    <P>
                        The wizard generates the complete SDF monomer record. The molblock appears in an editable text area.
                        Click <strong>Complete</strong>; the server runs structural integrity, field consistency, and functional
                        monomer validation checks. If all pass, the monomer is saved to your personal library.
                    </P>
                    <Figure
                        src="/assets/documentation/create-monomer_step5_review-sdf.png"
                        alt="Step 5 — Validation"
                        caption="Step 5 — Validation checks and completion."
                        openLightbox={openLightbox}
                    />

                    <Sub2Title>Submit to public library</Sub2Title>
                    <P>
                        If you've created monomers that could benefit all users, you can propose them for inclusion in the public
                        library via the <MUILink href="/submit-public-monomers">Submit to public library</MUILink> page. Your submission
                        is reviewed by PEP-EDIT maintainers before being added to the public collection.
                    </P>

                    <Divider sx={{ my: 4 }} />

                    {/* ════════════════════════════════════════════
                        3 · EXAMPLES & USE CASES
                       ════════════════════════════════════════════ */}

                    {/* Microcin J25 */}
                    <SectionTitle id="example-microcin">Microcin J25 (lasso peptide)</SectionTitle>

                    <Figure
                        src="/assets/documentation/mccJ25templateUsage.png"
                        alt="Microcin J25 template usage"
                        caption="Using a PDB template (PDB ID: 1Q71) to preserve the lasso topology of Microcin J25. Left: without constraints. Right: with template constraints."
                        openLightbox={openLightbox}
                    />

                    <P>
                        Microcin J25 (MccJ25) is a lasso peptide produced by <em>Escherichia coli</em>, with the sequence:
                    </P>
                    <CodeBlock>GGAGHVPEYFVGIGTPISFYG</CodeBlock>

                    <P>
                        MccJ25 adopts a characteristic lasso topology, in which the C-terminal tail is threaded through a
                        macrolactam ring. This ring is formed by a bond between Glu8's side chain and the backbone amine of
                        the N-terminal Gly.
                    </P>
                    <P>
                        Here, we generate the 3D structure of a variant where Phe19 is substituted with 3-chloro-L-phenylalanine
                        (<code>Phe_3Cl</code>). From the primary sequence, it is straightforward to generate the corresponding BILN
                        using <strong>Upload sequence</strong>, substitute residue 19, and define the side-chain-to-backbone cyclization.
                        However, a generic 3D builder cannot spontaneously recover the lasso topology.
                    </P>
                    <P>
                        This limitation is resolved by using the <strong>3D template</strong> facility. Providing the experimental
                        structure (PDB ID: <code>1Q71</code>) as a template enforces the correct backbone topology.
                    </P>

                    <Divider sx={{ my: 3 }} />

                    {/* Semaglutide */}
                    <SectionTitle id="example-semaglutide" variant="h6">Semaglutide</SectionTitle>

                    <P>
                        Semaglutide is a therapeutic peptide with a linear backbone and a fatty diacid chain attached via
                        a lysine side chain. The backbone in BILN:
                    </P>
                    <CodeBlock>H-Aib-E-G-T-F-T-S-D-V-S-S-Y-L-E-G-Q-A-A-K-E-F-I-A-W-L-V-R-G-R-G</CodeBlock>

                    <P>
                        The lipid moiety (<code>SemaB</code>) can be linked to Lys20's side chain:
                    </P>
                    <CodeBlock>H-Aib-E-G-T-F-T-S-D-V-S-S-Y-L-E-G-Q-A-A-K(1,3)-E-F-I-A-W-L-V-R-G-R-G.SemaB(1,2)</CodeBlock>

                    <Figure
                        src="/assets/documentation/Semaglutide.png"
                        alt="Semaglutide 3D structure"
                        caption="Generation of semaglutide without structural constraints."
                        openLightbox={openLightbox}
                    />

                    <P>
                        While PEP-EDIT can generate a valid initial conformation, a more realistic backbone conformation for
                        residues 3–31 can be obtained using an external tool (e.g. PEP-FOLD4) and then used as a
                        <strong> 3D template</strong> within PEP-EDIT (with an offset of 2) to build the full lipidated structure.
                    </P>

                    <Figure
                        src="/assets/documentation/SemaglutideFromTemplate.png"
                        alt="Semaglutide with template"
                        caption="Generation of semaglutide including structural constraints for region 3–31."
                        openLightbox={openLightbox}
                    />

                    <Divider sx={{ my: 3 }} />

                    {/* Cyclic peptides */}
                    <SectionTitle id="example-cyclic" variant="h6">Cyclic peptides with L- and D-amino acids</SectionTitle>

                    <P>
                        PEP-EDIT supports head-to-tail cyclic peptides, including sequences with mixtures of L- and D-amino acids:
                    </P>

                    <Ul>
                        <Li>
                            Head-to-tail octapeptide with standard L-amino acids:
                            <CodeBlock>G(1,1)-T-V-A-V-Q-F-L(1,2)</CodeBlock>
                        </Li>
                    </Ul>

                    <Figure
                        src="/assets/documentation/OctaL.png"
                        alt="Cyclic octapeptide (L)"
                        caption="Octapeptide (L-amino acids) with head-to-tail cyclization."
                        openLightbox={openLightbox}
                    />

                    <Ul>
                        <Li>
                            With three D-amino acids:
                            <CodeBlock>D(1,1)-D-P-T-dP-dR-Q-dQ(1,2)</CodeBlock>
                        </Li>
                        <Li>
                            With four D-amino acids:
                            <CodeBlock>dR(1,1)-Q-dP-dQ-R-dE-P-Q(1,2)</CodeBlock>
                        </Li>
                    </Ul>

                    <Figure
                        src="/assets/documentation/OctaD4L.png"
                        alt="Cyclic octapeptide (4 D-AAs)"
                        caption="Octapeptide (4 D-amino acids) with head-to-tail cyclization."
                        openLightbox={openLightbox}
                    />

                    <Divider sx={{ my: 3 }} />

                    {/* ORCA */}
                    <SectionTitle id="example-orca" variant="h6">Conformer search with ORCA</SectionTitle>

                    <P>
                        The XYZ file generated by PEP-EDIT can be used as input for the{" "}
                        <MUILink href="https://www.faccts.de/docs/orca/6.0/tutorials/prop/goat.html" target="_blank" rel="noreferrer">
                            GOAT algorithm in ORCA
                        </MUILink>.
                        For instance, cilengitide:
                    </P>
                    <CodeBlock>R(1,1)-G-D-dF-meV(1,2)</CodeBlock>

                    <P>
                        Using this XYZ as input for ORCA's global optimizer allows exploration of various conformations.
                        Scripts for input preparation are available{" "}
                        <MUILink href="https://github.com/alexisdougha/goat-pep" target="_blank" rel="noreferrer">here</MUILink>.
                    </P>

                    <Figure
                        src="/assets/documentation/cilengitide.png"
                        alt="Cilengitide conformer search"
                        caption="Conformer ensemble generated by ORCA's GOAT algorithm for cilengitide. Purple: PEP-EDIT conformation; green: lowest-RMSD conformer; gray: reference PDB (1L5G)."
                        openLightbox={openLightbox}
                    />

                    <Divider sx={{ my: 3 }} />

                    {/* AlphaFold */}
                    <SectionTitle id="example-alphafold" variant="h6">Protein-peptide structure prediction</SectionTitle>

                    <P>
                        SMILES generated by PEP-EDIT can be used as input to AlphaFold 3 (or Chai, Boltz) together with a protein
                        sequence to predict protein–peptide complexes involving modified peptides.
                    </P>

                    <Ul>
                        <Li>
                            Doubly sulfated CCR2 N-terminal peptide (PDB: <code>7P8X</code>):
                            <CodeBlock>ac-D-Tyr_SO3H-D-Tyr_SO3H-G</CodeBlock>
                        </Li>
                        <Li>
                            Histone H3K27ac(24-27) (PDB: <code>7X88</code>):
                            <CodeBlock>A-A-R-Lys_Ac</CodeBlock>
                        </Li>
                    </Ul>

                    <Figure
                        src="/assets/documentation/7P8X_top_7X88_bottom.png"
                        alt="AlphaFold 3 predictions"
                        caption="Protein-peptide complexes predicted with AlphaFold 3 using PEP-EDIT SMILES. Experimental (green) vs predicted (purple). Top: 7P8X. Bottom: 7X88."
                        openLightbox={openLightbox}
                    />

                    <P>
                        Scripts for preparing AlphaFold 3 inputs from SMILES are available{" "}
                        <MUILink href="https://github.com/alexisdougha/smiles-fold-input-builder" target="_blank" rel="noreferrer">here</MUILink>.
                    </P>

                    <Divider sx={{ my: 3 }} />

                    {/* Simulated tempering */}
                    <SectionTitle id="example-st" variant="h6">Simulated tempering</SectionTitle>

                    <P>
                        PEP-EDIT's SMILES and PDB outputs can be used directly with OpenMM for molecular dynamics.
                        For cilengitide (<code>R(1,1)-G-D-dF-meV(1,2)</code>), a simulated tempering run explores conformational space:
                    </P>

                    <Figure
                        src="/assets/documentation/ST-cilengitide.png"
                        alt="Simulated tempering for cilengitide"
                        caption="Cilengitide conformational space sampled via simulated tempering with OpenMM. Left: RMSD to experimental conformation (~1 Å). Center: sampling includes experimental conformation (black dot). Right: closest conformer at 0.7 Å from experiment."
                        openLightbox={openLightbox}
                    />

                    <P>
                        Scripts for ST simulations are available{" "}
                        <MUILink href="https://github.com/samuelmurail/Pep-Edit_ST" target="_blank" rel="noreferrer">here</MUILink>.
                    </P>

                    <Divider sx={{ my: 3 }} />

                    {/* Docking */}
                    <SectionTitle id="example-docking" variant="h6">Peptide docking</SectionTitle>

                    <P>
                        The BAD peptide (25 residues, BH3 domain) was generated from its primary sequence with alpha-helix
                        secondary-structure constraints:
                    </P>

                    <Figure
                        src="/assets/documentation/PEP-EDIT-BadPepetideAsHelix.png"
                        alt="BAD peptide as helix"
                        caption="All-helical conformation of the 25-residue BAD peptide generated with secondary-structure constraints."
                        openLightbox={openLightbox}
                    />

                    <P>
                        The PDB output was used for redocking in the Bcl-xL protein structure (PDB: <code>1G5J</code>) using
                        AutoDock CrankPep (ADCP). The best energy model (ΔG = −41.4 kcal/mol) closely matches the experimental
                        peptide position with RMSD &lt; 1 Å for central residues.
                    </P>

                    <Figure
                        src="/assets/documentation/BAD_docking_2.png"
                        alt="BAD peptide docking"
                        caption="Bcl-xL (cyan) with experimental BH3 peptide (magenta) and docked BH3 peptide (green)."
                        openLightbox={openLightbox}
                    />

                    <Divider sx={{ my: 4 }} />

                    {/* ════════════════════════════════════════════
                        4 · REFERENCE
                       ════════════════════════════════════════════ */}

                    <SectionTitle id="output-formats">Output & export formats</SectionTitle>

                    <P>Exported representations include the protonation state predicted for the chosen pH (default 7.4).</P>

                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 1.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Dimension</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Formats</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Typical use</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow><TableCell><strong>1D</strong></TableCell><TableCell>BILN, HELM, SMILES, InChI, InChIKey</TableCell><TableCell>Cheminformatics, similarity search, AlphaFold 3 input (SMILES).</TableCell></TableRow>
                                <TableRow><TableCell><strong>2D</strong></TableCell><TableCell>SDF 2D</TableCell><TableCell>Fingerprints, substructure search, pharmacophore identification.</TableCell></TableRow>
                                <TableRow><TableCell><strong>3D</strong></TableCell><TableCell>PDB, MMCIF, XYZ, SDF 3D, MOL2, PDBQT</TableCell><TableCell>Starting conformations for MD (PDB+SMILES → OpenMM), quantum chemistry (XYZ → ORCA), docking (PDBQT).</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <P>
                        The <strong>Output</strong> tab in the right panel presents each format as a collapsible accordion with
                        Copy and Download buttons. A <strong>Download all</strong> button exports all formats at once.
                    </P>

                    <Divider sx={{ my: 4 }} />

                    {/* ── Monomer library reference ── */}
                    <SectionTitle id="monomer-library-ref">Monomer library & R-groups</SectionTitle>

                    <Figure
                        src="/assets/documentation/Monomer6.png"
                        alt="Monomer detail view with R-groups"
                        caption="Example monomer with labeled R-groups (R1, R2). Each monomer has three labels: its name, the BILN symbol, and a 3-letter PDB identifier."
                        openLightbox={openLightbox}
                        maxWidth="xs"
                    />

                    <P>
                        Attachment points are specified as R-groups (<code>R1</code>, <code>R2</code>, <code>R3</code>, …). In BILN:
                        a monomer with one R-group acts as a capping group; a monomer with more than two R-groups can be a branching
                        or cyclization site.
                    </P>
                    <P>
                        Each R-group must have an associated <strong>leaving group</strong>. If an R-group is not used in a connection,
                        it is replaced by its leaving group in the final structure (H or OH).
                    </P>
                    <P>
                        <strong>Convention:</strong> for amino acids, use R1 for backbone N and R2 for backbone carbonyl C. Additional
                        attachment points should be R3, R4, etc.
                    </P>

                    <Sub2Title>Color coding in the chain track</Sub2Title>

                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 1.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
                                    <TableCell sx={{ fontWeight: 700, width: 50 }}>Color</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell><Box sx={{ width: 18, height: 18, borderRadius: 0.5, bgcolor: "#8FB3A5", border: "1px solid", borderColor: "divider" }} /></TableCell>
                                    <TableCell><strong>Natural</strong></TableCell>
                                    <TableCell>Standard proteinogenic amino acids (Ala, Gly, Leu, …).</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Box sx={{ width: 18, height: 18, borderRadius: 0.5, bgcolor: "#E0A387", border: "1px solid", borderColor: "divider" }} /></TableCell>
                                    <TableCell><strong>Non-natural</strong></TableCell>
                                    <TableCell>Modified or non-standard amino acids and custom monomers.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Box sx={{ width: 18, height: 18, borderRadius: 0.5, bgcolor: "#6B7B8C", border: "1px solid", borderColor: "divider" }} /></TableCell>
                                    <TableCell><strong>Cap</strong></TableCell>
                                    <TableCell>N-terminal or C-terminal capping groups (e.g. acetyl, amide).</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Divider sx={{ my: 4 }} />

                    {/* ── BILN quick reference ── */}
                    <SectionTitle id="biln-quick-ref">BILN quick reference</SectionTitle>

                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 1.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Concept</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Example</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow><TableCell>Backbone connection (automatic R2→R1)</TableCell><TableCell><code>A-C</code></TableCell></TableRow>
                                <TableRow><TableCell>Explicit equivalent</TableCell><TableCell><code>A(1,2).C(1,1)</code></TableCell></TableRow>
                                <TableRow><TableCell>Branch / side-chain capping</TableCell><TableCell><code>A-G-K(1,3)-D.ac(1,2)</code></TableCell></TableRow>
                                <TableRow><TableCell>Monomer containing "-" (brackets)</TableCell><TableCell><code>[2-Cl-Phe]-A</code></TableCell></TableRow>
                                <TableRow><TableCell>Disulfide bridge</TableCell><TableCell><code>A-C(1,3)-G-A-G-C(1,3)-D</code></TableCell></TableRow>
                                <TableRow><TableCell>Cyclic peptide (head-to-tail)</TableCell><TableCell><code>C(1,1)-Y-C-L-I-C(1,2)</code></TableCell></TableRow>
                                <TableRow><TableCell>Branched chain</TableCell><TableCell><code>A-G-K(1,3)-G-A-D.E-H-I-A(1,2)</code></TableCell></TableRow>
                                <TableRow><TableCell>N-terminal cap</TableCell><TableCell><code>ac-G-A-D</code></TableCell></TableRow>
                                <TableRow><TableCell>C-terminal cap</TableCell><TableCell><code>G-A-D-am</code></TableCell></TableRow>
                                <TableRow><TableCell>Multiple connections</TableCell><TableCell><code>K(1,3)(2,3)</code></TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Sub2Title>R-group numbering</Sub2Title>
                    <Ul>
                        <Li><strong>R1</strong> — typically the N-terminal backbone nitrogen.</Li>
                        <Li><strong>R2</strong> — typically the C-terminal carbonyl carbon.</Li>
                        <Li><strong>R3+</strong> — side chains, branching, or specific chemical modifications.</Li>
                    </Ul>

                    <Sub2Title>Bond identifiers</Sub2Title>
                    <P>
                        A <strong>BondID</strong> is an integer used to pair two monomers together. Each BondID must appear exactly
                        twice in the BILN string. The syntax is <code>Monomer(BondID, R-group)</code>.
                    </P>

                    <Divider sx={{ my: 4 }} />

                    {/* ════════════════════════════════════════════
                        5 · TROUBLESHOOTING & POLICIES
                       ════════════════════════════════════════════ */}

                    <SectionTitle id="limitations">Limitations & tips</SectionTitle>

                    <Ul>
                        <Li>No more than <strong>40 monomers</strong> are allowed per construct (due to RDKit embedding limits).</Li>
                        <Li>For large, branched, or multi-fragment constructs, constrained embedding may require multiple attempts; the iterative mapping strategy is designed to improve success rates.</Li>
                        <Li>Extra bonds are not chemically validated automatically — use domain knowledge to ensure plausibility.</Li>
                        <Li>Secondary-structure presets provide a controlled backbone bias (φ/ψ/ω), but realistic conformations often benefit from template constraints or downstream refinement (minimization / MD).</Li>
                        <Li>When using a 3D template, auto-sync is disabled. Click <strong>Generate 3D</strong> manually after adjusting the template.</Li>
                    </Ul>

                    <Divider sx={{ my: 4 }} />

                    <SectionTitle id="policies">Accessibility & cookies</SectionTitle>

                    <Ul>
                        <Li>This website is free and open to all — no login is required.</Li>
                        <Li>This website does not use tracking cookies. Cookie usage is restricted to strictly necessary cookies.</Li>
                    </Ul>

                    {/* bottom padding */}
                    <Box sx={{ height: 80 }} />
                </Box>
            </Box>

            {/* ── Lightbox ── */}
            <Dialog
                open={lightbox.open}
                onClose={closeLightbox}
                maxWidth="lg"
                fullWidth
                PaperProps={{ sx: { bgcolor: "transparent", boxShadow: "none" } }}
            >
                <Box sx={{ position: "relative", p: 2, width: "100%", height: "90vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <IconButton
                        aria-label="Close"
                        onClick={closeLightbox}
                        sx={{ position: "absolute", top: 8, right: 8, color: "grey.100", zIndex: 2, bgcolor: "rgba(0,0,0,0.4)", "&:hover": { bgcolor: "rgba(0,0,0,0.6)" } }}
                    >
                        <CloseIcon />
                    </IconButton>
                    {lightbox.src && (
                        <Box component="img" src={lightbox.src} alt={lightbox.alt} sx={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 2, boxShadow: 4 }} />
                    )}
                </Box>
            </Dialog>
        </Box>
    );
};

export default Documentation;
