import React, { useContext, useMemo, useState } from "react";
import { SendRounded } from "@mui/icons-material";
import {
  Stack,
  TextField,
  FormControlLabel,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Typography,
  Button,
  Box,
} from "@mui/material";
import { Formik } from "formik";
import { useMutation } from "@tanstack/react-query";
import { quickMessageInitialValues } from "@/config/initialValues";
import { postMessage } from "@/api/messageAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import TextEditor from "@/components/custom/TextEditor";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { useNavigate } from "react-router-dom";

const SMSQuick = () => {
  const navigate = useNavigate();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  const [radioValue, setRadioValue] = useState("sms");

  const data = useMemo(
    () => quickMessageInitialValues(radioValue),
    [radioValue]
  );

  const { mutate, isPending } = useMutation({ mutationFn: postMessage });
  const onSubmit = (values, options) => {
    values.rate = "quick";
    mutate(values, {
      onSettled: () => {
        options.setSubmitting(false);
      },
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        navigate("/messages");
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  return (
    <Box sx={{ bgcolor: "#fff", borderRadius: "12px", p: 2 }}>
      <Formik
        initialValues={data.init}
        onSubmit={onSubmit}
        validationSchema={data.val}
        enableReinitialize={true}
      >
        {({
          values,
          errors,
          touched,
          isSubmitting,
          handleChange,
          handleSubmit,
        }) => {
          return (
            <Stack
              spacing={3}
              justifyContent="flex-start"
              alignItems="flex-start"
              py={3}
            >
              <Typography
                variant="h5"
                color="primary.main"
                bgcolor="lightgray"
                p={1}
                sx={{ fontWeight: "bold", width: "100%" }}
                paragraph
              >
                Quick Message
              </Typography>
              <FormControl>
                <FormLabel id="message-type">Select Type</FormLabel>
                <RadioGroup
                  row
                  aria-labelledby="message-type"
                  name="message-type"
                  value={radioValue}
                  onChange={(e, value) => setRadioValue(value)}
                >
                  <FormControlLabel
                    value="sms"
                    control={<Radio />}
                    label="SMS"
                  />
                  <FormControlLabel
                    value="email"
                    control={<Radio />}
                    label="Email"
                  />
                  <FormControlLabel
                    value="both"
                    control={<Radio />}
                    label="Both"
                  />
                </RadioGroup>
              </FormControl>
              {(radioValue === "sms" || radioValue === "both") && (
                <TextField
                  label="Recipient's Phone No"
                  required
                  inputMode="tel"
                  // size="small"
                  type="tel"
                  fullWidth
                  value={values.phonenumber || ""}
                  onChange={handleChange("phonenumber")}
                  hidden={radioValue === "email" ? true : false}
                  error={Boolean(touched.phonenumber && errors.phonenumber)}
                  helperText={touched.phonenumber && errors.phonenumber}
                />
              )}

              {(radioValue === "email" || radioValue === "both") && (
                <TextField
                  label="Recipient's Email Address"
                  inputMode="email"
                  type="email"
                  // size="small"
                  required
                  fullWidth
                  hidden={radioValue === "sms" ? true : false}
                  value={values.email || ""}
                  onChange={handleChange("email")}
                  error={Boolean(touched.email && errors.email)}
                  helperText={touched.email && errors.email}
                />
              )}

              <TextField
                label="Message Title"
                required
                fullWidth
                // size="small"
                value={values.title || ""}
                onChange={handleChange("title")}
                error={Boolean(touched.title && errors.title)}
                helperText={touched.title && errors.title}
              />

              <TextEditor
                label="Message"
                value={values.message}
                setValue={handleChange("message")}
                touched={touched?.message}
                errors={errors?.message}
              />
              {/* <TextField
              // sx={{ textAlign: "left" }}
              label="Message"
              required
              // size="small"
              multiline
              rows={5}
              fullWidth
              value={values.message || ""}
              onChange={handleChange("message")}
              error={Boolean(touched.message && errors.message)}
              helperText={touched.message && errors.message}
            /> */}

              <Button
                loading={isSubmitting || isPending}
                variant="contained"
                onClick={handleSubmit}
                endIcon={<SendRounded />}
                sx={{ alignSelf: "flex-end", py: 1.5 }}
              >
                Send Message
              </Button>
            </Stack>
          );
        }}
      </Formik>
      {isPending && <LoadingSpinner value="Sending Message..." />}
    </Box>
  );
};

export default SMSQuick;
