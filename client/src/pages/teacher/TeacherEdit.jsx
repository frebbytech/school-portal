import React, { use, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import DialogActions from "@mui/material/DialogActions";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Formik } from "formik";
import { getTeacher, putTeacher } from "@/api/teacherAPI";
import CustomFormControl from "@/components/inputs/CustomFormControl";
import { teacherValidationSchema } from "@/config/validationSchema";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { uploadProfileImage } from "@/api/sessionAPI";
import dayjs from "@/lib/dates";
import { useParams, useNavigate } from "react-router-dom";
import CustomDatePicker from "@/components/inputs/CustomDatePicker";
import { TOWNS } from "@/mockup/data/towns";
import { NATIONALITY } from "@/mockup/data/nationality";
import CustomImageChooser from "@/components/inputs/CustomImageChooser";
import Loader from "@/config/Loader";
import { Box, Container } from "@mui/material";
import Back from "@/components/Back";
import CustomTitle from "@/components/custom/CustomTitle";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";

const TeacherEdit = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams();
  const [dob, setDob] = useState(null);
  const { schoolSessionDispatch } = use(SchoolSessionContext);

  const teacher = useQuery({
    queryKey: ["teacher", id],
    queryFn: () => getTeacher(id),
    initialData: queryClient
      .getQueryData(["teachers", id])
      ?.find((teacher) => teacher?._id === id),
    enabled: !!id,
  });

  useEffect(() => {
    setDob(dayjs(teacher?.data?.dateofbirth));
   
  }, [teacher?.data]);

  //Put teacher
  const { mutate, isPending } = useMutation({
    mutationFn: putTeacher,
  });
  const onSubmit = (values) => {
    delete values?.profile;
    values.dateofbirth = dayjs(dob).format("L");

    mutate(values, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["teachers"] });
        queryClient.invalidateQueries({ queryKey: ["teacher", id] });
      },
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        handleClose();
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  const changeProfile = useMutation({
    mutationFn: uploadProfileImage,
  });
  const uploadProfile = (e) => {
    const profile = e.target?.files[0];
    const info = {
      _id: id,
      profile,
      type: "teachers",
    };

    changeProfile.mutate(info, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["teachers"] });
        queryClient.invalidateQueries({ queryKey: ["teacher", id] });
      },
      onSuccess: () => {
        schoolSessionDispatch(alertSuccess("Profile Updated!"));
      },
      onError: () => {
        schoolSessionDispatch(alertError("An unknown error has occurred!"));
      },
    });
  };

  const handleClose = () => {
    navigate(`/teacher/${id}`);
  };

  if (teacher?.isPending) {
    return <Loader />;
  }

  return (
    <Container>
      <Back to={`/teacher/${id}`} color="primary.main" />
      <CustomTitle
        title="Edit Teacher"
        subtitle="Manage changes to teachers profile"
        color="primary.main"
      />

      <Formik
        initialValues={teacher?.data}
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
        }) => {
          return (
            <>
              <Box sx={{ bgcolor: "#fff", borderRadius: "12px" }}>
                <Stack padding={2} spacing={1}>
                  <Stack alignSelf="center">
                    <CustomImageChooser handleImageUpload={uploadProfile}>
                      {changeProfile.isPending ? (
                        <div className="spinner"></div>
                      ) : (
                        <Avatar
                          srcSet={teacher?.data?.profile}
                          sx={{ width: 100, height: 100, alignSelf: "center" }}
                        />
                      )}
                    </CustomImageChooser>
                  </Stack>
                  <Typography
                    variant="body2"
                    color="primary.main"
                    sx={{ fontWeight: "bold" }}
                  >
                    Personal information
                  </Typography>
                  <CustomFormControl>
                    <TextField
                      label="Firstname"
                      type="text"
                      fullWidth
                      size="small"
                      value={values?.firstname || ""}
                      onChange={handleChange("firstname")}
                      error={Boolean(touched?.firstname && errors?.firstname)}
                      helperText={touched?.firstname && errors?.firstname}
                    />
                    <TextField
                      label="Surname"
                      fullWidth
                      size="small"
                      value={values?.lastname || ""}
                      onChange={handleChange("lastname")}
                      error={Boolean(touched?.lastname && errors?.lastname)}
                      helperText={touched?.lastname && errors?.lastname}
                    />
                  </CustomFormControl>
                  <TextField
                    label="Username"
                    fullWidth
                    size="small"
                    value={values?.username || ""}
                    onChange={handleChange("username")}
                    error={Boolean(touched?.username && errors?.username)}
                    helperText={touched?.username && errors?.username}
                  />
                  <CustomFormControl>
                    <CustomDatePicker
                      label="Date of Birth"
                      date={dob}
                      setDate={setDob}
                      disableFuture={true}
                      touched={Boolean(
                        touched?.dateofbirth && errors?.dateofbirth
                      )}
                      error={touched?.dateofbirth && errors?.dateofbirth}
                    />

                    <TextField
                      label="Gender"
                      select
                      fullWidth
                      size="small"
                      value={values?.gender || ""}
                      onChange={handleChange("gender")}
                      error={Boolean(touched?.gender && errors?.gender)}
                      helperText={touched?.gender && errors?.gender}
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
                      value={values?.email || ""}
                      onChange={handleChange("email")}
                      error={Boolean(touched?.email && errors?.email)}
                      helperText={touched?.email && errors?.email}
                    />
                    <TextField
                      label="Telephone No."
                      inputMode="tel"
                      type="tel"
                      fullWidth
                      size="small"
                      value={values?.phonenumber || ""}
                      onChange={handleChange("phonenumber")}
                      error={Boolean(
                        touched?.phonenumber && errors?.phonenumber
                      )}
                      helperText={touched?.phonenumber && errors?.phonenumber}
                    />
                  </CustomFormControl>
                  <TextField
                    label="Address"
                    fullWidth
                    size="small"
                    row={3}
                    maxRows={3}
                    value={values?.address || ""}
                    onChange={handleChange("address")}
                    error={Boolean(touched?.address && errors?.address)}
                    helperText={touched?.address && errors?.address}
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
                      value={values?.residence || ""}
                      onChange={(e, value) => setFieldValue("residence", value)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Residence"
                          fullWidth
                          size="small"
                          error={Boolean(
                            touched?.residence && errors?.residence
                          )}
                          helperText={touched?.residence && errors?.residence}
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
                      value={values?.nationality || ""}
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
                            touched?.nationality && errors?.nationality
                          )}
                          helperText={
                            touched?.nationality && errors?.nationality
                          }
                        />
                      )}
                    />
                  </CustomFormControl>
                  <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button
                      loading={isPending}
                      variant="contained"
                      color="primary"
                     
                      onClick={handleSubmit}
                    >
                      Save Changes
                    </Button>
                  </DialogActions>
                </Stack>
              </Box>
            </>
          );
        }}
      </Formik>
      {isPending && <LoadingSpinner value="Saving Changes.." />}
    </Container>
  );
};

TeacherEdit.propTypes = {};

export default TeacherEdit;
