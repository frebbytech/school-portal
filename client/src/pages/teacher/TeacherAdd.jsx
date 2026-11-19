import React, { useContext, useState } from "react";
import { Alert, Avatar, Box, Button, Stack, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import dayjs from "@/lib/dates";
import { postTeacher } from "@/api/teacherAPI";
import CustomImageChooser from "@/components/inputs/CustomImageChooser";
import CustomTitle from "@/components/custom/CustomTitle";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { teacherValidationSchema } from "@/config/validationSchema";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { thrownMessage } from "@/lib/formErrors";
import UserFields, { USER_DEFAULTS, dobRule } from "../user/UserFields";

const schema = teacherValidationSchema.shape({ dateofbirth: dobRule });
const { role: _role, ...TEACHER_DEFAULTS } = USER_DEFAULTS;

const TeacherAdd = ({ setTab }) => {
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { ...TEACHER_DEFAULTS, profile: null },
  });

  const { isPending, mutate } = useMutation({ mutationFn: postTeacher });

  const onSubmit = (values) => {
    clearErrors("root.server");
    mutate(
      { ...values, dateofbirth: dayjs(values.dateofbirth).format("L") },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ["teachers"] });
          schoolSessionDispatch(alertSuccess(data));
          reset();
          setPreview(null);
          setTab?.("1");
        },
        onError: (error) => {
          // Keep what was typed and say why (for example, the username is taken)
          setError("root.server", { type: "server", message: thrownMessage(error) });
          schoolSessionDispatch(alertError(error));
        },
      }
    );
  };

  const choosePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setValue("profile", file);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
  };

  return (
    <>
      <Box sx={{ backgroundColor: "#fff", borderRadius: "12px" }}>
        <CustomTitle
          title="New Facilitator"
          subtitle="Fill in the new teacher's personal and contact details."
          img={null}
          color="primary.main"
        />
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack padding={2} spacing={2}>
            {errors.root?.server && (
              <Alert severity="error" role="alert">
                {errors.root.server.message}
              </Alert>
            )}
            <Stack alignSelf="center">
              <CustomImageChooser handleImageUpload={choosePhoto}>
                <Avatar srcSet={preview} sx={{ width: 100, height: 100, alignSelf: "center" }} />
              </CustomImageChooser>
            </Stack>
            <UserFields control={control} errors={errors} showRole={false} />
            <Typography variant="caption" color="text.secondary">
              The teacher&apos;s first password is their telephone number. They are asked to
              choose their own the first time they sign in, so check the number is right.
            </Typography>
            <Stack direction="row" justifyContent="flex-end" spacing={2} paddingY={2}>
              <Button type="submit" variant="contained" color="primary" disabled={isPending}>
                {isPending ? "Saving..." : "Save Teacher"}
              </Button>
            </Stack>
          </Stack>
        </form>
      </Box>
      {isPending && <LoadingSpinner value="Creating New Teacher..." />}
    </>
  );
};

export default TeacherAdd;
