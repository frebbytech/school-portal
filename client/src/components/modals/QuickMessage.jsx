import React, { useContext, useMemo, useState } from "react";
import { thrownMessage } from "@/lib/formErrors";
import {
  Stack,
  TextField,
  FormControlLabel,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  DialogContent,
  Dialog,
  Button,
} from "@mui/material";
import { SendRounded } from "@mui/icons-material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation } from "@tanstack/react-query";

import CustomDialogTitle from "../dialog/CustomDialogTitle";
import Transition from "../animations/Transition";
import { postMessage } from "@/api/messageAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";

import {
  messageValidationSchema,
  onlyEmailValidationSchema,
  onlyPhoneValidationSchema,
} from "@/config/validationSchema";

const QuickMessage = () => {
  const {
    schoolSessionState: { quickMessageData },
    schoolSessionDispatch,
  } = useContext(SchoolSessionContext);

  const [radioValue, setRadioValue] = useState("sms");

  // -----------------------------
  // SELECT VALIDATION DYAMICALLY
  // -----------------------------
  const validationSchema = useMemo(() => {
    switch (radioValue) {
      case "sms":
        return onlyPhoneValidationSchema;
      case "email":
        return onlyEmailValidationSchema;
      default:
        return messageValidationSchema;
    }
  }, [radioValue]);

  // --------------------------------
  // INITIAL FORM VALUES (MEMOIZED)
  // --------------------------------
  const defaultValues = useMemo(() => {
    const { email, phonenumber } = quickMessageData?.data || {};

    return {
      type: radioValue,
      email: email || "",
      phonenumber: phonenumber || "",
      title: "",
      message: "",
    };
  }, [radioValue, quickMessageData]);

  // --------------------------------
  // REACT HOOK FORM
  // --------------------------------
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues,
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  // Reset form when switching type
  React.useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const { mutateAsync } = useMutation({ mutationFn: postMessage });

  // ------------------------
  // SUBMIT MESSAGE
  // ------------------------
  const onSubmit = async (values) => {
    try {
      const payload = { ...values, rate: "quick" };

      const response = await mutateAsync(payload);

      schoolSessionDispatch({
        type: "showAlert",
        payload: { severity: "info", message: response },
      });

      handleClose();
    } catch (error) {
      schoolSessionDispatch({
        type: "showAlert",
        payload: { severity: "error", message: thrownMessage(error) },
      });
    }
  };

  // ------------------------
  // CLOSE DIALOG
  // ------------------------
  const handleClose = () => {
    schoolSessionDispatch({
      type: "sendQuickMessage",
      payload: { open: false, data: {} },
    });
  };

  return (
    <Dialog
      open={quickMessageData.open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      TransitionComponent={Transition}
    >
      <CustomDialogTitle title="Send Message" onClose={handleClose} />

      <DialogContent sx={{ p: 1 }}>
        {/* MESSAGE TYPE SELECTOR */}
        <FormControl>
          <FormLabel id="message-type">Select type</FormLabel>
          <RadioGroup
            row
            value={radioValue}
            onChange={(e) => setRadioValue(e.target.value)}
          >
            <FormControlLabel
              value="sms"
              control={<Radio />}
              label="SMS"
              slotProps={{
                typography: {
                  fontSize: 14,
                },
              }}
            />
            <FormControlLabel
              value="email"
              control={<Radio />}
              label="Email"
              slotProps={{
                typography: {
                  fontSize: 14,
                },
              }}
            />
            <FormControlLabel
              value="both"
              control={<Radio />}
              label="Both"
              slotProps={{
                typography: {
                  fontSize: 14,
                },
              }}
            />
          </RadioGroup>
        </FormControl>

        {/* FORM */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2} py={2}>
            {/* PHONE NUMBER FIELD */}
            {(radioValue === "sms" || radioValue === "both") && (
              <Controller
                name="phonenumber"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Recipient Phone Number"
                    type="tel"
                    size="small"
                    fullWidth
                    error={!!errors.phonenumber}
                    helperText={errors.phonenumber?.message}
                  />
                )}
              />
            )}

            {/* EMAIL FIELD */}
            {(radioValue === "email" || radioValue === "both") && (
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Recipient Email Address"
                    type="email"
                    size="small"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />
            )}

            {/* TITLE */}
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Message Title"
                  size="small"
                  fullWidth
                  error={!!errors.title}
                  helperText={errors.title?.message}
                />
              )}
            />

            {/* MESSAGE BODY */}
            <Controller
              name="message"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Message"
                  multiline
                  rows={4}
                  size="small"
                  fullWidth
                  error={!!errors.message}
                  helperText={errors.message?.message}
                />
              )}
            />

            {/* SUBMIT BUTTON */}
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              endIcon={<SendRounded />}
              sx={{ alignSelf: "flex-end", py: 1.4 }}
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </Button>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickMessage;

// import React, { useContext, useMemo, useState } from "react";
// import { SendRounded } from "@mui/icons-material";

// import {
//   Stack,
//   TextField,
//   FormControlLabel,
//   FormControl,
//   FormLabel,
//   RadioGroup,
//   Radio,
//   DialogContent,
//   Dialog,
// } from "@mui/material";
// import { Formik } from "formik";
// import { useMutation } from "@tanstack/react-query";
// import CustomDialogTitle from "../dialog/CustomDialogTitle";
// import Button from "@mui/material/Button";
// import { postMessage } from "@/api/messageAPI";
// import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
// import Transition from "../animations/Transition";
// import {
//   messageValidationSchema,
//   onlyEmailValidationSchema,
//   onlyPhoneValidationSchema,
// } from "@/config/validationSchema";

// const QuickMessage = () => {
//   const {
//     schoolSessionState: { quickMessageData },
//     schoolSessionDispatch,
//   } = useContext(SchoolSessionContext);

