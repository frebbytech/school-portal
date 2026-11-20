import React, { useContext, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
  MenuItem,
  FormControl,
  FormHelperText,
  InputLabel,
  CircularProgress,
  Modal,
  Select,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAnnouncement, putAnnouncement } from "@/api/announcementAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { thrownMessage } from "@/lib/formErrors";
import QueryError from "@/components/QueryError";

const validationSchema = Yup.object().shape({
  title: Yup.string().trim().required("Title is required").min(3, "At least 3 characters"),
  description: Yup.string()
    .trim()
    .required("Description is required")
    .min(10, "At least 10 characters"),
  priority: Yup.string()
    .oneOf(["high", "medium", "low", "default"])
    .required("Priority is required"),
});

const EditAnnouncementModal = ({ onClose }) => {
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const [searchParams] = useSearchParams();
  const announcementId = searchParams.get("_id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const announcement = useQuery({
    queryKey: ["announcement", announcementId],
    queryFn: () => getAnnouncement(announcementId),
    enabled: !!announcementId,
  });

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: { title: "", description: "", priority: "medium" },
  });

  useEffect(() => {
    if (!announcement.data) return;
    reset({
      title: announcement.data.title || "",
      description: announcement.data.description || "",
      priority: announcement.data.priority || "medium",
    });
  }, [announcement.data, reset]);

  const mutation = useMutation({
    mutationFn: putAnnouncement,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["announcement", announcementId] });
    },
    onSuccess: () => {
      onClose();
      schoolSessionDispatch(alertSuccess("Announcement Updated!"));
    },
    onError: (error) => {
      setError("root.server", { type: "server", message: thrownMessage(error) });
      schoolSessionDispatch(alertError(error));
    },
  });

  // The server derives the background colour from the priority.
  const onSubmit = (values) => mutation.mutate({ ...values, _id: announcementId });

  const missing = announcement.isSuccess && !announcement.data;

  return (
    <Modal open={Boolean(announcementId)} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 2,
          borderRadius: 2,
          width: { xs: 300, md: 500 },
        }}
      >
        {announcement.isPending ? (
          <Box display="flex" justifyContent="center" alignItems="center">
            <CircularProgress />
          </Box>
        ) : announcement.isError ? (
          <QueryError
            what="the announcement"
            error={announcement.error}
            onRetry={announcement.refetch}
          />
        ) : missing ? (
          <Alert severity="warning">This announcement no longer exists.</Alert>
        ) : (
          <>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Edit Announcement
            </Typography>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {errors.root?.server && (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {errors.root.server.message}
                </Alert>
              )}

              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    margin="normal"
                    label="Title"
                    error={!!errors.title}
                    helperText={errors.title?.message}
                  />
                )}
              />

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    margin="normal"
                    label="Description"
                    multiline
                    rows={4}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />

              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth margin="normal" error={!!errors.priority}>
                    <InputLabel id="edit-announcement-priority">Priority</InputLabel>
                    <Select
                      {...field}
                      labelId="edit-announcement-priority"
                      label="Priority"
                    >
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="default">Default</MenuItem>
                    </Select>
                    {errors.priority && (
                      <FormHelperText>{errors.priority.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />

              <Box sx={{ textAlign: "right", mt: 2 }}>
                <Button
                  color="secondary"
                  variant="outlined"
                  onClick={() => navigate("/announcements")}
                  sx={{ mr: 2 }}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Updating..." : "Save Changes"}
                </Button>
              </Box>
            </form>
          </>
        )}
      </Box>
    </Modal>
  );
};

export default EditAnnouncementModal;
