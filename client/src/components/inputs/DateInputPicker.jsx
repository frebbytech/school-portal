import React from "react";
import { Controller } from "react-hook-form";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "@/lib/dates";

// Custom Date Picker Controller
const DateInputPicker = ({
  name,
  control,
  label,
  rules,
  disableFuture,
  style,
  textFieldProps,
  ...props
}) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label={label}
            value={value ? dayjs(value) : null}
            onChange={(newValue) => {
              // A cleared or half-typed date is stored as "" so the form says
              // "Required*" instead of silently saving 1 January 1970.
              onChange(newValue && newValue.isValid() ? newValue : "");
            }}
            format="Do MMMM YYYY"
            disableMaskedInput
            disableFuture={disableFuture}
         
            slotProps={{
              textField: {
                fullWidth: true,
                size: "small",
                error: !!error,
                helperText: error ? error.message : null,
                slotProps: {
                  inputLabel: {
                    shrink: true,
                  },
                },
                ...textFieldProps,
              },
              inputLabel: {
                shrink: true,
              },
            }}
            sx={{ width: "100%", ...style }}
            {...props}
          />
        </LocalizationProvider>
      )}
    />
  );
};

export default DateInputPicker;
