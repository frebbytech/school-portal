import React, { useContext, useState } from "react";
import { SendRounded } from "@mui/icons-material";
import Button from "@mui/material/Button";
import {
  Stack,
  TextField,
  FormControlLabel,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  MenuItem,
  Typography,
  Box,
} from "@mui/material";
import { Formik } from "formik";
import { useMutation } from "@tanstack/react-query";
import { bulkMessageInitialValues } from "@/config/initialValues";
import { postMessage } from "@/api/messageAPI";
import { bulksmsValidationSchema } from "@/config/validationSchema";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import TextEditor from "@/components/custom/TextEditor";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { useNavigate } from "react-router-dom";

const SMSBulk = () => {
  const navigate = useNavigate();

  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const [radioValue, setRadioValue] = useState("sms");
  const [group, setGroup] = useState("students");

  const { mutate, isPending } = useMutation(postMessage);
  const onSubmit = (values, options) => {
    values.rate = "bulk";
    values.group = group;
    values.type = radioValue;

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
        initialValues={bulkMessageInitialValues}
        onSubmit={onSubmit}
        validationSchema={bulksmsValidationSchema}
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
              justifyContent="center"
              alignItems="flex-start"
              paddingY={3}
            >
              <Typography
                variant="h5"
                color="primary.main"
                bgcolor="lightgray"
                p={1}
                sx={{ fontWeight: "bold", width: "100%" }}
                paragraph
              >
                Bulk Messages
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
              <TextField
                label="Select Group"
                select
                fullWidth
                value={group}
                // size="small"
                onChange={(e) => setGroup(e.target.value)}
              >
                <MenuItem value="students">Students</MenuItem>
                <MenuItem value="parents">Parents</MenuItem>
                <MenuItem value="teachers">Teachers</MenuItem>
              </TextField>

              <TextField
                label="Message Title"
                required
                // size="small"
                fullWidth
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
              sx={{ textAlign: "left" }}
              label="Message"
              required
              multiline
              rows={5}
              // size="small"
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

export default SMSBulk;
