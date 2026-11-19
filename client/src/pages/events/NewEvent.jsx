import React, { useState, useContext } from "react";
import {
  Container,
  Stack,
  Autocomplete,
  Typography,
  TextField,
  Avatar,
  FormLabel,
  FormHelperText,
  Button,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { AddAPhoto } from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import { useForm, Controller } from "react-hook-form";
import _ from "lodash";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import CustomTitle from "@/components/custom/CustomTitle";
import { EVENT_TYPE } from "@/mockup/data/data";
import { useNavigate } from "react-router-dom";
import { eventValidationSchema } from "@/config/validationSchema";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postEvent } from "@/api/eventAPI";
import Back from "@/components/Back";
import TextEditor from "@/components/custom/TextEditor";
import { UserContext } from "@/context/providers/UserProvider";
import CustomFormControl from "@/components/inputs/CustomFormControl";

function NewEvent() {
  const queryClient = useQueryClient();
  const { session } = useContext(UserContext);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const navigate = useNavigate();
  const [showEndDate, setShowEndDate] = useState(false);
  const [profile, setProfile] = useState(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(eventValidationSchema),
    defaultValues: {
      type: "",
      title: "",
      description: "",
      album: "",
      caption: "",
      start: "",
      end: "",
    },
  });

  const { getRootProps, getInputProps, open } = useDropzone({
    noClick: true,
    noKeyboard: true,
    maxFiles: 1,
    accept: { "image/*": [".jpeg", ".png",".PNG", ".webp"] },
    maxSize: 200000,
    multiple: false,
    onDrop: (acceptedFiles) => {
      // console.log(acceptedFiles)
      if (!_.isEmpty(acceptedFiles)) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setProfile(event.target.result);
          setValue("album", event.target.result);
        };
        reader.readAsDataURL(acceptedFiles[0]);
      }
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: postEvent,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
    onSuccess: () => {
      schoolSessionDispatch(alertSuccess("Event Created"));
      navigate("/events");
    },
    onError: (error) => {
      schoolSessionDispatch(alertError(error));
    },
  });

  const onSubmit = (values) => {
    mutate({
      ...values,
      session: session?.sessionId,
      term: session?.termId,
    });
  };

  return (
    <Container>
      <Back to="/events" color="primary.main" />
      <CustomTitle
        title="New Events"
        subtitle="Send single and bulk SMS to students and parents"
        color="text.main"
        backColor="#012e54"
      />
      <Stack
        px={2}
        py={4}
        spacing={4}
        bgcolor="#fff"
        component="form"
        onSubmit={handleSubmit(onSubmit)}
      >
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Autocomplete
              {...field}
              onChange={(e, value) => setValue("type", value)}
              freeSolo
              fullWidth
              size="small"
              options={EVENT_TYPE}
              loadingText="Please wait...."
              noOptionsText="No Event available"
              getOptionLabel={(option) => option || ""}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Event Type"
                  fullWidth
                  size="small"
                  error={!!errors.type}
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
              error={!!errors.title}
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
              error={!!errors.caption}
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
                error={!!errors.startDate}
                helperText={errors.startDate?.message}
              />
            )}
          />
          <Stack width="100%" direction="row">
            <FormControlLabel
              control={
                <Checkbox
                  checked={showEndDate}
                  onChange={(e) => setShowEndDate(e.target.checked)}
                />
              }
              sx={{ whiteSpace: "no-wrap" }}
              label="End Date"
            />
            {showEndDate && (
              <Controller
                name="end"
                control={control}
                rules={{ required: showEndDate }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="End Date / Time"
                    type="datetime-local"
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.endDate}
                    helperText={errors.endDate?.message}
                  />
                )}
              />
            )}
          </Stack>
        </CustomFormControl>
        <div>
          <FormLabel
            sx={{ color: errors.album ? "#B72136" : "var(--primary)" }}
          >
            Event Photo/Album
          </FormLabel>
          <Stack
            {...getRootProps({ className: "dropzone" })}
            sx={{
              borderRadius: 1,
              border: errors.album
                ? "1px solid #B72136"
                : "1px dotted lightgray",
              py: 8,
              px: 4,
            }}
          >
            <Avatar
              variant="square"
              src={profile}
              sx={{
                width: profile ? "50%" : 120,
                height: profile ? "50%" : 120,
                objectFit: "contain",
                alignSelf: "center",
              }}
            />
            <input {...getInputProps()} />
            <Typography textAlign="center" paragraph>
              Drag & drop your photo here
            </Typography>
            <Button variant="outlined" onClick={open} startIcon={<AddAPhoto />}>
              Upload Image
            </Button>
          </Stack>
          {errors.album && (
            <FormHelperText sx={{ color: "#B72136" }}>
              {errors.album?.message}
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
            Create Event
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}

export default NewEvent;
