import React, { useContext, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import List from "@mui/material/List";
import Typography from "@mui/material/Typography";
import SaveAltRounded from "@mui/icons-material/SaveAltRounded";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import _ from "lodash";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { addSubjectsToLevel } from "@/api/levelAPI";
import LevelSubjectItem from "../items/LevelSubjectItem";
import { getSubjects } from "@/api/subjectAPI";

import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import useLevelById from "../hooks/useLevelById";
import { Box, ListSubheader } from "@mui/material";
// import Back from "../Back";
import CustomTitle from "../custom/CustomTitle";
import { useParams } from "react-router-dom";
import { UserContext } from "@/context/providers/UserProvider";
import { SUBJECTS } from "@/mockup/columns/sessionColumns";

const AddCurrentSubjects = () => {
  const { session } = useContext(UserContext);
  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const { id } = useParams();
  const [subject, setSubject] = useState([]);
  const [subjectList, setSubjectList] = useState([]);

  const { levelName, subjects, levelLoading } = useLevelById(id);
  // console.log(subjects)

  const subjectOptions = useQuery({
    queryKey: ["subjects"],
    queryFn: () =>
      getSubjects({
        session: session?.sessionId,
        term: session?.termId,
      }),
    initialData: [],
    select: (subjects) => {
      return subjects?.sort((a, b) => {
        SUBJECTS.indexOf(a?.name) - SUBJECTS.indexOf(b?.name);
      });
    },
  });

  useEffect(() => {
    setSubjectList(subjects);
  }, [id, subjects]);

  //Add Subjects to subject list
  const handleAddSubject = () => {
   

    const newSubjects = _.values(
      _.merge(_.keyBy([...subjectList, ...subject], "_id"))
    );
    

    setSubjectList(newSubjects);
    setSubject([]);
  };

  //Remove subject from class
  const handleRemoveSubject = (subjectId) => {
    setSubjectList((prev) => {
      const filteredSubjects = prev.filter(
        (subject) => subject?._id !== subjectId
      );

      return filteredSubjects;
    });
  };

  const { mutate, isPending } = useMutation({
    mutationFn: addSubjectsToLevel,
  });

  //Save subjects to db
  const handleSaveSubjects = () => {
    const values = {
      levelId: id,
      subjects: _.map(subjectList, "_id"),
    };

    mutate(values, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["subjects"] });
        queryClient.invalidateQueries({ queryKey: ["level", id] });
      },
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  return (
    <>
      {/* <Back to={-1} color="primary.main" /> */}
      <CustomTitle
        title={`Current Courses for ${levelName}`}
        subtitle="Add new subjects to the current level"
        color="primary.main"
        showBack={true}
      />

      <Box>
        <Stack
          spacing={2}
          py={6}
          width="100%"
          justifyContent="center"
          alignItems="flex-start"
        >
          <Typography variant="h6">
            Please select one or multiple courses
          </Typography>
          <Autocomplete
            multiple={true}
            freeSolo
            fullWidth
            options={subjectOptions.data}
            loading={subjectOptions.isPending}
            loadingText="Please Wait.."
            disableCloseOnSelect
            getOptionLabel={(option) => option?.name || ""}
            value={subject}
            onChange={(e, value) => setSubject(value)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Course"
                size="small"
                // onChange={(e) => setSubject(e.target.value)}
                focused
              />
            )}
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleAddSubject}
            sx={{
              px: 4,
              py: 2,
              alignSelf: "flex-end",
            }}
            disabled={subject?.length === 0}
          >
            Add Course
          </Button>
        </Stack>

        <List
          sx={{
            height: 400,
            p: 2,
            my: 4,
            overflow: "auto",
            bgcolor: "#fff",
            borderRadius: "12px",
          }}
          subheader={
            <ListSubheader
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: "center",
                justifyContent: "space-between",
                gap: 4,
              }}
            >
              <Typography variant="h6">
                {subjectList?.length} Course(s) Available
              </Typography>
              <Button
                startIcon={<SaveAltRounded />}
                loading={isPending}
                variant="contained"
                onClick={handleSaveSubjects}
                disabled={subjectList?.length === 0}
              >
                Save Courses
              </Button>
            </ListSubheader>
          }
        >
          {levelLoading && <Typography variant="h6">Loading.... </Typography>}

          {subjectList?.map((subject) => {
            return (
              <LevelSubjectItem
                key={subject?._id}
                subject={subject}
                removeSubject={handleRemoveSubject}
              />
            );
          })}
        </List>
      </Box>
    </>
  );
};

export default AddCurrentSubjects;
