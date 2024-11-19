import { useState, Fragment } from 'react';

import { useForm, Controller } from "react-hook-form"

import {
    Box,
    Button,
    FormHelperText,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';

import Grid from '@mui/material/Grid2';

import {
    TabContext,
    TabList,
    TabPanel
} from '@mui/lab';

import {
    MolNameForm,
    MolSymbolForm,
    MolAnalogForm,
    MolPDBForm,
    MolTypeForm,
    MolSubTypeForm,
    GroupLabelForm,
    GroupLeavingForm
} from './MoleculeSettingForms/Forms'

import createPalette from "@mui/material/styles/createPalette";


const extractSmilesIndices = (str) => {
    const regex = /\[(\d+)\*\]|\*/g;
    const indices = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
        if (match[1]) {
            indices.push(parseInt(match[1], 10));
        } else {
            indices.push('*');
        }
    }
    return indices;
};


const createRGroupObject = (baseName, groupIndices) => {
    return groupIndices.reduce((accumulator, currentValue) => {
        accumulator[baseName + currentValue] = '';
        return accumulator;
    }, {});
};


const GroupTabs = ({ groupIndices, sxOptions, control, errors }) => {
    const [value, setValue] = useState(groupIndices[0].toString());

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    return (
        <Box sx={{ width: '100%', typography: 'body1' }}>
            <TabContext value={value}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        centered
                        value={value}
                        onChange={handleChange}
                        scrollButtons="auto"
                        aria-label="Scrollable Tabs"
                    >
                        {groupIndices.map((index) => (
                            <Tab
                                label={`Group ${index}`}
                                value={index.toString()}
                                key={index}
                            />
                        ))}
                    </Tabs>
                </Box>
                {groupIndices.map((index) => (
                    <TabPanel value={index.toString()} key={index}>
                        <Typography>Content for Group {index}</Typography>

                        <GroupLabelForm
                            sxOptions={sxOptions}
                            control={control}
                            error={errors[`rgroup${index}`]}
                            index={index}
                        />

                    </TabPanel>
                ))}
            </TabContext>
        </Box>
    );
};


export const NewMonomerSettingForm = ({ smiles }) => {
    const sxOptions = { margin: 0.85, width: 180 }
    const groupIndices = extractSmilesIndices(smiles);
    const defaultValues = {
        name: "",
        symbol: "",
        selectType: "",
        selectSubType: "",
        naturalAnalog: "",
        pdb: "",
    };
    const groupLabelValues = createRGroupObject("groupLabel", groupIndices);
    const groupLeavingValues = createRGroupObject("groupLeaving", groupIndices);

    const { control, handleSubmit, formState: { errors }, } = useForm({
        defaultValues: { ...defaultValues, ...groupLabelValues, ...groupLeavingValues },
        mode: 'onBlur',  // or 'onChange', 'onSubmit', etc.
    });

    const onSubmit = (data) => console.log(data);

    return (
        <form onSubmit={handleSubmit(onSubmit)}>

            <Grid container rowSpacing={0.5} columnSpacing={{ xs: 0.5, sm: 1, md: 2 }}>

                <Grid size={{ xs: 12, md: 6 }}>
                    <MolNameForm
                        sxOptions={sxOptions}
                        control={control}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <MolSymbolForm
                        sxOptions={sxOptions}
                        control={control}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <MolAnalogForm
                        sxOptions={sxOptions}
                        control={control}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <MolPDBForm
                        sxOptions={sxOptions}
                        control={control}
                        error={errors.pdb}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <MolTypeForm
                        sxOptions={sxOptions}
                        control={control}
                        error={errors.selectType}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <MolSubTypeForm
                        sxOptions={sxOptions}
                        control={control}
                        error={errors.selectSubType}
                    />
                </Grid>

                {groupIndices.map((index) => (
                    <Fragment key={index}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <GroupLabelForm
                                sxOptions={sxOptions}
                                control={control}
                                error={errors[`groupLabel${index}`]}
                                index={index}
                            />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <GroupLeavingForm
                                sxOptions={sxOptions}
                                control={control}
                                error={errors[`groupLeaving${index}`]}
                                index={index}
                            />
                        </Grid>
                    </Fragment>
                ))}

            </Grid>
            <div>
                <Button variant="contained" type="submit">Submit</Button>

            </div>
        </form>
    )
}