import React, { useState } from "react";
import Button from "@mui/material/Button";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Autocomplete,
  TextField,
  List,
  Alert,
  Typography,
  Divider,
} from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import _ from "lodash";
import { SUBJECT_OPTIONS } from "../../mockup/columns/sessionColumns";
import SubjectItem from "../list/SubjectItem";
import {
  getAllSubjectsByCurrentLevel,
  putCurrentSujectsByCurrentLevel,
} from "../../api/levelAPI";
import CustomDialogTitle from "../dialog/CustomDialogTitle";

const AddSubject = ({ open, setOpen }) => {
  
  const [subject, setSubject] = useState([]);
  const [msg, setMsg] = useState({
    severity: "",
    text: "",
  });
  const [subjectList, setSubjectList] = useState([]);

  

  const currentSubjects = useQuery(
    ["current-subject"],
    () => getAllSubjectsByCurrentLevel(),
    {
      select: (subjects) => {
        return subjects.map(({ title }) => title);
      },
    }
  );

  const handleAddSubject = () => {
    if (subject === "") {
      return;
    }
    setSubjectList((prev) => {
      return prev !== undefined ? _.uniq([...prev, ...subject]) : [...subject];
    });

    setSubject([]);
  };

  const handleRemoveSubject = (searchSubject) => {
    setSubjectList((prev) => {
      const filteredSubjects = prev.filter(
        (subject) => subject !== searchSubject
      );

      return filteredSubjects;
    });
  };

  const { mutate } = useMutation(putCurrentSujectsByCurrentLevel);

  const handleSaveSubjects = () => {
    setMsg({ text: "" });
    const values = _.difference(subjectList, currentSubjects.data);

    mutate(values, {
      onSuccess: () => {
        setSubjectList([]);
        currentSubjects.refetch();
        setMsg({
          severity: "info",
          text: "Subjects saved successfully!!!",
        });
      },
    });
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
      <CustomDialogTitle title="New Subjects" onClose={() => setOpen(false)} />
      <DialogContent>
        {msg.text && <Alert severity={msg.severity}>{msg.text}</Alert>}
        <Stack spacing={2} paddingY={2}>
          <Typography variant="h5" sx={{ textAlign: "right" }}></Typography>
          <Divider />
          <Stack direction="row" spacing={2} alignItems="center">
            <Autocomplete
              multiple
              freeSolo
              fullWidth
              defaultValue={SUBJECT_OPTIONS}
              options={SUBJECT_OPTIONS}
              getOptionLabel={(option) => option || ""}
              value={subject}
              onChange={(e, value) => setSubject(value)}
              renderInput={(params) => (
                <TextField {...params} label="Select Subject" size="small" />
              )}
            />
            <Button variant="contained" size="small" onClick={handleAddSubject}>
              Add
            </Button>
          </Stack>
          <List sx={{ maxHeight: 400 }}>
            {_.isEmpty(subjectList) ? (
              <Typography>No Subject selected</Typography>
            ) : (
              subjectList.map((subject) => {
                return (
                  <SubjectItem
                    key={subject}
                    name={subject}
                    removeSubject={handleRemoveSubject}
                  />
                );
              })
            )}
          </List>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ padding: 2 }}>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="contained" onClick={handleSaveSubjects}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddSubject;
