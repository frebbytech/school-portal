import React, { useContext, useMemo } from "react";
import {
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
import LoadingSpinner from "@/components/spinners/LoadingSpinner";

const AssignTutorLevel = ({ open, setOpen }) => {
  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  const { levelsOption } = useLevel();

  const memoizedLevelsOption = useMemo(() => {
    return levelsOption.map(({ _id, level }) => ({
      _id,
      levelName: `${level?.name} ${level?.type}`,
    }));
  }, [levelsOption]);

  // 📌 Load Teachers
  const { data: teachers = [], isPending: loadingTeachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: getAllTeachers,
    select: (teachers) =>
      teachers?.map((t) => ({
        _id: t._id,
        fullName: t.fullname,
      })),
  });

  // 📌 React Hook Form Setup
  const {
    handleSubmit,
    control,
    reset,
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
    setOpen(false);
  };

  // 📌 SUBMIT FORM
  const onSubmit = async (values) => {
    Swal.fire({
      title: "Assign Teacher",
      text: `Assign ${values.teacher?.fullName} to ${values.level?.type}`,
      showCancelButton: true,
      backdrop: false,
    }).then((result) => {
      if (!result.isConfirmed) return;

      const payload = {
        _id: values.level?._id,
        teacher: values.teacher?._id,
      };

      mutate(payload, {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ["levels"] });
        },
        onSuccess: () => {
          schoolSessionDispatch(alertSuccess("Teacher assigned successfully!"));
          handleClose();
        },
        onError: (error) => {
          schoolSessionDispatch(alertError(error));
        },
      });
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <CustomDialogTitle
        onClose={handleClose}
        title="Assign Teacher to Level"
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ p: 2 }}>
          <Stack spacing={2}>
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
                      label="Level"
                      size="small"
                      error={!!errors.level}
                      helperText={errors.level?._id?.message}
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
