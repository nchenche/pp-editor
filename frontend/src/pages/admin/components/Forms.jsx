import { useForm, Controller } from "react-hook-form"

import {
    Button,
    FormHelperText,
    FormControl,
    InputLabel,
    MenuItem,
    TextField,
    Select,
} from '@mui/material';
import createPalette from "@mui/material/styles/createPalette";



export const NewMonomerSettingForm = () => {
    const sxOptions = { margin: 0.85, minWidth: 235}
    const { control, handleSubmit, formState: { errors }, } = useForm({
        defaultValues: {
            name: "",
            symbol: "",
            selectType: "",
            selectSubType: "",
            naturalAnalog: "",
            pdbName: "",
        },
        mode: 'onBlur',  // or 'onChange', 'onSubmit', etc.
    });

    const onSubmit = (data) => console.log(data);

    return (
        /* "handleSubmit" will validate inputs before invoking "onSubmit" */
        <form onSubmit={handleSubmit(onSubmit)}>

            <section>
                <FormControl sx={sxOptions} variant="outlined" margin="normal" size="small">
                    <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                label="Name"
                                {...field}
                                size="small"
                            />
                        )}
                    />
                </FormControl>
            </section>

            <section>
                <FormControl sx={sxOptions} variant="outlined" margin="normal" size="small">
                    <Controller
                        name="symbol"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                label="Symbol"
                                {...field}
                                size="small"
                            />
                        )}
                    />
                </FormControl>
            </section>

            <section>
                <FormControl sx={sxOptions} variant="outlined" margin="normal" size="small">
                    <Controller
                        name="naturalAnalog"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                label="Natural analog"
                                {...field}
                                size="small"
                            />
                        )}
                    />
                </FormControl>
            </section>


            <section>
                <FormControl sx={sxOptions} variant="outlined" margin="normal" size="small">
                    <InputLabel id="select-type" error={!!errors.selectType}>Select Type</InputLabel>
                    <Controller
                        name="selectType"
                        control={control}
                        defaultValue=""
                        rules={{ required: 'Selection is required' }}
                        render={({
                            field
                        }) => (
                            <>
                                <Select
                                    {...field}
                                    labelId="select-type"
                                    label="Select Type"
                                    error={!!errors.selectType}
                                >
                                    <MenuItem value="aminoAcid">Amino acid</MenuItem>
                                    <MenuItem value="cap">Cap</MenuItem>
                                </Select>
                            </>
                        )}
                    />
                    {errors.selectType && (
                        <FormHelperText error>{errors.selectType.message}</FormHelperText>
                    )}
                </FormControl>
            </section>

            <section>
                <FormControl sx={sxOptions} variant="outlined" margin="normal" size="small">
                    <InputLabel id="select-subtype" error={!!errors.selectSubType}>Select Subtype</InputLabel>
                    <Controller
                        name="selectSubType"
                        control={control}
                        defaultValue=""
                        rules={{ required: 'Selection is required' }}
                        render={({
                            field
                        }) => (
                            <>
                                <Select
                                    {...field}
                                    labelId="select-subtype"
                                    label="Select subtype"
                                    error={!!errors.selectSubType}
                                >
                                    <MenuItem value="natural">Natural</MenuItem>
                                    <MenuItem value="nonNatural">Non natural</MenuItem>
                                </Select>
                            </>
                        )}
                    />
                    {errors.selectSubType && (
                        <FormHelperText error>{errors.selectSubType.message}</FormHelperText>
                    )}
                </FormControl>
            </section>

            <section>
                <FormControl sx={sxOptions} variant="outlined" margin="normal" size="small" error={!!errors.name}>
                    <Controller
                        name="pdbName"
                        control={control}
                        rules={{
                            required: 'PDB name is required',
                            minLength: { value: 3, message: 'Minimum length is 3 characters' },
                            maxLength: { value: 3, message: 'Maximum length is 3 characters' },
                        }}
                        render={({
                            field
                        }) => (
                            <TextField
                                label="PDB name"
                                error={!!errors.pdbName}
                                {...field}
                                size="small"
                            />
                        )}
                    />
                    {errors.pdbName && (
                        <FormHelperText error>{errors.pdbName.message}</FormHelperText>
                    )}
                </FormControl>

            </section>

            <Button variant="contained" type="submit">Submit</Button>
        </form>
    )
}