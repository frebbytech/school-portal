import React from "react";
import { Controller } from "react-hook-form";
import TextField from "@mui/material/TextField";
import Datetime from "react-datetime";
import dayjs from "@/lib/dates";
import "../../theme/react-datetime.css";

const YearPicker = Datetime.default ? Datetime.default : Datetime;
const YearInput = ({ name, control, label, rules }) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <YearPicker
          label={label}
          value={value || null}
          dateFormat="YYYY"
          timeFormat={false}
          initialValue={dayjs().format("YYYY")}
          closeOnSelect={true}
          onChange={(date) => {
            onChange(date.format("YYYY"));
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              error={!!error}
              helperText={error ? error.message : null}
              label={label}
              size="small"
              fullWidth
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />
          )}
        />
      )}
    />
  );
};

export default YearInput;
