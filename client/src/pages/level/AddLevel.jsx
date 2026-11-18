import React from "react";
import {
  Stack,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Button,
  Typography,
} from "@mui/material";
import _ from "lodash";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  LEVEL_OPTIONS,
  LEVEL_TYPE_OPTIONS,
} from "@/mockup/columns/sessionColumns";
import { levelValidationSchema } from "@/config/validationSchema";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import useLevel from "@/components/hooks/useLevel";
import { postLevel } from "@/api/levelAPI";
import { levelInitialValues } from "@/config/initialValues";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { UserContext } from "@/context/providers/UserProvider";
import { getAllTeachers } from "@/api/teacherAPI";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import CustomFormControl from "@/components/inputs/CustomFormControl";
import { getLevelInitials } from "@/config/helper";


const AddLevel = ({ open, setOpen }) => {
  const { session } = React.useContext(UserContext);
  const { schoolSessionDispatch } = React.useContext(SchoolSessionContext);
  const { levelsOption, departments } = useLevel();
  const queryClient = useQueryClient();

  const teachers = useQuery({
    queryKey: ["teachers"],
    queryFn: getAllTeachers,
    initialData: [],
    select: (data) =>
      data?.map((teacher) => ({
        _id: teacher?._id,
        fullName: teacher?.fullname,
      })) ?? [],
  });

  const { mutate, isPending } = useMutation({ mutationFn: postLevel });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: levelInitialValues,
    resolver: yupResolver(levelValidationSchema),
  });

  const levelWatch = watch("level");
  const typeWatch = watch("type");
  const initialsWatch = watch("initials");

  const onSubmit = (values) => {
    const newType = `${values.level} ${values.type}`;
    const isMatch = levelsOption.find(
      ({ type }) => type === newType.toUpperCase()
    );

    if (!_.isEmpty(isMatch)) {
      schoolSessionDispatch(alertError("Level already exists!!!"));
      return;
    }

    const newLevel = {
      session: session.sessionId,
      term: session.termId,
      level: {
        name: values.level,
        type: values.type,
      },
      initials:
        values.initials || getLevelInitials(`${levelWatch} ${typeWatch}`),
      ...(values?.teacher?._id && { teacher: values.teacher._id }),
    };

    mutate(newLevel, {
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        queryClient.invalidateQueries({ queryKey: ["levels"] });
        reset();
        setOpen(false);
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <CustomDialogTitle
        title="New Level"
        subtitle="Create a new academic level for your school."
        onClose={() => setOpen(false)}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ p: 1 }}>
          <Stack spacing={2} py={2}>
            {/* Level */}
            <Controller
              name="level"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  freeSolo
                  options={LEVEL_OPTIONS}
                  value={field.value || ""}
                  onInputChange={(_, value) => field.onChange(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Level"
                      size="small"
                      error={!!errors.level}
                      helperText={errors.level?.message}
                    />
                  )}
                />
              )}
            />
            {/* <CustomAutoComplete
              name="department"
              control={control}
              label="Department"
              data={{
                data: departments,
                isPending: false,
              }}
            /> */}
            <CustomFormControl>
              {/* Level Type */}
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    fullWidth
                    freeSolo
                    options={LEVEL_TYPE_OPTIONS}
                    value={field.value || ""}
                    onInputChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Level Type"
                        size="small"
                        error={!!errors.type}
                        helperText={errors.type?.message}
                      />
                    )}
                  />
                )}
              />

              {/* Initials */}
              <Controller
                name="initials"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Level Initials"
                    fullWidth
                    size="small"
                    placeholder="e.g. J.H.S 1"
                    error={!!errors.initials}
                    helperText={errors.initials?.message}
                    slotProps={{
                      htmlInput: {
                        style: {
                          textTransform: "uppercase",
                        },
                      },
                    }}
                  />
                )}
              />
            </CustomFormControl>

            {/* Assign Teacher */}
            <Controller
              name="teacher"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={teachers.data}
                  loading={teachers.isPending}
                  getOptionLabel={(option) => option?.fullName || ""}
                  value={field.value || null}
                  onChange={(_, value) => field.onChange(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Assign Teacher"
                      size="small"
                    />
                  )}
                />
              )}
            />
            <Typography
              variant="body2"
              color="primary.main"
              sx={{ fontWeight: "bold", textDecoration: "underline" }}
            >
              Level Preview
            </Typography>
            {levelWatch && (
              <Typography
                variant="body2"
                fontStyle="italic"
                sx={{
                  ml: 2,
                  p: 2,
                  // bgcolor: "",
                  border: "1px solid whitesmoke",
                }}
              >
                {levelWatch} {typeWatch} -{" "}
                <Typography
                  variant="caption"
                  color="green"
                  fontWeight="bold"
                  textTransform="uppercase"
                >
                  {initialsWatch ||
                    getLevelInitials(`${levelWatch} ${typeWatch}`)}
                </Typography>
              </Typography>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            type="submit"
            variant="contained"
            disabled={isPending}
            fullWidth
          >
            {isPending ? "Adding..." : "Add Level"}
          </Button>
        </DialogActions>
      </form>

      {isPending && (
        <LoadingSpinner value="Creating New Level. Please wait..." />
      )}
    </Dialog>
  );
};

export default AddLevel;

