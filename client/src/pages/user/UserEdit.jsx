import React, { useContext, useEffect } from "react";
import { Alert, Avatar, Box, Button, DialogActions, Stack } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import dayjs from "@/lib/dates";
import { getUser, putUser } from "@/api/userAPI";
import { uploadProfileImage } from "@/api/sessionAPI";
import Back from "@/components/Back";
import CustomTitle from "@/components/custom/CustomTitle";
import CustomImageChooser from "@/components/inputs/CustomImageChooser";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import QueryError from "@/components/QueryError";
import { userEditValidationSchema } from "@/config/validationSchema";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { thrownMessage } from "@/lib/formErrors";
import UserFields, { USER_DEFAULTS, dobRule } from "./UserFields";

const schema = userEditValidationSchema.shape({ dateofbirth: dobRule });

// What the form starts from: every field present, a missing or bad date left empty
export const editDefaults = (user = {}) => {
  const born = user?.dateofbirth ? dayjs(user.dateofbirth) : null;
  return {
    ...Object.fromEntries(
      Object.keys(USER_DEFAULTS).map((key) => [key, user?.[key] ?? USER_DEFAULTS[key]])
    ),
    dateofbirth: born?.isValid() ? born : null,
  };
};

const UserEdit = () => {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const navigate = useNavigate();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  const user = useQuery({
    queryKey: ["user", id],
    queryFn: () => getUser(id),
    initialData: queryClient.getQueryData(["users"])?.find((u) => u?._id === id),
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
    defaultValues: editDefaults(user.data),
  });

  // Fill the form when the record arrives, but never overwrite what is being typed
  useEffect(() => {
    if (user.data && !isDirty) reset(editDefaults(user.data));
  }, [user.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mutate, isPending } = useMutation({ mutationFn: putUser });

  const onSubmit = (values) => {
    clearErrors("root.server");
    mutate(
      {
        ...values,
        _id: id,
        dateofbirth: dayjs(values.dateofbirth).format("L"),
        isOnlyUpdate: true,
      },
      {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ["users"] });
          queryClient.invalidateQueries({ queryKey: ["user", id] });
        },
        onSuccess: (data) => {
          schoolSessionDispatch(alertSuccess(data));
          navigate(`/users/${id}`);
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
      { _id: id, profile, type: "users" },
      {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ["users"] });
          queryClient.invalidateQueries({ queryKey: ["user", id] });
        },
        onSuccess: () => schoolSessionDispatch(alertSuccess("Profile Updated!")),
        onError: (error) => schoolSessionDispatch(alertError(error)),
      }
    );
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

      {user.isError && !user.data && (
        <QueryError what="this user" error={user.error} onRetry={() => user.refetch()} />
      )}

      {user.data && (
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
                      srcSet={user.data?.profile}
                      sx={{ width: 100, height: 100, alignSelf: "center" }}
                    />
                  )}
                </CustomImageChooser>
              </Stack>
              <UserFields control={control} errors={errors} />
              <DialogActions>
                <Button onClick={handleGoBack} disabled={isPending}>
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
    </>
  );
};

export default UserEdit;
