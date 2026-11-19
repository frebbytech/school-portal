// // AddAnnouncementModal.tsx

// AddAnnouncementModal.tsx
import React from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  Typography,
  MenuItem,
  Select,
  FormHelperText,
  InputLabel,
  FormControl,
  RadioGroup,
  Radio,
  FormControlLabel,
  FormLabel,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { postAnnouncement } from "@/api/announcementAPI";
import { UserContext } from "@/context/providers/UserProvider";

// Validation schema
const validationSchema = Yup.object({
  title: Yup.string()
    .required("Title is required")
    .min(3, "Title must be at least 3 characters"),
  description: Yup.string()
    .required("Description is required")
    .min(10, "Description must be at least 10 characters"),
  priority: Yup.string().required("Priority is required"),
  group: Yup.string().required("Please select a group"),
});

const AddAnnouncementModal = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const { session } = React.useContext(UserContext);
  const { schoolSessionDispatch } = React.useContext(SchoolSessionContext);

  const { mutate, isPending } = useMutation({
    mutationFn: postAnnouncement,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "default",
      group: "all",
    },
    mode: "onChange",
  });

  // Map priority to background colors
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "#ffcccb";
      case "medium":
        return "#fff3cd";
      case "low":
        return "#d4edda";
      default:
        return "#ffffff";
    }
  };

  const onSubmit = async (values) => {
    // console.log(values);
    // return;
    mutate(
      {
        ...values,
        bgColor: getPriorityColor(values.priority),
        session: session?.sessionId,
        term: session?.termId,
      },
      {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ["announcements"] });
        },
        onSuccess: () => {
          schoolSessionDispatch(alertSuccess("Announcement Created"));
          reset();
          onClose();
        },
        onError: (error) => {
          schoolSessionDispatch(alertError(error));
        },
      }
    );
  };

  return (
    <Modal open={open} onClose={onClose}>
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
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Add New Announcement
        </Typography>

        {/* Form Section */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Title Field */}
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                fullWidth
                margin="normal"
                label="Title"
                error={!!errors.title}
                helperText={errors.title?.message}
              />
            )}
          />

          {/* Description Field */}
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
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

          {/* Priority Select */}
          <FormControl fullWidth margin="normal" error={!!errors.priority}>
            <InputLabel>Priority</InputLabel>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select {...field} size="small" label="Priority">
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="default">Default</MenuItem>
                </Select>
              )}
            />
            {errors.priority && (
              <FormHelperText>{errors.priority.message}</FormHelperText>
            )}
          </FormControl>

          {/* Radio Group for Audience */}
          <FormControl
            component="fieldset"
            margin="normal"
            error={!!errors.group}
          >
            <FormLabel component="legend">Broadcast To</FormLabel>
            <Controller
              name="group"
              control={control}
              render={({ field }) => (
                <RadioGroup {...field} row>
                  <FormControlLabel
                    value="all"
                    control={<Radio />}
                    label="All"
                  />
                  <FormControlLabel
                    value="students"
                    control={<Radio />}
                    label="Students"
                  />
                  <FormControlLabel
                    value="teachers"
                    control={<Radio />}
                    label="Teachers"
                  />
                </RadioGroup>
              )}
            />
            {errors.group && (
              <FormHelperText>{errors.group.message}</FormHelperText>
            )}
          </FormControl>

          {/* Form Actions */}
          <Box
            sx={{
              textAlign: "right",
              mt: 2,
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
            }}
          >
            <Button
              onClick={onClose}
              disabled={isPending}
              color="secondary"
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!isValid || !isDirty || isPending}
            >
              {isPending ? "Creating..." : "Create"}
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
};

export default AddAnnouncementModal;

// import React, { use } from "react";
// import {
//   Modal,
//   Box,
//   TextField,
//   Button,
//   Typography,
//   MenuItem,
//   Select,
//   FormHelperText,
//   InputLabel,
//   FormControl,
// } from "@mui/material";
// import { useFormik } from "formik";
// import * as Yup from "yup";
// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
// import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
// import { postAnnouncement } from "@/api/announcementAPI";
// import { UserContext } from "@/context/providers/UserProvider";

// // Validation schema using Yup
// const validationSchema = Yup.object({
//   title: Yup.string()
//     .required("Title is required")
//     .min(3, "Title must be at least 3 characters"),
//   //   date: Yup.string().required("Date is required"),
//   description: Yup.string()
//     .required("Description is required")
//     .min(10, "Description must be at least 10 characters"),
//   priority: Yup.string().required("Priority is required"),
// });

// const AddAnnouncementModal = ({ open, onClose }) => {
//   const queryClient = useQueryClient();
//   const { session } = use(UserContext);
//   const { schoolSessionDispatch } = use(SchoolSessionContext);

