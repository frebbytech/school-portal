import React, { useContext } from "react";
import { SendRounded } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { postMessage } from "@/api/messageAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { thrownMessage } from "@/lib/formErrors";
import TextEditor from "@/components/custom/TextEditor";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { bulkWarning, messageSchema, smsLength, smsLengthText } from "./messageRules";

const GROUPS = { students: "Students", parents: "Parents", teachers: "Teachers" };

// A message to a whole group: it sends real SMS and email, so it asks first.
const SMSBulk = () => {
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
    resolver: yupResolver(messageSchema(null)),
    defaultValues: { type: "sms", group: "students", title: "", message: "" },
  });

  const [type, title, message] = watch(["type", "title", "message"]);
  const length = type !== "email" ? smsLengthText(smsLength(title, message)) : "";

  const { mutate, isPending } = useMutation({ mutationFn: postMessage });

  const send = (values) => {
    clearErrors("root.server");
    mutate(
      { ...values, rate: "bulk" },
      {
        onSettled: () => queryClient.invalidateQueries({ queryKey: ["messages"] }),
        onSuccess: (data) => {
          schoolSessionDispatch(alertSuccess(data));
          navigate("/messages");
        },
        onError: (error) => {
          setError("root.server", { type: "server", message: thrownMessage(error) });
          schoolSessionDispatch(alertError(error));
        },
      }
    );
  };

  const onSubmit = (values) => {
    Swal.fire({
      title: `Send to all ${GROUPS[values.group].toLowerCase()}?`,
      text: bulkWarning(values.type, values.group),
      showCancelButton: true,
      confirmButtonText: "Send",
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) send(values);
    });
  };

  return (
    <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)} sx={{ bgcolor: "#fff", borderRadius: "12px", p: 2 }}>
      <Stack spacing={3} justifyContent="center" alignItems="flex-start" paddingY={3}>
        <Typography variant="h5" color="primary.main" bgcolor="lightgray" p={1} sx={{ fontWeight: "bold", width: "100%" }}>
          Bulk Messages
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

        <Controller
          name="group"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Select Group" select fullWidth>
              {Object.entries(GROUPS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

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

        {length && (
          <Typography variant="caption" color="text.secondary" aria-live="polite" sx={{ mt: "-16px !important" }}>
            {length}
          </Typography>
        )}

        <Button type="submit" variant="contained" disabled={isPending} endIcon={<SendRounded />} sx={{ alignSelf: "flex-end", py: 1.5 }}>
          Send Message
        </Button>
      </Stack>

      {isPending && <LoadingSpinner value="Sending Message..." />}
    </Box>
  );
};

export default SMSBulk;
