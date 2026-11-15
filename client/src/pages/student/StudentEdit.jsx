import React, { useContext, useEffect, useState } from "react";
import {
  Button,
  Autocomplete,
  Avatar,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "@/lib/dates";

import { putStudent } from "@/api/studentAPI";
import CustomFormControl from "@/components/inputs/CustomFormControl";
import CustomDatePicker from "@/components/inputs/CustomDatePicker";
import CustomImageChooser from "@/components/inputs/CustomImageChooser";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";

import { studentEditValidationSchema } from "@/config/validationSchema";
import { StudentContext } from "@/context/providers/StudentProvider";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { NATIONALITY } from "@/mockup/data/nationality";
import { TOWNS } from "@/mockup/data/towns";

const StudentEdit = () => {
  const queryClient = useQueryClient();
  const [dob, setDob] = useState(null);
  const [profileImage, setProfileImage] = useState(null);

  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const {
    studentState: { editStudentData },
    studentDispatch,
  } = useContext(StudentContext);

  const student = editStudentData?.data;

  // Initialize form
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(studentEditValidationSchema),
    defaultValues: student,
  });

  useEffect(() => {
    if (student) {
      reset(student);
      setDob(dayjs(student?.dateofbirth));
      setProfileImage(student?.profile);
    }
  }, [student, reset]);

  // Close dialog
  const handleClose = () => {
    studentDispatch({
      type: "editStudent",
      payload: { open: false, data: {} },
    });
  };

  // Update student mutation
  const { mutateAsync, isPending } = useMutation({ mutationFn: putStudent });

  const onSubmit = async (values) => {
    values.dateofbirth = dayjs(dob).format("L");
    values.profile = profileImage;

    await mutateAsync(values, {
      onSettled: () => queryClient.invalidateQueries(["student-profile"]),
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        handleClose();
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  // Upload profile photo
  const uploadProfile = async (e) => {
    const profile = e.target?.files?.[0];
    if (!profile) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageURL = event.target?.result;
        setProfileImage(imageURL);
        schoolSessionDispatch(alertSuccess("Photo Updated"));
      };
      reader.readAsDataURL(profile);
    } catch (error) {
      schoolSessionDispatch(alertError(error));
    }

    queryClient.invalidateQueries(["students"]);
    queryClient.invalidateQueries(["student-by-id"]);
  };

  return (
    <Dialog open={editStudentData.open} maxWidth="md" fullWidth>
      <CustomDialogTitle
        title="Edit Student Information"
        subtitle="Make changes to student information"
        onClose={handleClose}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ p: 1.5 }}>
          <Stack spacing={1}>
            {/* Profile */}
            <Stack alignSelf="center">
              <CustomImageChooser handleImageUpload={uploadProfile}>
                <Avatar
                  srcSet={profileImage || ""}
                  sx={{ width: 100, height: 100, alignSelf: "center" }}
                />
              </CustomImageChooser>
            </Stack>

            <Typography
              variant="body2"
              color="primary.main"
              sx={{ fontWeight: "bold" }}
            >
              Personal Information
            </Typography>

            {/* Student ID */}
            <Controller
              name="indexnumber"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Student ID"
                  size="small"
                  sx={{ maxWidth: { xs: "100%", md: 240 } }}
                  disabled
                  error={!!errors.indexnumber}
                  helperText={errors.indexnumber?.message}
                />
              )}
            />

            {/* Names */}
            <CustomFormControl>
              <Controller
                name="firstname"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Firstname"
                    fullWidth
                    size="small"
                    error={!!errors.firstname}
                    helperText={errors.firstname?.message}
                    slotProps={{
                      htmlInput: {
                        style: {
                          textTransform: "capitalize",
                        },
                      },
                    }}
                  />
                )}
              />

              <Controller
                name="surname"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Surname"
                    fullWidth
                    size="small"
                    error={!!errors.surname}
                    helperText={errors.surname?.message}
                    slotProps={{
                      htmlInput: {
                        style: {
                          textTransform: "capitalize",
                        },
                      },
                    }}
                  />
                )}
              />

              <Controller
                name="othername"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Othername"
                    fullWidth
                    size="small"
                    error={!!errors.othername}
                    helperText={errors.othername?.message}
                    slotProps={{
                      htmlInput: {
                        style: {
                          textTransform: "capitalize",
                        },
                      },
                    }}
                  />
                )}
              />
            </CustomFormControl>

            {/* DOB and Gender */}
            <CustomFormControl>
              <CustomDatePicker
                label="Date of Birth"
                date={dob}
                setDate={setDob}
                disableFuture
                error={!!errors.dateofbirth}
                helperText={errors.dateofbirth?.message}
              />

              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    fullWidth
                    size="small"
                    label="Gender"
                    error={!!errors.gender}
                    helperText={errors.gender?.message}
                  >
                    <MenuItem value="male">male</MenuItem>
                    <MenuItem value="female">female</MenuItem>
                  </TextField>
                )}
              />
            </CustomFormControl>

            {/* Contact Info */}
            <Typography
              variant="body2"
              color="primary.main"
              sx={{ fontWeight: "bold" }}
            >
              Contact
            </Typography>
            <CustomFormControl>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email"
                    fullWidth
                    size="small"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />

              <Controller
                name="phonenumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Telephone No."
                    type="tel"
                    fullWidth
                    size="small"
                    error={!!errors.phonenumber}
                    helperText={errors.phonenumber?.message}
                  />
                )}
              />
            </CustomFormControl>

            {/* Address */}
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Address"
                  fullWidth
                  size="small"
                  error={!!errors.address}
                  helperText={errors.address?.message}
                />
              )}
            />

            {/* Residence & Nationality */}
            <CustomFormControl>
              <Controller
                name="residence"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    freeSolo
                    fullWidth
                    size="small"
                    options={TOWNS}
                    value={field.value || ""}
                    onChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Residence"
                        fullWidth
                        size="small"
                        error={!!errors.residence}
                        helperText={errors.residence?.message}
                      />
                    )}
                  />
                )}
              />

              <Controller
                name="nationality"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    freeSolo
                    fullWidth
                    size="small"
                    options={NATIONALITY}
                    value={field.value || ""}
                    onChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Nationality"
                        fullWidth
                        size="small"
                        error={!!errors.nationality}
                        helperText={errors.nationality?.message}
                      />
                    )}
                  />
                )}
              />
            </CustomFormControl>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isPending}
          >
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default React.memo(StudentEdit);

