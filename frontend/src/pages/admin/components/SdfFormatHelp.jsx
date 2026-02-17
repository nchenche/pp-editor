import React, { useState } from 'react';
import {
    Box,
    Typography,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const ALANINE_EXAMPLE = `
     RDKit          2D

  7  6  0  0  0  0  0  0  0  0999 V2000
    2.0625    0.7145    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.2375    0.7145    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.8250    1.4289    0.0000 N   0  0  0  0  0  0  0  0  0  0  0  0
    0.8250    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    1.2375    2.1434    0.0000 R#  0  0  0  0  0  0  0  0  0  0  0  0
    1.2375   -0.7145    0.0000 R#  0  0  0  0  0  0  0  0  0  0  0  0
  2  1  1  1
  2  3  1  0
  3  6  1  0
  2  4  1  0
  4  7  1  0
  4  5  2  0
M  RGP  2   6   1   7   2
V    6 *
V    7 *
M  END
>  <m_name>  (1) 
Alanine

>  <symbol>  (1) 
A

>  <m_abbr>  (1) 
A

>  <m_type>  (1) 
aa

>  <m_subtype>  (1) 
natural

>  <m_Rgroups>  (1) 
H,OH,None,None

>  <m_RgroupIdx>  (1) 
5,6,None,None

>  <m_attachmentPointIdx>  (1) 
2,3,None,None

>  <natAnalog>  (1) 
A

>  <pdbName>  (1) 
ALA

$$$$`.trim();

const monoSx = { fontFamily: 'monospace', fontSize: '0.78rem' };
const tagSx = { fontFamily: 'monospace', fontSize: '0.75rem', bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5 };

const Tag = ({ children }) => (
    <Box component="code" sx={tagSx}>{children}</Box>
);

/**
 * Collapsible help section explaining what a pepedit-compatible SDF file is,
 * what tags are required, how R-groups map to R1–R4, and a valid Alanine example.
 *
 * Designed to be inserted in the "Upload SDF file" dialog of both
 * PublicMonomers and PersonalMonomers admin pages.
 */
export default function SdfFormatHelp() {
    const [expanded, setExpanded] = useState(false);

    const handleChange = (panel) => (_event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>

            {/* Soft expert warning */}
            <Alert
                severity="info"
                variant="outlined"
                icon={<WarningAmberIcon fontSize="small" />}
                sx={{ py: 0.25, '& .MuiAlert-message': { fontSize: '0.8rem' } }}
            >
                This mode is intended for users who already have an SDF file.
                If you&apos;re new to pepedit, consider <b>Create from scratch</b> instead.
            </Alert>

            {/* ── Accordion 1: What is a pepedit-compatible SDF? ── */}
            <Accordion
                disableGutters
                elevation={0}
                variant="outlined"
                expanded={expanded === 'format'}
                onChange={handleChange('format')}
                sx={{ '&:before': { display: 'none' }, borderRadius: '8px !important' }}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        What is a pepedit-compatible SDF?
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 1 }}>
                        A standard SDF record with specific SD tags that describe the monomer for pepedit.
                        Here&apos;s what your file must satisfy:
                    </Typography>

                    <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.5, fontSize: '0.8rem', color: 'text.secondary' } }}>
                        <li>Each record must end with the <Tag>$$$$</Tag> delimiter.</li>
                        <li>The molfile block must contain <Tag>M&nbsp;&nbsp;END</Tag> — SD tags come after it.</li>
                        <li>
                            Tag headers must follow <Tag>{'> <tagName>'}</Tag> format exactly
                            (both <code>&lt;</code> and <code>&gt;</code> required).
                        </li>
                        <li>The molblock must be parseable by RDKit (valid atom/bond/counts lines).</li>
                    </Box>

                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8rem', mt: 1.5, mb: 0.5 }}>
                        Required SD tags (strict validation)
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {['m_name', 'symbol', 'm_abbr', 'm_type', 'm_subtype', 'm_Rgroups', 'm_RgroupIdx', 'm_attachmentPointIdx', 'natAnalog', 'pdbName'].map((t) => (
                            <Chip key={t} label={t} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.72rem', height: 22 }} />
                        ))}
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', mt: 1 }}>
                        <Tag>symbol</Tag> and <Tag>m_abbr</Tag> should match.
                        &ensp;•&ensp;
                        <Tag>m_Rgroups</Tag>, <Tag>m_RgroupIdx</Tag>, and <Tag>m_attachmentPointIdx</Tag> must each have <b>exactly 4 comma-separated tokens</b>.
                    </Typography>
                </AccordionDetails>
            </Accordion>

            {/* ── Accordion 2: R-group mapping ── */}
            <Accordion
                disableGutters
                elevation={0}
                variant="outlined"
                expanded={expanded === 'rgroups'}
                onChange={handleChange('rgroups')}
                sx={{ '&:before': { display: 'none' }, borderRadius: '8px !important' }}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        How R-groups (R1–R4) are defined
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 1 }}>
                        Three tags work together to define up to 4 attachment points.
                        The <b>position in the comma-separated list</b> determines R1, R2, R3, or R4:
                    </Typography>

                    <Box
                        sx={{
                            bgcolor: 'action.hover',
                            borderRadius: 1,
                            p: 1.5,
                            ...monoSx,
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.7,
                        }}
                    >
                        {`m_Rgroups ............... H,OH,None,None
                          │ │
                         R1 R2       (leaving groups)

m_RgroupIdx ............. 5,6,None,None
                          │ │
                         R1 R2       (0-based dummy atom indices)

m_attachmentPointIdx .... 2,3,None,None
                          │ │
                         R1 R2       (0-based attachment atom indices)`}
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', mt: 1.5 }}>
                        In the Alanine example above:
                    </Typography>
                    <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.4, fontSize: '0.78rem', color: 'text.secondary' } }}>
                        <li><b>R1</b> — leaving group <Tag>H</Tag>, dummy atom at index 5, bonded to atom 2 (nitrogen).</li>
                        <li><b>R2</b> — leaving group <Tag>OH</Tag>, dummy atom at index 6, bonded to atom 3 (carbonyl carbon).</li>
                        <li><b>R3 &amp; R4</b> — unused → <Tag>None</Tag>.</li>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', mt: 1 }}>
                        <b>Tip:</b> <Tag>m_RgroupIdx</Tag> values should point to dummy atoms (<code>R#</code> / <code>*</code>),
                        and <Tag>m_attachmentPointIdx</Tag> should be a direct neighbor of the corresponding dummy.
                        All indices are <b>0-based</b> (first atom = 0).
                    </Typography>
                </AccordionDetails>
            </Accordion>

            {/* ── Accordion 3: Alanine example ── */}
            <Accordion
                disableGutters
                elevation={0}
                variant="outlined"
                expanded={expanded === 'example'}
                onChange={handleChange('example')}
                sx={{ '&:before': { display: 'none' }, borderRadius: '8px !important' }}
            >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 36, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        Example: valid Alanine record
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.78rem', mb: 1 }}>
                        Below is a complete, valid SDF record for Alanine. You can use it as a template for
                        building your own monomer records.
                    </Typography>
                    <Box
                        sx={{
                            bgcolor: 'grey.900',
                            color: 'grey.100',
                            borderRadius: 1,
                            p: 1.5,
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            lineHeight: 1.5,
                            whiteSpace: 'pre',
                            overflow: 'auto',
                            maxHeight: 320,
                        }}
                    >
                        {ALANINE_EXAMPLE}
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
}
