import React, { useContext, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Autocomplete,
  TextField,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { assignGradeToLevel } from "@/api/levelAPI";
import { useParams, useSearchParams } from "react-router-dom";
import { getGrades } from "@/api/gradeAPI";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import Swal from "sweetalert2";
import GradeTable from "@/components/tables/GradeTable";
import { UserContext } from "@/context/providers/UserProvider";

const AssignLevelGrade = ({ levelName }) => {
  const { session } = useContext(UserContext);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const { levelId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedGrade, setSelectedGrade] = useState({
    _id: "",
    name: "",
    ratings: "",
  });

  const grades = useQuery({
    queryKey: ["grades", session?.sessionId, session?.termId],
    queryFn: () => getGrades(session?.sessionId, session?.termId),
    enabled: !!session?.sessionId && !!session?.termId,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: assignGradeToLevel,
  });

  const handleAssignGrade = () => {
    const info = {
      grade: selectedGrade._id,
      levels: [levelId],
    };

    Swal.fire({
      title: "Assign Grade",
      text: `Do yow wish to assign ${selectedGrade?.name} to ${levelName}?`,
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        mutate(info, {
          onSettled: () => {
            queryClient.invalidateQueries({
              queryKey: ["exams-details", levelId],
            });
          },
          onSuccess: (data) => {
            handleClose();
            schoolSessionDispatch(alertSuccess(data));
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
      params.delete("assign_grade");

      return params;
    });

    setSelectedGrade({
      _id: "",
      name: "",
      ratings: "",
    });
  };

  // console.log(levelsOption);

  return (
    <Dialog
      open={searchParams.get("assign_grade") !== null}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <CustomDialogTitle
        title="Assign Grade"
        subtitle={`Select a grading system and add to ${levelName}`}
        onClose={handleClose}
      />
      <DialogContent sx={{ p: 1 }}>
        <Stack spacing={2} paddingY={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Autocomplete
              fullWidth
              defaultValue={selectedGrade}
              loading={grades.isPending}
              loadingText="Loading Grades.."
              options={grades?.data}
              disableCloseOnSelect
              getOptionLabel={(option) => option?.name || ""}
              value={selectedGrade}
              onChange={(e, value) => setSelectedGrade(value)}
              renderInput={(params) => (
                <TextField {...params} label="Select Grade" size="small" />
              )}
            />
          </Stack>
          {selectedGrade?._id && <GradeTable data={selectedGrade?.ratings} />}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ padding: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          disabled={!selectedGrade?._id}
          variant="contained"
          onClick={handleAssignGrade}
          loading={isPending}
        >
          {isPending ? "Please wait" : "Assign Grade"}
        </Button>
      </DialogActions>
      {isPending && <LoadingSpinner value="Please Wait.." />}
    </Dialog>
  );
};

export default AssignLevelGrade;