// import React, { useContext, useEffect, useState } from "react";
// import Button from "@mui/material/Button";
// import Autocomplete from "@mui/material/Autocomplete";
// import Avatar from "@mui/material/Avatar";
// import Dialog from "@mui/material/Dialog";
// import DialogActions from "@mui/material/DialogActions";
// import DialogContent from "@mui/material/DialogContent";
// import MenuItem from "@mui/material/MenuItem";
// import Stack from "@mui/material/Stack";
// import TextField from "@mui/material/TextField";
// import Typography from "@mui/material/Typography";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { Formik } from "formik";
// import { putStudent } from "@/api/studentAPI";
// import CustomFormControl from "@/components/inputs/CustomFormControl";
// import { studentEditValidationSchema } from "@/config/validationSchema";
// import { StudentContext } from "@/context/providers/StudentProvider";
// import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
// import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";

// import CustomDatePicker from "@/components/inputs/CustomDatePicker";
// import dayjs from "@/lib/dates";
// import { NATIONALITY } from "@/mockup/data/nationality";
// import { TOWNS } from "@/mockup/data/towns";
// import CustomImageChooser from "@/components/inputs/CustomImageChooser";
// import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";

// const StudentEdit = () => {
//   const queryClient = useQueryClient();
//   const [dob, setDob] = useState(null);

//   const [profileImage, setProfileImage] = useState(null);
//   const { schoolSessionDispatch } = useContext(SchoolSessionContext);
//   const {
//     studentState: { editStudentData },
//     studentDispatch,
//   } = useContext(StudentContext);