//   const { mutate, isPending } = useMutation({
//     mutationFn: postAnnouncement,
//   });

//   const formik = useFormik({
//     initialValues: {
//       title: "",
//       description: "",
//       priority: "default",
//     },
//     validationSchema: validationSchema,
//     onSubmit: (values) => {
//       mutate(
//         {
//           ...values,
//           bgColor: getPriorityColor(values.priority),
//           session: session?.sessionId,
//           term: session?.termId,
//         },
//         {
//           onSettled: () => {
//             queryClient.invalidateQueries({ queryKey: ["announcements"] });
//           },
//           onSuccess: () => {
//             schoolSessionDispatch(alertSuccess("Announcement Created"));
//             formik.resetForm();
//             onClose();
//           },
//           onError: (error) => {
//             schoolSessionDispatch(alertError(error));
//           },
//         }
//       );
//     },
//   });

//   // Map priority to background colors
//   const getPriorityColor = (priority) => {
//     switch (priority) {
//       case "high":
//         return "#ffcccb"; // Red shade
//       case "medium":
//         return "#fff3cd"; // Yellow shade
//       case "low":
//         return "#d4edda"; // Green shade
//       case "default":
//         return "#ffffff"; // Green shade
//       default:
//         return "#ffffff"; // Default white
//     }
//   };

//   return (
//     <Modal open={open} onClose={onClose}>
//       <Box
//         sx={{
//           position: "absolute",
//           top: "50%",
//           left: "50%",
//           transform: "translate(-50%, -50%)",
//           bgcolor: "background.paper",
//           boxShadow: 24,
//           p: 2,
//           borderRadius: 2,
//           width: { xs: 300, md: 500 },
//         }}
//       >
//         <Typography variant="h6" fontWeight="bold" gutterBottom>
//           Add New Announcement
//         </Typography>

//         {/* Form Section */}
//         <form onSubmit={formik.handleSubmit}>
//           {/* Title Field */}
//           <TextField
//             size="small"
//             fullWidth
//             margin="normal"
//             label="Title"
//             name="title"
//             value={formik.values.title}
//             onChange={formik.handleChange}
//             onBlur={formik.handleBlur}
//             error={formik.touched.title && Boolean(formik.errors.title)}
//             helperText={formik.touched.title && formik.errors.title}
//           />

//           {/* Date Field */}
//           {/* <TextField
//             fullWidth
//             margin="normal"
//             label="Date"
//             type="date"
//             InputLabelProps={{ shrink: true }}
//             name="date"
//             value={formik.values.date}
//             onChange={formik.handleChange}
//             onBlur={formik.handleBlur}
//             error={formik.touched.date && Boolean(formik.errors.date)}
//             helperText={formik.touched.date && formik.errors.date}
//           /> */}

//           {/* Description Field */}
//           <TextField
//             size="small"
//             fullWidth
//             margin="normal"
//             label="Description"
//             multiline
//             rows={4}
//             name="description"
//             value={formik.values.description}
//             onChange={formik.handleChange}
//             onBlur={formik.handleBlur}
//             error={
//               formik.touched.description && Boolean(formik.errors.description)
//             }
//             helperText={formik.touched.description && formik.errors.description}
//           />

//           {/* Priority Select */}
//           <FormControl fullWidth margin="normal">
//             <InputLabel>Priority</InputLabel>
//             <Select
//               size="small"
//               name="priority"
//               value={formik.values.priority}
//               onChange={formik.handleChange}
//               onBlur={formik.handleBlur}
//               error={formik.touched.priority && Boolean(formik.errors.priority)}
//             >
//               <MenuItem value="high">High</MenuItem>
//               <MenuItem value="medium">Medium</MenuItem>
//               <MenuItem value="low">Low</MenuItem>
//               <MenuItem value="default">Default</MenuItem>
//             </Select>
//             {formik.touched.priority && formik.errors.priority && (
//               <FormHelperText error>{formik.errors.priority}</FormHelperText>
//             )}
//           </FormControl>

//           {/* Form Actions */}
//           <Box
//             sx={{
//               textAlign: "right",
//               mt: 2,
//               display: "flex",
//               justifyContent: "flex-end",
//               gap: 2,
//             }}
//           >
//             <Button
//               onClick={onClose}
//               disabled={isPending}
//               color="secondary"
//               variant="outlined"
//             >
//               Cancel
//             </Button>
//             <Button
//               loading={isPending}
//               type="submit"
//               variant="contained"
//               color="primary"
//               disabled={!formik.isValid || !formik.dirty}
//             >
//               Create
//             </Button>
//           </Box>
//         </form>
//       </Box>
//     </Modal>
//   );
// };

// export default AddAnnouncementModal;
