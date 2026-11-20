import React, { useContext } from "react";
import { SendRounded } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { postMessage } from "@/api/messageAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { thrownMessage } from "@/lib/formErrors";
import TextEditor from "@/components/custom/TextEditor";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { messageSchema } from "./messageRules";

// A message to one person: a phone number, an email address, or both.
const SMSQuick = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  const {
    control,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    // the rules depend on the chosen type (SMS needs a phone number, email an address)
    resolver: (values, context, options) =>
      yupResolver(messageSchema(values.type, { individual: true }))(values, context, options),
    defaultValues: { type: "sms", phonenumber: "", email: "", title: "", message: "" },
  });
  const type = watch("type");

  const { mutate, isPending } = useMutation({ mutationFn: postMessage });

  const onSubmit = ({ type, phonenumber, email, title, message }) => {
    clearErrors("root.server");
    // only the recipient details the chosen type needs are sent
    const payload = {
      type,
      title,
      message,
      rate: "quick",
      ...(type !== "email" ? { phonenumber: phonenumber.trim() } : {}),
      ...(type !== "sms" ? { email: email.trim() } : {}),
    };
    mutate(payload, {
      onSettled: () => queryClient.invalidateQueries({ queryKey: ["messages"] }),
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        navigate("/messages");
      },
      onError: (error) => {
        setError("root.server", { type: "server", message: thrownMessage(error) });
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  return (
    <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)} sx={{ bgcolor: "#fff", borderRadius: "12px", p: 2 }}>
      <Stack spacing={3} justifyContent="flex-start" alignItems="flex-start" py={3}>
        <Typography variant="h5" color="primary.main" bgcolor="lightgray" p={1} sx={{ fontWeight: "bold", width: "100%" }}>
          Quick Message
        </Typography>

        {errors.root?.server?.message && (
          <Alert severity="error" role="alert" sx={{ width: "100%" }}>
            {errors.root.server.message}
          </Alert>
        )}

        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <FormControl>
              <FormLabel id="message-type">Select Type</FormLabel>
              <RadioGroup row aria-labelledby="message-type" {...field}>
                {Object.entries({ sms: "SMS", email: "Email", both: "Both" }).map(([value, label]) => (
                  <FormControlLabel key={value} value={value} control={<Radio />} label={label} />
                ))}
              </RadioGroup>
            </FormControl>
          )}
        />

        {type !== "email" && (
          <Controller
            name="phonenumber"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Recipient's Phone No"
                required
                type="tel"
                slotProps={{ htmlInput: { inputMode: "tel" } }}
                fullWidth
                error={Boolean(errors.phonenumber)}
                helperText={errors.phonenumber?.message}
              />
            )}
          />
        )}

        {type !== "sms" && (
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Recipient's Email Address"
                required
                type="email"
                fullWidth
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
              />
            )}
          />
        )}

        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Message Title" required fullWidth error={Boolean(errors.title)} helperText={errors.title?.message} />
          )}
        />

        <Controller
          name="message"
          control={control}
          render={({ field }) => (
            <TextEditor label="Message" value={field.value} setValue={field.onChange} touched={Boolean(errors.message)} errors={errors.message?.message} />
          )}
        />

        <Button type="submit" variant="contained" disabled={isPending} endIcon={<SendRounded />} sx={{ alignSelf: "flex-end", py: 1.5 }}>
          Send Message
        </Button>
      </Stack>

      {isPending && <LoadingSpinner value="Sending Message..." />}
    </Box>
  );
};

export default SMSQuick;
