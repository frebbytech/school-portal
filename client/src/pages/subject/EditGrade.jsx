import {
  Autocomplete,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Stack,
  TextField,
} from "@mui/material";
import _ from "lodash";
import { v4 as uuid } from "uuid";
import React, { useContext, useEffect, useState } from "react";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { Formik } from "formik";
import { gradesValidationSchema } from "@/config/validationSchema";
import { GRADES, REMARKS } from "@/mockup/columns/sessionColumns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGrade, putGrade } from "@/api/gradeAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import GradeTable from "@/components/tables/GradeTable";

function EditGrade() {
  const {
    schoolSessionState: {
      editGrades: { open, data },
    },
    schoolSessionDispatch,
  } = useContext(SchoolSessionContext);

  const queryClient = useQueryClient();
  const [grades, setGrades] = useState([]);
  const [name, setName] = useState("");
  const initialValues = {
    lowestMark: 0,
    highestMark: 0,
    grade: "",
    remarks: "",
  };

  const grade = useQuery({
    queryKey: ["grade", data?._id],
    queryFn: () => getGrade(data?._id),
    enabled: !!data?._id,
    initialData: data,
  });

  useEffect(() => {
    setName(grade?.data?.name);
    setGrades(grade?.data?.ratings);
  }, [grade.data]);

  const onSubmit = (values, option) => {
    values.id = uuid();

    const newGrades = _.values(
      _.merge(_.keyBy([...grades, values], "remarks"))
    );
    setGrades(newGrades);
    option.resetForm();
  };

  const handleRemoveGrade = (gradeId) => {
    const filteredGrades = grades.filter(({ id }) => id !== gradeId);
    setGrades(filteredGrades);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: putGrade,
  });

  const saveGrades = () => {
    const values = {
      _id: data?._id,
      name,
      ratings: grades,
    };

    mutate(values, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["grades"] });
      },
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        setGrades([]);
        handleCloseDialog();
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  const handleCloseDialog = () => {
    schoolSessionDispatch({
      type: "editGrade",
      payload: { open: false, data: {} },
    });
  };

  return (
    <Dialog open={open}>
      <CustomDialogTitle
        title="Edit Grading System"
        subtitle="Make changes to grades and remarks"
        onClose={handleCloseDialog}
      />

      <DialogContent >
        <Stack spacing={3} py={2}>
          <TextField
            label="Name of Grading System"
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Formik
            initialValues={initialValues}
            validationSchema={gradesValidationSchema}
            onSubmit={onSubmit}
          >
            {({
              values,
              errors,
              touched,
              isValid,
              dirty,
              setFieldValue,
              handleChange,
              handleSubmit,
            }) => {
              return (
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <TextField
                    label="Lowest Mark"
                    type="number"
                    inputMode="numeric"
                    size="small"
                    value={values.lowestMark}
                    onChange={handleChange("lowestMark")}
                    error={Boolean(touched.lowestMark && errors.lowestMark)}
                    helperText={errors.lowestMark}
                  />
                  <TextField
                    label="Highest Mark"
                    type="number"
                    inputMode="numeric"
                    size="small"
                    value={values.highestMark}
                    onChange={handleChange("highestMark")}
                    error={Boolean(touched.highestMark && errors.highestMark)}
                    helperText={errors.highestMark}
                  />

                  <Autocomplete
                    freeSolo
                    options={GRADES}
                    getOptionLabel={(option) => option || ""}
                    defaultValue={values.grade}
                    value={values.grade}
                    onChange={(e, value) => setFieldValue("grade", value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Grade"
                        size="small"
                        error={Boolean(touched.grade && errors.grade)}
                        helperText={touched.grade && errors.grade}
                      />
                    )}
                  />
                  <Autocomplete
                    freeSolo
                    fullWidth
                    options={REMARKS}
                    getOptionLabel={(option) => option || ""}
                    defaultValue={values.remarks}
                    value={values.remarks}
                    onChange={(e, value) => setFieldValue("remarks", value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Remarks"
                        size="small"
                        error={Boolean(touched.remarks && errors.remarks)}
                        helperText={touched.remarks && errors.remarks}
                      />
                    )}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!isValid || !dirty}
                  >
                    Add
                  </Button>
                </Stack>
              );
            }}
          </Formik>
          <Divider>
            <Chip label="Grades" />
          </Divider>
        </Stack>

        <GradeTable data={grades} removeGrade={handleRemoveGrade} />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog}>Cancel</Button>
        <Button
          loading={isPending}
          variant="contained"
          disabled={grades.length === 0}
          onClick={saveGrades}
        >
          Save Changes
        </Button>
      </DialogActions>
      {isPending && <LoadingSpinner value="Saving Changes. Please Wait.." />}
    </Dialog>
  );
}

export default EditGrade;
