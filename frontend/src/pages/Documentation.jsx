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
import SwapVertIcon from "@mui/icons-material/SwapVert";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import UploadIcon from "@mui/icons-material/Upload";
import QuestionMarkSharpIcon from "@mui/icons-material/QuestionMarkSharp";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DownloadIcon from "@mui/icons-material/Download";
import CategoryIcon from "@mui/icons-material/Category";
import PaletteIcon from "@mui/icons-material/Palette";
import LabelIcon from "@mui/icons-material/Label";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LayersIcon from "@mui/icons-material/Layers";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SubjectIcon from "@mui/icons-material/Subject";
import MoreVertIcon from "@mui/icons-material/MoreVert";

/* shorthand for inline icon in doc text */
const Ic = ({ icon: Icon, label }) => (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', gap: 0.3 }}>
        <Icon sx={{ fontSize: 16 }} />{label && <span>{label}</span>}
    </Box>
);

/* ─────────────────────────────────────────────
   Hierarchical navigation model
   ───────────────────────────────────────────── */
const NAV_TREE = [
    {
        group: "Getting started",
        children: [
            { id: "introduction", label: "Introduction" },
            { id: "quick-start", label: "Quick start" },
            {
                id: "interface-overview", label: "Interface overview",
                children: [
                    {
                        id: "editor-interface", label: "Editor interface",
                        children: [
                            { id: "manual-edition", label: "Manual edition" },
                            { id: "chains", label: "Chains" },
                        ],
                    },
                    { id: "viewer-2d", label: "2D viewer (2D Sketch)" },
                    { id: "viewer-3d", label: "3D viewer" },
                    { id: "right-panel", label: "Right panel" },
                ],
            },
            { id: "sessions", label: "Sessions" },
            {
                id: "key-concepts", label: "Key concepts",
                children: [
                    { id: "biln-notation", label: "BILN notation" },
                    { id: "monomers-rgroups", label: "Monomers, R-groups & leaving groups" },
                    { id: "pepedit-vs-pypept", label: "PEP-EDIT vs pyPept" },
                ],
            },
            { id: "protonation", label: "Protonation (pH)" },
            {
                id: "conformer-generation", label: "Conformer generation",
                children: [
                    { id: "auto-vs-manual", label: "Automatic vs. manual" },
                    { id: "constraints-2d", label: "Secondary structure (2D)" },
                    { id: "constraints-3d", label: "3D template (scaffold)" },
                ],
            },
        ],
    },
    {
        group: "How-to guides",
        children: [
            { id: "building-peptide", label: "Building a peptide" },
            { id: "linking", label: "Linking monomers" },
            { id: "complex-topologies", label: "Complex topologies" },
            { id: "adding-monomers", label: "Adding monomers to the library" },
            { id: "exporting", label: "Exporting results" },
        ],
    },
    {
        group: "Examples & use cases",
        children: [
            { id: "example-microcin", label: "Microcin J25 (lasso peptide)" },
            { id: "example-semaglutide", label: "Semaglutide" },
            { id: "example-cyclic", label: "Cyclic peptides (L/D)" },
            { id: "example-orca", label: "Conformer search with ORCA" },
            { id: "example-alphafold", label: "Protein\u2013peptide prediction" },
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
            { id: "resources", label: "Resources & external scripts" },
        ],
    },
    {
        group: "Troubleshooting & policies",
        children: [
            { id: "faq", label: "FAQ & common errors" },
            { id: "limitations", label: "Limitations & tips" },
            { id: "browser-compat", label: "Browser compatibility" },
            { id: "how-to-cite", label: "How to cite" },
            { id: "changelog", label: "Changelog" },
            { id: "policies", label: "Accessibility, cookies & contact" },
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
                    e.preventDefault();
                    if (hasChildren) {
                        setOpen((o) => !o);
                    }
                    // Push hash to history so back/forward works
                    window.history.pushState(null, "", `#${item.id}`);
                    const el = document.getElementById(item.id);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
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

const Figure = ({ src, alt, caption, openLightbox, maxWidth = "2xl" }) => {
    const isVideo = typeof src === "string" && /\.(mp4|webm|ogg)$/i.test(src);
    const resolvedMax = maxWidth === "xs" ? 280 : maxWidth === "sm" ? 380 : maxWidth === "md" ? 480 : 640;
    const mediaSx = {
        maxWidth: resolvedMax,
        width: "100%",
        mx: "auto",
        display: "block",
        borderRadius: 2.5,
        boxShadow: 2,
        cursor: "pointer",
        transition: "box-shadow 0.2s",
        "&:hover": { boxShadow: 6 },
    };

    return (
        <Box component="figure" sx={{ my: 3, mx: 0 }}>
            {isVideo ? (
                <Box
                    component="video"
                    src={src}
                    autoPlay
                    loop
                    muted
                    playsInline
                    onClick={() => openLightbox(src, alt)}
                    sx={mediaSx}
                />
            ) : (
                <Box
                    component="img"
                    src={src}
                    alt={alt}
                    onClick={() => openLightbox(src, alt)}
                    sx={mediaSx}
                />
            )}
            {caption && (
                <Typography variant="caption" display="block" align="center" sx={{ mt: 1, color: "text.secondary", maxWidth: 640, mx: "auto" }}>
                    {caption}
                </Typography>
            )}
        </Box>
    );
};

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

    /* ── hash-based history: scroll to anchor on back/forward ── */
    useEffect(() => {
        // On initial load, honour a hash already in the URL
        const initialHash = window.location.hash.replace("#", "");
        if (initialHash) {
            requestAnimationFrame(() => {
                const el = document.getElementById(initialHash);
                if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                    setActiveId(initialHash);
                }
            });
        }

        const onPopState = () => {
            const hash = window.location.hash.replace("#", "");
            if (hash) {
                const el = document.getElementById(hash);
                if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                    setActiveId(hash);
                }
            }
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, []);

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

    /**
     * Delegated click handler: intercept clicks on internal hash links
     * (href="#...") so we push proper history entries & scroll manually.
     * This makes the browser back/forward buttons work as expected.
     */
    const handleContentClick = useCallback((e) => {
        const anchor = e.target.closest('a[href^="#"]');
        if (!anchor) return;
        const hash = anchor.getAttribute("href");
        if (!hash || hash === "#") return;
        e.preventDefault();
        const id = hash.replace("#", "");
        window.history.pushState(null, "", hash);
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth" });
        setActiveId(id);
    }, []);

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
                onClick={handleContentClick}
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
                        Interactive web application for peptide design, editing and 3D conformer generation - supporting standard, non-standard, cyclic and branched peptides.
                    </Typography>

                    <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mb: 4 }}>
                        <Chip component="a" href="#quick-start" label="Quick start →" clickable size="small" color="primary" variant="outlined" />
                        <Chip component="a" href="#building-peptide" label="Build a peptide →" clickable size="small" color="primary" variant="outlined" />
                        <Chip component="a" href="#conformer-generation" label="Apply constraints →" clickable size="small" color="primary" variant="outlined" />
                    </Box>

                    <Divider sx={{ mb: 4 }} />

                    {/* ════════════════════════════════════════════
                        1 · GETTING STARTED
                       ════════════════════════════════════════════ */}

                    {/* ── Introduction ── */}
                    <SectionTitle id="introduction">Introduction</SectionTitle>

                    <P>
                        PEP-EDIT is an interactive web application for the easy and rapid editing and generation of peptide
                        representations in 1D (SMILES, BILN, HELM), 2D (SDF/MOL2) and 3D (PDB/SDF/XYZ).
                        Unlike <MUILink href="https://doi.org/10.1093/nar/gkad376" target="_blank" rel="noreferrer">PEP-FOLD</MUILink> or
                        other tools that predict peptide 3D structure from sequence alone, PEP-EDIT focuses on
                        <strong> building, editing and exporting</strong> peptide representations - including non-standard
                        monomers, cyclic and branched architectures - and provides conformer generation as a preparation utility,
                        not as a structure prediction method.
                    </P>

                    <InfoBox>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Core workflow</Typography>
                        <Ol>
                            <Li><strong>Define</strong> a peptide; type a BILN sequence or build from the monomer library (FASTA and HELM upload are also supported).</Li>
                            <Li><strong>Refine</strong>; apply constraints (secondary structure or 3D template), adjust pH, link chains.</Li>
                            <Li><strong>Generate & export</strong>; obtain 1D/2D/3D representations and download them.</Li>
                        </Ol>
                    </InfoBox>

                    <P>PEP-EDIT can:</P>
                    <Ul>
                        <Li>Build peptides from a BILN sequence, a FASTA upload, or interactively from the monomer library.</Li>
                        <Li>Edit existing structures - substitute, delete, or reorder monomers (drag-and-drop) - while preserving backbone topology.</Li>
                        <Li>Handle standard and non-standard monomers: D-amino acids, N-methylated residues, peptidomimetics, capping groups, lipid moieties or others.</Li>
                        <Li>Support linear, cyclic (head-to-tail, disulfide), branched, and multi-chain peptide architectures.</Li>
                        <Li>Apply conformational constraints - secondary-structure presets (H/E/-) or a 3D template from PDB/mmCIF.</Li>
                        <Li>Control protonation at a user-specified pH (default 7.4).</Li>
                        <Li>Export to 12 formats across 1D (BILN, HELM, SMILES, InChI), 2D (SDF), and 3D (PDB, mmCIF, XYZ, SDF, MOL2, PDBQT).</Li>
                        <Li>Manage personal and public monomer libraries with moderated contribution.</Li>
                        <Li>Handle constructs of up to 40 monomers.</Li>
                    </Ul>

                    <InfoBox color="info">
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>How to cite</Typography>
                        <P>
                            Chevrollier N, Dougha A, Ye C, Stratmann D, Moroy G, Rey J, Murail S & Tufféry P.
                            PEP-EDIT: an interactive web interface for the rapid generation and editing of complex peptides.
                            <em> (manuscript in preparation).</em>
                        </P>
                        <P>
                            URL:{" "}
                            <MUILink href="https://pep-edit.rpbs.univ-paris-diderot.fr" target="_blank" rel="noreferrer">
                                https://pep-edit.rpbs.univ-paris-diderot.fr
                            </MUILink>
                        </P>
                        <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                            Please also cite:{" "}
                            <MUILink href="https://doi.org/10.1186/s13321-023-00748-2" target="_blank" rel="noreferrer">pyPept</MUILink>{" · "}
                            <MUILink href="https://doi.org/10.1021/acs.jcim.2c00703" target="_blank" rel="noreferrer">BILN</MUILink>
                        </Typography>
                    </InfoBox>

                    <Divider sx={{ my: 4 }} />

                    {/* ── Quick start ── */}
                    <SectionTitle id="quick-start">Quick start: your first peptide in 20 seconds</SectionTitle>

                    <P>
                        Watch the full workflow - from an empty editor to a downloadable 3D conformer:
                    </P>

                    <Figure
                        src="/assets/documentation/gifs/quick-start-step1-3.gif"
                        alt="Full PEP-EDIT workflow: type a BILN sequence, generate 3D, export"
                        caption="From BILN input to 3D export in one take. The 2D Sketch, chain track, and 1D outputs update live as you type; clicking Generate 3D produces a conformer and unlocks all 3D export formats."
                        openLightbox={openLightbox}
                    />

                    <P><strong>What just happened:</strong></P>
                    <Ol>
                        <Li>A BILN sequence was typed in the editor; the 2D Sketch and 1D outputs (SMILES, HELM…) updated live with each keystroke.</Li>
                        <Li>The chain track populated with color-coded monomer pills.</Li>
                        <Li><strong>Generate 3D</strong> was clicked; a conformer job ran and the 3D viewer loaded the result. All 3D export formats (PDB, mmCIF, XYZ...) became available in the <strong>Output</strong> tab.</Li>
                    </Ol>

                    <P>
                        <strong>Try it yourself:</strong> type <code>ac-A-G-K-D-am</code> in the BILN editor,
                        or click <strong>Examples...</strong> to load one of the 15 pre-built peptides.
                    </P>

                    <Figure
                        src="/assets/documentation/gifs/quick-start-examples.gif"
                        alt="Clicking Examples... to load pre-built peptides"
                        caption={
                            <>
                                Click the <strong>Examples...</strong> dropdown in the editor toolbar to load any of the 15 pre-built peptides - including linear, cyclic, and branched architectures, with various non-standard monomers. This is a great way to explore the capabilities of PEP-EDIT and jumpstart your design.
                            </>
                        }
                        openLightbox={openLightbox}
                    />

                    <Sub2Title>What's next?</Sub2Title>
                    <Ul>
                        <Li>Load a pre-built example → click <strong>Examples…</strong> in the editor toolbar.</Li>
                        <Li>Build from the monomer library → see <MUILink href="#building-peptide">Building a peptide</MUILink>.</Li>
                        <Li>Apply constraints → see <MUILink href="#conformer-generation">Conformer generation</MUILink>.</Li>
                        <Li>Add custom monomers → see <MUILink href="#adding-monomers">Adding monomers to the library</MUILink>.</Li>
                    </Ul>

                    <Divider sx={{ my: 4 }} />

                    {/* ════════════════════════════════════════════
                        Interface overview
                       ════════════════════════════════════════════ */}

                    {/* ── Interface overview ── */}
                    <SectionTitle id="interface-overview">Interface overview</SectionTitle>

                    <P>
                        PEP-EDIT's interface is organized into four main areas, each serving a distinct role in the
                        peptide design workflow. The annotated screenshot below shows them at a glance — detailed
                        descriptions follow in the subsections below.
                    </P>

                    <Figure
                        src="/assets/documentation/pepedit_interface-overview_labeled.png"
                        alt="Annotated overview of the PEP-EDIT interface. Four numbered zones: (1) Editor interface at top-left, (2) 2D Sketch at bottom-left, (3) 3D viewer at bottom-right, (4) Right panel on the right side."
                        caption="The four main areas of PEP-EDIT: (1) Editor interface — BILN input, chain track & constraints; (2) 2D Sketch — interactive molecular depiction; (3) 3D viewer — Mol*-powered conformer visualization; (4) Right panel — monomer library, outputs & job history."
                        openLightbox={openLightbox}
                    />

                    <Ol>
                        <Li><strong><MUILink href="#editor-interface">Editor interface</MUILink></strong> (1 - top-left); where you define and edit your peptide. Contains the BILN text input, the editor toolbar, the chain track with monomer pills, and optional constraint tracks. Split into <MUILink href="#manual-edition">Manual edition</MUILink> and <MUILink href="#chains">Chains</MUILink>.</Li>
                        <Li><strong><MUILink href="#viewer-2d">2D Sketch</MUILink></strong> (2 - bottom-left); an interactive SVG depiction of the molecule, rendered by RDKit. Updates live as you type. Supports hover highlighting synced across all panels, as well as bond creation and removal.</Li>
                        <Li><strong><MUILink href="#viewer-3d">3D viewer</MUILink></strong> (3 - bottom-right); conformer visualization powered by <MUILink href="https://molstar.org" target="_blank" rel="noreferrer">Mol*</MUILink>. Includes controls for representation, color scheme, labels, camera, and screenshot export.</Li>
                        <Li><strong><MUILink href="#right-panel">Right panel</MUILink></strong> (4 - right side); a collapsible, resizable sidebar with three vertical tabs: Monomer Library, Outputs, and Jobs.</Li>
                    </Ol>

                    <P>
                        The top-left is where you <strong>define</strong> your peptide (BILN input, chain track, constraints).
                        The bottom half is where you <strong>see</strong> it (2D chemical structure on the left, 3D conformer on the right).
                        The right panel provides resources (monomer library), results (export formats), and history (job list).
                    </P>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        The header bar at the top provides navigation between the three main pages (<strong>Design peptide</strong>,{" "}
                        <strong>My monomers</strong>, <strong>Documentation</strong>), a theme toggle (light/dark), a contact access, and session management
                        controls (see <MUILink href="#sessions">Sessions</MUILink>).
                    </Alert>

                    {/* ── Editor interface ── */}
                    <SubTitle id="editor-interface">Editor interface</SubTitle>

                    <P>
                        The editor interface occupies the top-left of the screen.
                        It contains a <strong>shared toolbar</strong> at the top and two collapsible sections below it:{" "}
                        <strong>Manual edition</strong> (BILN text input) and <strong>Chains</strong> (visual
                        chain track, constraint rows, and chain-level actions).
                    </P>

                    {/* [MEDIA: annotated screenshot of the editor interface] */}
                    <Figure
                        src="/assets/documentation/pepedit_editor-interface.png"
                        alt="Editor interface showing the shared toolbar, Manual edition section, and Chains section"
                        caption="The editor interface: shared toolbar at top, then Manual edition and Chains sections; both are independently collapsible and their order can be swapped."
                        openLightbox={openLightbox}
                    />

                    <P><strong>Editor toolbar</strong></P>

                    <P>
                        The toolbar runs across the top of the editor interface, above both sections.
                        It provides quick access to editing tools and global settings.
                    </P>

                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 1.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Control</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Function</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell><Ic icon={SwapVertIcon} /> <strong>Swap sections</strong></TableCell>
                                    <TableCell>Swaps the vertical position of Manual edition and Chains. Useful on smaller screens: putting Chains on top lets you see the sequence track alongside the 2D Sketch without scrolling. The preference is saved across sessions.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Ic icon={PlayArrowIcon} /> <strong>Examples…</strong></TableCell>
                                    <TableCell>Opens a dialog with 15 pre-built examples across 6 categories (linear, cyclic, capped, non-natural amino acids, secondary structure constraints, 3D template constraints).</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Ic icon={DeviceHubIcon} /> <strong>Link mode</strong></TableCell>
                                    <TableCell>Toggle: activates bond-creation mode. Click two monomers in the chain track (or two R-groups in the 2D Sketch) to create a bond. A banner appears: "Link monomers — Select a second R-group to create the link." While active, Manual edition auto-collapses and Chains auto-detaches to maximize the 2D Sketch area (see <MUILink href="#chains">detach mode</MUILink>).</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Ic icon={LinkOffIcon} /> <strong>Cut mode</strong></TableCell>
                                    <TableCell>Toggle: activates bond-removal mode. Click an existing bond to remove it. Same auto-collapse/auto-detach behavior as Link mode. Only one of Link/Cut can be active at a time.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><strong>pH slider</strong></TableCell>
                                    <TableCell>Adjusts the target pH for protonation (range 0–14, default 7.4). Changes update protonation states and SMILES/InChI outputs immediately. Protonation states also reflect in the 3D structure.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Ic icon={UndoIcon} /> <strong>Undo</strong> / <Ic icon={RedoIcon} /> <strong>Redo</strong></TableCell>
                                    <TableCell>Undo or redo the last editor action (up to 20 steps). Covers all editor operations (add, delete, reorder, link, constraint changes). Note: Ctrl+Z only works inside the BILN text field (native browser undo) — use the toolbar buttons for chain track operations.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Ic icon={UploadIcon} /> <strong>Upload sequence</strong></TableCell>
                                    <TableCell>Opens an upload dialog to populate the editor from a different notation. See the <MUILink href="#manual-edition">Upload sequence dialog</MUILink> section below.</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* [GIF: swap sections animation — clicking the swap icon to move Chains above Manual edition and back] */}
                    {/* <Figure
                        src="/assets/documentation/pepedit_swap-sections.gif"
                        alt="Animated demonstration of the swap sections button toggling Manual edition and Chains order"
                        caption="Swapping sections: click the ↕ icon to move Chains above Manual edition (or vice versa) for better visibility on compact screens."
                        openLightbox={openLightbox}
                    /> */}

                    {/* ── Manual edition ── */}
                    <Sub2Title id="manual-edition">Manual edition</Sub2Title>

                    <P>
                        The Manual edition section contains the BILN text input field.
                        It can be collapsed by clicking its header. A <Ic icon={QuestionMarkSharpIcon} /> help icon next to the header
                        opens the <em>"Manual edit (BILN) help"</em> dialog — a comprehensive quick-reference covering
                        BILN syntax, R-group rules, and common sequence examples.
                    </P>

                    <P><strong>BILN input field</strong></P>

                    <P>
                        A live text field for typing or pasting BILN sequences directly. Changes are applied on every
                        keystroke — no Enter or Apply button is needed. The 2D Sketch and 1D outputs (SMILES, HELM…)
                        update as soon as the BILN is syntactically complete (no trailing hyphen, unbalanced parentheses,
                        or unrecognized symbol). Incomplete intermediate states are held silently until the input becomes valid.
                    </P>

                    <P>
                        A monomer counter is displayed below the field (e.g. "6/40 monomers"), showing the current count
                        against the maximum of 40.
                    </P>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        <P sx={{ mb: 1 }}><strong>Validation feedback</strong></P>
                        <Ul>
                            <Li><strong>Unrecognized monomer</strong> — a red error message appears next to the monomer counter below the BILN input field.</Li>
                            <Li><strong>Exceeds 40 monomers</strong> — a red border on the input field with a "Maximum length reached" caption and a confirmation dialog.</Li>
                            <Li><strong>Incomplete syntax</strong> (mid-typing) — no error; views remain at the last valid state.</Li>
                        </Ul>
                    </Alert>

                    {/* [GIF: Interactive edition animation with error message — BILN edition updates 2D sketch and validation feedback is illustrated from incorrect monomer input] */}
                    <Figure
                        src="/assets/documentation/gifs/pepedit_manual-edition_error_cropped.gif"
                        alt="Animated demonstration of BILN manual edition with validation feedback: typing an invalid monomer triggers an error message"
                        caption="BILN manual edition with validation feedback: as you type, the 2D Sketch updates when the input is valid; typing an unrecognized monomer triggers an error message below the input field."
                        openLightbox={openLightbox}
                    />

                    <P><strong>Upload sequence dialog</strong></P>

                    <P>
                        Accessible from the <Ic icon={UploadIcon} /> <strong>Upload sequence</strong> button in the section header.
                        This dialog lets you populate the editor from an alternative notation instead of typing BILN manually.
                    </P>

                    <Ul>
                        <Li><strong>FASTA mode</strong> (default) — paste one sequence per line (up to 10 lines). Only the standard 20 one-letter amino acid codes are accepted (A, R, N, D, C, Q, E, G, H, I, L, K, M, F, P, S, T, W, Y, V). Each valid line becomes a separate chain, joined by "." in the resulting BILN.</Li>
                        <Li><strong>HELM mode</strong> — paste a HELM string. Conversion to BILN is handled server-side.</Li>
                    </Ul>

                    <P>
                        Select the input format via the radio buttons at the top, paste your sequence into the text area,
                        then click <strong>Apply</strong>. An error message is displayed inline if the input is invalid.
                    </P>

                    {/* [GIF: upload sequence dialog — switching between FASTA and HELM modes and applying a FASTA sequence] */}
                    <Figure
                        src="/assets/documentation/gifs/pepedit_upload-sequence.gif"
                        alt="Animated demonstration of the Upload Sequence dialog: selecting FASTA mode, pasting a sequence, and clicking Apply. Same process for HELM mode."
                        caption="The Upload Sequence dialog: choose FASTA or HELM format, paste your sequence, and click Apply to populate the editor. Chains are separated by newlines in FASTA and converted to BILN with '.' separators."
                        openLightbox={openLightbox}
                    />

                    {/* ── Chains ── */}
                    <Sub2Title id="chains">Chains</Sub2Title>

                    <P>
                        The Chains section displays a visual representation of each chain in your peptide.
                        It can be collapsed by clicking its header. A <Ic icon={QuestionMarkSharpIcon} /> help icon next to the header
                        opens the <em>"Working with chains"</em> dialog — a reference covering chain management,
                        constraint modes, sequence track interactions, and color coding.
                    </P>

                    {/* [MEDIA: annotated screenshot of chain track area] */}
                    <Figure
                        src="/assets/documentation/gifs/pepedit_chain-track_example.gif"
                        alt="Chains section showing sequence row with colored monomer pills, constraint track, and chain-level actions"
                        caption="The Chains section: each chain has a Sequence row (colored monomer pills), an optional constraint track, and a ⋮ menu for chain-level actions."
                        openLightbox={openLightbox}
                    />

                    <P>
                        Each chain is displayed as a Sequence row — a horizontal strip of colored monomer pills.
                        Each pill shows the monomer symbol and its position number in the chain.
                    </P>

                    <P>Color coding:</P>
                    <Ul>
                        <Li><strong>Green</strong> — natural amino acids.</Li>
                        <Li><strong>Orange</strong> — non-natural / modified monomers.</Li>
                        <Li><strong>Gray</strong> — capping groups.</Li>
                    </Ul>

                    <P>Interactions:</P>
                    <Ul>
                        <Li><strong>Hover</strong> over a pill — reveals Replace, Info, and Delete action icons, and synchronizes highlighting with the 2D Sketch and 3D viewer.</Li>
                        <Li><strong>Drag-and-drop</strong> — reorder monomers within or across chains. Invalid moves (R-group conflicts, cap placement violations) are rejected with an explanatory dialog. Capping groups cannot be dragged.</Li>
                        <Li><strong>Bond indicators</strong> — colored dots on pills indicate non-backbone bonds (e.g. disulfide bridges, side-chain links).</Li>
                    </Ul>

                    <P>Each Sequence row has a ⋮ menu on the left side with:</P>
                    <Ul>
                        <Li><strong>Clear</strong> — remove all monomers from the chain.</Li>
                        <Li><strong>Cyclize / Uncyclize</strong> — create or remove a head-to-tail bond (R1 of first residue ↔ R2 of last residue).</Li>
                        <Li><strong>Mirror</strong> — swap all L-amino acids ↔ D-amino acids in the chain.</Li>
                        <Li><strong>Delete chain</strong> — remove the entire chain.</Li>
                    </Ul>

                    <P><strong>Constraint track</strong></P>

                    <Figure 
                        src="/assets/documentation/pepedit_chain_constraint-modes.png"
                        alt="Constraint track showing secondary structure buttons and 3D template mapping"
                        caption="The Constraint track: displays per-residue buttons for secondary structure or a template mapping row for 3D templates."
                        openLightbox={openLightbox}
                    />

                    <P>
                        When a constraint mode is active, a second row appears below the Sequence row. The constraint mode
                        is selected via the <strong>Structural constraints…</strong> dropdown button (located to the right
                        of the Chains header):
                    </P>

                    <Ul>
                        <Li><strong>None</strong> — no constraints. Only the Sequence row is visible.</Li>
                        <Li><strong>Secondary structure</strong> — a per-residue row of buttons: <strong>H</strong> (helix), <strong>E</strong> (strand), or <strong>−</strong> (coil). Use the ⋮ menu for bulk operations (All alpha, All beta, All random, Clear).</Li>
                        <Li><strong>3D template</strong> — a template mapping row showing the scaffold residues loaded from a PDB/mmCIF file. Each residue maps to a position in the Sequence row above it.</Li>
                    </Ul>

                    <P><strong>Adding chains</strong></P>

                    <P>
                        Click the <strong>+</strong> button (next to Structural constraints…) to add a new chain.
                        Chains are separated by "." in the BILN string. Each chain has its own Sequence and constraint rows.
                    </P>

                    <P><strong>Detach mode</strong></P>

                    {/* [GIF: detach mode — clicking detach, dragging the floating panel, then reattaching] */}
                    <Figure
                        src="/assets/documentation/gifs/pepedit_chains-detach.gif"
                        alt="Animated demonstration of the Chains detach mode: detaching, dragging the floating panel around, and reattaching"
                        caption="Detach mode: pop the Chains section into a floating panel for more editing space, then reattach when done."
                        openLightbox={openLightbox}
                    />

                    <P>
                        On smaller screens, the Chains section can take up valuable vertical space.
                        Click the <Ic icon={OpenInNewIcon} /> <strong>detach</strong> button next to the Chains header to pop the section out into
                        a <strong>floating panel</strong>. The floating panel:
                    </P>

                    <Ul>
                        <Li>Is <strong>draggable</strong> — grab its title bar to move it anywhere on screen.</Li>
                        <Li>Is <strong>resizable</strong> — drag the bottom-right corner to adjust its dimensions.</Li>
                        <Li>Is <strong>non-blocking</strong> — you can still interact with the editor, 2D Sketch, and other panels behind it.</Li>
                        <Li>Shows <strong>"Chains (detached)"</strong> in the title bar with a <Ic icon={VerticalAlignBottomIcon} /> <strong>reattach</strong> button to snap it back inline.</Li>
                    </Ul>

                    <P>
                        While detached, the inline area shows a placeholder message:
                        <em>"Chains detached — click <Ic icon={VerticalAlignBottomIcon} /> to reattach."</em>
                    </P>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        <strong>Auto-detach during Link / Cut mode:</strong> when you activate Link or Cut mode in the toolbar,
                        the Manual edition section auto-collapses and Chains auto-detaches to maximize the 2D Sketch area. When
                        you exit the mode, both sections return to their previous state automatically.
                    </Alert>

                    {/* ── 2D viewer ── */}
                    <SubTitle id="viewer-2d">2D viewer (2D Sketch)</SubTitle>

                    <P>
                        The 2D Sketch displays an interactive SVG depiction of the molecule,
                        rendered by RDKit. It updates automatically whenever the BILN input is valid.
                    </P>

                    {/* [MEDIA: annotated screenshot of the 2D viewer] */}
                    <Figure
                        src="/assets/documentation/pepedit_2d-sketch.png"
                        alt="2D Sketch panel with toolbar and monomer hover tooltip"
                        caption="The 2D Sketch: interactive molecular depiction with Link, Unlink, Reset View, and Download SVG toolbar buttons. Hovering a monomer shows details in the bottom-right corner."
                        openLightbox={openLightbox}
                        maxWidth="md"
                    />

                    <P><strong>Toolbar</strong> (top-right of the 2D Sketch panel):</P>

                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 1.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Icon</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Tooltip</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Function</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell><Ic icon={DeviceHubIcon} /></TableCell>
                                    <TableCell>Link</TableCell>
                                    <TableCell>Toggle link mode — click R-groups on monomers to create a bond.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Ic icon={LinkOffIcon} /></TableCell>
                                    <TableCell>Unlink</TableCell>
                                    <TableCell>Toggle cut mode — double-click an existing bond to remove it.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Ic icon={RestartAltIcon} /></TableCell>
                                    <TableCell>Reset View</TableCell>
                                    <TableCell>Reset any zoom/pan back to the default fitted view.</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell><Ic icon={DownloadIcon} /></TableCell>
                                    <TableCell>Download SVG</TableCell>
                                    <TableCell>Download the current 2D depiction as <code>pep-edit_2d.svg</code>.</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <P><strong>Navigation:</strong></P>
                    <Ul>
                        <Li><strong>Scroll wheel</strong> — zoom in/out.</Li>
                        <Li><strong>Click + drag</strong> — pan the view.</Li>
                        <Li><strong>Double-click</strong> (or Reset View button) — reset to the default fitted view.</Li>
                    </Ul>

                    <P><strong>Hover synchronization:</strong></P>
                    <P>
                        Mousing over a monomer in the 2D Sketch highlights it simultaneously in the chain track 
                        and the 3D viewer. A tooltip in the bottom-right corner shows monomer details — for
                        example: "A DIJ 5 / dI / D-Isoleucine" (chain letter, PDB code, position, BILN symbol, full name).
                    </P>
                    <P>
                        Clicking a monomer has no effect in normal mode. Click interactions only activate when
                        Link or Unlink mode is on.
                    </P>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        A collapse/expand toggle (<strong>&lt;</strong> / <strong>&gt;</strong>) between the 2D Sketch and 3D viewer
                        allows you to expand either panel to full width.
                    </Alert>

                    {/* ── 3D viewer ── */}
                    <SubTitle id="viewer-3d">3D viewer</SubTitle>

                    <P>
                        The 3D viewer displays the generated conformer using{" "}
                        <MUILink href="https://molstar.org" target="_blank" rel="noreferrer">Mol*</MUILink>.
                        It loads automatically when a conformer generation job completes.
                    </P>

                    <Figure
                        src="/assets/documentation/pepedit_3d-viewer_representation-panel.png"
                        alt="3D viewer with the Representation side panel open, showing toggles for Cartoon, Ball & Stick, Spacefill, Backbone, Licorice, Ribbon, Line (with opacity slider), Molecular Surface, Gaussian Surface, Gaussian Volume, and Putty."
                        caption="The 3D viewer with the Representation panel open. Multiple representations can be active simultaneously."
                        openLightbox={openLightbox}
                        maxWidth="md"
                    />

                    <P><strong>Main controls</strong> (top-left of the 3D viewer):</P>
                    <Ul>
                        <Li><strong>▶ Generate 3D</strong> — submit a conformer generation job manually.</Li>
                        <Li><strong>Auto sync</strong> — toggle live 3D regeneration. ON by default for peptides with fewer than 8 monomers; automatically disabled at 8+ monomers (with a toast notification) or when a 3D template is active.</Li>
                    </Ul>

                    <P><strong>Icon toolbar</strong> (top-right, left to right):</P>

                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 1.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
                                    <TableCell sx={{ fontWeight: 700, width: 80 }}>Icon</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Tooltip</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Function</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow><TableCell><Ic icon={CategoryIcon} /></TableCell><TableCell>Representation</TableCell><TableCell>Opens a side panel with toggles for visual styles: Cartoon, Ball & Stick, Spacefill, Backbone, Licorice, Ribbon, Line (with opacity slider), Molecular Surface, Gaussian Surface, Gaussian Volume, Putty. Multiple can be active simultaneously.</TableCell></TableRow>
                                <TableRow><TableCell><Ic icon={PaletteIcon} /></TableCell><TableCell>Color by</TableCell><TableCell>Opens a side panel to choose a color scheme (by element, chain, residue type…).</TableCell></TableRow>
                                <TableRow><TableCell><Ic icon={LabelIcon} /></TableCell><TableCell>Labels</TableCell><TableCell>Opens a side panel to toggle atom or residue labels on the structure.</TableCell></TableRow>
                                <TableRow><TableCell><Ic icon={LightModeIcon} /> / <Ic icon={DarkModeIcon} /></TableCell><TableCell>Background</TableCell><TableCell>Toggles the Mol* canvas between dark and light background.</TableCell></TableRow>
                                <TableRow><TableCell><Ic icon={RestartAltIcon} /></TableCell><TableCell>View / Reset</TableCell><TableCell>Resets the camera to the default orientation (available via the <Ic icon={MoreVertIcon} /> overflow menu).</TableCell></TableRow>
                                <TableRow><TableCell><Ic icon={LayersIcon} /></TableCell><TableCell>Template</TableCell><TableCell>Opens the scaffold template management panel. Icon is tinted when a template is loaded.</TableCell></TableRow>
                                <TableRow><TableCell><Ic icon={PhotoCameraIcon} /></TableCell><TableCell>Snapshot</TableCell><TableCell>Downloads a PNG screenshot of the current 3D viewport (available via the <Ic icon={MoreVertIcon} /> overflow menu).</TableCell></TableRow>
                                <TableRow><TableCell><Ic icon={SubjectIcon} /></TableCell><TableCell>Log</TableCell><TableCell>Opens a side panel showing the conformer generation job log (available via the <Ic icon={MoreVertIcon} /> overflow menu).</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <P><strong>3D navigation:</strong></P>
                    <Ul>
                        <Li><strong>Left-click + drag</strong> — rotate the structure.</Li>
                        <Li><strong>Scroll wheel</strong> — zoom in/out.</Li>
                        <Li><strong>Right-click + drag</strong> (or middle-click) — pan.</Li>
                    </Ul>

                    <P>
                        Mol*'s built-in advanced controls are accessible via the "Show panels" tab on the right edge of the
                        3D viewer (arrow icon: <strong>&gt;</strong>), providing structure annotations, measurements, and more.
                    </P>

                    {/* ── Right panel ── */}
                    <SubTitle id="right-panel">Right panel (Library / Output / Jobs)</SubTitle>

                    <P>
                        The right panel (zone ④) is a collapsible, resizable sidebar with three vertical tabs along its
                        right edge. Click a tab to switch between views; drag the panel's left edge to resize it.
                    </P>

                    <CardGrid>
                        <Card title="Monomer Library">
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
                                Searchable catalog of 331 monomers (as of v1.0.0). Use the search bar and class filters
                                (<strong>ALL</strong>, <strong>CAPS</strong>, <strong>NATURAL</strong>, <strong>NON-NATURAL</strong>)
                                to find monomers. Click the <strong>+</strong> button on a monomer card to add it to your sequence.
                            </Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7, mt: 1 }}>
                                The <strong>Linking process mode</strong> section at the top controls how monomers are added:
                            </Typography>
                            <Ul>
                                <Li><strong>Mode:</strong> Append (end of chain), Prepend (start of chain), or New chain.</Li>
                                <Li><strong>Chain:</strong> select which chain to add to (for multi-chain peptides).</Li>
                            </Ul>
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
                                Card size can be toggled between <strong>Small</strong> and <strong>Large</strong> using
                                the buttons in the panel header. Each card shows the monomer structure, symbol, PDB code,
                                and type label.
                            </Typography>
                        </Card>
                        <Card title="Outputs">
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 1 }}>
                                Displays all computed output formats, organized into three sections:
                            </Typography>
                            <Ul>
                                <Li><strong>1D — Sequences & Notations</strong> (5): BILN, HELM, SMILES, InChI, InChIKey</Li>
                                <Li><strong>2D — Depiction & Coordinates</strong> (1): SDF 2D + Export depiction (SVG, PNG)</Li>
                                <Li><strong>3D — Structures</strong> (6): PDB, MMCIF, XYZ, SDF 3D, MOL2 Tripos, PDBQT + Export snapshot (PNG)</Li>
                            </Ul>
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
                                Each format row has <strong>Copy</strong> and <strong>Download</strong> buttons.
                                Panel controls: <strong>Wrap</strong> (wraps long text like SMILES for readability),{" "}
                                <strong>Expand</strong> (opens all accordion sections), and a <strong>Download all</strong> button
                                (blue icon, top-right). 1D and 2D formats update live on every valid keystroke. 3D formats
                                require a successful conformer generation job.
                            </Typography>
                        </Card>
                    </CardGrid>
                    <CardGrid>
                        <Card title="Jobs">
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 1 }}>
                                Lists all conformer generation jobs submitted in the current session. The table shows four
                                columns: <strong>Name</strong>, <strong>BILN</strong>, <strong>State</strong>, and <strong>Action</strong>.
                            </Typography>
                            <Ul>
                                <Li><strong>Name</strong> — defaults to "Untitled job". Editable via the ⋮ menu → Edit details (name up to 200 characters, description up to 2000 characters). The dialog also shows read-only metadata: Job ID, creation and update timestamps.</Li>
                                <Li><strong>State</strong> — green "success" chip or red "failed" chip. Failed jobs show "—" in the BILN column.</Li>
                                <Li><strong>Resume</strong> — restores <em>everything</em>: the BILN sequence, all constraints (secondary structure or template with scaffold mappings), and loads the 3D conformer into the viewer. Auto-sync is suppressed to prevent re-triggering a new job. Disabled for failed jobs.</Li>
                                <Li><strong>⋮ menu</strong> → <em>Edit details</em> (rename/describe) and <em>Copy BILN</em> (copies the job's BILN string to the clipboard).</Li>
                            </Ul>
                            <Figure
                                src="/assets/documentation/pepedit_jobs_edit-details.png"
                                alt="Edit Job Details dialog showing Name and Description fields, plus read-only Job ID and timestamps."
                                caption="The Edit Job Details dialog: set a name and description for each job."
                                openLightbox={openLightbox}
                                maxWidth="sm"
                            />
                        </Card>
                    </CardGrid>

                    <Divider sx={{ my: 4 }} />

                    {/* ════════════════════════════════════════════
                        Sessions (top-level)
                       ════════════════════════════════════════════ */}
                    <SectionTitle id="sessions">Sessions</SectionTitle>

                    <P>
                        A <strong>Session ID</strong> ties together your personal monomers, conformer jobs, and editor state.
                        No account or login is required — the session is anonymous and identified only by its unique ID.
                    </P>

                    <Sub2Title>How a session is created</Sub2Title>

                    <Ol>
                        <Li><strong>First visit:</strong> a Session ID is automatically generated and stored in your browser (localStorage) and on the server.</Li>
                        <Li><strong>Subsequent visits:</strong> the stored Session ID is reloaded automatically so your work is restored.</Li>
                        <Li><strong>New session:</strong> click the <strong>+</strong> button in the header to create a fresh session. A confirmation dialog reminds you to save your current Session ID before switching.</Li>
                    </Ol>

                    <Sub2Title>What a session contains</Sub2Title>
                    <Ul>
                        <Li><strong>Personal monomers</strong> — custom monomers you created or uploaded in <em>My monomers</em>.</Li>
                        <Li><strong>Conformer generation jobs</strong> — every 3D job submitted under this session, accessible from the Jobs tab.</Li>
                    </Ul>

                    <Sub2Title>Naming a session</Sub2Title>
                    <P>
                        You can give a session a human-readable name (e.g. <em>"Therapeutic peptides"</em>) and a short description.
                        Click the session name in the header to edit it inline, or open Session → <strong>Email</strong> tab → "Session notes".
                    </P>

                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Sessions are automatically deleted after <strong>1 month of inactivity</strong>. Each visit refreshes the expiration timer.
                    </Alert>

                    <Sub2Title>Session dialog (Share / Recover / Email)</Sub2Title>
                    <P>Click the <strong>⚙ Session</strong> button in the header to open the Session Management dialog with three tabs:</P>

                    <CardGrid>
                        <Card title="Share">
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 1 }}>
                                Send a Session ID by email. The recipient can load and collaborate on the session.
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

                    {/* ════════════════════════════════════════════
                        Key concepts
                       ════════════════════════════════════════════ */}
                    <SectionTitle id="key-concepts">Key concepts</SectionTitle>

                    {/* ── BILN notation ── */}
                    <SubTitle id="biln-notation">BILN notation</SubTitle>

                    <P>
                        BILN (Boehringer Ingelheim Line Notation) represents a peptide as monomers and connections. In its explicit
                        form, each monomer can carry one or more connection pairs <code>(bondId, RgroupId)</code>. The BILN rules are:
                        monomers separated by dots, connections defined by integer pairs, and a hyphen shorthand when connecting
                        R2→R1 along the backbone.
                    </P>

                    <P>Examples:</P>
                    <Ul>
                        <Li>Explicit backbone connections: <code>A(1,2).G(1,1)(2,2).C(2,1)</code></Li>
                        <Li>Shorthand for linear peptide: <code>P-E-P-T-I-D-E</code></Li>
                        <Li>Multi-chain (dot separator): <code>A-G-K(1,3)-D.ac(1,2)</code></Li>
                    </Ul>

                    <P>
                        If a monomer abbreviation contains a hyphen, BILN requires brackets for disambiguation
                        (e.g. <code>A-[2-Cl-Phe]-C</code>). PEP-EDIT avoids this by using underscores (<code>_</code>) in such
                        monomer names.
                    </P>

                    <P>
                        In practice, BILN describes a peptide as an ordered list of monomers plus explicit connections between
                        their attachment points (R-groups). The convention is <strong>R1 = backbone N</strong> and{" "}
                        <strong>R2 = backbone carbonyl C</strong> for amino acids (N→C reading order).
                    </P>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        For a complete syntax reference, see the{" "}
                        <MUILink href="#biln-quick-ref">BILN quick reference</MUILink> table.
                    </Alert>

                    {/* ── Monomers, R-groups & leaving groups ── */}
                    <SubTitle id="monomers-rgroups">Monomers, R-groups & leaving groups</SubTitle>

                    {/* [MEDIA: annotated monomer diagram showing R-groups] */}
                    <Figure
                        src="/assets/documentation/Monomer6.png"
                        alt="Monomer with labeled R-groups"
                        caption="Example monomer with labeled R-groups (R1, R2). Each monomer has a name, BILN symbol, and a 3-letter PDB identifier."
                        openLightbox={openLightbox}
                        maxWidth="xs"
                    />

                    <P>
                        A <strong>monomer</strong> is the basic building block in PEP-EDIT - an amino acid, cap, or chemical moiety.
                        Each monomer has <strong>attachment points</strong> (R-groups) that define where it can connect to other monomers.
                    </P>

                    <Ul>
                        <Li><strong>R1</strong> - typically the backbone nitrogen (N-terminus side).</Li>
                        <Li><strong>R2</strong> - typically the backbone carbonyl carbon (C-terminus side).</Li>
                        <Li><strong>R3, R4…</strong> - side chains, branching points, or specific chemical modifications.</Li>
                    </Ul>

                    <P>
                        A monomer with only one R-group acts as a <strong>capping group</strong> (e.g. acetyl = N-cap, amide = C-cap).
                        A monomer with three or more R-groups can serve as a <strong>branching or cyclization site</strong>.
                    </P>

                    <P>
                        Each R-group has an associated <strong>leaving group</strong> (H or OH). If an R-group is not used in a
                        connection, it is replaced by its leaving group in the final structure.
                    </P>

                    <Sub2Title>Monomer categories in the chain track</Sub2Title>

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

                    {/* ── PEP-EDIT vs pyPept ── */}
                    <SubTitle id="pepedit-vs-pypept">PEP-EDIT vs pyPept</SubTitle>

                    <P>
                        PEP-EDIT is built upon <strong>pyPept</strong>, a Python toolkit for peptide representation and conversion,
                        which itself relies on the <strong>BILN</strong> notation (Boehringer Ingelheim Line Notation).
                    </P>

                    <Ul>
                        <Li>
                            pyPept paper:{" "}
                            <MUILink href="https://link.springer.com/article/10.1186/s13321-023-00748-2" target="_blank" rel="noreferrer">
                                Springer - J Cheminform (2023)
                            </MUILink>
                        </Li>
                        <Li>
                            BILN paper:{" "}
                            <MUILink href="https://pubs.acs.org/doi/10.1021/acs.jcim.2c00703" target="_blank" rel="noreferrer">
                                ACS - J Chem Inf Model (2022)
                            </MUILink>
                        </Li>
                    </Ul>

                    <P>
                        PEP-EDIT relies on pyPept, but uses a modified version with several changes to support
                        an interactive web workflow and structure-aware peptide design:
                    </P>

                    <Ul>
                        <Li><strong>Web interface:</strong> PEP-EDIT provides a web access to complex peptide modeling using an enhanced interface to pyPept.</Li>
                        <Li><strong>Monomer storage:</strong> monomer metadata is stored in a MongoDB database (instead of CSV files) to enable richer querying, editing and moderation workflows. This supports both public and user-specific monomer libraries, as well as facilities to migrate monomers to the public library in a moderated mode.</Li>
                        <Li><strong>Monomer naming:</strong> monomers containing the hyphen character (<code>-</code>) are renamed using underscores (<code>_</code>) to avoid conflicts with BILN's hyphen shorthand for backbone connections.</Li>
                        <Li><strong>Conformer generation with structural constraints:</strong> PEP-EDIT can generate 3D conformers from secondary-structure presets or PDB template constraints.</Li>
                        <Li><strong>PDB atom naming fixes:</strong> atom names were corrected for some amino acids to improve downstream compatibility (visualization, tooling, MD pipelines).</Li>
                        <Li><strong>Interactive 2D SVG:</strong> the RDKit 2D sketch SVG is post-processed to expose interactive elements (monomers, R-groups, extra bonds) so the UI can attach JS-driven interactions.</Li>
                        <Li><strong>pH-aware protonation:</strong> final molecules include protonation predicted from the peptide-derived SMILES using Dimorphite-DL (default pH 7.4).</Li>
                    </Ul>

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
                        <Li><strong>Secondary structure constraints (2D)</strong> - per-residue backbone angle presets (H / E / -).</Li>
                        <Li><strong>3D template constraints</strong> - backbone coordinate constraints from a PDB/mmCIF structure.</Li>
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
                                <TableRow><TableCell><code><strong>-</strong></code></TableCell><TableCell>Random / coil</TableCell><TableCell>No structural preference - free to adopt any conformation.</TableCell></TableRow>
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
                        <Li><strong>BILN sequence</strong> - each chain is separated by a "." in the combined BILN string.</Li>
                        <Li><strong>Constraints</strong> - each chain has its own secondary-structure or 3D-template constraint track.</Li>
                        <Li><strong>Viewers</strong> - the 2D and 3D viewers update to reflect all chains.</Li>
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
                        <Li><strong>Append</strong> - adds the monomer at the C-terminus (end) of the active chain.</Li>
                        <Li><strong>Prepend</strong> - inserts the monomer at the N-terminus (beginning) of the active chain.</Li>
                        <Li><strong>New chain</strong> - starts a brand-new chain (default when the editor is empty).</Li>
                    </Ul>

                    <Sub2Title>Linking mode</Sub2Title>
                    <P>The linking mode controls which bond is formed when the monomer is placed:</P>
                    <Ul>
                        <Li><strong>Peptide</strong> - automatic peptide bond (R2→R1, standard backbone connection).</Li>
                        <Li><strong>R3→R1, R3→R2, R3→R3</strong> - explicit R-group connections for non-standard attachments.</Li>
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
                        <Li><strong>BILN connectivity</strong> - write explicit bond annotations in the BILN sequence, using <code>(bondId, RgroupId)</code> pairs.</Li>
                        <Li><strong>Link mode</strong> - activate the Link tool (chain icon in the editor toolbar), then click two compatible R-groups in the 2D viewer to create a bond.</Li>
                    </Ul>
                    <P>
                        To remove a bond, activate the <strong>Cut mode</strong> (scissors icon) and click a non-backbone bond in the 2D viewer.
                    </P>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        Extra bonds are flexible by design - PEP-EDIT does not automatically validate whether a given link is
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
                                <Li>Paste a valid SMILES - the molecule renders live</Li>
                                <Li>Click bonds to define attachment points; pick the core fragment</Li>
                                <Li>Fill in metadata (Symbol, PDB, type…); review stereochemistry</Li>
                                <Li>Validate the generated molblock and save</Li>
                            </Ol>
                        </Card>
                        <Card title="Import SDF">
                            <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 1 }}>
                                Import monomers from a pepedit-compatible SDF file - useful for sharing, restoring, or bulk-loading monomers.
                            </Typography>
                            <Ol>
                                <Li>My monomers → <strong>Import SDF</strong></Li>
                                <Li>Choose a <code>.sdf</code> file and upload</Li>
                                <Li>The monomers become available in the library immediately</Li>
                            </Ol>
                        </Card>
                    </CardGrid>

                    <Sub2Title>Create a monomer - step-by-step walkthrough</Sub2Title>

                    <P>
                        The wizard transforms a SMILES string into a validated SDF monomer record containing a molecular core, explicit
                        attachment points (R1–R4), leaving groups, stereochemistry assignments, and the metadata required for BILN integration.
                    </P>

                    {/* Step 1 */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>Step 1 - Choose a molecule (SMILES input)</Typography>
                    <P>
                        Paste a valid SMILES string into the input field. A live 2D depiction appears as you type.
                        Click <strong>Next</strong> once the preview matches the molecule you intend to register.
                    </P>
                    <Figure
                        src="/assets/documentation/create-monomer_step1_smiles.png"
                        alt="Step 1 - SMILES input"
                        caption="Step 1 - SMILES input field with live 2D preview. The example shows N-methyl-alanine."
                        openLightbox={openLightbox}
                    />

                    {/* Step 2 */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>Step 2 - Define attachment points</Typography>
                    <P>
                        Click bonds in the 2D depiction to select cleavage sites. At least one bond must be selected.
                        For amino-acid-like monomers: cut the N-terminal bond (→ R1) and C-terminal bond (→ R2).
                        A capping group needs only one bond cut.
                    </P>
                    <P>
                        After bond selection, the molecule is split into fragments displayed in a carousel. Click a card to select
                        the core fragment - PEP-EDIT automatically pre-fills metadata fields based on the chosen fragment.
                    </P>
                    <Figure
                        src="/assets/documentation/create-monomer_step2_attachment-points.png"
                        alt="Step 2 - Attachment points"
                        caption="Step 2 - Bond selection and core fragment carousel."
                        openLightbox={openLightbox}
                    />

                    {/* Step 3 */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>Step 3 - Fill in monomer metadata</Typography>
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
                        alt="Step 3 - Metadata form"
                        caption="Step 3 - Monomer metadata form with auto-filled fields."
                        openLightbox={openLightbox}
                    />

                    {/* Step 4 */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>Step 4 - Review stereochemistry</Typography>
                    <P>
                        If the fragment contains stereocenters, this step lets you review and modify their configuration (R/S).
                        Stereocenters are highlighted in the 2D depiction. You may override assignments if necessary.
                    </P>
                    <Figure
                        src="/assets/documentation/create-monomer_step4_stereochemistry.png"
                        alt="Step 4 - Stereochemistry"
                        caption="Step 4 - Stereochemistry review and override."
                        openLightbox={openLightbox}
                    />

                    {/* Step 5 */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>Step 5 - Validate and complete</Typography>
                    <P>
                        The wizard generates the complete SDF monomer record. The molblock appears in an editable text area.
                        Click <strong>Finish</strong>; the server runs structural integrity, field consistency, and functional
                        monomer validation checks. If all pass, the monomer is saved to your personal library.
                    </P>
                    <Figure
                        src="/assets/documentation/create-monomer_step5_review-sdf.png"
                        alt="Step 5 - Validation"
                        caption="Step 5 - Validation checks and completion."
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
                        For instance, orbitide xanthoxycyclin D:
                    </P>
                    <CodeBlock>G(1,1)-T-V-A-V-Q-F-L(1,2)</CodeBlock>

                    <P>
                        Using this XYZ as input for ORCA's global optimizer allows exploration of various conformations.
                        Scripts for input preparation are available{" "}
                        <MUILink href="https://github.com/alexisdougha/goat-pep" target="_blank" rel="noreferrer">here</MUILink>.
                    </P>

                    <Figure
                        src="/assets/documentation/6wpv_doc.jpg"
                        alt="Orbitide xanthoxycyclin D conformer search"
                        caption="Conformer ensemble generated by ORCA's GOAT algorithm for orbitide xanthoxycyclin D. Purple: PEP-EDIT conformation; green: lowest-RMSD conformer; gray: reference PDB (6WPV)."
                        openLightbox={openLightbox}
                    />

                    <Divider sx={{ my: 3 }} />

                    {/* AlphaFold */}
                    <SectionTitle id="example-alphafold" variant="h6">Protein-peptide structure prediction</SectionTitle>

                    <P>
                        SMILES generated by PEP-EDIT can be used as input to Chai-1 (or AlphaFold 3, Boltz) together with a protein
                        sequence to predict protein–peptide complexes involving modified peptides.
                        The peptide drug Degarelix (<CodeBlock>ac-D_2Nal-D_Phe_4Cl-D_3Pal-S-Phe_4Sdihydroorotamido-D_Phe_4ureido-L-G-Lys_iPr-dA-am</CodeBlock>),
                        was predicted in complex with its target, the GnRH receptor, using the Chai-1 webserver.
                    </P>

                    <Figure
                        src="/assets/documentation/degarelix_gnrhr_chai.png"
                        alt="Chai-1 predictions"
                        caption="Degarelix-GnRH receptor complex predicted with Chai-1 webserver using PEP-EDIT SMILES."
                        openLightbox={openLightbox}
                    />

                    <P>
                        Scripts for preparing AlphaFold 3, Chai-1 and Boltz inputs from SMILES are available{" "}
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
                        <Li><strong>R1</strong> - typically the N-terminal backbone nitrogen.</Li>
                        <Li><strong>R2</strong> - typically the C-terminal carbonyl carbon.</Li>
                        <Li><strong>R3+</strong> - side chains, branching, or specific chemical modifications.</Li>
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
                        <Li>Extra bonds are not chemically validated automatically - use domain knowledge to ensure plausibility.</Li>
                        <Li>Secondary-structure presets provide a controlled backbone bias (φ/ψ/ω), but realistic conformations often benefit from template constraints or downstream refinement (minimization / MD).</Li>
                        <Li>When using a 3D template, auto-sync is disabled. Click <strong>Generate 3D</strong> manually after adjusting the template.</Li>
                    </Ul>

                    <Divider sx={{ my: 4 }} />

                    <SectionTitle id="policies">Accessibility & cookies</SectionTitle>

                    <Ul>
                        <Li>This website is free and open to all - no login is required.</Li>
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
                        /\.(mp4|webm|ogg)$/i.test(lightbox.src) ? (
                            <Box
                                component="video"
                                src={lightbox.src}
                                autoPlay
                                loop
                                muted
                                playsInline
                                controls
                                sx={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 2, boxShadow: 4 }}
                            />
                        ) : (
                            <Box component="img" src={lightbox.src} alt={lightbox.alt} sx={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 2, boxShadow: 4 }} />
                        )
                    )}
                </Box>
            </Dialog>
        </Box>
    );
};

export default Documentation;