//   const student = editStudentData?.data;

//   useEffect(() => {
//     setDob(dayjs(student?.dateofbirth));
//     setProfileImage(student?.profile);
//   }, [student]);

//   //CLOSE Edit Student
//   const handleClose = () => {
//     studentDispatch({
//       type: "editStudent",
//       payload: {
//         open: false,
//         data: {},
//       },
//     });
//   };

//   //Put student
//   const { mutateAsync, isPending } = useMutation({ mutationFn: putStudent });
//   const onSubmit = (values) => {
//     values.dateofbirth = dayjs(dob).format("L");
//     values.profile = profileImage;

//     mutateAsync(values, {
//       onSettled: () => {
//         queryClient.invalidateQueries(["student-profile"]);
//       },
//       onSuccess: (data) => {
//         schoolSessionDispatch(alertSuccess(data));
//         handleClose();
//       },
//       onError: (error) => {
//         schoolSessionDispatch(alertError(error));
//       },
//     });
//   };

//   const uploadProfile = async (e) => {
//     const profile = e.target?.files[0];

//     try {

//       const reader = new FileReader();
//       reader.onload = function (event) {
//         const ImageURL = event.target.result;
//         setProfileImage(ImageURL);
//         schoolSessionDispatch(alertSuccess("Photo Updated"));
//       };

//       reader.readAsDataURL(profile);
//     } catch (error) {
//       schoolSessionDispatch(alertError(error));
//     }
//     queryClient.invalidateQueries(["students"]);
//     queryClient.invalidateQueries(["student-by-id"]);
//   };

//   return (
//     <Dialog open={editStudentData.open} maxWidth="md" fullWidth>
//       <CustomDialogTitle
//         title="Edit Student Information"
//         subtitle='Make changes to student information'
//         onClose={handleClose}
//       />

//       <Formik
//         initialValues={student}
//         onSubmit={onSubmit}
//         enableReinitialize={true}
//         validationSchema={studentEditValidationSchema}
//       >
//         {({
//           values,
//           errors,
//           touched,
//           setFieldValue,
//           handleChange,
//           handleSubmit,
//         }) => {
//           return (
//             <>
//               <DialogContent sx={{ p: 1.5 }}>
//                 <Stack spacing={1}>
//                   <Stack alignSelf="center">
//                     <CustomImageChooser handleImageUpload={uploadProfile}>
//                       <Avatar
//                         srcSet={profileImage}
//                         sx={{ width: 100, height: 100, alignSelf: "center" }}
//                       />
//                     </CustomImageChooser>
//                   </Stack>
//                   <Typography
//                     variant="body2"
//                     color="primary.main"
//                     sx={{ fontWeight: "bold" }}
//                   >
//                     Personal information
//                   </Typography>
//                   <TextField
//                     label="Student ID"
//                     type="text"
//                     // fullWidth
//                     sx={{ maxWidth: { xs: "100%", md: 240 } }}
//                     disabled={true}
//                     size="small"
//                     value={values.indexnumber}
//                     onChange={handleChange("indexnumber")}
//                     error={Boolean(touched.indexnumber && errors.indexnumber)}
//                     helperText={touched.indexnumber && errors.indexnumber}
//                   />
//                   <CustomFormControl>
//                     <TextField
//                       label="Firstname"
//                       type="text"
//                       fullWidth
//                       size="small"
//                       value={values.firstname || ""}
//                       onChange={handleChange("firstname")}
//                       error={Boolean(touched.firstname && errors.firstname)}
//                       helperText={touched.firstname && errors.firstname}
//                     />
//                     <TextField
//                       label="Surname"
//                       fullWidth
//                       size="small"
//                       value={values.surname || ""}
//                       onChange={handleChange("surname")}
//                       error={Boolean(touched.surname && errors.surname)}
//                       helperText={touched.surname && errors.surname}
//                     />
//                     <TextField
//                       label="Othername"
//                       fullWidth
//                       size="small"
//                       value={values.othername || ""}
//                       onChange={handleChange("othername")}
//                       error={Boolean(touched.othername && errors.othername)}
//                       helperText={touched.othername && errors.othername}
//                     />
//                   </CustomFormControl>

