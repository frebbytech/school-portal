import React, { useContext, useEffect, useMemo } from "react";
import {
  Button,
  Autocomplete,
  Avatar,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import _ from "lodash";

import { putStudent } from "@/api/studentAPI";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { StudentContext } from "@/context/providers/StudentProvider";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { TOWNS } from "@/mockup/data/towns";
import CustomAutoComplete from "@/components/inputs/CustomAutoComplete";
import useLevel from "@/components/hooks/useLevel";
import { mixed, object, string } from "yup";
import { useDropzone } from "react-dropzone";
import Input from "@/components/inputs/Input";
import { Add, AddToDrive } from "@mui/icons-material";
import { useParams } from "react-router-dom";

const schema = object().shape({
  department: object({
    _id: string().optional(),
    name: string().optional(),
  }),
  house: object({
    _id: string().optional(),
    name: string().optional(),
  }),

  previousSchool: object({
    name: string().optional(),
    location: string().optional(),
    report: mixed().nullable(),
  }).optional(),

  level: object({
    _id: string().required("Required*"),
    type: string().required("Required*"),
  }),
});

const AcademicEdit = () => {
  const { studentId } = useParams();
  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const {
    studentState: { studentAcademicData },
    studentDispatch,
  } = useContext(StudentContext);

  const { departments, houses, levelsOption, levelLoading } = useLevel();
  const levels = useMemo(() => {
    return levelsOption?.map((level) => ({
      _id: level._id,
      type: level.type,
    }));
  }, [levelsOption]);

  const student = studentAcademicData?.data;

  // Initialize form
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: student,
  });

  useEffect(() => {
    if (student) {
      reset(student);
    }
  }, [student, reset]);

  const report = watch("previousSchool.report");

  const { getRootProps, getInputProps, open } = useDropzone({
    noClick: true,
    noKeyboard: true,
    maxFiles: 1,
    accept: {
      "image/*": [".jpeg", ".png", ".jpg", ".webp"],
      "application/pdf": [".pdf"],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (!_.isEmpty(acceptedFiles)) {
        const reader = new FileReader();
        reader.onload = function (event) {
          const reportURL = event.target.result;
          setValue("previousSchool.report", reportURL);
        };
        reader.readAsDataURL(acceptedFiles[0]);
      }
    },
  });

  // Close dialog
  const handleClose = () => {
    studentDispatch({
      type: "editStudentAcademics",
      payload: { open: false, data: {} },
    });
  };

  // Update student mutation
  const { mutate, isPending } = useMutation({ mutationFn: putStudent });

  const onSubmit = (values) => {
    const { level, ...academic } = values;

    mutate(
      {
        _id: studentId,
        type: "academic",
        academic,
        level: level?._id,
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: ["student-profile"] });
          queryClient.invalidateQueries({ queryKey: ["student/id"] });
          queryClient.invalidateQueries({ queryKey: ["student-details"] });
          queryClient.invalidateQueries({ queryKey: ["levels"] });
          schoolSessionDispatch(alertSuccess(data));
          handleClose();
        },
        onError: (error) => {
          schoolSessionDispatch(alertError(error));
        },
      }
    );
  };

  return (
    <Dialog open={studentAcademicData.open} maxWidth="md" fullWidth>
      <CustomDialogTitle
        title="Update Academic Information"
        subtitle="Make changes to student academic information."
        onClose={handleClose}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ p: 1.5 }}>
          <Stack spacing={2}>
            <Typography
              variant="body2"
              color="primary.main"
              sx={{ fontWeight: "bold" }}
            >
              Department/Level/House
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Assign the student to a department, level, and house.
            </Typography>

            <CustomAutoComplete
              name="department"
              control={control}
              label="Department"
              data={{
                data: departments,
                isPending: levelLoading,
              }}
            />

            <Controller
              name="level"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  options={levels}
                  getOptionLabel={(option) => option.type || ""}
                  isOptionEqualToValue={(option, value) =>
                    value?._id === option?._id
                  }
                  // value={level}
                  {...field}
                  onChange={(_, value) =>
                    setValue("level", {
                      _id: value?._id,
                      type: value?.type,
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Current Level"
                      fullWidth
                      size="small"
                      error={!!errors.academic?.level}
                      helperText={errors.academic?.level?._id?.message}
                    />
                  )}
                />
              )}
            />

            <CustomAutoComplete
              name="house"
              control={control}
              label="House/Section"
              data={{
                data: houses,
                isPending: levelLoading,
              }}
            />

            <Typography
              variant="body2"
              color="primary.main"
              sx={{ fontWeight: "bold" }}
            >
              Previous School Records
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Provide details about the student&apos;s previous school.
            </Typography>

            <Input
              control={control}
              name="previousSchool.name"
              label="School Name"
              size="small"
            />

            <Controller
              name="previousSchool.location"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  freeSolo
                  options={TOWNS}
                  getOptionLabel={(option) => option || ""}
                  {...field}
                  onChange={(_, value) =>
                    setValue("previousSchool.location", value)
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Location"
                      fullWidth
                      size="small"
                      error={!!errors.academic?.previousSchool?.location}
                      helperText={
                        errors.academic?.previousSchool?.location?.message
                      }
                    />
                  )}
                />
              )}
            />

            <Typography
              variant="body2"
              color="primary.main"
              sx={{ fontWeight: "bold" }}
            >
              A copy of the most recent school report
            </Typography>
            <Stack
              padding={2}
              spacing={1}
              {...getRootProps({ className: "dropzone" })}
              style={{ border: "1px dashed black" }}
            >
              <Stack
                spacing={2}
                justifyContent="center"
                alignItems="center"
                paddingY={1}
              >
                <Avatar
                  variant="square"
                  src={report}
                  sx={{ width: 80, height: 80 }}
                >
                  <Add />
                </Avatar>
                <Stack>
                  <input {...getInputProps()} />
                  <Typography textAlign="center">
                    Drag & drop your report here
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={open}
                    startIcon={<AddToDrive />}
                  >
                    Upload Report
                  </Button>
                </Stack>
                {!_.isEmpty(report) && (
                  <iframe
                    style={{ width: "100%", height: "5in" }}
                    src={report}
                  ></iframe>
                )}
              </Stack>
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isPending}
          >
            Save Changes
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default React.memo(AcademicEdit);
