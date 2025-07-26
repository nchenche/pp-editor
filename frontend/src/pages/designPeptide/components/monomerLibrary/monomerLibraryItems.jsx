import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Card, CardContent, CardActions, IconButton, Box, Tooltip, Typography } from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";



const MonomerLibraryItem = ({ monomer, onAdd, onInfo = () => { } }) => {
    return (
        <Card
            variant="outlined"
            sx={{
                width: 95, // ~w-20 in Tailwind
                minWidth: 0,
                p: 0,
                borderRadius: 2,
                boxShadow: 2,
                transition: "transform 0.2s",
                "&:hover": { transform: "scale(1.05)", zIndex: 2 },
                bgcolor: "background.paper",
                position: "relative",
            }}
        >
            {/* Top bar: actions */}
            <CardActions
                sx={{
                    p: 0,
                    pb: 0,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    zIndex: 3,
                    display: "flex",
                    justifyContent: "space-around",
                    background: "rgba(30,41,59,0.97)", // slate-800
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                }}
            >
                <Tooltip title="Add monomer" placement="top" arrow>
                    <IconButton
                        size="small"
                        color="success"
                        onClick={onAdd}
                        sx={{ p: 0.6, color: "grey.400" }}
                        className='hover:text-slate-200'
                    >
                        <AddCircleIcon fontSize="inherit" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="View details" placement="top" arrow>
                    <IconButton
                        size="small"
                        color="info"
                        onClick={onInfo}
                        sx={{ p: 0.6, color: "grey.400" }}
                        className='hover:text-slate-200'

                    >
                        <InfoOutlinedIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </CardActions>
            {/* Main area: structure image */}
            <Box
                sx={{
                    mt: 3.6, // Push content below action bar
                    // mb: 0.5,
                    pt: 0.5,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 56,
                    overflow: "hidden",
                }}
                onMouseDown={e => e.preventDefault()}
            >
                <Box
                    component="img"
                    src={`data:image/png;base64,${monomer.image_url}`}
                    alt={`Structure of ${monomer.symbol}`}
                    sx={{
                        // width: "75%",
                        objectFit: "contain",
                        // mb: 0.5,
                        maxHeight: 56,
                        userSelect: "none",
                        pointerEvents: "none",
                    }}
                />
            </Box>
            {/* PDB code (bold) and name (ellipsis) */}
            <CardContent sx={{
                p: 0.5,
                textAlign: "center",
                // border: "1px solid rgba(209,213,219,0.5)", // slate-300
                // height: 20,
                pb: "4px !important", // Override default padding-bottom
            }}>
                <Typography
                    variant="caption"
                    fontWeight="bold"
                    color="text.primary"
                    sx={{ display: "block", fontSize: "0.68rem", lineHeight: 1.1, mb: 0.1 }}
                    noWrap
                >
                    {monomer.pdbName}
                </Typography>
                <Tooltip title={monomer.m_name} placement="bottom" arrow disableInteractive>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                            display: "block",
                            fontSize: "0.64rem",
                            lineHeight: 1.1,
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            maxWidth: "100%",
                        }}
                        noWrap
                    >
                        {monomer.m_name}
                    </Typography>
                </Tooltip>
            </CardContent>
        </Card >
    );
}


export const MonomerLibraryItems = ({ monomers, handleOnDoubleClick }) => {
    return (
        <div className="relative flex flex-wrap justify-center gap-4">
            {monomers.map((monomer) => (
                <MonomerLibraryItem
                    key={monomer._id}
                    monomer={monomer}
                    onAdd={handleOnDoubleClick}
                    onInfo={() => console.log("More info for", monomer.symbol)}
                />
            ))}
        </div>
    )
}