//                   <CustomFormControl>
//                     <CustomDatePicker
//                       label="Date of Birth"
//                       date={dob}
//                       setDate={setDob}
//                       disableFuture={true}
//                       error={Boolean(touched.dateofbirth && errors.dateofbirth)}
//                       helperText={touched.dateofbirth && errors.dateofbirth}
//                     />
//                     <TextField
//                       label="Gender"
//                       select
//                       fullWidth
//                       size="small"
//                       value={values.gender || ""}
//                       onChange={handleChange("gender")}
//                       error={Boolean(touched.gender && errors.gender)}
//                       helperText={touched.gender && errors.gender}
//                     >
//                       <MenuItem value="male">male</MenuItem>
//                       <MenuItem value="female">female</MenuItem>
//                     </TextField>
//                   </CustomFormControl>
//                   <CustomFormControl>
//                     <TextField
//                       label="Email"
//                       fullWidth
//                       size="small"
//                       row={3}
//                       maxRows={3}
//                       value={values.email || ""}
//                       onChange={handleChange("email")}
//                       error={Boolean(touched.email && errors.email)}
//                       helperText={touched.email && errors.email}
//                     />
//                     <TextField
//                       label="Telephone No."
//                       inputMode="tel"
//                       type="tel"
//                       fullWidth
//                       size="small"
//                       value={values.phonenumber || ""}
//                       onChange={handleChange("phonenumber")}
//                       error={Boolean(touched.phonenumber && errors.phonenumber)}
//                       helperText={touched.phonenumber && errors.phonenumber}
//                     />
//                   </CustomFormControl>
//                   <TextField
//                     label="Address"
//                     fullWidth
//                     size="small"
//                     row={3}
//                     maxRows={3}
//                     value={values.address || ""}
//                     onChange={handleChange("address")}
//                     error={Boolean(touched.address && errors.address)}
//                     helperText={touched.address && errors.address}
//                   />
//                   <CustomFormControl>
//                     <Autocomplete
//                       freeSolo
//                       fullWidth
//                       size="small"
//                       options={TOWNS}
//                       loadingText="Please wait...."
//                       noOptionsText="No Town available"
//                       getOptionLabel={(option) => option || ""}
//                       value={values.residence || ""}
//                       onChange={(e, value) => setFieldValue("residence", value)}
//                       renderInput={(params) => (
//                         <TextField
//                           {...params}
//                           label="Residence"
//                           fullWidth
//                           size="small"
//                           error={Boolean(touched.residence && errors.residence)}
//                           helperText={touched.residence && errors.residence}
//                         />
//                       )}
//                     />

//                     <Autocomplete
//                       freeSolo
//                       fullWidth
//                       size="small"
//                       loadingText="Please wait...."
//                       options={NATIONALITY}
//                       noOptionsText="No Nationality available"
//                       getOptionLabel={(option) => option || ""}
//                       value={values.nationality || ""}
//                       onChange={(e, value) =>
//                         setFieldValue("nationality", value)
//                       }
//                       renderInput={(params) => (
//                         <TextField
//                           {...params}
//                           label="Nationality"
//                           fullWidth
//                           size="small"
//                           error={Boolean(
//                             touched.nationality && errors.nationality
//                           )}
//                           helperText={touched.nationality && errors.nationality}
//                         />
//                       )}
//                     />
//                   </CustomFormControl>

//                 </Stack>

//               </DialogContent>
//               <DialogActions>
//                 <Button
//                   loading={isPending}
//                   variant="contained"
//                   color="primary"
//                   onClick={handleSubmit}
//                 >
//                   Save Changes
//                 </Button>
//               </DialogActions>
//             </>
//           );
//         }}
//       </Formik>
//     </Dialog>
//   );
// };

// StudentEdit.propTypes = {};

// export default React.memo(StudentEdit);
