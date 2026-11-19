import React, { useContext } from "react";
import { addExamsScoreValidationSchema } from "@/config/validationSchema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateCustomGrade } from "@/config/generateCustomGrade";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { updateExams } from "@/api/ExaminationAPI";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { Formik } from "formik";
import { Dialog, DialogContent, Stack, TextField } from "@mui/material";
import Button from "@mui/material/Button";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { useParams, useSearchParams } from "react-router-dom";
import { UserContext } from "@/context/providers/UserProvider";
import _ from "lodash";

function AddStudentRecord() {
  const { session } = useContext(UserContext);
  const [searchParams] = useSearchParams();
  const { levelId } = useParams();

  const scorePreference = session?.exams?.scorePreference?.split("/");
  const classScorePreference = !_.isUndefined(scorePreference)
    ? scorePreference[0]
    : 50;
  const examsScorePreference = !_.isUndefined(scorePreference)
    ? scorePreference[1]
    : 50;

  const {
    schoolSessionState: {
      addStudentResults: { open, data, grade },
    },
    schoolSessionDispatch,
  } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: updateExams,
  });
  const onSubmit = (values) => {
    const total = Number(values.classScore) + Number(values.examsScore);
    const summary = generateCustomGrade(total, grade?.ratings);

    const result = {
      session: {
        examsId: data?._id,
      },
      scores: [
        {
          _id: data?.course?._id,
          subject: values?.subject,
          classScore: values?.classScore,
          examsScore: values?.examsScore,

          ...summary,
        },
      ],
    };

    mutate(result, {
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: ["subject-score", levelId, searchParams.get("_id")],
        });
      },
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        handleClose();
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  const handleClose = () => {
    schoolSessionDispatch({
      type: "addStudentResults",
      payload: {
        open: false,
        data: {
          _id: "",
          level: "",
          classScore: "",
          examsScore: "",
          totalScore: "",
          grade: "",
          remarks: "",
        },
        grade,
      },
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <CustomDialogTitle title="Add Record" onClose={handleClose} />
      <DialogContent>
        <Formik
          initialValues={data?.course}
          validationSchema={addExamsScoreValidationSchema(
            classScorePreference,
            examsScorePreference
          )}
          onSubmit={onSubmit}
        >
          {({ values, errors, isValid, dirty, handleChange, handleSubmit }) => {
            return (
              <>
                <Stack spacing={2} paddingY={2}>
                  <TextField
                    label="Subject"
                    size="small"
                    value={values.subject}
                    onChange={handleChange("subject")}
                    error={Boolean(errors.subject)}
                    helperText={errors.subject}
                    disabled
                  />

                  <TextField
                    type="number"
                    label="Class Score"
                    size="small"
                    value={values.classScore}
                    onChange={handleChange("classScore")}
                    error={Boolean(errors.classScore)}
                    helperText={errors.classScore}
                  />
                  <TextField
                    type="number"
                    label="Exams Score"
                    size="small"
                    value={values.examsScore}
                    onChange={handleChange("examsScore")}
                    error={Boolean(errors.examsScore)}
                    helperText={errors.examsScore}
                  />

                  <Button
                    loading={isPending}
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!isValid || !dirty}
                  >
                    Save Record
                  </Button>
                </Stack>
              </>
            );
          }}
        </Formik>
      </DialogContent>
      {isPending && <LoadingSpinner value="Saving Record..." />}
    </Dialog>
  );
}

export default AddStudentRecord;
