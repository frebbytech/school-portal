import React, { useContext, useEffect } from "react";
import { Alert, Avatar, Box, Button, Container, DialogActions, Stack } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import dayjs from "@/lib/dates";
import { getTeacher, putTeacher } from "@/api/teacherAPI";
import { uploadProfileImage } from "@/api/sessionAPI";
import Back from "@/components/Back";
import CustomTitle from "@/components/custom/CustomTitle";
import CustomImageChooser from "@/components/inputs/CustomImageChooser";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import QueryError from "@/components/QueryError";
import { teacherValidationSchema } from "@/config/validationSchema";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { thrownMessage } from "@/lib/formErrors";
import UserFields, { USER_DEFAULTS, dobRule } from "../user/UserFields";

const schema = teacherValidationSchema.shape({ dateofbirth: dobRule });
const { role: _role, ...TEACHER_DEFAULTS } = USER_DEFAULTS;

// What the form starts from: every field present, a missing or bad date left empty
export const teacherDefaults = (teacher = {}) => {
  const born = teacher?.dateofbirth ? dayjs(teacher.dateofbirth) : null;
  return {
    ...Object.fromEntries(
      Object.keys(TEACHER_DEFAULTS).map((key) => [key, teacher?.[key] ?? TEACHER_DEFAULTS[key]])
    ),
    dateofbirth: born?.isValid() ? born : null,
  };
};

const TeacherEdit = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  const teacher = useQuery({
    queryKey: ["teacher", id],
    queryFn: () => getTeacher(id),
    enabled: !!id,
  });

  const {
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: teacherDefaults(teacher.data),
  });

  // Fill the form when the record arrives, but never overwrite what is being typed
  useEffect(() => {
    if (teacher.data && !isDirty) reset(teacherDefaults(teacher.data));
  }, [teacher.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mutate, isPending } = useMutation({ mutationFn: putTeacher });

  const onSubmit = (values) => {
    clearErrors("root.server");
    mutate(
      { ...values, _id: id, dateofbirth: dayjs(values.dateofbirth).format("L") },
      {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ["teachers"] });
          queryClient.invalidateQueries({ queryKey: ["teacher", id] });
        },
        onSuccess: (data) => {
          schoolSessionDispatch(alertSuccess(data));
          navigate(`/teacher/${id}`);
        },
        onError: (error) => {
          setError("root.server", { type: "server", message: thrownMessage(error) });
          schoolSessionDispatch(alertError(error));
        },
      }
    );
  };

  const changeProfile = useMutation({ mutationFn: uploadProfileImage });
  const uploadProfile = (e) => {
    const profile = e.target?.files?.[0];
    if (!profile) return;
    changeProfile.mutate(
      { _id: id, profile, type: "teachers" },
      {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ["teachers"] });
          queryClient.invalidateQueries({ queryKey: ["teacher", id] });
        },
        onSuccess: () => schoolSessionDispatch(alertSuccess("Profile Updated!")),
        onError: (error) => schoolSessionDispatch(alertError(error)),
      }
    );
  };

  return (
    <Container>
      <Back to={`/teacher/${id}`} color="primary.main" />
      <CustomTitle title="Edit Teacher" subtitle="Manage changes to teachers profile" color="primary.main" />

      {teacher.isError && !teacher.data && (
        <QueryError what="this teacher" error={teacher.error} onRetry={() => teacher.refetch()} />
      )}

      {teacher.data && (
        <Box sx={{ bgcolor: "#fff", borderRadius: "12px" }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <Stack padding={2} spacing={2}>
              {errors.root?.server && (
                <Alert severity="error" role="alert">
                  {errors.root.server.message}
                </Alert>
              )}
              <Stack alignSelf="center">
                <CustomImageChooser handleImageUpload={uploadProfile}>
                  {changeProfile.isPending ? (
                    <div className="spinner"></div>
                  ) : (
                    <Avatar
                      srcSet={teacher.data?.profile}
                      sx={{ width: 100, height: 100, alignSelf: "center" }}
                    />
                  )}
                </CustomImageChooser>
              </Stack>
              <UserFields control={control} errors={errors} showRole={false} />
              <DialogActions>
                <Button onClick={() => navigate(`/teacher/${id}`)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" color="primary" disabled={isPending}>
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogActions>
            </Stack>
          </form>
        </Box>
      )}
      {isPending && <LoadingSpinner value="Saving Changes..." />}
    </Container>
  );
};

export default TeacherEdit;
