import React, { useContext, useMemo } from "react";
import {
  Alert,
  Stack,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Button,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { AssignTutorValidationSchema } from "@/config/validationSchema";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";

import { assignTeacherLevel } from "@/api/levelAPI";
import { getAllTeachers } from "@/api/teacherAPI";
import useLevel from "@/components/hooks/useLevel";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { thrownMessage } from "@/lib/formErrors";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";

const AssignTutorLevel = ({ open, setOpen }) => {
  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  const { levelsOption, levelError, levelRefetch } = useLevel();

  // Only classes without a class teacher: the server refuses one that already has one
  const memoizedLevelsOption = useMemo(() => {
    return (levelsOption || [])
      .filter((l) => !l?.teacher?._id)
      .map(({ _id, type }) => ({ _id, levelName: type || "" }));
  }, [levelsOption]);
  const everyClassHasATeacher = (levelsOption || []).length > 0 && memoizedLevelsOption.length === 0;

  // Only active teachers can be given a class
  const teachersQuery = useQuery({
    queryKey: ["teachers"],
    queryFn: getAllTeachers,
    enabled: open,
  });
  const loadingTeachers = teachersQuery.isPending;
  const teachers = useMemo(
    () =>
      (teachersQuery.data || [])
        .filter((t) => t.active !== false)
        .map((t) => ({ _id: t._id, fullName: t.fullname })),
    [teachersQuery.data]
  );

  // 📌 React Hook Form Setup
  const {
    handleSubmit,
    control,
    reset,
    setError,
    clearErrors,
    formState: { errors, isValid },
  } = useForm({
    resolver: yupResolver(AssignTutorValidationSchema),
    mode: "onChange",
    defaultValues: {
      teacher: null,
      level: null,
    },
  });

  // 📌 Mutation
  const { mutate, isPending } = useMutation({
    mutationFn: assignTeacherLevel,
  });

  const handleClose = () => {
    reset();
    clearErrors("root.server");
    setOpen(false);
  };

  // 📌 SUBMIT FORM
  const onSubmit = async (values) => {
    Swal.fire({
      title: "Assign Teacher",
      text: `Make ${values.teacher?.fullName} the class teacher of ${values.level?.levelName}?`,
      showCancelButton: true,
      backdrop: false,
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload = {
        _id: values.level?._id,
        teacher: values.teacher?._id,
      };

      clearErrors("root.server");
      mutate(payload, {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ["levels"] });
        },
        onSuccess: () => {
          schoolSessionDispatch(alertSuccess("Teacher assigned successfully!"));
          handleClose();
        },
        onError: (error) => {
          setError("root.server", { type: "server", message: thrownMessage(error) });
          schoolSessionDispatch(alertError(error));
        },
      });
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <CustomDialogTitle
        onClose={handleClose}
        title="Assign Teacher to Class"
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ p: 2 }}>
          <Stack spacing={2}>
            {errors.root?.server?.message && (
              <Alert severity="error" role="alert">{errors.root.server.message}</Alert>
            )}
            {teachersQuery.isError && (
              <Alert severity="error" role="alert" action={<Button color="inherit" size="small" onClick={() => teachersQuery.refetch()}>Try again</Button>}>
                Could not load the teachers.
              </Alert>
            )}
            {levelError && (
              <Alert severity="error" role="alert" action={<Button color="inherit" size="small" onClick={() => levelRefetch()}>Try again</Button>}>
                Could not load the classes.
              </Alert>
            )}
            {everyClassHasATeacher && (
              <Alert severity="info">Every class already has a class teacher.</Alert>
            )}
            {/* 📌 TEACHER FIELD */}
            <Controller
              name="teacher"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={teachers}
                  loading={loadingTeachers}
                  getOptionLabel={(opt) => opt?.fullName || ""}
                  isOptionEqualToValue={(o, v) => o._id === v?._id}
                  value={field.value}
                  onChange={(_, value) => field.onChange(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Choose Teacher"
                      size="small"
                      error={!!errors.teacher}
                      helperText={errors.teacher?.message}
                    />
                  )}
                />
              )}
            />

            {/* 📌 LEVEL FIELD */}
            <Controller
              name="level"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={memoizedLevelsOption}
                  getOptionLabel={(opt) => opt?.levelName || ""}
                  isOptionEqualToValue={(o, v) => o?._id === v?._id}
                  value={field.value}
                  onChange={(_, value) => field.onChange(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Class"
                      size="small"
                      error={!!errors.level}
                      helperText={errors.level?._id?.message || errors.level?.message}
                    />
                  )}
                />
              )}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button variant="outlined" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!isValid || isPending}
          >
            Assign Teacher
          </Button>
        </DialogActions>
      </form>

      {isPending && <LoadingSpinner value="Assigning teacher..." />}
    </Dialog>
  );
};

export default AssignTutorLevel;
