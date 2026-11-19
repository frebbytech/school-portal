import React, { useContext, useState } from "react";
import { Alert, Autocomplete, Box, Container, DialogActions, Stack, TextField } from "@mui/material";
import Swal from "sweetalert2";
import Button from "@mui/material/Button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import useLevel from "@/components/hooks/useLevel";
import CustomTitle from "@/components/custom/CustomTitle";
import Back from "@/components/Back";
import QueryError from "@/components/QueryError";
import useLevelById from "@/components/hooks/useLevelById";
import { UserContext } from "@/context/providers/UserProvider";
import { postCourse } from "@/api/courseAPI";
import TeacherCourses from "./TeacherCourses";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { getTeacher } from "@/api/teacherAPI";

const TeacherAssignCourse = () => {
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const { session } = useContext(UserContext);
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(null);

  const { levelsOption, levelLoading } = useLevel();
  const { subjects, levelLoading: subjectLoading } = useLevelById(currentLevel?._id);

  const { id } = useParams();

  const teacher = useQuery({
    queryKey: ["teacher", id],
    queryFn: () => getTeacher(id),
    initialData: queryClient.getQueryData(["teachers", id])?.find((t) => t?._id === id),
    enabled: !!id,
  });
  const deactivated = teacher?.data?.active === false;

  const { mutate, isPending } = useMutation({ mutationFn: postCourse });

  const reset = () => {
    setCurrentLevel(null);
    setSubject(null);
  };

  const onSubmit = () => {
    if (!currentLevel?._id || !subject?._id) return;
    Swal.fire({
      title: "Assign Course",
      text: `Give ${teacher?.data?.fullname || "this teacher"} ${subject.name} in ${currentLevel.type}?`,
      showCancelButton: true,
      backdrop: false,
    }).then((data) => {
      if (!data.isConfirmed) return;
      mutate(
        {
          session: session?.sessionId,
          term: session?.termId,
          teacher: id,
          level: currentLevel._id,
          levelName: currentLevel.type,
          subject: subject._id,
          subjectName: subject.name,
        },
        {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["courses", id] });
          },
          onSuccess: (message) => {
            schoolSessionDispatch(alertSuccess(message));
            // keep the class so several subjects can be given in a row
            setSubject(null);
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        }
      );
    });
  };

  return (
    <Container>
      <Back to={-1} color="primary.main" />
      <CustomTitle
        title="Course Allocation Portal"
        subtitle={`Assign courses to ${
          teacher?.data?.fullname || "teacher"
        }, ensuring that everyone is aware of their responsibilities and schedules.`}
        color="primary.main"
        img={teacher?.data?.profile}
      />
      {teacher.isError && !teacher.data && (
        <QueryError what="this teacher" error={teacher.error} onRetry={() => teacher.refetch()} />
      )}
      {deactivated && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          This teacher is deactivated. Reactivate the account before giving them a course.
        </Alert>
      )}

      <Box sx={{ mt: 4, py: 4, px: 2, borderRadius: "12px", bgcolor: "#fff" }}>
        <Stack spacing={3}>
          <Autocomplete
            size="small"
            options={levelsOption}
            loading={levelLoading}
            loadingText="Loading levels.Please wait..."
            getOptionLabel={(option) => option?.type || ""}
            isOptionEqualToValue={(option, value) => value?._id === option?._id}
            value={currentLevel}
            onChange={(e, value) => {
              setCurrentLevel(value);
              setSubject(null);
            }}
            renderInput={(params) => <TextField {...params} label="Select a level" />}
            sx={{ marginY: 2 }}
          />
          <Autocomplete
            fullWidth
            noOptionsText={currentLevel ? "No subject available" : "Select a level first"}
            loading={subjectLoading}
            loadingText="Please Wait..."
            options={subjects || []}
            getOptionLabel={(option) => option?.name || ""}
            isOptionEqualToValue={(option, value) => value?._id === option?._id}
            value={subject}
            onChange={(e, value) => setSubject(value)}
            renderInput={(params) => <TextField {...params} label="Select Subject" size="small" />}
          />
        </Stack>
        <DialogActions>
          <Button onClick={reset} disabled={!currentLevel && !subject}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={!currentLevel?._id || !subject?._id || isPending || deactivated}
          >
            Assign Course
          </Button>
        </DialogActions>
      </Box>
      <TeacherCourses />
      {isPending && <LoadingSpinner value="Assigning Course.Please wait..." />}
    </Container>
  );
};

export default React.memo(TeacherAssignCourse);
