import React, { use } from "react";
import {
  Stack,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Button,
} from "@mui/material";
import { Formik } from "formik";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AssignTeacherValidationSchema } from "@/config/validationSchema";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { assignTeacherLevel } from "@/api/levelAPI";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { getAllTeachers } from "@/api/teacherAPI";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { useParams, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";

const AssignTeacher = ({ levelName }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { id } = useParams();

  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = use(SchoolSessionContext);

  const teachers = useQuery({
    queryKey: ["teachers"],
    queryFn: () => getAllTeachers(),
    initialData: [],
    select: (teachers) => {
      const modifiedTeachers = teachers?.map((teacher) => {
        return {
          _id: teacher?._id,
          fullname: teacher?.fullname,
        };
      });
      return modifiedTeachers;
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: assignTeacherLevel,
  });
  const onSubmit = (values, options) => {
    Swal.fire({
      title: "Assign Teacher",
      text: `Assign ${levelName} to ${values.teacher?.fullname}?`,
      showCancelButton: true,
      backdrop: false,
    }).then((data) => {
      if (data.isConfirmed) {
        const info = {
          _id: id,
          teacher: values.teacher?._id,
        };

        mutate(info, {
          onSettled: () => {
            queryClient.invalidateQueries({
              queryKey: ["level", id],
            });
            options.setSubmitting(false);
          },
          onSuccess: () => {
            schoolSessionDispatch(alertSuccess("Assigment done!"));
            handleClose();
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };
  const handleClose = () => {
    setSearchParams((params) => {
      params.delete("_at");
      return params;
    });
  };

  return (
    <Dialog
      open={searchParams.get("_at")}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
    >
      <CustomDialogTitle
        title={`Assign Teacher to ${levelName}`}
        onClose={handleClose}
      />
      <Formik
        initialValues={{
          teacher: { _id: "", fullname: "" },
        }}
        onSubmit={onSubmit}
        validationSchema={AssignTeacherValidationSchema}
      >
        {({ values, handleSubmit, setFieldValue }) => {
          return (
            <>
              <DialogContent sx={{ p: 1 }}>
                <Stack spacing={2} paddingY={2}>
                  <Autocomplete
                    options={teachers?.data}
                    loading={teachers.isPending}
                    getOptionLabel={(option) => option?.fullname || ""}
                    value={values?.teacher}
                    onChange={(e, value) => setFieldValue("teacher", value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Choose Teacher"
                        size="small"
                      />
                    )}
                  />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ padding: 2 }}>
                <Button
                  color="secondary"
                  disabled={isPending}
                  variant="outlined"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  loading={isPending}
                  variant="contained"
                  onClick={handleSubmit}
                >
                  Assign Teacher
                </Button>
              </DialogActions>
            </>
          );
        }}
      </Formik>

      {isPending && (
        <LoadingSpinner value="Creating New Level. Please wait..." />
      )}
    </Dialog>
  );
};

export default AssignTeacher;
