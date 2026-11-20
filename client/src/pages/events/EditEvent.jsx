import React, { useEffect, useContext, useState } from "react";
import {
  Container,
  Stack,
  Autocomplete,
  Typography,
  TextField,
  Avatar,
  FormLabel,
  FormHelperText,
  Alert,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import Button from "@mui/material/Button";
import { AddAPhoto } from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import _ from "lodash";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import CustomTitle from "@/components/custom/CustomTitle";
import { EVENT_TYPE } from "@/mockup/data/data";
import { useNavigate, useParams } from "react-router-dom";
import { eventValidationSchema } from "@/config/validationSchema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEvent, putEvent } from "@/api/eventAPI";
import Back from "@/components/Back";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import TextEditor from "@/components/custom/TextEditor";
import CustomFormControl from "@/components/inputs/CustomFormControl";
import QueryError from "@/components/QueryError";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { thrownMessage } from "@/lib/formErrors";
import dayjs from "@/lib/dates";

const toInput = (value) => (value ? dayjs(value).format("YYYY-MM-DDTHH:mm") : "");

function EditEvent() {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const navigate = useNavigate();
  const [showEndDate, setShowEndDate] = useState(false);

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(eventValidationSchema),
    defaultValues: {
      _id: id,
      type: "",
      title: "",
      caption: "",
      description: "",
      album: "",
      start: "",
      end: "",
    },
  });

  const event = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEvent(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (!event.data) return;
    setShowEndDate(!!event.data.end);
    reset({
      _id: id,
      type: event?.data?.type || "",
      title: event?.data?.title || "",
      caption: event?.data?.caption || "",
      description: event?.data?.description || "",
      album: event?.data?.album || "",
      start: toInput(event?.data?.start),
      end: toInput(event?.data?.end),
    });
  }, [event.data, id, reset]);

  const { getRootProps, getInputProps, open } = useDropzone({
    noClick: true,
    noKeyboard: true,
    maxFiles: 1,
    accept: { "image/*": [".jpeg", ".png", ".webp"] },
    // maxSize: 200000,
    multiple: false,
    onDrop: (acceptedFiles) => {

      if (!_.isEmpty(acceptedFiles)) {
        const reader = new FileReader();
        reader.onload = function (event) {
          const ImageURL = event.target.result;
          setValue("album", ImageURL);
        };
        reader.readAsDataURL(acceptedFiles[0]);
      }
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: putEvent,
  });

  const onSubmit = (values) => {
    mutate(values, {
      onSettled: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        navigate("/events");
      },
      onError: (error) => {
        setError("root.server", { type: "server", message: thrownMessage(error) });
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  return (
    <Container>
      <Back to="/events" color="primary.main" />
      <CustomTitle
        title="Edit Event"
        subtitle="Change the details, dates or photo of this event."
        color="text.main"
        backColor="#012e54"
      />

      {event.isPending && <LoadingSpinner />}
      {event.isError && (
        <QueryError what="the event" error={event.error} onRetry={event.refetch} />
      )}
      {event.isSuccess && !event.data && (
        <Alert severity="warning">This event no longer exists.</Alert>
      )}
      {event.data && (
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack px={2} py={4} spacing={4} bgcolor="#fff">
          {errors.root?.server && (
            <Alert severity="error">{errors.root.server.message}</Alert>
          )}
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Autocomplete
                freeSolo
                fullWidth
                size="small"
                options={EVENT_TYPE}
                getOptionLabel={(option) => option || ""}
                value={field.value || ""}
                onChange={(e, value) => field.onChange(value || "")}
                onInputChange={(e, value, reason) => {
                  if (reason === "input") field.onChange(value);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Event Type"
                    fullWidth
                    size="small"
                    error={Boolean(errors.type)}
                    helperText={errors.type?.message}
                  />
                )}
              />
            )}
          />

          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Event Title"
                fullWidth
                size="small"
                error={Boolean(errors.title)}
                helperText={errors.title?.message}
              />
            )}
          />

          <Controller
            name="caption"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Event Caption"
                fullWidth
                size="small"
                error={Boolean(errors.caption)}
                helperText={errors.caption?.message}
              />
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextEditor
                {...field}
                label="Description"
                touched={!!errors.description}
                errors={errors.description?.message}
              />
            )}
          />

          <CustomFormControl>
            <Controller
              name="start"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Start Date / Time"
                  type="datetime-local"
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  error={!!errors.start}
                  helperText={errors.start?.message}
                />
              )}
            />
            <Stack width="100%" direction="row">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showEndDate}
                    onChange={(e) => {
                      setShowEndDate(e.target.checked);
                      if (!e.target.checked) setValue("end", "");
                    }}
                  />
                }
                label="End Date"
              />
              {showEndDate && (
                <Controller
                  name="end"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="End Date / Time"
                      type="datetime-local"
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.end}
                      helperText={errors.end?.message}
                    />
                  )}
                />
              )}
            </Stack>
          </CustomFormControl>

          <div>
            <FormLabel
              style={{
                color: errors.album ? "#B72136" : "var(--primary)",
              }}
            >
              Event Photo/Album
            </FormLabel>
            <Stack
              {...getRootProps()}
              sx={{
                borderRadius: 1,
                border: errors.album
                  ? "1px solid #B72136"
                  : "1px dotted lightgray",
                py: 8,
                px: 4,
              }}
            >
              <Controller
                name="album"
                control={control}
                render={({ field }) => (
                  <Avatar
                    variant="square"
                    src={field.value}
                    sx={{
                      width: { xs: 120, md: 480 },
                      height: { xs: 120, md: 480 },
                      objectFit: "contain",
                      alignSelf: "center",
                    }}
                  />
                )}
              />
              <input {...getInputProps()} />
              <Typography textAlign="center" paragraph>
                Drag & drop your photo here
              </Typography>
              <Button
                variant="outlined"
                onClick={() => open()}
                startIcon={<AddAPhoto />}
              >
                Upload Image
              </Button>
            </Stack>
            {errors.album && (
              <FormHelperText sx={{ color: "#B72136" }}>
                {errors.album.message}
              </FormHelperText>
            )}
          </div>

          <Stack direction="row" justifyContent="flex-end" spacing={2}>
            <Button onClick={() => navigate("/events")}>Cancel</Button>
            <Button
              type="submit"
              disabled={isPending}
              variant="contained"
              color="primary"
            >
              Save Changes
            </Button>
          </Stack>
        </Stack>
      </form>
      )}
    </Container>
  );
}

export default EditEvent;
