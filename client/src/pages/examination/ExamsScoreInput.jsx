import React, { useContext, useRef, useState } from "react";
import {
  Stack,
  Button,
  TextField,
  Autocomplete,
  Alert,
  Grid2,
  Typography,
  Box,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import _ from "lodash";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateExams } from "@/api/ExaminationAPI";
import { examsScoreValidationSchema } from "@/config/validationSchema";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { generateCustomGrade } from "@/config/generateCustomGrade";
import { useParams, useSearchParams } from "react-router-dom";
import { UserContext } from "@/context/providers/UserProvider";
import useLevelById from "@/components/hooks/useLevelById";
import ExamsScoreTable from "@/components/tables/ExamsScoreTable";
import useUnsavedChangesWarning from "@/components/hooks/useUnsavedChangesWarning";
import { parseScorePreference, totalOf } from "./scoreRules";

const ExamsScoreInput = ({ setTab, scores }) => {
  const { session } = useContext(UserContext);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();
  const { levelId } = useParams();
  const [searchParams] = useSearchParams();

  const [msgs, setMsgs] = useState({ severity: "", text: "" });

  const [scoreList, setScoreList] = useState(scores || []);
  const { gradeSystem, subjects } = useLevelById(levelId);

  //Score preference
  const { classMax: classScorePreference, examsMax: examsScorePreference } = parseScorePreference(
    session?.exams?.scorePreference
  );

  // Warn before the tab is closed while scores are listed but not saved.
  const [saved, setSaved] = useState(false);
  const hasUnsaved = !saved && !_.isEqual(scoreList, scores || []);
  useUnsavedChangesWarning(hasUnsaved);

  // After adding a score the cursor returns to the subject box, so a whole student can be
  // entered from the keyboard: subject, Tab, class score, Tab, exams score, Enter.
  const subjectInput = useRef(null);

  //React Hook Form setup
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isValid, isDirty },
  } = useForm({
    mode: "onChange",
    resolver: yupResolver(
      examsScoreValidationSchema(classScorePreference, examsScorePreference)
    ),
    defaultValues: {
      subject: null,
      classScore: "",
      examsScore: "",
    },
  });

  //Add Score Handler
  const onSubmit = (values) => {
    const total = Number(values.classScore) + Number(values.examsScore);
    const summary = generateCustomGrade(total, gradeSystem?.ratings);

    const score = {
      _id: values?.subject?._id,
      subject: values?.subject?.name,
      classScore: Number(values.classScore),
      examsScore: Number(values.examsScore),
      ...summary,
    };

    //Optimized merge: overrides matching subject score
    const merged = { ..._.keyBy(scoreList, "_id"), [score._id]: score };
    setScoreList(Object.values(merged));

    reset();
    subjectInput.current?.focus();
  };

  const [watchedClass, watchedExams] = watch(["classScore", "examsScore"]);

  //SAVE RESULTS
  const { mutate, isPending } = useMutation({
    mutationFn: updateExams,
  });

  const handleSaveResults = () => {
    const data = {
      session: {
        levelId,
        studentId: searchParams.get("sid"),
        sessionId: session.sessionId,
        termId: session.termId,
      },
      scores: scoreList,
    };

    setMsgs({ severity: "", text: "" });
    mutate(data, {
      onSettled: () => {
        queryClient.invalidateQueries(["exams-by-id", searchParams.get("eid")]);
      },
      onSuccess: (data) => {
        setSaved(true);
        schoolSessionDispatch(alertSuccess(data));
        setTab("1");
      },
      onError: (error) => {
        // Shown here, next to the list, as well as in the pop-up: the message names the
        // score that was refused and nothing was saved, so the list is still there to fix.
        const text = typeof error === "string" ? error : error?.message || "The results could not be saved.";
        setMsgs({ severity: "error", text: `${text} Nothing was saved; your list is still here.` });
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  //CLOSE FORM
  const handleClose = () =>
    schoolSessionDispatch({
      type: "openAddExamsScore",
      payload: { open: false, data: {} },
    });

  return (
    <>
      {msgs.text && (
        <Alert
          sx={{ marginY: 1 }}
          severity={msgs.severity}
          onClose={() => setMsgs({ text: "" })}
        >
          {msgs.text}
        </Alert>
      )}

      <Box sx={{ bgcolor: "#fff", borderRadius: "12px", p: 2 }}>
        {/* HEADER */}
        <Stack
          spacing={2}
          direction={{ xs: "column", md: "row" }}
          justifyContent={{ xs: "flex-start", md: "flex-end" }}
          pb={2}
        >
          <Typography
            variant="h6"
            color="primary.main"
            p={1}
            sx={{ fontWeight: "bold", width: "100%" }}
          >
            Results Entry
          </Typography>

          <Stack direction="row">
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              variant="contained"
              disabled={scoreList.length === 0 || isPending}
              onClick={handleSaveResults}
            >
              {isPending ? "Saving..." : "Save Results"}
            </Button>
          </Stack>
        </Stack>

        <Grid2 container spacing={2} sx={{ minHeight: "60svh" }}>
          {/* LEFT PANEL (INPUT FORM) */}
          <Grid2 size={{ xs: 12, md: 5 }}>
            <Stack spacing={2} component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
              <Typography
                variant="h6"
                color="primary.main"
                bgcolor="lightgray"
                p={1}
                sx={{ fontWeight: "bold", width: "100%" }}
              >
                Add Subject Score
              </Typography>

              {/* SUBJECT AUTOCOMPLETE */}
              <Controller
                name="subject"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={subjects}
                    getOptionLabel={(option) => option?.name || ""}
                    value={field.value}
                    onChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Subject"
                        inputRef={subjectInput}
                        size="small"
                        error={!!errors.subject}
                        helperText={errors.subject?.message}
                      />
                    )}
                  />
                )}
              />

              <Typography variant="body2" color="text.secondary">
                This term: class score out of {classScorePreference}, exams score out of {examsScorePreference}.
              </Typography>

              {/* CLASS SCORE */}
              <Controller
                name="classScore"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label={`Class Score (0-${classScorePreference})`}
                    size="small"
                    error={!!errors.classScore}
                    helperText={errors.classScore?.message}
                  />
                )}
              />

              {/* EXAMS SCORE */}
              <Controller
                name="examsScore"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="number"
                    label={`Exams Score (0-${examsScorePreference})`}
                    size="small"
                    error={!!errors.examsScore}
                    helperText={errors.examsScore?.message}
                  />
                )}
              />

              <Typography variant="body2" color="text.secondary" aria-live="polite">
                Total: {totalOf(watchedClass, watchedExams)} / 100 (the server works out the final total)
              </Typography>

              <Button
                type="submit"
                variant="contained"
                disabled={!isValid || !isDirty}
              >
                Add Score
              </Button>
            </Stack>
          </Grid2>

          {/* RIGHT PANEL (PREVIEW TABLE) */}
          <Grid2 size={{ xs: 12, md: 7 }}>
            <Typography
              variant="h6"
              color="primary.main"
              bgcolor="lightgray"
              p={1}
              sx={{ fontWeight: "bold", width: "100%" }}
            >
              Scores Preview
            </Typography>

            <Box
              sx={{
                maxWidth: { xs: 300, sm: "100%" },
                overflowX: "auto",
              }}
            >
              <ExamsScoreTable data={scoreList} setData={setScoreList} />
            </Box>
          </Grid2>
        </Grid2>
      </Box>
    </>
  );
};

export default ExamsScoreInput;
