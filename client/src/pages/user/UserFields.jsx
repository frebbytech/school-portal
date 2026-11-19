import React from "react";
import { Autocomplete, MenuItem, TextField, Typography } from "@mui/material";
import { Controller } from "react-hook-form";
import { mixed } from "yup";
import dayjs from "@/lib/dates";
import CustomDatePicker from "@/components/inputs/CustomDatePicker";
import CustomFormControl from "@/components/inputs/CustomFormControl";
import { NATIONALITY } from "@/mockup/data/nationality";
import { TOWNS } from "@/mockup/data/towns";

// A date of birth is required and must be a real date
export const dobRule = mixed().test("dob", "Required*", (value) => !!value && dayjs(value).isValid());

// Roles the server accepts for staff accounts.
export const USER_ROLES = [
  { value: "administrator", label: "Administrator" },
  { value: "teacher", label: "Teacher" },
];

export const USER_DEFAULTS = {
  firstname: "",
  lastname: "",
  username: "",
  dateofbirth: null,
  gender: "",
  role: "",
  email: "",
  phonenumber: "",
  address: "",
  residence: "",
  nationality: "",
};

const Heading = ({ children, hint }) => (
  <>
    <Typography variant="body2" color="primary.main" sx={{ fontWeight: "bold" }}>
      {children}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      {hint}
    </Typography>
  </>
);

/** The personal and contact fields shared by the Add and Edit user screens (React Hook Form). */
const UserFields = ({ control, errors, children, showRole = true }) => {
  const text = (name, label, extra = {}) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          value={field.value ?? ""}
          label={label}
          fullWidth
          size="small"
          error={!!errors[name]}
          helperText={errors[name]?.message}
          {...extra}
        />
      )}
    />
  );

  const choose = (name, label, options) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Autocomplete
          freeSolo
          fullWidth
          size="small"
          options={options}
          noOptionsText="Nothing found"
          value={field.value || ""}
          onChange={(_, value) => field.onChange(value ?? "")}
          onInputChange={(_, value, reason) => reason === "input" && field.onChange(value)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              fullWidth
              size="small"
              error={!!errors[name]}
              helperText={errors[name]?.message}
            />
          )}
        />
      )}
    />
  );

  const select = (name, label, items) =>
    text(name, label, {
      select: true,
      children: items.map(({ value, label: itemLabel }) => (
        <MenuItem key={value} value={value}>
          {itemLabel}
        </MenuItem>
      )),
    });

  return (
    <>
      <Heading hint="Enter the user's personal details.">Personal information</Heading>
      <CustomFormControl>
        {text("firstname", "Firstname")}
        {text("lastname", "Lastname")}
      </CustomFormControl>
      {text("username", "Username", { autoComplete: "off" })}
      <CustomFormControl>
        <Controller
          name="dateofbirth"
          control={control}
          render={({ field }) => (
            <CustomDatePicker
              label="Date of Birth"
              date={field.value}
              setDate={field.onChange}
              disableFuture={true}
              error={!!errors.dateofbirth}
              helperText={errors.dateofbirth?.message}
            />
          )}
        />
        {select("gender", "Gender", [
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
        ])}
      </CustomFormControl>
      {showRole && select("role", "Role", USER_ROLES)}

      <Heading hint="Enter the user's contact details.">Contact information</Heading>
      <CustomFormControl>
        {text("email", "Email", { type: "email" })}
        {text("phonenumber", "Telephone No.", { type: "tel", inputMode: "tel" })}
      </CustomFormControl>
      {text("address", "Address")}
      <CustomFormControl>
        {choose("residence", "Residence", TOWNS)}
        {choose("nationality", "Nationality", NATIONALITY)}
      </CustomFormControl>
      {children}
    </>
  );
};

export default UserFields;
