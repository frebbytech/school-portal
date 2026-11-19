import {
  Autocomplete,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  FormHelperText,
  Link,
  Stack,
  TextField,
} from "@mui/material";
import * as XLSX from "xlsx";
import { v4 as uuid } from "uuid";
import React, { useContext, useState } from "react";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { Formik } from "formik";
import { gradesValidationSchema } from "@/config/validationSchema";
import { DATA_HEADERS, GRADES, REMARKS } from "@/mockup/columns/sessionColumns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postGrades } from "@/api/gradeAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import _ from "lodash";
import { downloadTemplate } from "@/api/userAPI";
import GradeTable from "@/components/tables/GradeTable";
import { UserContext } from "@/context/providers/UserProvider";
import { validateExcelHeaders } from "@/config/helper";

function AddGrade({ open, setOpen }) {
  const { session } = useContext(UserContext);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();

  const [error, setError] = useState("");
  const [grades, setGrades] = useState([]);
  const [name, setName] = useState(uuid()?.split("-")[0]);
  const initialValues = {
    lowestMark: 0,
    highestMark: 0,
    grade: "",
    remarks: "",
  };

  const onSubmit = (values, option) => {
    values.id = uuid();

    setGrades((prev) => [...prev, values]);
    option.resetForm();
  };

  const handleRemoveGrade = (gradeId) => {
    const filteredGrades = grades.filter(({ id }) => id !== gradeId);
    setGrades(filteredGrades);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: postGrades,
  });

  const saveGrades = () => {
    const values = {
      session: session?.sessionId,
      term: session?.termId,
      name: name || uuid(),
      ratings: grades,
    };

    mutate(values, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: ["grades"] });
      },
      onSuccess: (data) => {
        schoolSessionDispatch(alertSuccess(data));
        setGrades([]);
        setOpen(false);
      },
      onError: (error) => {
        schoolSessionDispatch(alertError(error));
      },
    });
  };

  const handleFileUpload = async (e) => {
    setError("");
    const headers = DATA_HEADERS.GRADES;

    const file = e.target.files[0];
    const result = await validateExcelHeaders(file, headers);

    if (!result.valid) {
      setError(
        `Invalid file headers.Expected headers: [${headers.join(
          ", "
        )}].Missing headers: [${result.missing.join(", ")}].`
      );
      return;
    }

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const binaryStr = e.target?.result;
        if (binaryStr) {
          const workbook = XLSX.read(binaryStr, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: "", // Default value for empty cells
            blankrows: false, // Skip rows that are completely empty
          });

          if (jsonData.length === 0) {
            schoolSessionDispatch(alertError("No data found in the file"));
            return;
          }

          // Function to filter out empty or undefined rows

          const modifiedData = jsonData.filter((row) =>
            Object.values(row).some(
              (value) => value !== undefined && value !== ""
            )
          );
          // Convert the first row to headers and the rest to rows

          const headers = modifiedData[0].map((header) => _.camelCase(header));
          const rows = jsonData.slice(1);

          const formattedData = rows.map((row) => {
            const rowData = {};
            headers.forEach((header, index) => {
              rowData[header] = row[index];
            });
            rowData.id = uuid();
            return rowData;
          });
          setGrades(formattedData);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDownloadTemplate = async () => {
    await downloadTemplate("grades");
  };

  return (
    <Dialog open={open} maxWidth="md">
      <CustomDialogTitle
        title="New Grading System"
        subtitle="Add new grades and remarks"
        onClose={() => setOpen(false)}
      />

      <DialogContent sx={{ px: 1.5 }}>
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
              setFieldValue,
              handleChange,
              handleSubmit,
            }) => {
              return (
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  alignItems="center"
                  spacing={1}
                >
                  <TextField
                    label="Lowest Mark"
                    type="number"
                    inputMode="numeric"
                    size="small"
                    fullWidth
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
                    fullWidth
                    value={values.highestMark}
                    onChange={handleChange("highestMark")}
                    error={Boolean(touched.highestMark && errors.highestMark)}
                    helperText={errors.highestMark}
                  />

                  <Autocomplete
                    freeSolo
                    fullWidth
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
                  <Button variant="outlined" onClick={handleSubmit}>
                    Add
                  </Button>
                </Stack>
              );
            }}
          </Formik>
          <Stack spacing={2} py={2} justifyContent="center">
            <TextField
              size="small"
              type="file"
              accept=".csv,.xlsx,.xls"
              label="Import File"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              inputProps={{
                accept: ".xlsx,.xls,.csv",
              }}
              fullWidth
              onChange={handleFileUpload}
              onClick={(e) => {
                e.target.value = null;
                e.currentTarget.value = null;
              }}
            />
            {error && (
              <FormHelperText
                sx={{ color: "error.main" }}
                variant="body2"
                color="error"
              >
                {error}
              </FormHelperText>
            )}

            <Link
              sx={{ cursor: "pointer", alignSelf: "start" }}
              onClick={handleDownloadTemplate}
              variant="caption"
            >
              Download Grade template here
            </Link>
          </Stack>

          <Divider>
            <Chip label="Grades" />
          </Divider>
        </Stack>

        <GradeTable data={grades} removeGrade={handleRemoveGrade} />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          loading={isPending}
          variant="contained"
          disabled={grades.length === 0}
          onClick={saveGrades}
        >
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddGrade;
