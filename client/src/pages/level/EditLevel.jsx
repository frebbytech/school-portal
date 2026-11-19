import React, { useContext, useEffect } from "react";
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
import { putLevel } from "@/api/levelAPI";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { getAllTeachers } from "@/api/teacherAPI";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import CustomAutoComplete from "@/components/inputs/CustomAutoComplete";
import CustomFormControl from "@/components/inputs/CustomFormControl";
import { getLevelInitials } from "@/config/helper";

const EditLevel = () => {
  const queryClient = useQueryClient();
  const {
    schoolSessionState: {
      editLevel: { open, data },
    },
    schoolSessionDispatch,
  } = useContext(SchoolSessionContext);
  const { levelsOption } = useLevel();


  // Fetch all teachers
  const teachers = useQuery({
    queryKey: ["teachers"],
    queryFn: getAllTeachers,
    select: (data) =>
      data?.map((t) => ({
        _id: t?._id,
        fullName: t?.fullName,
      })) ?? [],
  });

  // Update mutation
  const { mutate, isPending } = useMutation({ mutationFn: putLevel });

  // Setup React Hook Form
  const {
    control,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: data || {
      _id: "",
      level: "",
      type: "",
      teacher: null,
    },
    resolver: yupResolver(levelValidationSchema),
  });



  const levelWatch = watch("level");
  const typeWatch = watch("type");
  const initialsWatch = watch("initials");

  // Reinitialize form when `data` changes
  useEffect(() => {
    if (data) {
      reset(data);
    }
  }, [data, reset]);

  const handleClose = () => {
    schoolSessionDispatch({
      type: "editLevel",
      payload: { open: false, data: {} },
    });
  };

  const onSubmit = async (values) => {
    const newType = `${values.level} ${values.type}`;
    const isMatch = levelsOption.find(
      ({ type }) => type === newType.toUpperCase()
    );

    if (!_.isEmpty(isMatch)) {
      schoolSessionDispatch(alertError("Level already exists!!!"));
      return;
    }

    const updatedLevel = {
      _id: values._id,
      level: {
        name: values.level,
        type: values.type,
      },
      initials:
        values.initials || getLevelInitials(`${levelWatch} ${typeWatch}`),
      ...(values?.teacher?._id && { teacher: values.teacher._id }),
    };

  

    mutate(updatedLevel, {
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        queryClient.invalidateQueries({ queryKey: ["levels"] });
        handleClose();
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
      <CustomDialogTitle title='Edit Level Details' subtitle='Update the academic level information.' onClose={handleClose} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
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
                      label="Level"
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
                    freeSolo
                    options={LEVEL_TYPE_OPTIONS}
                    value={field.value || ""}
                    onInputChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Type"
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

            {/* Teacher */}
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
                      error={!!errors.teacher}
                      helperText={errors.teacher?.message}
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
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </form>

      {isPending && <LoadingSpinner value="Saving Changes..." />}
    </Dialog>
  );
};

export default EditLevel;
