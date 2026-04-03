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
            {
                id: "introduction", label: "Introduction",
                children: [{ id: "pepedit-vs-pypept", label: "PEP-EDIT vs pyPept" },
                ]
            },

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
                    { id: "right-panel", label: "Resource panel" },
                ],
            },
            { id: "sessions", label: "Sessions" },
            {
                id: "key-concepts", label: "Key concepts",
                children: [
                    { id: "biln-notation", label: "BILN notation" },
                    { id: "monomers-rgroups", label: "Monomer definition" },
                ],
            },
            { id: "protonation", label: "Protonation (pH)" },
            {
                id: "conformer-generation", label: "Conformer generation",
                children: [
                    { id: "embedding", label: "Iterative embedding strategy" },
                    { id: "constraint-modes", label: "Constraint modes" },
                ],
            },
        ],
    },
    {
        group: "How-to guides",
        children: [
            {
                id: "building-peptide", label: "Building a peptide",
                children: [
                    { id: "from-biln", label: "From a BILN sequence" },
                    { id: "from-library", label: "From the monomer library" },
                    { id: "from-import", label: "From FASTA or HELM" },
                    { id: "editing-peptide", label: "Editing your peptide" },
                ],
            },
            {
                id: "linking", label: "Linking monomers",
                children: [
                    { id: "creating-links", label: "Creating bonds" },
                    { id: "removing-links", label: "Removing bonds" },
                ],
            },
            {
                id: "applying-constraints", label: "Applying structural constraints",
                children: [
                    { id: "constraints-2d-howto", label: "Secondary structure constraints" },
                    {
                        id: "constraints-3d-howto", label: "3D template constraints",
                        children: [
                            { id: "loading-template", label: "Loading a template" },
                            { id: "configuring-mapping", label: "Configuring the mapping" },
                            { id: "masking-residues", label: "Masking residues" },
                            { id: "template-multi-chain", label: "Multi-chain peptides" },
                        ],
                    },
                ],
            },
            { id: "adding-monomers", label: "Adding monomers to the library" },
            // { id: "exporting", label: "Exporting results" },
        ],
    },
    {
        group: "Examples & use cases",
        children: [
            { id: "example-microcin", label: "Microcin J25 (lasso peptide)" },
            { id: "example-semaglutide", label: "Semaglutide" },
            {
                id: "example-topologies", label: "Complex topologies",
                children: [
                    { id: "topo-cyclic", label: "Head-to-tail cyclization" },
                    { id: "topo-disulfide", label: "Disulfide bridges" },
                    { id: "topo-branched", label: "Branched peptides" },
                    { id: "topo-multi-chain", label: "Multi-chain & inter-chain bonds" },
                ],
            },
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
                    if (el) el.scrollIntoView({ behavior: "instant" });
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
const GroupTitle = ({ children, ...rest }) => (
    <Typography variant="h2" sx={{ fontWeight: 800, scrollMarginTop: 24, mt: 6, mb: 0.5, fontSize: "1.65rem", letterSpacing: "-0.01em", color: "text.secondary", ...rest.sx }} {...rest}>
        {children}
    </Typography>
);

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

const Sub3Title = ({ children, ...rest }) => (
    <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 0.5, fontSize: "0.85rem", color: "text.secondary", ...rest.sx }} {...rest}>
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

const Figure = ({ src, alt, caption, openLightbox, maxWidth = "2xl", lightboxMaxWidth }) => {
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

    const handleClick = () => openLightbox(src, alt, lightboxMaxWidth);

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
                    onClick={handleClick}
                    sx={mediaSx}
                />
            ) : (
                <Box
                    component="img"
                    src={src}
                    alt={alt}
                    onClick={handleClick}
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

    const [lightbox, setLightbox] = useState({ open: false, src: "", alt: "", lbMax: undefined });
    const openLightbox = useCallback((src, alt, lbMax) => setLightbox({ open: true, src, alt, lbMax }), []);
    const closeLightbox = useCallback(() => setLightbox((prev) => ({ ...prev, open: false })), []);

    /* ── hash-based history: scroll to anchor on back/forward ── */
    useEffect(() => {
        // On initial load, honour a hash already in the URL
        const initialHash = window.location.hash.replace("#", "");
        if (initialHash) {
            requestAnimationFrame(() => {
                const el = document.getElementById(initialHash);
                if (el) {
                    el.scrollIntoView({ behavior: "instant" });
                    setActiveId(initialHash);
                }
            });
        }

        const onPopState = () => {
            const hash = window.location.hash.replace("#", "");
            if (hash) {
                const el = document.getElementById(hash);
                if (el) {
                    el.scrollIntoView({ behavior: "instant" });
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
        if (el) el.scrollIntoView({ behavior: "instant" });
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
                        <Chip component="a" href="#applying-constraints" label="Apply constraints →" clickable size="small" color="primary" variant="outlined" />
                    </Box>

                    <Divider sx={{ mb: 4 }} />

                    {/* ════════════════════════════════════════════
                        1 · GETTING STARTED
                       ════════════════════════════════════════════ */}

                    <GroupTitle>Getting started</GroupTitle>

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

                    {/* ── PEP-EDIT vs pyPept ── */}
                    <Sub2Title id="pepedit-vs-pypept">PEP-EDIT vs pyPept</Sub2Title>

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
                        <Li><strong>Conformer generation with structural constraints:</strong> PEP-EDIT can generate 3D conformers from secondary-structure with dihedral angle presets or PDB template constraints. In multi-chain peptides, constraints can be set independently per chain — a capability not available in pyPept, which only supports secondary-structure constraints (distance-based, from bound matrix settings) on single-chain peptides.</Li>
                        <Li><strong>PDB atom naming fixes:</strong> atom names were corrected for some amino acids to improve downstream compatibility (visualization, tooling, MD pipelines).</Li>
                        <Li><strong>Interactive 2D SVG:</strong> the RDKit 2D sketch SVG is post-processed to expose interactive elements (monomers, R-groups, extra bonds) so the UI can attach JS-driven interactions.</Li>
                        <Li><strong>pH-aware protonation:</strong> final molecules include protonation predicted from the peptide-derived SMILES using Dimorphite-DL (default pH 7.4).</Li>
                    </Ul>

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
                        <strong>Try it yourself:</strong> type <code>ac-A-G-K-D-am</code> in the BILN editor and see the 2D Sketch updates live.
                    </P>



                    <Sub2Title>What's next?</Sub2Title>
                    <Ul>
                        <Li>Load a pre-built example → see <MUILink href="#from-example">Examples</MUILink>.</Li>
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
                        alt="Annotated overview of the PEP-EDIT interface. Four numbered zones: (1) Editor interface at top-left, (2) 2D Sketch at bottom-left, (3) 3D viewer at bottom-right, (4) Resource panel on the right side."
                        caption="The four main areas of PEP-EDIT: (1) Editor interface — BILN input, chain track & constraints; (2) 2D Sketch — interactive molecular depiction; (3) 3D viewer — Mol*-powered conformer visualization; (4) Resource panel — monomer library, outputs & job history."
                        openLightbox={openLightbox}
                    />

                    <Ol>
                        <Li><strong><MUILink href="#editor-interface">Editor interface</MUILink></strong> (1 - top-left); where you define and edit your peptide. Contains the BILN text input, the editor toolbar, the chain track with monomer pills, and optional constraint tracks. Split into <MUILink href="#manual-edition">Manual edition</MUILink> and <MUILink href="#chains">Chains</MUILink>.</Li>
                        <Li><strong><MUILink href="#viewer-2d">2D Sketch</MUILink></strong> (2 - bottom-left); an interactive SVG depiction of the molecule, rendered by RDKit. Updates live as you type. Supports hover highlighting synced across all panels, as well as bond creation and removal.</Li>
                        <Li><strong><MUILink href="#viewer-3d">3D viewer</MUILink></strong> (3 - bottom-right); conformer visualization powered by <MUILink href="https://molstar.org" target="_blank" rel="noreferrer">Mol*</MUILink>. Includes controls for representation, color scheme, labels, camera, and screenshot export.</Li>
                        <Li><strong><MUILink href="#right-panel">Resource panel</MUILink></strong> (4 - right side); a collapsible, resizable sidebar with three vertical tabs: Monomer Library, Outputs, and Jobs.</Li>
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
                        The editor interface (zone 1) occupies the top-left of the screen.
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

                    <Sub3Title>Editor toolbar</Sub3Title>

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
                                    <TableCell>Adjusts the target pH for protonation (range 0-14, default 7.4). Changes update protonation states and SMILES/InChI outputs immediately. Protonation states also reflect in the 3D structure.</TableCell>
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

                    <Sub3Title>BILN input field</Sub3Title>

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

                    {/* <Sub3Title id="upload-sequence-dialog">Upload sequence dialog</Sub3Title>

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
                    {/* <Figure
                        src="/assets/documentation/gifs/pepedit_upload-sequence.gif"
                        alt="Animated demonstration of the Upload Sequence dialog: selecting FASTA mode, pasting a sequence, and clicking Apply. Same process for HELM mode."
                        caption="The Upload Sequence dialog: choose FASTA or HELM format, paste your sequence, and click Apply to populate the editor. Chains are separated by newlines in FASTA and converted to BILN with '.' separators."
                        openLightbox={openLightbox}
                    /> */}

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

                    <Sub3Title>Color coding</Sub3Title>
                    <Ul>
                        <Li><strong>Green</strong> — natural amino acids.</Li>
                        <Li><strong>Orange</strong> — non-natural / modified monomers.</Li>
                        <Li><strong>Gray</strong> — capping groups.</Li>
                    </Ul>

                    <Sub3Title>Interactions</Sub3Title>
                    <Ul>
                        <Li><strong>Hover</strong> over a pill — reveals Replace, Info, and Delete action icons, and synchronizes highlighting with the 2D Sketch and 3D viewer.</Li>
                        <Li><strong>Drag-and-drop</strong> — reorder monomers within or across chains. Invalid moves (R-group conflicts, cap placement violations) are rejected with an explanatory dialog. Capping groups cannot be dragged.</Li>
                        <Li><strong>Bond indicators</strong> — colored dots on pills indicate non-backbone bonds (e.g. disulfide bridges, side-chain links).</Li>
                    </Ul>

                    <Sub3Title>Chain-level actions (⋮ menu)</Sub3Title>
                    <P>Each Sequence row has a ⋮ menu on the left side with:</P>
                    <Ul>
                        <Li><strong>Clear</strong> — remove all monomers from the chain.</Li>
                        <Li><strong>Cyclize / Uncyclize</strong> — create or remove a head-to-tail bond (R1 of first residue ↔ R2 of last residue).</Li>
                        <Li><strong>Mirror</strong> — swap L- ↔ D-amino acids in the chain (standard amino acids only; non-natural residues are left unchanged).</Li>
                        <Li><strong>Delete chain</strong> — remove the entire chain.</Li>
                    </Ul>

                    <Sub3Title>Constraint track</Sub3Title>

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

                    <Alert severity="info" sx={{ mb: 2 }}>
                        In multi-chain peptides, each chain has its own independent constraint row. You can assign different
                        constraint types and values per chain — for example, helix on chain A and strand on chain B.
                    </Alert>

                    <Sub3Title>Adding chains</Sub3Title>

                    <P>
                        Click the <strong>+</strong> button (next to Structural constraints…) to add a new chain.
                        Chains are separated by "." in the BILN string. Each chain has its own Sequence and constraint rows.
                    </P>

                    <Sub3Title>Detach mode</Sub3Title>

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
                        The 2D Sketch (zone 2) displays an interactive SVG depiction of the molecule,
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

                    <Sub3Title>Toolbar (top-right of the 2D Sketch panel)</Sub3Title>

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

                    <Sub3Title>Navigation</Sub3Title>
                    <Ul>
                        <Li><strong>Scroll wheel</strong> — zoom in/out.</Li>
                        <Li><strong>Click + drag</strong> — pan the view.</Li>
                        <Li><strong>Double-click</strong> (or Reset View button) — reset to the default fitted view.</Li>
                    </Ul>

                    <Sub3Title>Hover synchronization</Sub3Title>
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
                        The 3D viewer (zone 3) displays the generated conformer using{" "}
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

                    <Sub3Title>Main controls (top-left of the 3D viewer)</Sub3Title>
                    <Ul>
                        <Li><strong>▶ Generate 3D</strong> — submit a conformer generation job manually.</Li>
                        <Li><strong>Auto sync</strong> — toggle live 3D regeneration. ON by default for peptides with fewer than 8 monomers; automatically disabled at 8+ monomers (with a toast notification) or when a 3D template is active.</Li>
                    </Ul>

                    <Sub3Title>Icon toolbar (top-right)</Sub3Title>

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

                    <Sub3Title>3D navigation</Sub3Title>
                    <Ul>
                        <Li><strong>Left-click + drag</strong> — rotate the structure.</Li>
                        <Li><strong>Scroll wheel</strong> — zoom in/out.</Li>
                        <Li><strong>Right-click + drag</strong> (or middle-click) — pan.</Li>
                    </Ul>


                    {/* ── Right panel ── */}
                    <SubTitle id="right-panel">Resource panel (Library / Output / Jobs)</SubTitle>

                    <P>
                        The resource panel (zone 4) is a collapsible, resizable sidebar with three vertical tabs along its
                        right edge. Click a tab to switch views; drag the panel's left edge to resize, or click the very top-right icon
                        to maximize width. The panel stays consistent across all tabs, only the content area changes.
                    </P>

                    <Figure
                        src="/assets/documentation/gifs/pepedit_right-panel.gif"
                        alt="Animated demonstration of the resource panel: resizing and maximizing panel width, switching between Small and Large monomer cards, toggling class filters (Natural, Cap, Non-natural, All), switching to the Outputs tab with Expand and Wrap toggles, and switching to the Jobs tab to generate a conformer, watch status updates, and rename a job."
                        caption="The resource panel in action: resize and maximize the panel, toggle card sizes and class filters in the Library, use Expand/Wrap in Outputs, and generate, monitor, and name conformer jobs."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />

                    {/* ── Monomer Library ── */}
                    <Sub2Title>Monomer Library</Sub2Title>

                    <P>
                        A searchable catalog of all available monomers. Use the search bar to filter by name or symbol,
                        and the class buttons (<strong>ALL</strong>, <strong>NATURAL</strong>, <strong>CAP</strong>,{" "}
                        <strong>NON-NATURAL</strong>) to narrow the list. Click the info icon to view details or click the <strong>+</strong> button on a monomer
                        card to add it to your sequence.
                    </P>

                    <Sub3Title>Linking process mode (top of the panel)</Sub3Title>
                    <Ul>
                        <Li><strong>Mode</strong> — <em>Append</em> (add to the end of the chain), <em>Prepend</em> (add to the start), or <em>New chain</em> (creates a separate chain).</Li>
                        <Li><strong>Chain</strong> — selects which chain to add to (relevant for multi-chain peptides).</Li>
                    </Ul>

                    <Sub3Title>Display options (panel header)</Sub3Title>
                    <Ul>
                        <Li><strong>Small / Large</strong> — toggles monomer card size.</Li>
                    </Ul>

                    {/* ── Outputs ── */}
                    <Sub2Title>Outputs</Sub2Title>

                    <P>
                        Displays all computed molecular representations, organized into three collapsible accordion sections:
                    </P>

                    <Ul>
                        <Li><strong>1D — Sequences & Notations</strong> (5 formats): BILN, HELM, SMILES, InChI, InChIKey.</Li>
                        <Li><strong>2D — Depiction & Coordinates</strong> (1 format): SDF 2D + Export depiction (SVG, PNG).</Li>
                        <Li><strong>3D — Structures</strong> (6 formats): PDB, MMCIF, XYZ, SDF 3D, MOL2 Tripos, PDBQT + Export snapshot (PNG).</Li>
                    </Ul>

                    <P>
                        Each format row has <strong>Copy</strong> and <strong>Download</strong> buttons.
                        1D and 2D formats update live on every valid keystroke. 3D formats require a successful conformer generation job.
                    </P>

                    <Sub3Title>Panel controls (header bar)</Sub3Title>
                    <Ul>
                        <Li><strong>Wrap</strong> — wraps long text (e.g. SMILES, InChI) for readability instead of horizontal scrolling.</Li>
                        <Li><strong>Expand</strong> — opens all accordion sections at once so every format is visible.</Li>
                        <Li><Ic icon={DownloadIcon} /> <strong>Download all</strong> — exports all available formats in a single action.</Li>
                    </Ul>

                    {/* ── Jobs ── */}
                    <Sub2Title>Jobs</Sub2Title>

                    <P>
                        Lists the 50 latest conformer generation jobs submitted in the current session. The table header shows
                        the session name (or short ID) and the total job count.
                    </P>

                    <Sub3Title>Table columns</Sub3Title>
                    <P>Name and Action are always visible; others can be toggled via <strong>Columns & view</strong>:</P>
                    <Ul>
                        <Li><strong>Name</strong> — defaults to "Untitled job". Click to edit inline, or use ⋮ → Edit details for a full dialog (name up to 200 characters, description up to 2 000 characters, plus read-only Job ID and timestamps).</Li>
                        <Li><strong>BILN</strong> — the BILN string used for the job. Shows "—" for failed jobs.</Li>
                        <Li><strong>Date</strong> — creation timestamp.</Li>
                        <Li><strong>State</strong> — green "success" chip or red "failed" chip.</Li>
                    </Ul>

                    <Sub3Title>Actions</Sub3Title>
                    <Ul>
                        <Li><strong>Resume</strong> — restores <em>everything</em>: the BILN sequence, all constraints (secondary structure or template with scaffold mappings), and loads the 3D conformer into the viewer. Auto-sync is suppressed to prevent re-triggering a new job. Disabled for failed jobs.</Li>
                        <Li><strong>⋮ menu</strong> per job:</Li>
                    </Ul>
                    <Ol>
                        <Li><strong>Edit details</strong> — opens a dialog to set name and description.</Li>
                        <Li><strong>Copy BILN</strong> — copies the job's BILN string to the clipboard.</Li>
                        <Li><strong>Delete job</strong> — permanently deletes the individual job (immediate, no undo).</Li>
                    </Ol>

                    <Sub3Title>Bulk actions (header bar)</Sub3Title>
                    <Ul>
                        <Li><strong>Delete all jobs</strong> — removes every job in the current session. A confirmation dialog shows the job count and warns that the action cannot be undone.</Li>
                        <Li><strong>Refresh</strong> — re-fetches the job list from the server.</Li>
                        <Li><strong>Columns & view</strong> — toggles optional columns (BILN, Date, State) and the "Show descriptions" option.</Li>
                    </Ul>


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
                        Sessions are automatically deleted after <strong>15 days of inactivity</strong>. Each visit refreshes the expiration timer.
                    </Alert>

                    <Sub2Title>Session dialog (Share / Recover / Email)</Sub2Title>
                    <P>Click the <strong>⚙ Session</strong> button in the header to open the Session Management dialog with three tabs:</P>

                    <Sub3Title>Share</Sub3Title>
                    <P>
                        Send a Session ID by email. The recipient can load and collaborate on the session.
                    </P>
                    <Ul>
                        <Li>Enter the recipient's email address.</Li>
                        <Li>Choose whether to share the current session or a different Session ID.</Li>
                        <Li>Click <strong>Send by Email</strong>.</Li>
                    </Ul>
                    <Figure
                        src="/assets/documentation/pepedit_session-share.png"
                        alt="Session dialog — Share tab showing email input and session ID selection"
                        caption="The Share tab: send a Session ID to a collaborator by email."
                        openLightbox={openLightbox}
                        maxWidth="sm"
                    />

                    <Sub3Title>Recover</Sub3Title>
                    <P>
                        Get back into a session you no longer have in your browser:
                    </P>
                    <Ol>
                        <Li><strong>Load by ID</strong> — paste a Session ID and click Load Session.</Li>
                        <Li><strong>Email this session ID</strong> — sends the current ID to your verified email.</Li>
                        <Li><strong>Email all session IDs</strong> — sends every Session ID linked to your email.</Li>
                    </Ol>
                    <Figure
                        src="/assets/documentation/pepedit_session-recover.png"
                        alt="Session dialog — Recover tab showing Load by ID field and email recovery options"
                        caption="The Recover tab: load an existing session by ID or request it via email."
                        openLightbox={openLightbox}
                        maxWidth="sm"
                    />

                    <Sub3Title>Email</Sub3Title>
                    <P>
                        Link an email address to enable recovery and sharing features.
                    </P>
                    <Ul>
                        <Li><strong>Link email:</strong> enter your email; verify via the link sent to you.</Li>
                        <Li><strong>Change email:</strong> two-step verification (current + new email).</Li>
                        <Li><strong>Session notes:</strong> set or update session name and description.</Li>
                    </Ul>
                    <Figure
                        src="/assets/documentation/pepedit_session-email.png"
                        alt="Session dialog — Email tab showing email linking and session notes fields"
                        caption="The Email tab: link an email for recovery, and set session name and description."
                        openLightbox={openLightbox}
                        maxWidth="sm"
                    />

                    <Alert severity="info" sx={{ mb: 2 }}>
                        <strong>Tip:</strong> click the Session ID chip in the header at any time to copy the full ID to your clipboard.
                    </Alert>
                    <Divider sx={{ my: 4 }} />

                    {/* ════════════════════════════════════════════
                        Key concepts
                       ════════════════════════════════════════════ */}
                    <SectionTitle id="key-concepts">Key concepts</SectionTitle>

                    {/* ── BILN notation ── */}
                    <SubTitle id="biln-notation">BILN notation</SubTitle>

                    <P>
                        BILN (Boehringer Ingelheim Line Notation) is a human-readable line notation for complex peptides
                        (Fox et al.,{" "}
                        <MUILink href="https://pubs.acs.org/doi/10.1021/acs.jcim.2c00035" target="_blank" rel="noreferrer">
                            <em>J. Chem. Inf. Model.</em> 2022
                        </MUILink>
                        ). It represents a peptide as an ordered list of monomers connected through numbered attachment
                        points (R-groups). Together with a monomer library that maps each abbreviation to its chemical
                        structure, a BILN string unambiguously defines the atomistic structure of any peptide — including
                        cyclic, branched, and multi-chain architectures with non-natural building blocks.
                    </P>

                    <P>In BILN, polymers are described as a chain of monomers following these conventions:</P>
                    <Ul>
                        <Li>
                            Unconnected monomers are listed by their abbreviation and separated by
                            dots: <code>A.G.C</code>
                        </Li>
                        <Li>
                            Connections between monomers are specified by integer pairs in parentheses after the
                            abbreviation. The first integer is a bond identifier (which must appear exactly twice in
                            the BILN string), and the second denotes the R-group
                            involved. When a monomer participates in more than one bond, pairs are
                            concatenated: <code>A(1,2).G(1,1)(2,2).C(2,1)</code>
                        </Li>
                        <Li>
                            When a connection goes from R2 of one monomer to R1 of the next — the standard backbone
                            peptide bond — the explicit notation can be replaced by a simple
                            hyphen: <code>A-G-C</code>. Combined with the convention that R1 sits on the backbone
                            nitrogen and R2 on the backbone carbonyl carbon, this gives a natural N→C reading order.
                        </Li>
                    </Ul>

                    <P>These conventions allow a wide range of peptide architectures to be expressed concisely:</P>

                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 1.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>BILN</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell>Linear peptide</TableCell>
                                    <TableCell><code>P-E-P-T-I-D-E</code></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Internal disulfide bridge + C-terminal amidation</TableCell>
                                    <TableCell><code>A-C(1,3)-G-A-G-C(1,3)-D-am</code></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Head-to-tail cyclic peptide</TableCell>
                                    <TableCell><code>C(1,1)-Y-C-L-I-C(1,2)</code></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Same peptide, C-C disulfide instead</TableCell>
                                    <TableCell><code>C(1,3)-Y-C-L-I-C(1,3)</code></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Side-chain modification (acetyl on Lys Nε)</TableCell>
                                    <TableCell><code>A-G-K(1,3)-D-D.ac(1,2)</code></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Branched peptide (poly-glycine linked on Lys Nε)</TableCell>
                                    <TableCell><code>A-G-K(1,3)-D-D.A-G-G-G(1,2)</code></TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>Multi-chain (dot separator)</TableCell>
                                    <TableCell><code>A-G-K.E-H-I</code></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <P>
                        If a monomer abbreviation contains a hyphen, BILN requires square brackets for disambiguation
                        (e.g. <code>A-[2-Cl-Phe]-C</code>). PEP-EDIT avoids this by using underscores in monomer symbols
                        that would otherwise contain hyphens.
                    </P>

                    <P>
                        For fully defined molecular entities, a BILN string carries the same structural information as a
                        HELM string and can be converted to or from HELM. PEP-EDIT accepts both notations as input and
                        provides HELM among its output formats.
                    </P>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        For a complete syntax reference, see the{" "}
                        <MUILink href="#biln-quick-ref">BILN quick reference</MUILink> table.
                    </Alert>

                    {/* ── Monomers, R-groups & leaving groups ── */}
                    <SubTitle id="monomers-rgroups">Monomer definition</SubTitle>

                    {/* [MEDIA: annotated monomer diagram showing R-groups] */}
                    <Figure
                        src="/assets/documentation/pepedit_monomer-card-details.png"
                        alt="D-Asparagine monomer card details"
                        caption="D-Asparagine (dN) monomer card showing its name, BILN symbol, PDB 3-letter code, and labeled R-groups (R1, R2)."
                        openLightbox={openLightbox}
                        maxWidth="xs"
                    />

                    <P>
                        A monomer is the basic building block in PEP-EDIT — an amino acid, capping group, or arbitrary
                        chemical moiety. Each monomer is defined by four properties:
                    </P>

                    <Ul>
                        <Li><strong>Structure</strong> — the chemical structure, stored as an SDF MolBlock in PEP-EDIT.</Li>
                        <Li><strong>Abbreviation (symbol)</strong> — a unique identifier used in the BILN string (e.g. "A" for alanine, "am" for C-terminal amine

                            ).</Li>
                        <Li><strong>Attachment points (R-groups)</strong> — numbered positions (R1, R2, R3…) where the monomer can form bonds with other monomers.</Li>
                        <Li><strong>Leaving groups</strong> — the atoms (H or OH) that cap an R-group when it is not involved in a bond.</Li>
                    </Ul>

                    <Sub2Title>R-group conventions</Sub2Title>
                    <P>By convention:</P>
                    <Ul>
                        <Li><strong>R1</strong> — backbone nitrogen (N-terminus side).</Li>
                        <Li><strong>R2</strong> — backbone carbonyl carbon (C-terminus side).</Li>
                        <Li><strong>R3, R4…</strong> — side chains, branching points, or chemical modifications.</Li>
                    </Ul>

                    <P>
                        The number of R-groups determines the monomer's role. A monomer with a single R-group acts as a
                        capping group (e.g. acetyl caps via R2, amide caps via R1). Two R-groups make a standard backbone
                        unit. Three or more R-groups open up branching or cyclization — for instance, lysine carries R1
                        and R2 on the backbone and R3 on the side-chain amine, allowing a modification at Nε while
                        remaining part of the main chain.
                    </P>

                    <Sub2Title>Leaving groups</Sub2Title>
                    <P>
                        Each R-group carries a leaving group (H or OH). When an R-group is not involved in a bond, it is
                        replaced by its leaving group in the final structure. For example, a free alanine has R1 capped
                        with H (→ backbone NH₂) and R2 capped with OH (→ backbone COOH), yielding the complete amino acid.
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

                    <P>
                        PEP-EDIT ships with a public library of 324 monomers covering all 20 canonical amino acids and
                        common non-natural residues. Users can create additional monomers through the guided wizard on
                        the <em>My monomers</em> page — see{" "}
                        <MUILink href="#adding-monomers">Adding monomers to the library</MUILink>.
                    </P>

                    <Divider sx={{ my: 4 }} />

                    {/* ── Protonation ── */}
                    <SectionTitle id="protonation">Protonation (pH)</SectionTitle>

                    <P>
                        After molecular assembly, PEP-EDIT performs pH-dependent protonation using a modified version of{" "}
                        <MUILink href="https://link.springer.com/article/10.1186/s13321-019-0336-9" target="_blank" rel="noreferrer">
                            Dimorphite-DL
                        </MUILink>{" "}
                        at a user-specified pH (default 7.4). Selected SMARTS pKa definitions were adjusted to better
                        match known amino-acid behaviour at physiological pH — for instance, phenol, imide and amide
                        groups are kept neutral.
                    </P>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        <strong>Modified pKa rules</strong> — The following SMARTS pKa adjustments were applied to the
                        original Dimorphite-DL definitions:
                        <Ul sx={{ mb: 0 }}>
                            <Li><strong>Phenols</strong> (e.g. Tyrosine): pKa raised from ~7.1 to 10.0 so they stay neutral at pH 7.4. A separate rule keeps a lower pKa (6.8) for heavily substituted, electron-withdrawing phenols.</Li>
                            <Li><strong>Imides</strong>: pKa for ringed imides raised by 2 units (~6.45 → 8.45) to prevent erroneous deprotonation.</Li>
                            <Li><strong>Secondary amides</strong> (e.g. peptide bonds): assigned an artificial pKa of −100, effectively locking them in their neutral state.</Li>
                            <Li><strong>Aromatic nitrogens</strong>: pKa for protonated aromatic nitrogens raised from ~7.2 to 14.0, preventing proton loss at physiological pH.</Li>
                        </Ul>
                    </Alert>

                    <P>
                        The resulting protonated molecular graph serves as the common starting point for both the 2D
                        depiction and the 3D conformer generation. You can adjust the target pH with the slider in the
                        editor toolbar; changes are reflected immediately in SMILES/InChI outputs and in the 3D structure.
                    </P>

                    {/* GIF animation showing protonation state reflection on 2D depiction */}
                    <Figure
                        src="/assets/documentation/gifs/pepedit_protonation.gif"
                        alt="Protonation state reflection"
                        caption="Adjusting the pH slider updates the protonation state in the 2D depiction."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />

                    <Divider sx={{ my: 4 }} />

                    {/* ── Conformer generation ── */}
                    <SectionTitle id="conformer-generation">Conformer generation</SectionTitle>

                    <P>
                        PEP-EDIT generates single three-dimensional conformers using RDKit's ETKDGv3 distance geometry
                        method. Three generation modes are supported, depending on whether and how structural constraints
                        are specified:
                    </P>
                    <Ul>
                        <Li><strong><i>De novo</i></strong> no spatial constraints; the conformer geometry is determined by molecular topology and ETKDGv3's built-in knowledge terms.</Li>
                        <Li><strong>Secondary-structure-guided</strong> per-residue backbone dihedral angles are preset to canonical Ramachandran values before embedding.</Li>
                        <Li><strong>Template-guided</strong> backbone atom positions are extracted from an experimental or modeled PDB structure and used as spatial reference during embedding.</Li>
                    </Ul>
                    <P>
                        In the constrained modes, a coordinate mapping step translates the user-specified constraints into
                        atom-level spatial references that are passed to RDKit's embedding engine. The sections below
                        describe the iterative embedding strategy common to all modes, followed by each constraint type
                        in detail.
                    </P>

                    <SubTitle id="embedding">Iterative embedding strategy</SubTitle>
                    <P>
                        Regardless of mode, PEP-EDIT uses an iterative strategy with progressive relaxation to maximize
                        embedding success. Embedding is first attempted with 100 % of constraints enforced. If that fails,
                        it is retried with randomly sampled subsets of the constraint set (90 %, 80 %, then 50 %), with an
                        increasing number of attempts at each stage.
                    </P>

                    <Alert severity="info" sx={{ mb: 2, pb: 0 }}>
                        <strong>The number of attempts is determined by the following schedule:</strong>
                        <Ul sx={{ mb: 0 }}>
                            <Li>100 % constraints: 10 attempts</Li>
                            <Li>90 % constraints: 10 attempts</Li>
                            <Li>80 % constraints: 20 attempts</Li>
                            <Li>50 % constraints: 50 attempts</Li>
                        </Ul>
                    </Alert>

                    <P>
                        The first successful embedding terminates the procedure. This schedule addresses geometric
                        conflicts that can arise when external coordinate constraints cannot be perfectly reconciled with
                        the molecule's bonding geometry — a common situation for complex or multi-fragment peptides. Even
                        at 50 % constraint retention, the global backbone fold is generally preserved while giving RDKit
                        enough freedom to resolve local clashes.
                    </P>
                    <P>
                        The same multi-attempt strategy is applied in <i>de novo</i> mode (without constraints) to maximize
                        success on topologically challenging molecules.
                    </P>

                    {/* Constraint modes */}
                    <SubTitle id="constraint-modes">Constraint modes</SubTitle>
                    <P>
                        PEP-EDIT supports two mutually exclusive constraint types that guide conformer generation. Both
                        translate user input into atom-level spatial references passed to the embedding engine.
                    </P>

                    <P>
                        <strong>Secondary-structure-guided mode</strong><br />
                        In this mode, backbone dihedral angles (φ, ψ, and ω) are preset to canonical Ramachandran values
                        for each residue according to its assigned code. For D-amino acids, angles are automatically
                        mirrored in Ramachandran space.
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

                    <Alert severity="info" sx={{ mb: 2 }}>
                        Reference angles — α-helix (<strong>H</strong>): φ = −57°, ψ = −47°; β-strand (<strong>E</strong>): φ = −120°, ψ = 120°.
                        These are standard Ramachandran values for L-amino acids; D-amino acid values are sign-mirrored.
                    </Alert>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        PEP-EDIT supports secondary-structure constraints on <strong>multi-chain peptides</strong> — each chain
                        can have its own independent H/E/− assignments. This extends pyPept's underlying constraint engine,
                        which only supports distance-based bound-matrix constraints on single-chain peptides.
                    </Alert>

                    <P>
                        <strong>Template-guided mode</strong><br />
                        In this mode, backbone atom positions are extracted from an experimentally determined or modeled
                        PDB structure and used as spatial constraints during embedding. The designed peptide's backbone
                        atoms are mapped onto the corresponding template atoms, so that constrained regions adopt the
                        template fold while modified or unmatched positions are resolved <i>de novo</i>.
                    </P>
                    <P>
                        Users can select which chain and residue range to map from the template, apply an offset for
                        leading unconstrained positions, and mask individual residues to exclude them from the constraint
                        set. Multi-chain peptides are fully supported — each designed chain can be mapped independently
                        to a different template chain or residue range.
                    </P>

                    <P>
                        For step-by-step instructions on how to apply either constraint type in the editor, see{" "}
                        <MUILink href="#applying-constraints">Applying structural constraints</MUILink>.
                    </P>

                    <Divider sx={{ my: 4 }} />

                    {/* ════════════════════════════════════════════
                        2 · HOW-TO GUIDES
                       ════════════════════════════════════════════ */}

                    <GroupTitle>How-to guides</GroupTitle>

                    {/* ── Building a peptide ── */}
                    <SectionTitle id="building-peptide">Building a peptide</SectionTitle>

                    <P>
                        There are several ways to start building a peptide in PEP-EDIT, depending on your starting point:
                    </P>
                    <Ul>
                        <Li><MUILink href="#from-biln">From a BILN sequence</MUILink> — type or paste a sequence directly if you know the monomer symbols.</Li>
                        <Li><MUILink href="#from-library">From the monomer library</MUILink> — browse, search, and add monomers interactively.</Li>
                        <Li><MUILink href="#from-example">From a pre-built example</MUILink> — load one of the 15 pre-built peptides as a starting point.</Li>
                        <Li><MUILink href="#from-import">From FASTA or HELM</MUILink> — import an existing sequence from another format.</Li>
                    </Ul>
                    <P>
                        Once your peptide is in the editor, see{" "}
                        <MUILink href="#editing-peptide">Editing your peptide</MUILink> for how to refine it.
                    </P>

                    <SubTitle id="from-biln">From a BILN sequence</SubTitle>

                    <P>
                        If you already know the sequence you want, type or paste it directly into the BILN input field
                        (Manual edition section). The input is live — the 2D Sketch updates on every valid
                        keystroke, with no need to press Enter or click Apply.
                    </P>
                    <P>
                        A simple linear peptide is just monomers separated by hyphens
                        (e.g. <code>P-E-P-T-I-D-E</code>). For cyclic, branched, or multi-chain peptides, BILN uses
                        explicit bond annotations and dot separators — see the{" "}
                        <MUILink href="#biln-notation">BILN notation</MUILink> section for syntax details.
                    </P>
                    <P>
                        Typing BILN directly requires knowing the monomer symbols available in the library. If you're
                        unsure which symbol to use for a particular residue, use the monomer library (described below) to
                        search by name, PDB code, or other attributes.
                    </P>

                    {/* GIFs showing editing of PEPTIDE from biln sequence */}
                    <Figure
                        src="/assets/documentation/gifs/pepedit_building-from-biln.gif"
                        alt="Typing a BILN sequence into the input field, with live 2D update."
                        caption="Type or paste a BILN sequence directly into the input field. The 2D Sketch updates live with every valid keystroke."
                        openLightbox={openLightbox}
                        maxWidth="md"
                    />

                    <Alert severity="info" sx={{ mb: 2 }}>
                        The monomer counter below the input field shows the current count against the maximum
                        (e.g. "6/40 monomers"). PEP-EDIT supports up to 40 monomers per peptide. Attempting to exceed
                        this limit shows a red border and a warning dialog.
                    </Alert>

                    <SubTitle id="from-library">From the monomer library</SubTitle>

                    <P>
                        If you prefer to build interactively — or if you need to explore what monomers are available —
                        open the <strong>Monomer Library</strong> tab in the right panel.
                    </P>

                    <P>
                        <strong>Browsing and searching</strong><br />
                        The library contains all public monomers (324 as of v1.0.0) plus any personal monomers from your
                        session. Two ways to find what you need:
                    </P>
                    <Ul>
                        <Li><strong>Quick filters</strong> — click ALL, CAPS, NATURAL, or NON-NATURAL to filter by monomer category.</Li>
                        <Li><strong>Search field</strong> — type any text to filter across multiple attributes simultaneously: name, symbol, PDB code, analog, SMILES, and more. For example, typing "phe" will match Phenylalanine, D-Phenylalanine, chloro-Phenylalanine variants, etc.</Li>
                    </Ul>
                    <P>
                        Card size can be toggled between <strong>Small</strong> (compact grid, more visible at once) and{" "}
                        <strong>Large</strong> (bigger structures, easier to read) using the buttons in the panel header.
                    </P>

                    <Figure
                        src="/assets/documentation/gifs/pepedit_monomer-filtering.gif"
                        alt="Monomer library panel showing search and filter options, with example search results for 'phe'."
                        caption="Use quick filters and the search field to find monomers by name, symbol, PDB code, and more. Here, 'phe' matches multiple phenylalanine variants."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />

                    <P>
                        <strong>Inspecting a monomer</strong><br />
                        Before adding a monomer, you can inspect its full details by clicking the <strong>ⓘ</strong> (info)
                        icon on its card. This opens a detailed view showing:
                    </P>
                    <Ul>
                        <Li>BILN symbol and Full name </Li>
                        <Li>PDB 3-letter code</Li>
                        <Li>Natural analog</Li>
                        <Li>Monomer type and subtype (natural amino acid, non-natural, cap, other)</Li>
                        <Li>2D structure with labeled R-groups</Li>
                        <Li>Canonical SMILES</Li>
                        <Li>Leaving groups for each R-group</Li>
                    </Ul>
                    <P>
                        This is especially useful for non-natural monomers where the symbol alone may not be immediately
                        recognizable.
                    </P>

                    <Figure
                        src="/assets/documentation/pepedit_monomer-card-details2.png"
                        alt="Dichloro-phenylalanine monomer card details"
                        caption="Detailed view of the Dichloro-phenylalanine monomer card after clicking ⓘ."
                        openLightbox={openLightbox}
                        maxWidth="sm"
                    />

                    <P>
                        <strong>Adding a monomer to your sequence</strong><br />
                        Click the <strong>+</strong> button on a monomer card to add it to the current peptide. Where and
                        how it's inserted depends on two settings in the <em>Linking process mode</em> section at the top
                        of the library panel:
                    </P>

                    <P><strong>Placement mode:</strong></P>
                    <Ul>
                        <Li><strong>Append</strong> — adds the monomer at the C-terminus (end) of the selected chain. This is the default and most common mode.</Li>
                        <Li><strong>Prepend</strong> — inserts the monomer at the N-terminus (beginning) of the selected chain.</Li>
                        <Li><strong>New chain</strong> — starts a new chain. This is the default when the editor is empty.</Li>
                    </Ul>

                    <P><strong>Chain selector:</strong></P>
                    <P>
                        For multi-chain peptides, use the <strong>Chain</strong> dropdown to choose which chain receives
                        the new monomer (Chain: 1, Chain: 2, etc.).
                    </P>

                    {/* GIFs showing building a peptide interactively from the monomer library */}
                    <Figure
                        src="/assets/documentation/gifs/pepedit_building-from-library.gif"
                        alt="Adding monomers from the library to the sequence, showing placement modes and chain selection."
                        caption="Click + on a monomer card to add it to your sequence. Placement depends on the selected mode (Append, Prepend, New chain) and, for multi-chain peptides, the Chain selector."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                        lightboxMaxWidth={1200}
                    />

                    <Alert severity="info" sx={{ mb: 2 }}>
                        The active chain where monomers are added is indicated by the Chain selector and by the
                        highlight on the corresponding Sequence row in the chain track. A click on any Sequence row also switches the active chain.
                        When the editor is empty, the default placement mode is New chain, which creates Chain 1.
                        Once a chain exists, the default mode switches to Append for that chain.
                    </Alert>

                    <SubTitle id="from-example">From a preset example</SubTitle>

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

                    <P>
                        Click <strong>Examples…</strong> in the editor toolbar to open a dialog with 15 pre-built
                        examples across 6 categories. This is a good way to explore PEP-EDIT's capabilities or to use
                        as a starting point for your own designs.
                    </P>
                    <Ul>
                        <Li><strong>Linear peptides</strong> — simple backbone-connected sequences</Li>
                        <Li><strong>Cyclic peptides</strong> — head-to-tail cyclization with L and/or D amino acids</Li>
                        <Li><strong>Capped peptides</strong> — N-terminal acetyl, C-terminal amide, both caps, side-chain capping</Li>
                        <Li><strong>Non-natural amino acids</strong> — semaglutide variants, cyclic with D-amino acids</Li>
                        <Li><strong>Secondary structure constraints</strong> — full helix, helix-loop-helix, beta strand, mixed</Li>
                        <Li><strong>3D template constraints</strong> — somatostatin with PDB template (auto-fetched)</Li>
                    </Ul>
                    <P>
                        Click <strong>▶ Load</strong> on any example to populate the editor with its BILN sequence and,
                        where applicable, its associated constraints (secondary structure assignments or template scaffold
                        mappings).
                    </P>

                    <SubTitle id="from-import">From FASTA or HELM import</SubTitle>

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

                    <SubTitle id="editing-peptide">Editing your peptide</SubTitle>


                    <P>
                        Once your peptide is in the editor, you can refine it using the chain track and editor toolbar.
                    </P>

                    <P>
                        <strong>Deleting a monomer</strong><br />
                        Hover over a monomer pill and click the Delete icon. The monomer is removed and the chain
                        reconnects automatically. Any bonds involving the deleted monomer's R-groups are also removed.
                    </P>

                    <P>
                        <strong>Reordering monomers</strong><br />
                        Drag and drop monomer pills to reorder them within a chain or move them between chains. The editor
                        validates every move: if the new position creates an R-group conflict (e.g. placing a cap in
                        mid-chain), the move is rejected with an explanatory dialog.
                    </P>

                    <P>
                        <strong>Replacing a monomer</strong><br />
                        Hover over any monomer pill in the chain track — a Replace icon appears. Click it, then select
                        the replacement monomer from the library panel (which opens automatically). The swap preserves
                        existing connections where the R-group configuration is compatible.
                    </P>
                    <P>
                        Only monomers with a compatible R-group configuration are offered as replacements. For example,
                        you cannot replace a backbone residue (R1 + R2) with a cap (single R-group) without first
                        breaking the relevant bonds.
                    </P>

                    {/* GIF ~5s — Swap monomers → Delete one monomer → Click on replace -> library opens → pick replacement Crop: chain track + library panel.] */}
                    <Figure
                        src="/assets/documentation/gifs/pepedit_editing-peptide-from-chain.gif"
                        alt="Editing a peptide: replacing a monomer, deleting a monomer, and adding a new one from the library."
                        caption="Refine your peptide using the chain track and editor toolbar. Here, a monomer is replaced, another is deleted, and a new one is added from the library."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />


                    <P>
                        <strong>Chain-level operations</strong><br />
                        Click the ⋮ menu on a chain's Sequence row for bulk operations:
                    </P>
                    <Ul>
                        <Li><strong>Cyclize</strong> — create a head-to-tail bond (R1 of first residue ↔ R2 of last residue), converting a linear chain to a cyclic peptide.</Li>
                        <Li><strong>Mirror</strong> — swap L-amino acids to their D equivalents (and vice versa) across the entire chain. This only affects the 20 standard amino acids (e.g. A ↔ dA); non-natural or modified residues are left unchanged.</Li>
                        <Li><strong>Delete chain</strong> — remove the chain entirely.</Li>
                    </Ul>

                    <P>
                        <strong>Adding a new chain</strong><br />
                        Click the <strong>+</strong> button next to the <strong>Structural constraints…</strong> dropdown
                        to add a new chain. In the BILN string, chains are separated by a dot
                        (e.g. <code>A-G-K.E-H-I</code>). Each chain has its own Sequence row and, if active, its own
                        constraint row.
                    </P>

                    <P>
                        <strong>Undo and redo</strong><br />
                        The editor toolbar provides <Ic icon={UndoIcon} label="Undo" /> and <Ic icon={RedoIcon} label="Redo" />{" "}
                        buttons covering all operations: adding, deleting, reordering, replacing, linking, and constraint
                        changes (up to 20 steps). Note that Ctrl+Z / Ctrl+Y only work inside the BILN text field (native
                        browser undo) — use the toolbar buttons for chain track operations.
                    </P>

                    {/* GIF showing click on menu -> mirror -> cyclize -> add chain -> swap monomer -> remove chain -> undo */}
                    <Figure
                        src="/assets/documentation/gifs/pepedit_chain-operations.gif"
                        alt="Performing various chain operations: mirror, cyclize, add chain, swap monomer, remove chain, and undo."
                        caption="Demonstration of chain operations in PEP-EDIT: mirror, cyclize, add chain, swap monomer, remove chain, and undo."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />

                    <Divider sx={{ my: 4 }} />

                    {/* ── Linking ── */}
                    <SectionTitle id="linking">Linking monomers</SectionTitle>

                    <P>
                        PEP-EDIT supports extra bonds beyond the backbone — disulfide bridges, side-chain
                        cross-links, lipidation attachments, or head-to-tail cyclizations. These bonds
                        are represented in BILN as <code>(bondId, rgroupId)</code> annotation pairs
                        (see <MUILink href="#biln-notation">BILN notation</MUILink>).
                    </P>

                    <SubTitle id="creating-links">Creating bonds and removing bonds</SubTitle>

                    <Figure
                        src="/assets/documentation/gifs/pepedit_linking.gif"
                        alt="Using Link mode to cyclize a chain and add a disulfide bridge, then using Unlink mode to remove it."
                        caption="Demonstration of Link and Unlink modes. First, the chain is cyclized via Link mode (the first and last R-groups are connected). Then a disulfide bridge is created between two chains. Finally, Unlink mode is used to remove the created bonds."
                        openLightbox={openLightbox}
                        maxWidth="md"
                    />

                    <P>
                        You can create extra bonds in two ways:
                    </P>
                    <Ul>
                        <Li>
                            <strong>BILN annotations</strong> — type matching <code>(bondId, rgroupId)</code> pairs
                            directly in the BILN input. For instance, adding <code>(1,1)</code> to the first residue
                            and <code>(1,2)</code> to the last residue creates a head-to-tail cyclic bond.
                        </Li>
                        <Li>
                            <strong>Link mode</strong> — click the <Ic icon={DeviceHubIcon} label="Link" /> button
                            in the editor toolbar. The 2D viewer dims the molecule structure and highlights every
                            available R-group. Click a first R-group (it highlights with an animated dashed outline),
                            then click a second R-group to create the bond. PEP-EDIT stays in Link mode after each bond,
                            so you can chain multiple links without re-clicking the toolbar button.
                            Press <strong>Esc</strong> to cancel an in-progress selection or exit Link mode entirely.
                        </Li>
                        <Li>
                            <strong>Cyclize shortcut</strong> — for head-to-tail cyclization specifically, the ⋮ menu
                            on a chain's Sequence row offers a one-click <strong>Cyclize</strong> action (R1 of first
                            residue ↔ R2 of last residue) without needing to enter Link mode.
                        </Li>
                        <Li>
                            <strong>Unlink mode</strong> — click the <Ic icon={LinkOffIcon} label="Unlink" /> button to enter <strong>Unlink mode</strong>.
                            The viewer dims everything except the cuttable extra bonds, which appear in red with
                            a marching-ants animation. Click any highlighted bond to remove it.
                            Only extra bonds (non-backbone) can be cut; backbone connections are managed by
                            editing the sequence itself. Only one of Link / Unlink can be active at a time.

                        </Li>
                    </Ul>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        <Ul sx={{ mb: 0 }}>
                            <Li>
                                When Link or Unlink mode is active, the <em>Manual edition</em> section auto-collapses and
                                the <em>Chains</em> panel auto-detaches into a floating overlay to maximize the 2D Sketch area.
                                Both are restored when you leave the mode.
                            </Li>
                            <Li>
                                Extra bonds are flexible by design — PEP-EDIT does not validate whether a given link is
                                chemically meaningful (e.g. matching R-group chemistry). That remains the user's responsibility.
                            </Li>
                        </Ul>
                    </Alert>

                    <Divider sx={{ my: 4 }} />

                    {/* ── Applying structural constraints ── */}
                    <SectionTitle id="applying-constraints">Applying structural constraints</SectionTitle>

                    <P>
                        This guide walks through the two ways to constrain conformer generation in PEP-EDIT: secondary
                        structure presets and 3D template scaffolds. For the underlying principles of how constraints
                        affect embedding, see{" "}
                        <MUILink href="#conformer-generation">Conformer generation</MUILink>.
                    </P>

                    <P>
                        <strong>Choosing a constraint mode</strong><br />
                        Click the <strong>Structural constraints…</strong> dropdown button in the Chains section header.
                        Three options are available:
                    </P>
                    <Ul>
                        <Li><strong>None</strong> — no constraints (default). Only the Sequence row is visible.</Li>
                        <Li><strong>Secondary structure</strong> — adds a constraint row with per-residue H/E/- buttons.</Li>
                        <Li><strong>3D template</strong> — adds a template mapping row and opens the scaffold upload workflow.</Li>
                    </Ul>
                    <P>The two constraint modes are mutually exclusive — selecting one replaces the other.</P>

                    <SubTitle id="constraints-2d-howto">Secondary structure constraints</SubTitle>

                    <Figure
                        src="/assets/documentation/gifs/pepedit_dssp-constraints.gif"
                        alt="Secondary structure constraints on a peptide chain."
                        caption="Applying secondary structure constraints on a multi-chain peptide. Individual residues are assigned H (helix), E (strand), or − (coil) by clicking the constraint track buttons; the ⋮ menu provides bulk operations. After clicking Generate 3D, the conformer reflects the assigned fold."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />

                    <P>
                        <strong>Setting constraints per residue</strong><br />
                        Once <em>Secondary structure</em> mode is active, a constraint row appears below the chain track.
                        Each cell accepts one of three values: <strong>H</strong> (helix), <strong>E</strong> (strand),
                        or <strong>−</strong> (coil). The input works like an OTP field — click a cell to
                        focus it (the active cell is highlighted with a subtle ring) and start typing:
                    </P>
                    <Ul>
                        <Li>Type <strong>H</strong>, <strong>E</strong>, or <strong>-</strong> to set a value — focus automatically advances to the next cell.</Li>
                        <Li>Use <strong>←</strong> / <strong>→</strong> arrows to navigate between cells (no text selection occurs).</Li>
                        <Li>Use <strong>↑</strong> / <strong>↓</strong> arrows to cycle through H → E → − without moving.</Li>
                        <Li><strong>Delete</strong> resets in place.</Li>
                        <Li>Paste a string of values (e.g. <code>HHE--E</code>) to fill multiple cells at once.</Li>
                    </Ul>

                    <P>
                        <strong>Bulk operations</strong><br />
                        Click the ⋮ menu on the constraint row for quick bulk assignments:
                    </P>
                    <Ul>
                        <Li><strong>All helix</strong> — sets every residue to H.</Li>
                        <Li><strong>All strand</strong> — sets every residue to E.</Li>
                        <Li><strong>All coil</strong> — sets every residue to −.</Li>
                        <Li><strong>Clear</strong> — removes all assignments (equivalent to all coil).</Li>
                    </Ul>

                    <P>
                        <strong>Multi-chain</strong><br />
                        For multi-chain peptides, each chain has its own independent constraint row. Different chains can
                        have different secondary structure assignments.
                    </P>

                    <P>
                        <strong>Generating the conformer</strong><br />
                        After setting constraints, click <strong>▶ Generate 3D</strong> (or rely on Auto sync if the
                        peptide has fewer than 8 monomers). The embedding engine will use the assigned angles as spatial
                        targets.
                    </P>


                    <SubTitle id="constraints-3d-howto">3D template constraints</SubTitle>

                    <P>
                        Template-guided constraints use backbone atom positions from an experimental or modeled PDB
                        structure as spatial references during conformer embedding. The designed peptide's backbone
                        atoms are mapped one-to-one onto the corresponding template atoms, so that constrained
                        positions adopt the template fold while unmatched or masked positions are resolved{" "}
                        <i>de novo</i>.
                    </P>
                    <P>
                        This workflow involves three steps: loading a template structure, configuring how the designed
                        peptide maps onto the template, and generating the conformer. Each step is described below.
                    </P>

                    {/* ── Loading a template ── */}
                    <Sub2Title id="loading-template">Loading a template</Sub2Title>

                    <P>
                        To load a template, switch to <strong>3D template</strong> mode by clicking{" "}
                        <strong>Structural constraints…</strong> in the Chains section header. A template mapping row appears
                        below each chain in the chain track. If no template is loaded yet, an <strong>Upload</strong>{" "}
                        button is shown in the template row.
                    </P>

                    <Figure
                        src="/assets/documentation/pepedit_constraints_menu.png"
                        alt="Structural constraints dropdown menu showing None, Secondary structure, and 3D template options."
                        caption="Select Structural constraints → 3D template to load a PDB structure as a constraint scaffold."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />

                    <P>
                        There are two ways to load a template structure:
                    </P>
                    <Ul>
                        <Li>
                            <strong>From a PDB identifier</strong> — in the upload dialog, select the{" "}
                            <strong>PDB ID</strong> tab and enter a 4-character RCSB PDB code
                            (e.g. <code>2MI1</code>). PEP-EDIT fetches and parses the structure from the RCSB PDB.
                        </Li>
                        <Li>
                            <strong>From a local file</strong> — select the <strong>File</strong> tab and
                            upload a PDB or mmCIF file from your computer. Accepted
                            extensions: <code>.pdb</code>, <code>.ent</code>, <code>.cif</code>, <code>.mmcif</code>.
                        </Li>
                    </Ul>

                    <Figure
                        src="/assets/documentation/pepedit_select-scaffold-source.png"
                        alt="Upload dialog showing PDB ID and File tabs for selecting a template source."
                        caption="Select a template source: PDB ID or local file."
                        openLightbox={openLightbox}
                        maxWidth="sm"
                    />

                    <P>
                        When a template is loaded, three things happen automatically:
                    </P>
                    <Ol>
                        <Li>The <strong>constraint mode</strong> switches to <em>3D template</em> (if not already active).</Li>
                        <Li>The <strong>Template panel</strong> opens in the right side of the 3D viewer, showing the mapping configuration controls.</Li>
                        <Li>The <strong>2D viewer collapses</strong> to give full visibility to the 3D viewer and template panel.</Li>
                    </Ol>
                    <P>
                        The template is parsed server-side, which standardizes atom names and determines available
                        chains and residues. If the PDB file contains warnings (e.g. non-standard residues, missing
                        atoms), a brief toast notification appears. PEP-EDIT also persists the template across page
                        navigation: if you leave and return, the template metadata is restored automatically.
                    </P>

                    {/* ── Configuring the mapping ── */}
                    <Sub2Title id="configuring-mapping">Configuring the mapping</Sub2Title>


                    <Figure
                        src="/assets/documentation/gifs/pepedit_constraints-3d.gif"
                        alt="Applying 3D template constraints on a single-chain peptide."
                        caption="Loading PDB structure 1CRN (crambin) as a 3D template and mapping chain A residues 9-18 onto the designed peptide. Clicking Generate 3D produces a conformer constrained to the template fold over the mapped region."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />
                    <P>
                        Once a template is loaded, the <strong>Template panel</strong> (opened via
                        the <Ic icon={LayersIcon} /> icon in the 3D toolbar, or automatically on first load)
                        provides the following controls:
                    </P>

                    <Sub3Title>Global controls (top of the panel)</Sub3Title>
                    <Ul>
                        <Li><strong>Template name</strong> displays the name of the loaded template (filename or PDB code).</Li>
                        <Li><strong>Remove template</strong> (trash icon) — deletes the template from the server and clears all mappings.</Li>
                        <Li><strong>Template overlay</strong> toggle — shows or hides the template structure in the 3D viewer as a semi-transparent overlay (see below).</Li>
                        <Li><strong>Opacity slider</strong> (5 %-60 %) — adjusts the overlay opacity.</Li>
                        <Li><strong>Lock camera</strong> toggle prevents the camera from resetting when conformers are generated.</Li>
                    </Ul>

                    <Sub3Title>Per-chain mapping (one block per designed chain)</Sub3Title>
                    <P>
                        Each designed chain (Chain A, Chain B, etc.) has its own mapping configuration:
                    </P>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 1.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
                                    <TableCell sx={{ fontWeight: 700, width: '28%' }}>Control</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow><TableCell><strong>Enable toggle</strong></TableCell><TableCell>Turns template constraints on or off for this chain. Disabled chains are embedded <i>de novo</i>.</TableCell></TableRow>
                                <TableRow><TableCell><strong>PDB chain</strong></TableCell><TableCell>Dropdown to select which chain from the template PDB to map onto this designed chain.</TableCell></TableRow>
                                <TableRow><TableCell><strong>Start residue</strong></TableCell><TableCell>First residue number (PDB numbering) in the template chain to use as the mapping source.</TableCell></TableRow>
                                <TableRow><TableCell><strong>End residue</strong></TableCell><TableCell>Last residue number. Together with Start, this defines the template window.</TableCell></TableRow>
                                <TableRow><TableCell><strong>Offset</strong></TableCell><TableCell>Number of leading designed-peptide positions to skip before mapping begins. Useful when the N-terminus has extra residues or a cap not present in the template.</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <P>
                        These controls are also reflected in the <strong>template mapping row</strong> in the chain
                        track, where each designed monomer is aligned with the corresponding template residue. The
                        template row shows three-letter amino-acid codes (e.g. ALA, THR) with PDB residue numbers
                        below each cell.
                    </P>

                    <P>
                        <strong>Automatic initialization</strong> — when a template is first loaded, PEP-EDIT
                        auto-configures all designed chains by sequentially assigning template residues from the
                        first template chain (Chain A gets the first N<sub>1</sub> residues, Chain B gets the
                        next N<sub>2</sub>, and so on). Caps are excluded from the amino-acid count, and an
                        N-terminal cap automatically sets the offset to 1.
                    </P>
                    <P>
                        <strong>Repacking</strong> — when you edit the mapping for one designed chain, PEP-EDIT
                        repacks all mappings on the same template chain to prevent overlaps. Chains are kept in
                        design order and each starts after the previous one ends.
                    </P>

                    <Sub3Title>Template overlay</Sub3Title>
                    <P>
                        When the template overlay is enabled (toggle in the Template panel), the template PDB is
                        displayed in the 3D viewer alongside the designed peptide's conformer. The overlay uses
                        a semi-transparent cartoon + line representation in neutral gray, while active
                        (mapped) chain segments are highlighted in gold and the specific mapped residue ranges
                        appear in amber at increased opacity. Masked residues are excluded from the amber highlight.
                    </P>
                    <P>
                        The overlay is an important visual aid for configuring the mapping: it lets you verify
                        which part of the template structure is being used, and helps you choose the right chain,
                        start/end residues, and offset. Hovering a residue in the 3D template overlay highlights
                        the corresponding cell in the template mapping row of the chain track.
                    </P>

                    <Figure
                        src="/assets/documentation/pepedit_constraints-3d_overlay-1crn.png"
                        alt="3D viewer showing the template overlay for PDB structure 1CRN (crambin). The mapped region is highlighted in amber, while the rest of the template is shown in semi-transparent gray."
                        caption="3D viewer showing the template overlay for 1CRN (crambin, chain A, residues 9-18). The mapped region is highlighted in amber, while the generated conformer (lines, colored by element) adopts a backbone conformation matching the constrained residues."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />

                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Using a 3D template automatically disables <strong>Auto sync</strong>. You must click{" "}
                        <strong>▶ Generate 3D</strong> manually to trigger conformer generation. This prevents
                        accidental regeneration while you are still configuring the template mapping.
                    </Alert>

                    {/* ── Masking residues ── */}
                    <Sub2Title id="masking-residues">Masking residues</Sub2Title>

                    <P>
                        Masking allows you to exclude individual template residues from the constraint set. Masked
                        residues are resolved <i>de novo</i> during embedding — their backbone atoms receive no
                        spatial reference from the template.
                    </P>

                    <Sub3Title>When to mask</Sub3Title>
                    <Ul>
                        <Li>The template residue at a given position is chemically incompatible with the designed monomer (e.g. Proline in the template vs. Glycine in the design).</Li>
                        <Li>Embedding fails because a specific position creates geometric conflicts — masking relaxes the constraint.</Li>
                        <Li>You want part of the peptide to deviate from the template fold while keeping the rest constrained.</Li>
                    </Ul>

                    <Sub3Title>How to mask</Sub3Title>
                    <Ul>
                        <Li><strong>Individual masking</strong> — hover over any template residue cell in the chain track. A small eye icon appears above the cell — click it to toggle the mask. Masked residues are shown with a warning-colored (amber) border and a <code>−</code> placeholder.</Li>
                        <Li><strong>Bulk masking</strong> — click the ⋮ menu on the template row and select <strong>Mask all</strong> or <strong>Unmask all</strong> to toggle all residues at once.</Li>
                    </Ul>

                    <Figure
                        src="/assets/documentation/gifs/pepedit_constraints-3d_masking-residues.gif"
                        alt="3D viewer showing the template overlay for 1CRN (crambin, chain A, residues 9-18) with masked residues. Masked residues are highlighted in amber, while the rest of the template is shown in semi-transparent gray."
                        caption="Masking terminal residues to resolve a failed embedding. A cyclic peptide mapped onto a linear template backbone (1CRN, chain A) initially fails due to topological incompatibility at the termini. After masking both terminal residues, conformer generation succeeds and the backbone aligns with the unmasked template positions."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />

                    <P>
                        Masks are automatically cleared when you change the chain, start, or end fields (since the
                        residue window changes). In the 3D viewer, the template overlay reflects the masking state:
                        only unmasked residues receive the amber highlight.
                    </P>

                    <Sub3Title>Troubleshooting failed embedding</Sub3Title>
                    <P>
                        Template-guided embedding can occasionally fail, especially when the designed peptide differs
                        significantly from the template. PEP-EDIT's iterative embedding strategy already tries
                        progressively relaxed subsets of the constraint set (100 % → 90 % → 80 % → 50 %,
                        see <MUILink href="#embedding">Iterative embedding strategy</MUILink>). If all attempts fail,
                        try the following:
                    </P>
                    <Ol>
                        <Li><strong>Mask problematic residues</strong> — the most common fix. Start by masking residues near the ends of the mapped range or near non-natural amino acids.</Li>
                        <Li><strong>Reduce the constraint window</strong> — shorten the mapped range by adjusting Start/End to exclude terminal residues.</Li>
                        <Li><strong>Increase the offset</strong> — if the N-terminal portion doesn't correspond well to the template, increase the offset so those positions are unconstrained.</Li>
                        <Li><strong>Disable constraints for specific chains</strong> — in multi-chain designs, disable template constraints for chains that are causing failures while keeping them for the chain(s) that need the template fold.</Li>
                        <Li><strong>Check the template quality</strong> — poor-resolution PDB structures or heavily modeled regions can provide unreliable backbone coordinates. Consider a higher-quality template or a different chain.</Li>
                    </Ol>

                    {/* ── Multi-chain peptides ── */}
                    <Sub2Title id="template-multi-chain">Multi-chain peptides</Sub2Title>

                    <P>
                        When the designed peptide has two or more chains, each chain gets its own independent mapping
                        entry. This enables several workflows:
                    </P>
                    <Ul>
                        <Li><strong>All chains from the same template chain</strong> — useful when the designed peptide is a segmented version of a single reference peptide. PEP-EDIT auto-allocates consecutive residue ranges and repacks automatically to prevent overlaps.</Li>
                        <Li><strong>Different template chains</strong> — each designed chain can map to a different chain from the template PDB. For example, if the template is a dimeric structure, Chain A of the design can map to template chain A, and Chain B to template chain B.</Li>
                        <Li><strong>Selective constraining</strong> — not all chains need to be enabled. You can constrain Chain A with a template and leave Chain B unconstrained (embedded <i>de novo</i>).</Li>
                    </Ul>

                    <Alert severity="info" sx={{ mb: 2 }}>
                        If two designed chains are mapped to overlapping residue ranges on the same template chain,
                        PEP-EDIT blocks the generation and displays a warning. You must resolve the overlap (adjust
                        start/end or switch one chain to a different template chain) before proceeding.
                    </Alert>

                    <P>
                        <strong>Choosing between constraint types</strong><br />
                        Secondary structure constraints are best when you want to impose a generic fold (e.g. all-helix,
                        helix-loop-helix) without a specific reference structure. Template-guided constraints are best
                        when you want the peptide to adopt the backbone conformation of a known experimental or modeled
                        structure.
                    </P>

                    <Divider sx={{ my: 4 }} />

                    {/* Complex topologies section moved to Examples & use cases */}

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
                        attachment points (R1-R4), leaving groups, stereochemistry assignments, and the metadata required for BILN integration.
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
                                <TableRow><TableCell><strong>Natural analog</strong></TableCell><TableCell>Single-letter code of closest natural AA</TableCell><TableCell>A-Y or X (no analog).</TableCell></TableRow>
                                <TableRow><TableCell><strong>PDB</strong></TableCell><TableCell>3-letter PDB residue code</TableCell><TableCell>Exactly 3 uppercase letters.</TableCell></TableRow>
                                <TableRow><TableCell><strong>Type</strong></TableCell><TableCell>Monomer category</TableCell><TableCell>Amino acid, Cap, or Other.</TableCell></TableRow>
                                <TableRow><TableCell><strong>Subtype</strong></TableCell><TableCell>Refinement of type</TableCell><TableCell>Natural / Non-natural / Cap.</TableCell></TableRow>
                                <TableRow><TableCell><strong>R-group label</strong></TableCell><TableCell>R-group number (R1-R4)</TableCell><TableCell>Must be unique per attachment point.</TableCell></TableRow>
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

                    <GroupTitle>Examples & use cases</GroupTitle>

                    {/* Microcin J25 */}
                    <SectionTitle id="example-microcin">Microcin J25 (lasso peptide)</SectionTitle>

                    <P>
                        Microcin J25 (MccJ25) is a lasso peptide produced by <em>Escherichia coli</em>, with the sequence:
                    </P>
                    <CodeBlock>GGAGHVPEYFVGIGTPISFYG</CodeBlock>
                    <P>
                        MccJ25 adopts a characteristic lasso topology, in which the C-terminal tail is threaded through a
                        macrolactam ring. This ring is formed by a side-chain-to-backbone bond between the Glu-8 side chain
                        and the backbone amine of the N-terminal Gly.
                    </P>
                    <P>
                        Here, we generate the 3D structure of a variant where Phe-19 is substituted with 3-chloro-L-phenylalanine
                        (<code>Phe_3Cl</code>). The first step is to build the BILN representation: the sequence is imported
                        via <strong>Upload sequence</strong>, the macrolactam bond is defined, and residue 19 is substituted
                        using the monomer library.
                    </P>

                    {/*
    [MEDIA SUGGESTION: GIF ~10-15s — importing the FASTA sequence via Upload sequence →
    defining the Glu-8-to-N-terminus side-chain-to-backbone cyclization bond in the 2D viewer →
    opening the monomer library and substituting Phe-19 with Phe_3Cl.
    Crop: Manual edition + 2D viewer, full width.]
*/}
                    <Figure
                        src="/assets/documentation/gifs/mccJ25_biln-setup.gif"
                        alt="Building the MccJ25 BILN representation"
                        caption="Importing the MccJ25 sequence, defining the side-chain-to-backbone macrolactam bond between Glu-8 and the N-terminal Gly, and substituting Phe-19 with 3-chloro-L-phenylalanine (Phe_3Cl) via the monomer library."
                        openLightbox={openLightbox}
                    />

                    <P>
                        The RDKit-based conformer generation process described above is unlikely to recover the lasso
                        topology spontaneously from the primary sequence alone. To enforce the correct threaded
                        backbone arrangement, we therefore uses the <strong>3D template</strong> facility of PEP-EDIT.
                        Providing the experimental structure (PDB ID: <code>1Q71</code>) as a template supplies the
                        required topological reference. Because the designed sequence matches the template length, the
                        mapping is pre-filled automatically and no further configuration is required.
                    </P>

                    {/*
    [MEDIA SUGGESTION: GIF ~8-10s — clicking Structural constraints → 3D template → entering PDB ID
    1Q71 → template loads with mapping pre-filled → clicking Generate 3D → conformer appears with
    lasso topology visible in the 3D viewer, template overlay shown.
    Crop: Chains section + 3D viewer + Template panel, full width.]
*/}
                    <Figure
                        src="/assets/documentation/gifs/mccJ25_template-conformer.gif"
                        alt="3D template-guided conformer generation for MccJ25"
                        caption="Loading PDB structure 1Q71 as a 3D template for MccJ25. The mapping is pre-filled automatically. Clicking Generate 3D produces a conformer that recovers the lasso topology, with the backbone aligned to the template."
                        openLightbox={openLightbox}
                    />
                    <Divider sx={{ my: 3 }} />

                    {/* Semaglutide */}
                    <SectionTitle id="example-semaglutide" variant="h6">Semaglutide</SectionTitle>

                    <P>
                        Semaglutide is a GLP-1 analogue therapeutic peptide featuring a linear backbone and a fatty diacid side chain. Its sequence incorporates
                        the non-natural amino acid Aib (alpha-aminoisobutyric acid) and a lipid moiety (SemaB) conjugated to the Lys20 side chain:
                    </P>
                    <CodeBlock>H-Aib-E-G-T-F-T-S-D-V-S-S-Y-L-E-G-Q-A-A-K(1,3)-E-F-I-A-W-L-V-R-G-R-G.SemaB(1,3)</CodeBlock>

                    <Figure
                        src="/assets/documentation/semaglutide_1d-2d.png"
                        alt="Semaglutide sequence and 2D structure"
                        caption="Sequence and 2D structure of semaglutide. The lipid moiety (SemaB) is attached to the Lys20 side chain "
                        openLightbox={openLightbox}
                        maxWidth="md"
                    />

                    <P>
                        While PEP-EDIT can generate a valid de novo conformation, a more realistic backbone fold can be obtained
                        by using an external prediction model as a 3D template. Here, a PEP-FOLD 4 model of the 31-residue GLP-1 analogue
                        sequence (without the lipid branch) was used as scaffold. Since PEP-FOLD 4 does not handle non-canonical
                        residues, the template begins at the third residue (Glu); an offset of 2 was therefore applied in PEP-EDIT
                        so that the first two positions (H-Aib) remain unconstrained while residues 3-31 are mapped onto the template
                        backbone. The lipid branch (SemaB) is resolved de novo during embedding -
                        it is the only region of the generated conformer that does not overlap with the template.
                    </P>

                    <Figure
                        src="/assets/documentation/semaglutide_structure-from-pepfold-template.png"
                        alt="Semaglutide with template"
                        caption="Template-guided generation of semaglutide. Left: 2D Sketch of the full 
                        lipidated peptide (backbone + SemaB branch). Right: 3D conformer (gray lines) 
                        overlaid on the PEP-FOLD 4 template (amber cartoon). The Template panel shows 
                        the mapping settings: chain A, residues 1-29, offset 2. The lipid moiety, visible 
                        as the protruding region with no template overlap, was generated de novo."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />

                    <Divider sx={{ my: 3 }} />

                    {/* Complex topologies */}
                    <SectionTitle id="example-topologies" variant="h6">Complex topologies</SectionTitle>

                    <P>
                        Beyond simple linear chains, PEP-EDIT supports cyclic, disulfide-bridged, branched, and
                        multi-chain peptide architectures. All of these topologies are expressed through BILN bond
                        annotations (see <MUILink href="#biln-notation">BILN notation</MUILink>) and can be created
                        either by typing BILN directly or by using the graphical
                        tools (<MUILink href="#linking">Link mode</MUILink>, chain-level menus).
                    </P>

                    {/* ── Head-to-tail cyclization ── */}
                    <SubTitle id="topo-cyclic">Head-to-tail cyclization</SubTitle>

                    <P>
                        A head-to-tail cyclic peptide is formed by connecting R1 of the first residue to R2 of
                        the last. There are three equivalent ways to create one:
                    </P>
                    <Ol>
                        <Li>
                            <strong>⋮ menu → Cyclize</strong> — click the ⋮ menu on a chain's Sequence row
                            and select <strong>Cyclize</strong>. This is the fastest route for a simple
                            head-to-tail ring.
                        </Li>
                        <Li>
                            <strong>Link mode</strong> — activate <Ic icon={DeviceHubIcon} label="Link" />,
                            click R1 on the first monomer, then R2 on the last.
                        </Li>
                        <Li>
                            <strong>BILN annotation</strong> — add matching bond IDs manually,
                            e.g. <code>G(1,1)-T-V-A-V-Q-F-L(1,2)</code>.
                        </Li>
                    </Ol>

                    {/*
    [MEDIA SUGGESTION — GIF ~8s: start with a linear octapeptide, click ⋮ → Cyclize,
    show the ring forming in the 2D viewer. Then show the same result via Link mode
    (click R1 on first residue, click R2 on last). Crop: chain track + 2D viewer.]
                    */}

                    <Figure
                        src="/assets/documentation/gifs/pepedit_cyclization-link-mode.gif"
                        alt="Creating a head-to-tail cyclic peptide via Link mode"
                        caption="Two ways to cyclize a linear octapeptide. 
                        First, using Link mode: click R1 on the first residue, then R2 on the last, a head-to-tail bond forms, 
                        creating a cyclic structure visible in the 2D Sketch. 
                        Alternatively, clicking ⋮ menu → Cyclize shortcut creates a head-to-tail 
                        bond in one click. Both approaches produce the same cyclic structure, 
                        visible in the 2D Sketch."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />


                    <P>
                        Cyclic peptides can freely mix L- and D-amino acids. Use the <strong>Mirror</strong> action
                        (⋮ menu) to swap L-forms to their D equivalents across an entire chain
                        (e.g. A ↔ dA). Mirror only affects the 20 standard amino acids — non-natural
                        residues are left unchanged. For those, replace individual residues manually
                        via the monomer library.
                    </P>

                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 1.5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
                                    <TableCell sx={{ fontWeight: 700 }}>Example</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>BILN</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow><TableCell>Cyclic octapeptide (all-L)</TableCell><TableCell><code>G(1,1)-T-V-A-V-Q-F-L(1,2)</code></TableCell></TableRow>
                                <TableRow><TableCell>3 D-amino acids</TableCell><TableCell><code>D(1,1)-D-P-T-dP-dR-Q-dQ(1,2)</code></TableCell></TableRow>
                                <TableRow><TableCell>4 D-amino acids</TableCell><TableCell><code>dR(1,1)-Q-dP-dQ-R-dE-P-Q(1,2)</code></TableCell></TableRow>
                                <TableRow><TableCell>Cilengitide (cyclic RGD)</TableCell><TableCell><code>R(1,1)-G-D-dF-meV(1,2)</code></TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/*
    [MEDIA SUGGESTION — Screenshot: side-by-side 2D sketches of the all-L and mixed
    L/D octapeptides, showing the different ring shapes. Reuse existing OctaL.png and
    OctaD4L.png assets if appropriate, or a single composite figure.]
                    */}

                    <Figure
                        src="/assets/documentation/pepedit_mirror-comparison.png"
                        alt="Side-by-side comparison of an all-L octapeptide helix (left) and its all-D mirror (right), both with all-H secondary structure constraints. The cartoon representation, colored blue (N-terminus) to red (C-terminus), shows the opposite helix handedness."
                        caption="Effect of the Mirror operation on helix handedness. Left: the all-L peptide (G-T-V-A-V-Q-F-L) forms a right-handed α-helix. Right: after mirroring to all-D (G-dT-dV-dA-dV-dQ-dF-dL), the same all-H constraint produces a left-handed helix. Both conformers are shown as cartoon colored from blue (N-terminus) to red (C-terminus)."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />
                    {/* ── Disulfide bridges ── */}
                    <SubTitle id="topo-disulfide">Disulfide bridges</SubTitle>

                    <P>
                        A disulfide bridge connects the side-chain thiol groups (R3) of two cysteine residues.
                        In BILN, both cysteines carry the same bond ID on R3:
                    </P>
                    <CodeBlock>A-C(1,3)-G-A-G-C(1,3)-D</CodeBlock>
                    <P>
                        This creates bond 1 between the R3 attachment points of the two Cys residues. The same
                        approach works with <strong>Link mode</strong>: click R3 on the first Cys, then R3 on the
                        second.
                    </P>
                    <P>
                        Multiple disulfide bridges use distinct bond IDs
                        (e.g. <code>C(1,3)-G-C(2,3)-G-C(1,3)-G-C(2,3)</code> for two bridges). This pattern
                        extends naturally to peptides with any number of disulfide pairs.
                    </P>

                    {/*
    [MEDIA SUGGESTION — GIF ~8s: start from a linear peptide with two Cys,
    enter Link mode, click R3 on first Cys → R3 on second Cys → disulfide bridge
    appears in 2D viewer as a cross-link. Crop: chain track + 2D viewer.]
                    */}

                    {/* ── Branched peptides ── */}
                    <SubTitle id="topo-branched">Branched peptides</SubTitle>

                    <P>
                        Branching requires a monomer with three or more R-groups — most commonly
                        Lysine (R1 backbone N, R2 backbone C, R3 side-chain Nε). The branch is written
                        as a second chain separated by <code>.</code>, connected via bond annotations:
                    </P>
                    <CodeBlock>A-G-K(1,3)-G-A-D.E-H-I-A(1,2)</CodeBlock>
                    <P>
                        Here, bond 1 connects R3 of Lys (main chain) to R2 of Ala (branch terminus),
                        effectively grafting the E-H-I-A branch onto the Lys side chain. This is the same
                        mechanism used in semaglutide to attach a lipid moiety to Lys20
                        (see <MUILink href="#example-semaglutide">Semaglutide example</MUILink>).
                    </P>
                    <P>
                        Any monomer with a free R3 (or higher) can serve as a branching point — not just Lysine.
                        Check the <MUILink href="#monomer-library-ref">Monomer library reference</MUILink> to see
                        available R-groups for each building block.
                    </P>

                    {/*
    [MEDIA SUGGESTION — Screenshot or GIF ~6s: building a Lys-branched peptide.
    Show the branch appearing in the 2D viewer as a side arm off the main chain.
    Crop: 2D viewer showing the branched topology.]
                    */}

                    {/* ── Multi-chain & inter-chain bonds ── */}
                    <SubTitle id="topo-multi-chain">Multi-chain & inter-chain bonds</SubTitle>

                    <P>
                        Multi-chain designs are created by adding chains with the <strong>+</strong> button
                        in the Chains section header. In BILN, chains are separated by
                        dots: <code>A-C-G-K.E-H-C-I</code> represents two independent chains.
                    </P>
                    <P>
                        Chains can be connected by inter-chain bonds using the same bond-annotation mechanism.
                        A common pattern is an inter-chain disulfide bridge:
                    </P>
                    <CodeBlock>A-C(1,3)-G-A-G.E-H-C(1,3)-I</CodeBlock>
                    <P>
                        Bond 1 links R3 of Cys in the first chain to R3 of Cys in the second chain, forming
                        a covalent cross-link between the two peptides. This can be combined with any other
                        topology, for example, a cyclic chain connected to a linear chain via a disulfide.
                    </P>

                    {/*
    [MEDIA SUGGESTION — GIF ~10s: add a second chain via the + button, enter Link mode,
    create an inter-chain disulfide by clicking R3 on a Cys in chain A then R3 on a Cys
    in chain B. Show the cross-link appearing in the 2D viewer. Crop: chain track + 2D viewer.]
                    */}

                    <Figure
                        src="/assets/documentation/gifs/pepedit_interchain-disulfide-bond.gif"
                        alt="Creating a multi-chain peptide with an inter-chain disulfide bond: a second chain is added via the + button, monomers are appended from the library, and Link mode connects the two cysteine residues across chains."
                        caption="Building a multi-chain peptide with an inter-chain disulfide bridge. A second chain is added with the + button, then monomers are appended from the library. Link mode is used to connect R3 of the cysteine in chain 1 to R3 of the cysteine in chain 2, forming the cross-link visible in the 2D Sketch."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />

                    <Alert severity="info" sx={{ mb: 2 }}>
                        All topologies can be combined freely: a multi-chain design can include cyclic chains,
                        disulfide bridges, and branches simultaneously. The only constraints are R-group
                        availability - each R-group can participate in at most one extra bond.
                    </Alert>

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
                        SMILES exported by PEP-EDIT can be passed to structure-prediction tools such
                        as <MUILink href="https://www.chaidiscovery.com/" target="_blank" rel="noreferrer">Chai-1</MUILink>,{" "}
                        <MUILink href="https://alphafoldserver.com/" target="_blank" rel="noreferrer">AlphaFold 3</MUILink>,{" "}
                        or <MUILink href="https://boltz.bio/boltz2" target="_blank" rel="noreferrer">Boltz</MUILink> — together with a protein sequence — to predict
                        protein-peptide complexes involving modified peptides.
                    </P>
                    <P>
                        As an example, the peptide drug Degarelix was built in PEP-EDIT from the
                        following BILN:
                    </P>
                    <CodeBlock>ac-D_2Nal-D_Phe_4Cl-D_3Pal-S-Phe_4Sdihydroorotamido-D_Phe_4ureido-L-G-Lys_iPr-dA-am</CodeBlock>
                    <P>
                        PEP-EDIT generates the corresponding SMILES:
                    </P>
                    <CodeBlock>CC(=O)N[C@H](Cc1ccc2ccccc2c1)C(=O)N[C@H](Cc1ccc(Cl)cc1)C(=O)N[C@H](Cc1cccnc1)C(=O)N[C@@H](CO)C(=O)N[C@@H](Cc1ccc(NC(=O)[C@@H]2CC(=O)NC(=O)N2)cc1)C(=O)N[C@H](Cc1ccc(NC(N)=O)cc1)C(=O)N[C@@H](CC(C)C)C(=O)NCC(=O)N[C@@H](CCCC[NH2+]C(C)C)C(=O)N[C@H](C)C(N)=O</CodeBlock>
                    <P>
                        This SMILES was submitted to the Chai-1 webserver together with the GnRH
                        receptor sequence to predict the Degarelix-GnRH receptor complex:
                    </P>

                    <Figure
                        src="/assets/documentation/degarelix_gnrhr_chai.png"
                        alt="Degarelix-GnRH receptor complex predicted by Chai-1"
                        caption="Degarelix-GnRH receptor complex predicted with the Chai-1 webserver using a SMILES exported from PEP-EDIT."
                        openLightbox={openLightbox}
                        maxWidth="sm"
                    />

                    <P>
                        Scripts for preparing AlphaFold 3, Chai-1, and Boltz inputs from SMILES are
                        available{" "}
                        <MUILink href="https://github.com/alexisdougha/smiles-fold-input-builder" target="_blank" rel="noreferrer">here</MUILink>.
                    </P>

                    <Divider sx={{ my: 3 }} />

                    {/* Simulated tempering */}
                    <SectionTitle id="example-st" variant="h6">Simulated tempering</SectionTitle>

                    <P>
                        PEP-EDIT's outputs can be fed directly
                        into <MUILink href="https://openmm.org/" target="_blank" rel="noreferrer">OpenMM</MUILink>{" "}
                        for molecular dynamics simulations. For peptides containing non-natural
                        residues which are not covered by standard protein force-field residue
                        templates, two complementary exports are needed:
                    </P>
                    <Ul>
                        <Li><strong>SMILES</strong> which provides the complete molecular graph (bond orders, formal charges, stereochemistry), required for force-field parameterization.</Li>
                        <Li><strong>PDB</strong> which provides the 3D atomic coordinates as the starting conformation.</Li>
                    </Ul>
                    <P>
                        Neither format alone is sufficient for non-standard building blocks: PDB files do not reliably
                        encode bond orders or formal charges beyond canonical residues, while SMILES carry no spatial
                        information.
                    </P>
                    <P>
                        As an example, cilengitide — a cyclic RGD pentapeptide — was built in PEP-EDIT
                        from the following BILN:
                    </P>
                    <CodeBlock>R(1,1)-G-D-dF-meV(1,2)</CodeBlock>
                    <P>
                        The exported SMILES and PDB were used to set up a simulated tempering (ST) run,
                        which samples conformational space across a range of temperatures. The simulation
                        recovered the experimental conformation (PDB: <code>1L5G</code>) with an RMSD of ~0.7 Å:
                    </P>

                    <Figure
                        src="/assets/documentation/ST-cilengitide.png"
                        alt="Simulated tempering conformational sampling for cilengitide"
                        caption="Cilengitide conformational space sampled via simulated tempering with OpenMM. Left: RMSD to experimental conformation (~1 Å). Center: sampling includes experimental conformation (black dot). Right: closest conformer at 0.7 Å from experiment."
                        openLightbox={openLightbox}
                    />

                    <P>
                        Scripts for setting up simulated tempering simulations from PEP-EDIT outputs
                        are available{" "}
                        <MUILink href="https://github.com/samuelmurail/Pep-Edit_ST" target="_blank" rel="noreferrer">here</MUILink>.
                    </P>

                    <Divider sx={{ my: 3 }} />

                    {/* Docking */}
                    <SectionTitle id="example-docking" variant="h6">Peptide docking</SectionTitle>

                    <P>
                        PEP-EDIT's PDB output can serve as input for peptide-protein docking. 
                        Here, we illustrate this with the BH3 domain of the pro-apoptotic BAD protein, 
                        a 25-residue helical motif that binds anti-apoptotic Bcl-xL. 
                        The peptide was built from its BILN sequence:
                    </P>
                    <CodeBlock>N-L-W-A-A-Q-R-Y-G-R-E-L-R-R-M-S-D-E-F-V-D-S-F-K-K</CodeBlock>
                    <P>
                        An all alpha-helix secondary-structure constraint was applied to the entire chain, 
                        consistent with the known helical fold of BH3 domains:
                    </P>

                    <Figure
                        src="/assets/documentation/pepedit_peptide-bad-helical.png"
                        alt="BAD peptide generated as an all-helical conformer"
                        caption="All-helical conformation of the 25-residue BAD peptide generated with secondary-structure constraints."
                        openLightbox={openLightbox}
                        maxWidth="lg"
                    />

                    <P>
                        The exported PDB was then docked into the Bcl-xL protein
                        structure (PDB: <code>1G5J</code>)
                        using{" "}
                        <MUILink href="https://ccsb.scripps.edu/adcp/" target="_blank" rel="noreferrer">
                            AutoDock CrankPep (ADCP)
                        </MUILink>.
                        The best-scoring model (ΔG = −41.4 kcal/mol) closely reproduces the
                        experimental peptide position, with an RMSD &lt; 1 Å for the central
                        residues:
                    </P>

                    <Figure
                        src="/assets/documentation/BAD_docking_2.png"
                        alt="BAD peptide docked into Bcl-xL"
                        caption="Bcl-xL (cyan) with experimental BH3 peptide (magenta) and docked BH3 peptide (green)."
                        openLightbox={openLightbox}
                        maxWidth="sm"
                    />

                    <Divider sx={{ my: 4 }} />

                    {/* ════════════════════════════════════════════
                        4 · REFERENCE
                       ════════════════════════════════════════════ */}

                    <GroupTitle>Reference</GroupTitle>

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
                        src="/assets/documentation/pepedit_monomer-card-details.png"
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

                    <GroupTitle>Troubleshooting & policies</GroupTitle>

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
                fullScreen
                PaperProps={{ sx: { bgcolor: "rgba(0,0,0,0.85)", boxShadow: "none" } }}
            >
                <IconButton
                    aria-label="Close"
                    onClick={closeLightbox}
                    sx={{ position: "absolute", top: 8, right: 8, zIndex: 2, color: "grey.100", bgcolor: "rgba(0,0,0,0.4)", "&:hover": { bgcolor: "rgba(0,0,0,0.6)" } }}
                >
                    <CloseIcon />
                </IconButton>
                <Box
                    onClick={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}
                    sx={{
                        width: "100%", height: "100%",
                        display: "flex", justifyContent: "center", alignItems: "center",
                        overflow: "auto",
                        p: 2,
                    }}
                >
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
                            <Box
                                component="img"
                                src={lightbox.src}
                                alt={lightbox.alt}
                                sx={{
                                    borderRadius: 2, boxShadow: 4,
                                    ...(lightbox.lbMax
                                        ? { maxWidth: lightbox.lbMax, width: "100%" }
                                        : { maxWidth: "100%", maxHeight: "100%" }),
                                }}
                            />
                        )
                    )}
                </Box>
            </Dialog>
        </Box >
    );
};

export default Documentation;
