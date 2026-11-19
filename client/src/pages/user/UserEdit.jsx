import React, { use, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import DialogActions from "@mui/material/DialogActions";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Formik } from "formik";
import { getUser, putUser } from "@/api/userAPI";
import CustomFormControl from "@/components/inputs/CustomFormControl";
import { userEditValidationSchema } from "@/config/validationSchema";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { uploadProfileImage } from "@/api/sessionAPI";
import dayjs from "@/lib/dates";
import CustomDatePicker from "@/components/inputs/CustomDatePicker";
import CustomImageChooser from "@/components/inputs/CustomImageChooser";
import Back from "@/components/Back";
import CustomTitle from "@/components/custom/CustomTitle";
import { useNavigate, useParams } from "react-router-dom";
import { Box } from "@mui/material";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";

const UserEdit = () => {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const navigate = useNavigate();
  const [dob, setDob] = useState(null);

  const { schoolSessionDispatch } = use(SchoolSessionContext);

  // const user = userEditData?.data;

  const user = useQuery({
    queryKey: ["user", id],
    queryFn: () => getUser(id),
    initialData: queryClient
      .getQueryData(["users"])
      ?.find((user) => user?._id === id),
  });

  useEffect(() => {
    const born = user?.data?.dateofbirth ? dayjs(user.data.dateofbirth) : null;
    setDob(born?.isValid() ? born : null);
  }, [user?.data]);

  //PUT user
  const { mutate, isPending } = useMutation({ mutationFn: putUser });
  const onSubmit = (values, options) => {
    delete values.profile;
    if (!dob || !dayjs(dob).isValid()) {
      options.setFieldTouched("dateofbirth", true, false);
      options.setFieldError("dateofbirth", "Required*");
      options.setSubmitting(false);
      return;
    }
    values.dateofbirth = dayjs(dob).format("L");
    values.isOnlyUpdate = true;

    // console.log(values);
    // return
    mutate(values, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["users"] });
        queryClient.invalidateQueries({ queryKey: ["user", id] });
        options.setSubmitting(false);
      },
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        navigate(`/users/${id}`);
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
      type: "users",
    };

    changeProfile.mutate(info, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["users"] });
        queryClient.invalidateQueries({ queryKey: ["user", id] });
      },
      onSuccess: () => {
        schoolSessionDispatch(alertSuccess("Profile Updated!"));
      },
      onError: () => {
        schoolSessionDispatch(alertError("An unknown error has occurred!"));
      },
    });
  };

  const handleGoBack = () => navigate(`/users/${id}`);

  return (
    <>
      <Back color="#012e54" to={`/users/${id}`} />
      <CustomTitle
        title="Update User Information"
        subtitle="Make Changes to user profile information using the form below."
        color="primary.main"
      />

      <Formik
        initialValues={user?.data}
        onSubmit={onSubmit}
        enableReinitialize={true}
        validationSchema={userEditValidationSchema}
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleSubmit,
          isSubmitting,
        }) => {
          return (
            <>
              <Box sx={{ bgcolor: "#fff", borderRadius: "12px" }}>
                <Stack padding={2} spacing={2}>
                  <Stack alignSelf="center">
                    <CustomImageChooser handleImageUpload={uploadProfile}>
                      {changeProfile.isPending ? (
                        <div className="spinner"></div>
                      ) : (
                        <Avatar
                          srcSet={user?.data?.profile}
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
                  <Typography variant="caption" color="text.secondary">
                    Update the user's personal details.
                  </Typography>

                  <CustomFormControl>
                    <TextField
                      label="Firstname"
                      type="text"
                      fullWidth
                      size="small"
                      value={values?.firstname}
                      onChange={handleChange("firstname")}
                      error={Boolean(touched.firstname && errors.firstname)}
                      helperText={touched.firstname && errors.firstname}
                    />
                    <TextField
                      label="Lastname"
                      type="text"
                      fullWidth
                      size="small"
                      value={values?.lastname}
                      onChange={handleChange("lastname")}
                      error={Boolean(touched.lastname && errors.lastname)}
                      helperText={touched.lastname && errors.lastname}
                    />
                  </CustomFormControl>

                  <TextField
                    label="Username"
                    fullWidth
                    size="small"
                    value={values?.username || ""}
                    onChange={handleChange("username")}
                    error={Boolean(touched.username && errors.username)}
                    helperText={touched.username && errors.username}
                    contentEditable={false}
                    disabled={true}
                  />

                  <CustomFormControl>
                    <CustomDatePicker
                      label="Date of Birth"
                      date={dob}
                      setDate={setDob}
                      disableFuture={true}
                      error={Boolean(touched.dateofbirth && errors.dateofbirth)}
                      helperText={touched.dateofbirth && errors.dateofbirth}
                    />

                    <TextField
                      label="Gender"
                      select
                      fullWidth
                      size="small"
                      value={values?.gender || ""}
                      onChange={handleChange("gender")}
                      error={Boolean(touched.gender && errors.gender)}
                      helperText={touched.gender && errors.gender}
                    >
                      <MenuItem value="male">male</MenuItem>
                      <MenuItem value="female">female</MenuItem>
                    </TextField>
                  </CustomFormControl>
                  <TextField
                    label="Role"
                    select
                    fullWidth
                    size="small"
                    value={values?.role || ""}
                    onChange={handleChange("role")}
                    error={Boolean(touched.role && errors.role)}
                    helperText={touched.role && errors.role}
                  >
                    <MenuItem value="administrator">Administrator</MenuItem>
                    <MenuItem value="teacher">Teacher</MenuItem>
                  </TextField>
                  <Typography
                    variant="body2"
                    color="primary.main"
                    sx={{ fontWeight: "bold" }}
                  >
                    Contact Info
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Update the user's contact details.
                  </Typography>

                  <CustomFormControl>
                    <TextField
                      label="Email"
                      fullWidth
                      size="small"
                      row={3}
                      maxRows={3}
                      value={values?.email || ""}
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
                      value={values?.phonenumber || ""}
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
                    value={values?.address || ""}
                    onChange={handleChange("address")}
                    error={Boolean(touched.address && errors.address)}
                    helperText={touched.address && errors.address}
                  />
                  <CustomFormControl>
                    <TextField
                      label="Residence"
                      type="text"
                      fullWidth
                      size="small"
                      value={values?.residence || ""}
                      onChange={handleChange("residence")}
                      error={Boolean(touched.residence && errors.residence)}
                      helperText={touched.residence && errors.residence}
                    />
                    <TextField
                      label="Nationality"
                      fullWidth
                      size="small"
                      value={values?.nationality || ""}
                      onChange={handleChange("nationality")}
                      error={Boolean(touched.nationality && errors.nationality)}
                      helperText={touched.nationality && errors.nationality}
                    />
                  </CustomFormControl>
                  <DialogActions>
                    <Button
                      loading={isSubmitting || isPending}
                      onClick={handleGoBack}
                    >
                      Cancel
                    </Button>
                    <Button
                      loading={isSubmitting || isPending}
                      variant="contained"
                      color="primary"
                      onClick={handleSubmit}
                    >
                      Save Changes
                    </Button>
                  </DialogActions>
                </Stack>
              </Box>

              {isPending && <LoadingSpinner value="Saving Changes..." />}
            </>
          );
        }}
      </Formik>
    </>
  );
};

UserEdit.propTypes = {};

export default UserEdit;
