import { TextField } from "@mui/material";


export function SequenceInput({ value, onChangeValue, error, helperText, ...props }) {
  return (
    <TextField
      label="Enter BILN sequence"
      value={value}
      onChange={(e) => onChangeValue(e.target.value)}
      variant="outlined"
      size="small"
      fullWidth
      autoComplete="off"
      spellCheck={false}
      error={!!error}
      helperText={helperText}
      multiline
      minRows={1}
      maxRows={6}
      slotProps={{
        inputProps: {
          inputMode: "text",
          pattern: "[A-Za-z0-9\\-\\.\\(\\),\\s]*", // Accepts newlines/spaces for easier pasting
          ...props.inputProps, // Allow further extension if needed
        }
      }}
      {...props}
    />
  );
}

export const InputSearch = ({ value, onChangeValue }) => (
    <div className='p-2 w-2/4 mx-auto'>
        <TextField
            id="outlined-required"
            label="Search monomers"
            fullWidth
            value={value}
            onChange={onChangeValue}
        />
    </div>
);
