import React, { useContext, useState } from "react";
import {
  Avatar,
  Stack,
  TextField,
  Typography,
  MenuItem,
  Autocomplete,
  Box,
} from "@mui/material";
import Button from "@mui/material/Button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Formik } from "formik";
import CustomFormControl from "@/components/inputs/CustomFormControl";
import { teacherInitialValues } from "@/config/initialValues";
import { teacherValidationSchema } from "@/config/validationSchema";
import { postTeacher } from "@/api/teacherAPI";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import CustomDatePicker from "@/components/inputs/CustomDatePicker";
import dayjs from "@/lib/dates";
import { TOWNS } from "@/mockup/data/towns";
import { NATIONALITY } from "@/mockup/data/nationality";
import CustomImageChooser from "@/components/inputs/CustomImageChooser";
import CustomTitle from "@/components/custom/CustomTitle";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";

const TeacherAdd = ({ setTab }) => {
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();

  //states
  const [profileImg, setProfieImg] = useState(null);
  const [dob, setDob] = useState(dayjs());

  const [initValues] = useState(teacherInitialValues);

  //Post teacher
  const { isPending, mutate } = useMutation({
    mutationFn: postTeacher,
  });
  const onSubmit = (values, options) => {
    values.dateofbirth = dayjs(dob).format("L");
    mutate(values, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["teachers"] });
        schoolSessionDispatch(alertSuccess(data));
        options.resetForm();
        setProfieImg(null);
        setTab("1");
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  return (
    <>
      <Box
        sx={{
          backgroundColor: "#fff",
          borderRadius: "12px",
        }}
      >
        <CustomTitle
          title="New Facilitator"
          subtitle=" Simply fill in essential details about the new teacher, including their personal information, qualifications, and contact details, to ensure smooth integration into our educational community."
          img={null}
          color="primary.main"
        />
        <Formik
          initialValues={initValues}
          onSubmit={onSubmit}
          enableReinitialize={true}
          validationSchema={teacherValidationSchema}
        >
          {({
            values,
            errors,
            touched,
            setFieldValue,
            handleChange,
            handleSubmit,
            handleReset,
          }) => {
            const uploadProfile = (e) => {
              setFieldValue("profile", e.target.files[0]);
              setProfieImg(URL.createObjectURL(e.target.files[0]));
            };
            return (
              <Stack padding={2} spacing={5}>
                <Stack alignSelf="center">
                  <CustomImageChooser handleImageUpload={uploadProfile}>
                    <Avatar
                      srcSet={profileImg}
                      sx={{ width: 100, height: 100, alignSelf: "center" }}
                    />
                  </CustomImageChooser>
                </Stack>
                <Stack spacing={3}>
                  <Typography
                    variant="h5"
                    color="secondary.main"
                    bgcolor="primary.main"
                    fontWeight="bold"
                    p={1}
                    paragraph
                  >
                    Personal information
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Enter the teacher's personal details.
                  </Typography>
                  <CustomFormControl>
                    <TextField
                      label="Firstname"
                      type="text"
                      fullWidth
                      size="small"
                      value={values.firstname}
                      onChange={handleChange("firstname")}
                      error={Boolean(touched.firstname && errors.firstname)}
                      helperText={touched.firstname && errors.firstname}
                    />
                    <TextField
                      label="Lastname"
                      type="text"
                      fullWidth
                      size="small"
                      value={values.lastname}
                      onChange={handleChange("lastname")}
                      error={Boolean(touched.lastname && errors.lastname)}
                      helperText={touched.lastname && errors.lastname}
                    />
                  </CustomFormControl>
                  <TextField
                    label="Username"
                    fullWidth
                    size="small"
                    value={values.username}
                    onChange={handleChange("username")}
                    error={Boolean(touched.username && errors.username)}
                    helperText={touched.username && errors.username}
                  />
                  <CustomFormControl>
                    <CustomDatePicker
                      label="Date of Birth"
                      date={dob}
                      setDate={setDob}
                      disableFuture={true}
                      error={Boolean(touched.dateofbirth && errors.dateofbirth)}
                      helperText={touched.dateofbirth && errors.dateofbirth}
                      value={values.dateofbirth}
                      handleChange={handleChange("dateofbirth")}
                    />

                    <TextField
                      label="Gender"
                      select
                      fullWidth
                      size="small"
                      value={values.gender}
                      onChange={handleChange("gender")}
                      error={Boolean(touched.gender && errors.gender)}
                      helperText={touched.gender && errors.gender}
                    >
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                    </TextField>
                  </CustomFormControl>
                </Stack>
                <Stack spacing={3}>
                  <Typography
                    variant="h5"
                    color="secondary.main"
                    bgcolor="primary.main"
                    fontWeight="bold"
                    p={1}
                    paragraph
                  >
                    Contact Details
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Enter the teacher's contact details.
                  </Typography>
                  <CustomFormControl>
                    <TextField
                      label="Email"
                      fullWidth
                      size="small"
                      row={3}
                      maxRows={3}
                      value={values.email}
                      onChange={handleChange("email")}
                      error={Boolean(touched.email && errors.email)}
                      helperText={touched.email && errors.email}
                    />
                    <TextField
                      label="Telephone No."
                      inputMode="tel"
                      type="tel"
                      fullWidth
                      size="small"
                      value={values.phonenumber}
                      onChange={handleChange("phonenumber")}
                      error={Boolean(touched.phonenumber && errors.phonenumber)}
                      helperText={touched.phonenumber && errors.phonenumber}
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
                    error={Boolean(touched.address && errors.address)}
                    helperText={touched.address && errors.address}
                  />
                  <CustomFormControl>
                    <Autocomplete
                      freeSolo
                      fullWidth
                      size="small"
                      options={TOWNS}
                      loadingText="Please wait...."
                      noOptionsText="No Town available"
                      getOptionLabel={(option) => option || ""}
                      value={values.residence}
                      onChange={(e, value) => setFieldValue("residence", value)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Residence"
                          fullWidth
                          size="small"
                          error={Boolean(touched.residence && errors.residence)}
                          helperText={touched.residence && errors.residence}
                        />
                      )}
                    />

                    <Autocomplete
                      freeSolo
                      fullWidth
                      size="small"
                      loadingText="Please wait...."
                      options={NATIONALITY}
                      noOptionsText="No Nationality available"
                      getOptionLabel={(option) => option || ""}
                      value={values.nationality}
                      onChange={(e, value) =>
                        setFieldValue("nationality", value)
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Nationality"
                          fullWidth
                          size="small"
                          error={Boolean(
                            touched.nationality && errors.nationality
                          )}
                          helperText={touched.nationality && errors.nationality}
                        />
                      )}
                    />
                  </CustomFormControl>
                </Stack>

                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  spacing={2}
                  py={4}
                >
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleReset}
                  >
                    Cancel
                  </Button>
                  <Button
                    loading={isPending}
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                  >
                    Add Teacher
                  </Button>
                </Stack>
              </Stack>
            );
          }}
        </Formik>
      </Box>
      {/* </Scrollbars> */}
      {isPending && <LoadingSpinner value="Please Wait.." />}
    </>
  );
};

TeacherAdd.propTypes = {};

export default TeacherAdd;