// import React, { use } from "react";
// import {
//   Stack,
//   Dialog,
//   DialogContent,
//   DialogActions,
//   TextField,
//   Autocomplete,
//   Button,
// } from "@mui/material";
// import _ from "lodash";
// import { Formik } from "formik";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import {
//   LEVEL_OPTIONS,
//   LEVEL_TYPE_OPTIONS,
// } from "@/mockup/columns/sessionColumns";
// import { levelValidationSchema } from "@/config/validationSchema";
// import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
// import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
// import useLevel from "@/components/hooks/useLevel";
// import { postLevel } from "@/api/levelAPI";
// import { levelInitialValues } from "@/config/initialValues";
// import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
// import { UserContext } from "@/context/providers/UserProvider";
// import { getAllTeachers } from "@/api/teacherAPI";
// import LoadingSpinner from "@/components/spinners/LoadingSpinner";
// import Input from "@/components/inputs/Input";

// const AddLevel = ({ open, setOpen }) => {
//   const { session } = use(UserContext);

//   const queryClient = useQueryClient();
//   const { schoolSessionDispatch } = use(SchoolSessionContext);
//   const { levelsOption } = useLevel();

//   const teachers = useQuery({
//     queryKey: ["teachers"],
//     queryFn: () => getAllTeachers(),
//     initialData: [],
//     select: (teachers) => {
//       const modifiedTeachers = teachers?.map((teacher) => {
//         return {
//           _id: teacher?._id,
//           fullName: teacher?.fullname,
//         };
//       });
//       // console.log(modifiedTeachers);
//       return modifiedTeachers;
//     },
//   });

//   //ADD New Level
//   const { mutateAsync, isPending } = useMutation({ mutationFn: postLevel });

//   const onSubmit = (values, options) => {
//     const newType = `${values.level}${values.type}`;
//     const isMatch = levelsOption.find(
//       ({ type }) => type === newType.toUpperCase()
//     );

//     if (!_.isEmpty(isMatch)) {
//       schoolSessionDispatch(alertError("Level already exists!!!"));
//       options.setSubmitting(false);
//       return;
//     }

//     const newLevel = {
//       session: session.sessionId,
//       term: session.termId,
//       level: {
//         name: values.level,
//         type: values.type,
//       },
//     };
//     if (values?.teacher?._id) {
//       newLevel.teacher = values?.teacher?._id;
//     }

//     mutateAsync(newLevel, {
//       onSettled: () => {
//         options.setSubmitting(false);
//         queryClient.invalidateQueries(["levels"]);
//       },
//       onSuccess: (data) => {
//         schoolSessionDispatch(alertSuccess(data));

//         setOpen(false);
//       },
//       onError: (error) => {
//         schoolSessionDispatch(alertError(error));
//       },
//     });
//   };

//   return (
//     <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
//       <CustomDialogTitle title="New Level" onClose={() => setOpen(false)} />
//       <Formik
//         initialValues={levelInitialValues}
//         onSubmit={onSubmit}
//         validationSchema={levelValidationSchema}
//       >
//         {({ values, errors, touched, handleSubmit, setFieldValue }) => {
//           return (
//             <>
//               <DialogContent sx={{ p: 1 }}>
//                 <Stack spacing={2} paddingY={2}>
//                   <Autocomplete
//                     freeSolo
//                     options={LEVEL_OPTIONS}
//                     getOptionLabel={(option) => option || ""}
//                     value={values.level}
//                     onInputChange={(_, value) => setFieldValue("level", value)}
//                     renderInput={(params) => (
//                       <TextField
//                         {...params}
//                         label="Select Level"
//                         size="small"
//                         error={Boolean(touched.level && errors.level)}
//                         helperText={touched.level && errors.level}
//                       />
//                     )}
//                   />
//                   <Autocomplete
//                     freeSolo
//                     options={LEVEL_TYPE_OPTIONS}
//                     getOptionLabel={(option) => option || ""}
//                     value={values.type}
//                     onInputChange={(e, value) => setFieldValue("type", value)}
//                     renderInput={(params) => (
//                       <TextField
//                         {...params}
//                         label="Select Level Type"
//                         size="small"
//                       />
//                     )}
//                   />
//                   <Input
//                     label="Initials"
//                     name="initials"
//                     fullWidth
//                     autoFocus
//                     control={control}
//                     size="small"
//                   />
//                   <Autocomplete
//                     options={teachers?.data}
//                     loading={teachers.isPending}
//                     getOptionLabel={(option) => option?.fullName || ""}
//                     value={values?.teacher}
//                     onChange={(e, value) => setFieldValue("teacher", value)}
//                     renderInput={(params) => (
//                       <TextField
//                         {...params}
//                         label="Assign Teacher"
//                         size="small"
//                       />
//                     )}
//                   />
//                 </Stack>
//               </DialogContent>
//               <DialogActions sx={{ padding: 2 }}>
//                 <Button
//                   loading={isPending}
//                   variant="contained"
//                   onClick={handleSubmit}
//                 >
//                   Add Level
//                 </Button>
//               </DialogActions>
//             </>
//           );
//         }}
//       </Formik>

//       {isPending && (
//         <LoadingSpinner value="Creating New Level. Please wait..." />
//       )}
//     </Dialog>
//   );
// };

// export default AddLevel;
