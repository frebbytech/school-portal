import React, { useContext, useState } from "react";
import {
  Autocomplete,
  Box,
  Container,
  DialogActions,
  TextField,
} from "@mui/material";
import Button from "@mui/material/Button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Formik } from "formik";
import { assignTeacherLevel } from "@/api/levelAPI";
import { currentLevelValidationSchema } from "@/config/validationSchema";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import useLevel from "@/components/hooks/useLevel";
import CustomTitle from "@/components/custom/CustomTitle";
import Back from "@/components/Back";
import TeacherLevels from "./TeacherLevels";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import Swal from "sweetalert2";
import { UserContext } from "@/context/providers/UserProvider";
import { getTeacher } from "@/api/teacherAPI";

const TeacherAssignLevel = () => {
  const { session } = useContext(UserContext);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();
  const [currentLevel, setCurrentLevel] = useState({
    _id: "",
    type: "",
  });
  const { id } = useParams();

  const teacher = useQuery({
    queryKey: ["teacher", id],
    queryFn: () => getTeacher(id),
    initialData: queryClient
      .getQueryData(["teachers", id])
      ?.find((teacher) => teacher?._id === id),
    enabled: !!id,
  });

  const { levelsOption, levelLoading } = useLevel();

  const { mutate, isPending } = useMutation({
    mutationFn: assignTeacherLevel,
  });
  const onSubmit = (values, options) => {
    Swal.fire({
      title: "Assign Level",
      text: "Proceed with Level Assignment?",
      showCancelButton: true,
      backdrop: false,
    }).then((data) => {
      if (data.isConfirmed) {
        const info = {
          _id: values?._id,
          teacher: id,
        };

        mutate(info, {
          onSettled: () => {
            queryClient.invalidateQueries({
              queryKey: ["levels", session.sessionId, session.termId],
            });
            options.setSubmitting(false);
          },
          onSuccess: (data) => {
            schoolSessionDispatch(alertSuccess(data));
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };

  // const handleClose = () => setOpen(false);

  return (
    <Container>
      <Back to={-1} color="primary.main" />
      <CustomTitle
        title="Level Allocation Portal"
        subtitle={`Allocate classrooms to ${teacher?.data?.fullname} to facilitate organized and efficient learning environments.`}
        color="primary.main"
        img={teacher?.data?.profile}
      />

      <Formik
        initialValues={currentLevel}
        validationSchema={currentLevelValidationSchema}
        onSubmit={onSubmit}
        enableReinitialize={true}
      >
        {({ errors, touched, handleSubmit, handleReset }) => {
          return (
            <>
              <Box
                sx={{
                  mt: 4,
                  py: 4,
                  px: 2,
                  // border: "1px solid lightgray",
                  borderRadius: "12px",
                  bgcolor: "#fff",
                }}
              >
                <Autocomplete
                  size="small"
                  options={levelsOption}
                  loading={levelLoading}
                  loadingText="Loading levels.Please wait..."
                  getOptionLabel={(option) => option?.type || ""}
                  isOptionEqualToValue={(option, value) =>
                    value._id === undefined ||
                    value._id === "" ||
                    value._id === option._id
                  }
                  value={currentLevel}
                  onChange={(e, value) => setCurrentLevel(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select a level"
                      error={Boolean(touched.type && errors.type)}
                      helperText={touched.type && errors.type}
                    />
                  )}
                  sx={{ marginY: 2 }}
                />
                <DialogActions>
                  <Button onClick={handleReset}>Cancel</Button>
                  <Button
                    loading={isPending}
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={currentLevel?._id === ""}
                  >
                    Assign Level
                  </Button>
                </DialogActions>
              </Box>
            </>
          );
        }}
      </Formik>

      <TeacherLevels />
      {isPending && <LoadingSpinner value="Assigning Level.Please wait..." />}
    </Container>
  );
};

export default React.memo(TeacherAssignLevel);