//   const [radioValue, setRadioValue] = useState("sms");

//   const init = useMemo(() => {
//     switch (radioValue) {
//       case "sms":
//         return {
//           init: {
//             type: radioValue,
//             phonenumber: quickMessageData?.data?.phonenumber,
//             title: "",
//             message: "",
//           },
//           val: onlyPhoneValidationSchema,
//         };
//       case "email":
//         return {
//           init: {
//             type: radioValue,
//             email: quickMessageData?.data?.email,
//             title: "",
//             message: "",
//           },
//           val: onlyEmailValidationSchema,
//         };

//       default:
//         return {
//           init: {
//             type: radioValue,
//             email: quickMessageData?.data?.email,
//             phonenumber: quickMessageData?.data?.phonenumber,
//             title: "",
//             message: "",
//           },
//           val: messageValidationSchema,
//         };
//     }
//   }, [radioValue, quickMessageData]);

//   const { mutateAsync } = useMutation({ mutationFn: postMessage });
//   const onSubmit = (values, options) => {
//     values.rate = "quick";

//     mutateAsync(values, {
//       onSettled: () => {
//         options.setSubmitting(false);
//       },
//       onSuccess: (data) => {
//         schoolSessionDispatch({
//           type: "showAlert",
//           payload: {
//             severity: "info",
//             message: data,
//           },
//         });
//         handleClose();
//       },
//       onError: (error) => {
//         schoolSessionDispatch({
//           type: "showAlert",
//           payload: {
//             severity: "error",
//             message: thrownMessage(error),
//           },
//         });
//       },
//     });
//   };

//   //CLOSE
//   const handleClose = () => {
//     schoolSessionDispatch({
//       type: "sendQuickMessage",
//       payload: {
//         open: false,
//         data: {},
//       },
//     });
//   };

//   return (
//     <Dialog
//       open={quickMessageData.open}
//       onClose={handleClose}
//       fullWidth
//       maxWidth="xs"
//       TransitionComponent={Transition}
//     >
//       <CustomDialogTitle title="Send Message" onClose={handleClose} />
//       <Formik
//         initialValues={init.init}
//         onSubmit={onSubmit}
//         validationSchema={init.val}
//         enableReinitialize={true}
//       >
//         {({
//           values,
//           errors,
//           touched,
//           isSubmitting,
//           handleChange,
//           handleSubmit,
//         }) => {
//           return (
//             <>
//               <DialogContent sx={{ p: 1 }}>
//                 <FormControl>
//                   <FormLabel id="message-type">Select type</FormLabel>
//                   <RadioGroup
//                     row
//                     aria-labelledby="message-type"
//                     name="message-type"
//                     value={radioValue}
//                     onChange={(e, value) => setRadioValue(value)}
//                   >
//                     <FormControlLabel
//                       value="sms"
//                       control={<Radio />}
//                       label="SMS"
//                       slotProps={{
//                         typography: {
//                           fontSize: 14,
//                         },
//                       }}
//                     />
//                     <FormControlLabel
//                       value="email"
//                       control={<Radio />}
//                       label="Email"
//                       slotProps={{
//                         typography: {
//                           fontSize: 14,
//                         },
//                       }}
//                     />
//                     <FormControlLabel
//                       value="both"
//                       control={<Radio />}
//                       label="Both"
//                       slotProps={{
//                         typography: {
//                           fontSize: 14,
//                         },
//                       }}
//                     />
//                   </RadioGroup>
//                 </FormControl>

//                 <Stack
//                   spacing={2}
//                   justifyContent="center"
//                   alignItems="center"
//                   py={2}
//                 >
//                   {(radioValue === "sms" || radioValue === "both") && (
//                     <TextField
//                       label="Recipient's Phone No"
//                       required
//                       inputMode="tel"
//                       size="small"
//                       type="tel"
//                       fullWidth
//                       value={values.phonenumber || ""}
//                       onChange={handleChange("phonenumber")}
//                       hidden={radioValue === "email" ? true : false}
//                       error={Boolean(touched.phonenumber && errors.phonenumber)}
//                       helperText={touched.phonenumber && errors.phonenumber}
//                     />
//                   )}

//                   {(radioValue === "email" || radioValue === "both") && (
//                     <TextField
//                       label="Recipient's Email Address"
//                       inputMode="email"
//                       type="email"
//                       size="small"
//                       required
//                       fullWidth
//                       hidden={radioValue === "sms" ? true : false}
//                       value={values.email || ""}
//                       onChange={handleChange("email")}
//                       error={Boolean(touched.email && errors.email)}
//                       helperText={touched.email && errors.email}
//                     />
//                   )}

//                   <TextField
//                     label="Message Title"
//                     required
//                     fullWidth
//                     size="small"
//                     value={values.title || ""}
//                     onChange={handleChange("title")}
//                     error={Boolean(touched.title && errors.title)}
//                     helperText={touched.title && errors.title}
//                   />

//                   <TextField
//                     sx={{ textAlign: "left" }}
//                     label="Message"
//                     required
//                     size="small"
//                     multiline
//                     rows={4}
//                     fullWidth
//                     value={values.message || ""}
//                     onChange={handleChange("message")}
//                     error={Boolean(touched.message && errors.message)}
//                     helperText={touched.message && errors.message}
//                   />
//                   <Button
//                     loading={isSubmitting}
//                     variant="contained"
//                     onClick={handleSubmit}
//                     endIcon={<SendRounded />}
//                     sx={{ alignSelf: "flex-end", py: 1.5 }}
//                   >
//                     Send Message
//                   </Button>
//                 </Stack>
//               </DialogContent>
//             </>
//           );
//         }}
//       </Formik>
//     </Dialog>
//   );
// };

// export default QuickMessage;
