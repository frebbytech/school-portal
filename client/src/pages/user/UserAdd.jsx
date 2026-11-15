import Button from "@mui/material/Button";
import { Box } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Formik } from "formik";
import dayjs from "@/lib/dates";
import React, { useContext, useState } from "react";
import { postUser } from "@/api/userAPI";
import CustomDatePicker from "@/components/inputs/CustomDatePicker";
import CustomFormControl from "@/components/inputs/CustomFormControl";
import CustomImageChooser from "@/components/inputs/CustomImageChooser";
import { userInitialValues } from "@/config/initialValues";
import { userValidationSchema } from "@/config/validationSchema";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { NATIONALITY } from "@/mockup/data/nationality";
import { TOWNS } from "@/mockup/data/towns";
import CustomTitle from "@/components/custom/CustomTitle";
import { SchoolRounded } from "@mui/icons-material";
import Back from "@/components/Back";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { useNavigate } from "react-router-dom";

function UserAdd() {
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  //states
  const [profileImg, setProfieImg] = useState(null);
  const [dob, setDob] = useState(null);
  const [initValues] = useState(userInitialValues);

  //Post teacher
  const { mutateAsync, isPending } = useMutation({ mutationFn: postUser });
  const onSubmit = (values, options) => {
    values.dateofbirth = dayjs(dob).format("L");
    values.fullname = `${values?.firstname} ${values?.lastname}`;
    // console.log(values);
    // return;

    mutateAsync(values, {
      onSettled: () => {
        queryClient.invalidateQueries(["users"]);
        options.setSubmitting(false);
      },
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        navigate(`/users`);
        options.resetForm();
        setProfieImg(null);
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  return (
    <>
      <Back color="#012e54" />
      <CustomTitle
        title="New User"
        subtitle="Add a new user to the system by filling out the form below."
        icon={<SchoolRounded color="primary" sx={{ width: 50, height: 50 }} />}
        color="primary.main"
      />

      <Formik
        initialValues={initValues}
        onSubmit={onSubmit}
        enableReinitialize={true}
        validationSchema={userValidationSchema}
      >
        {({
          values,
          errors,
          touched,
          setFieldValue,
          handleChange,
          handleSubmit,
          isSubmitting,
        }) => {
          const handleLoadFile = (e) => {
            setFieldValue("profile", e.target.files[0]);
            setProfieImg(URL.createObjectURL(e.target.files[0]));
          };

          return (
            <Box bgcolor="#fff" p={2}>
              <Stack padding={2} spacing={2}>
                <Stack alignSelf="center">
                  <CustomImageChooser handleImageUpload={handleLoadFile}>
                    <Avatar
                      srcSet={profileImg}
                      sx={{ width: 100, height: 100, alignSelf: "center" }}
                    />
                  </CustomImageChooser>
                </Stack>
                <Typography
                  variant="body2"
                  color="primary.main"
                  sx={{ fontWeight: "bold" }}
                >
                  Personal information
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  Enter the user&apos;s personal details.
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
                  type="text"
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
                    touched={Boolean(touched.dateofbirth && errors.dateofbirth)}
                    error={touched.dateofbirth && errors.dateofbirth}
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
                <TextField
                  label="Role"
                  select
                  fullWidth
                  size="small"
                  value={values.role}
                  onChange={handleChange("role")}
                  error={Boolean(touched.role && errors.role)}
                  helperText={touched.role && errors.role}
                >
                  <MenuItem value="administrator">Administrator</MenuItem>
                  <MenuItem value="director">Director</MenuItem>
                  <MenuItem value="secretary">Secretary</MenuItem>
                  <MenuItem value="coordinator">Exams Coordinator</MenuItem>
                  {/* <MenuItem value="teacher">Teacher</MenuItem> */}
                </TextField>
                <Typography
                  variant="body2"
                  color="primary.main"
                  sx={{ fontWeight: "bold" }}
                >
                  Contact information
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  Enter the user&apos;s contact details.
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
                    onInputChange={(e, value) =>
                      setFieldValue("residence", value)
                    }
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
                    onInputChange={(e, value) =>
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
                <CustomFormControl>
                  <TextField
                    type="password"
                    label="Password"
                    fullWidth
                    size="small"
                    autoComplete="no"
                    value={values.password}
                    onChange={handleChange("password")}
                    error={Boolean(touched.password && errors.password)}
                    helperText={touched.password && errors.password}
                  />
                  <TextField
                    type="password"
                    label="Confirm Password"
                    fullWidth
                    autoComplete="no"
                    size="small"
                    value={values.confirmPassword}
                    onChange={handleChange("confirmPassword")}
                    error={Boolean(
                      touched.confirmPassword && errors.confirmPassword
                    )}
                    helperText={
                      touched.confirmPassword && errors.confirmPassword
                    }
                  />
                </CustomFormControl>
                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  alignItems="center"
                  spacing={2}
                  paddingY={2}
                >
                  <Button
                    loading={isSubmitting || isPending}
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                  >
                    Save User
                  </Button>
                </Stack>
              </Stack>
            </Box>
          );
        }}
      </Formik>
      {isPending && <LoadingSpinner value="Creating New User..." />}
    </>
  );
}

export default UserAdd;
