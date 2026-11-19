import React, { useContext, useState } from "react";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Autocomplete,
  TextField,
  List,
  Typography,
  ListItem,
  Checkbox,
  ListItemText,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import _ from "lodash";

import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";

import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import LevelItem from "@/components/items/LevelItem";
import useLevel from "@/components/hooks/useLevel";
import { assignGradeToLevel } from "@/api/levelAPI";
import { useSearchParams } from "react-router-dom";
import { getGrade } from "@/api/gradeAPI";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import Swal from "sweetalert2";

const AssignGrade = () => {
  const {
    schoolSessionState: {
      assignGrades: { data },
    },
    schoolSessionDispatch,
  } = useContext(SchoolSessionContext);

  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [levels, setLevels] = useState([]);
  const [levelList, setLevelList] = useState([]);
  const { levelsOption, levelLoading } = useLevel();

  const grade = useQuery({
    queryKey: ["grade", searchParams.get("grade_id")],
    queryFn: () => getGrade(searchParams.get("grade_id") || data?._id),
    enabled: !!searchParams.get("grade_id"),
  });

  const handleAddLevel = () => {
    const newLevels = _.values(
      _.merge(_.keyBy([...levelList, ...levels], "_id"))
    );

    setLevelList(newLevels);

    setLevels([]);
  };

  const handleRemoveLevel = (searchLevel) => {
    setLevelList((prev) => {
      const filteredLevels = prev.filter(({ type }) => type !== searchLevel);
      return filteredLevels;
    });
  };

  const { mutate, isPending } = useMutation({
    mutationFn: assignGradeToLevel,
  });

  const handleSaveLevels = () => {
    const ids = _.map(levelList, "_id");

    const info = {
      grade: searchParams.get("grade_id"),
      levels: ids,
    };

    Swal.fire({
      title: "Assign Grade",
      text: "Do yow wish to assign grade to selected Levels?",
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        mutate(info, {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["levels"] });
          },
          onSuccess: (data) => {
            schoolSessionDispatch(alertSuccess(data));
            setLevelList([]);
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
      params.delete("grade_id");

      return params;
    });
  };

  // console.log(levelsOption);

  return (
    <Dialog
      open={searchParams.get("grade_id") !== null}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <CustomDialogTitle
        title="Assign Grade"
        subtitle="Add the selected grading system to your levels"
        onClose={handleClose}
      />
      <DialogContent>
        <Stack spacing={2} paddingY={2}>
          <Typography variant="h6" color="primary">
            Grade - <span style={{color:'var(--secondary)'}}>{grade?.data?.name}</span>
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center">
            <Autocomplete
              multiple
              freeSolo
              fullWidth
              defaultValue={[]}
              loading={levelLoading}
              loadingText="Loading Levels.Please Wait..."
              options={levelsOption}
              disableCloseOnSelect
              getOptionLabel={(option) => option?.type || ""}
              renderOption={(props, option, state) => {
                return (
                  <ListItem
                    {...props}
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <Checkbox checked={state?.selected} />
                    <ListItemText primary={option?.type} />
                  </ListItem>
                );
              }}
              value={levels}
              onChange={(e, value) => setLevels(value)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Level to assign"
                  size="small"
                />
              )}
            />
            <Button variant="contained" size="small" onClick={handleAddLevel}>
              Add
            </Button>
          </Stack>
          <List sx={{ maxHeight: 400 }}>
            {_.isEmpty(levelList) ? (
              <Typography>No Level selected</Typography>
            ) : (
              levelList.map(({ _id, type }) => {
                return (
                  <LevelItem
                    key={_id}
                    name={type}
                    removeSubject={handleRemoveLevel}
                  />
                );
              })
            )}
          </List>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ padding: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          disabled={levelList.length === 0}
          variant="contained"
          onClick={handleSaveLevels}
          loading={isPending}
        >
          {isPending ? "Please wait" : "Assign Grade"}
        </Button>
      </DialogActions>
      {(isPending || grade.isPending) && (
        <LoadingSpinner value="Please Wait.." />
      )}
    </Dialog>
  );
};

export default AssignGrade;
