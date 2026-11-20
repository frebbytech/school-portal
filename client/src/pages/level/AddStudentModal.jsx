import React, { useContext, useState } from "react";
import {
  Avatar,
  Container,
  Divider,
  Stack,
  TextField,
  Typography,
  FormLabel,
  MenuItem,
  Button,
  useTheme,
  Alert,
} from "@mui/material";
import CustomFormControl from "../../components/inputs/CustomFormControl";
import { useMutation } from "@tanstack/react-query";
import { Formik } from "formik";
import { postStudent } from "../../api/studentAPI";
import { useLocation } from "react-router-dom";
import Back from "../../components/Back";
import { UserContext } from "../../context/providers/UserProvider";

const AddStudentModal = () => {

  const {
    session
  } = useContext(UserContext);


  const {
    state: { levelId, levelName },
  } = useLocation();

  const { palette } = useTheme();
  const [msg, setMsg] = useState({
    severity: "",
    text: "",
  });
  const [profileImg, setProfieImg] = useState(null);

  const initialValues = {
    profile: null,
    firstname: "",
    surname: "",
    othername: "",
    dateofbirth: "",
    gender: "male",
    email: "",
    address: "",
    residence: "",
    nationality: "",
    level: levelId,
    levelName: levelName,
    session: session,
  };
  const { mutate } = useMutation({ mutationFn: postStudent });
  const onSubmit = (values, options) => {
    // //console.log(values);
    mutate(values, {
      onSettled: () => {
        options.setSubmitting(false);
      },
      onSuccess: (student) => {
        setMsg({
          severity: "info",
          text: "New Student has been saved successfully!!!",
        });
      },
      onError: (error) => {
        setMsg({
          severity: "error",
          text: "Error saving student information!!!",
        });
      },
    });
  };

  return (
    <>
      <Back />
      {msg.text && (
        <Alert severity={msg.severity} onClose={() => setMsg({ text: "" })}>
          {msg.text}
        </Alert>
      )}
      <Container maxWidth="md" sx={{ paddingY: 2 }}>
        <Stack justifyContent="flex-end">
          <Typography variant="h4">
            New Student for {levelName || ""}
          </Typography>
        </Stack>
        <Divider />
        <Formik initialValues={initialValues} onSubmit={onSubmit}>
          {({
            values,
            errors,
            setFieldValue,
            handleChange,
            handleSubmit,
            handleReset,
            isSubmitting,
          }) => {
            return (
              <Stack padding={2} spacing={1}>
                <Stack
                  spacing={2}
                  justifyContent="center"
                  alignItems="center"
                  paddingY={2}
                >
                  <Avatar src={profileImg} sx={{ width: 80, height: 80 }} />
                  <FormLabel
                    htmlFor="profile"
                    sx={{
                      padding: 1,
                      cursor: "pointer",
                      "&:hover": {
                        background: palette.primary.main,
                        color: palette.primary.contrastText,
                      },
                    }}
                  >
                    Upload Image
                  </FormLabel>
                  <input
                    type="file"
                    id="profile"
                    name="profile"
                    accept=".png,.jpeg,.jpg,.webp"
                    hidden
                    onChange={(e) => {
                      setFieldValue("profile", e.target.files[0]);
                      setProfieImg(URL.createObjectURL(e.target.files[0]));
                    }}
                  />
                </Stack>
                <Typography>Student information</Typography>
                <CustomFormControl>
                  <TextField
                    label="Firstname"
                    type="text"
                    fullWidth
                    size="small"
                    value={values.firstname}
                    onChange={handleChange("firstname")}
                  />
                  <TextField
                    label="Surname"
                    fullWidth
                    size="small"
                    value={values.surname}
                    onChange={handleChange("surname")}
                  />
                  <TextField
                    label="Othername"
                    fullWidth
                    size="small"
                    value={values.othername}
                    onChange={handleChange("othername")}
                  />
                </CustomFormControl>

                <Typography>Student information</Typography>
                <CustomFormControl>
                  <TextField
                    label="Date of birth"
                    type="text"
                    fullWidth
                    size="small"
                    onFocus={(e) => (e.target.type = "date")}
                    onBlur={(e) => (e.target.type = "text")}
                    value={values.dateofbirth}
                    onChange={handleChange("dateofbirth")}
                  />
                  <TextField
                    label="Gender"
                    select
                    fullWidth
                    size="small"
                    value={values.gender}
                    onChange={handleChange("gender")}
                  >
                    <MenuItem value="male">male</MenuItem>
                    <MenuItem value="female">female</MenuItem>
                  </TextField>
                </CustomFormControl>
                <CustomFormControl>
                  <TextField
                    label="Email"
                    fullWidth
                    size="small"
                    row={3}
                    maxRows={3}
                    value={values.email}
                    onChange={handleChange("email")}
                  />
                </CustomFormControl>
                <TextField
                  label="Address"
                  fullWidth
                  size="small"
                  row={3}
                  maxRows={3}
                  value={values.address}
                  onChange={handleChange("address")}
                />
                <Stack
                  paddingY={2}
                  spacing={2}
                  direction={{ xs: "column", md: "row" }}
                  justifyContent={{ xs: "center", md: "space-between" }}
                  alignItems="center"
                >
                  <TextField
                    label="Residence"
                    type="text"
                    fullWidth
                    size="small"
                    value={values.residence}
                    onChange={handleChange("residence")}
                  />
                  <TextField
                    label="Nationality"
                    fullWidth
                    size="small"
                    value={values.nationality}
                    onChange={handleChange("nationality")}
                  />
                </Stack>

                <Typography>Academic Information</Typography>

                <CustomFormControl>
                  <TextField
                    select
                    label="Current Class"
                    type="text"
                    fullWidth
                    size="small"
                    defaultValue={levelName}
                    value={values.level}
                    onChange={handleChange("level")}
                    InputProps={{
                      readOnly: true,
                    }}
                  >
                    <MenuItem selected={true} defaultChecked value={levelId}>
                      {levelName}
                    </MenuItem>
                  </TextField>
                </CustomFormControl>
                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  spacing={2}
                  paddingY={4}
                >
                  <Button
                    sx={{ minWidth: { xs: 100, sm: 150 } }}
                    onClick={handleReset}
                  >
                    Cancel
                  </Button>
                  <Button
                    loading={isSubmitting}
                    variant="contained"
                    color="primary"
                    sx={{ minWidth: { xs: 100, sm: 150 } }}
                    onClick={handleSubmit}
                  >
                    Save
                  </Button>
                </Stack>
              </Stack>
            );
          }}
        </Formik>
      </Container>
    </>
  );
};

AddStudentModal.propTypes = {};

export default AddStudentModal;
