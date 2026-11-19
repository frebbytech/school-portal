import React, { useContext, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Container,
  DialogActions,
  TextField,
} from "@mui/material";
import Button from "@mui/material/Button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { assignTeacherLevel } from "@/api/levelAPI";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import useLevel from "@/components/hooks/useLevel";
import CustomTitle from "@/components/custom/CustomTitle";
import Back from "@/components/Back";
import TeacherLevels from "./TeacherLevels";
import QueryError from "@/components/QueryError";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import Swal from "sweetalert2";
import { UserContext } from "@/context/providers/UserProvider";
import { getTeacher } from "@/api/teacherAPI";

const TeacherAssignLevel = () => {
  const { session } = useContext(UserContext);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();
  const [currentLevel, setCurrentLevel] = useState(null);
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
  const deactivated = teacher?.data?.active === false;

  const onSubmit = () => {
    if (!currentLevel?._id) return;
    Swal.fire({
      title: "Assign Level",
      text: `Make ${teacher?.data?.fullname || "this teacher"} the class teacher of ${currentLevel?.type}?`,
      showCancelButton: true,
      backdrop: false,
    }).then((data) => {
      if (!data.isConfirmed) return;
      mutate(
        { _id: currentLevel._id, teacher: id },
        {
          onSettled: () => {
            queryClient.invalidateQueries({
              queryKey: ["levels", session.sessionId, session.termId],
            });
          },
          onSuccess: (message) => {
            setCurrentLevel(null);
            schoolSessionDispatch(alertSuccess(message));
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
        title="Level Allocation Portal"
        subtitle={`Allocate classrooms to ${teacher?.data?.fullname} to facilitate organized and efficient learning environments.`}
        color="primary.main"
        img={teacher?.data?.profile}
      />

      {teacher.isError && !teacher.data && (
        <QueryError what="this teacher" error={teacher.error} onRetry={() => teacher.refetch()} />
      )}
      {deactivated && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          This teacher is deactivated. Reactivate the account before giving them a class.
        </Alert>
      )}
      <Box sx={{ mt: 4, py: 4, px: 2, borderRadius: "12px", bgcolor: "#fff" }}>
        <Autocomplete
          size="small"
          options={levelsOption}
          loading={levelLoading}
          loadingText="Loading levels.Please wait..."
          getOptionLabel={(option) => option?.type || ""}
          isOptionEqualToValue={(option, value) => value?._id === option?._id}
          value={currentLevel}
          onChange={(e, value) => setCurrentLevel(value)}
          renderInput={(params) => <TextField {...params} label="Select a level" />}
          sx={{ marginY: 2 }}
        />
        <DialogActions>
          <Button onClick={() => setCurrentLevel(null)} disabled={!currentLevel}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={!currentLevel?._id || isPending || deactivated}
          >
            Assign Level
          </Button>
        </DialogActions>
      </Box>

      <TeacherLevels />
      {isPending && <LoadingSpinner value="Assigning Level.Please wait..." />}
    </Container>
  );
};

export default React.memo(TeacherAssignLevel);
