import React, { useContext, useState } from "react";
import {
  Autocomplete,
  Dialog,
  DialogContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Swal from "sweetalert2";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { postManyStudents } from "@/api/studentAPI";
import useLevel from "../hooks/useLevel";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { UserContext } from "@/context/providers/UserProvider";
import { IMPORT_STUDENT_COLUMNS } from "@/mockup/columns/studentColumns";
import CustomizedMaterialTable from "../tables/CustomizedMaterialTable";
import { EMPTY_IMAGES } from "@/config/images";
import CustomDialogTitle from "../dialog/CustomDialogTitle";
import { ImportExport } from "@mui/icons-material";
import LoadingSpinner from "../spinners/LoadingSpinner";
import { importProblem } from "@/pages/student/importCheck";
function AddStudentFileDialog() {
  const { session } = useContext(UserContext);

  //Params
  const queryClient = useQueryClient();

  const [fieldError, setFieldError] = useState("");
  const [fieldValue, setFieldValue] = useState({ _id: "", type: "" });

  const { schoolSessionState, schoolSessionDispatch } =
    useContext(SchoolSessionContext);
  const fileData = schoolSessionState.addStudentFileData;

  //Get All levels
  const { levelsOption } = useLevel();
  // console.log(levelsOption)

  //CLOSE File Dialog
  const handleCloseDialog = () => {
    Swal.fire({
      title: "Exiting",
      text: "Unsaved Changes will be lost. Are you sure?",
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        schoolSessionDispatch({ type: "closeAddStudentFileDialog" });
      }
    });
  };

  const { mutate, isPending } = useMutation({
    mutationFn: postManyStudents,
  });
  const handlePostStudents = () => {
    setFieldError("");

    if (fieldValue._id === "") {
      setFieldError("Please select a level!");

      return;
    }

    // Mistakes the browser can see (no index number, an index number twice) are shown now
    // (only for a file: when existing students are being added to a class the rows are ids)
    const problem = fileData?.type === "file" ? importProblem(fileData?.data) : "";
    if (problem) {
      Swal.fire({ title: "Check the file", text: problem, icon: "error", backdrop: false });
      return;
    }

    const studentInfo = {
      students: fileData?.data,
      session: {
        sessionId: session.sessionId,
        termId: session.termId,
        levelId: fieldValue._id,
      },
      type: fileData.type,
    };

    // return;

    Swal.fire({
      title: "Importing students",
      text: `Do you want to import students in ${fieldValue.type}?`,
      showCancelButton: true,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        mutate(studentInfo, {
          onSuccess: (data) => {
            schoolSessionDispatch(alertSuccess(data));
            schoolSessionDispatch({ type: "closeAddStudentFileDialog" });
            // The class lists and the student summary show the new students
            queryClient.invalidateQueries({ queryKey: ["levels"] });
            queryClient.invalidateQueries({ queryKey: ["student-details"] });
            setFieldValue({ _id: "", type: "" });
          },
          onError: (error) => {
            if (error?.isDuplicateError) {
              // Shown as plain text (never as HTML): the ids come from the file
              Swal.fire({
                title: "Student ID already in use",
                icon: "error",
                text: `${error.message} ${(error.data || []).join(", ")}`,
                showCancelButton: false,
                backdrop: false,
              });
            } else {
              schoolSessionDispatch(alertError(error));
            }
          },
        });
      }
    });
  };

  return (
    <Dialog open={fileData.open} fullScreen fullWidth>
      <CustomDialogTitle
        title="Import Students"
        subtitle="Enroll new students by adding their personal and academic details to the system for accurate record-keeping and future reference by importing Student data from excel or csv files."
        color="primary.main"
        onClose={handleCloseDialog}
      />

      <DialogContent sx={{ px: 4 }}>
        <Stack spacing={2} p={2} my={4} border="1px solid lightgray">
          <Typography>
            Select an <b>EXCEL</b> OR <b>CSV</b> file containing students
            information. Make sure the columns matches the accepted fields.
          </Typography>
        </Stack>

        {fileData.data?.length === 0 ? (
          <Typography>No data available</Typography>
        ) : (
          <CustomizedMaterialTable
            title={fieldValue?.type || "Students"}
            subtitle="List of imported students"
            icon={EMPTY_IMAGES.student}
            columns={IMPORT_STUDENT_COLUMNS}
            data={fileData?.data}
            search={true}
            actions={[]}
            autoCompleteComponent={
              <Autocomplete
                size="small"
                options={levelsOption}
                noOptionsText="No Level available"
                getOptionLabel={(option) => option.type || ""}
                isOptionEqualToValue={(option, value) =>
                  value?._id === undefined ||
                  value?._id === "" ||
                  value?._id === option?._id
                }
                value={fieldValue}
                onChange={(e, value) => setFieldValue(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Level"
                    size="small"
                    error={Boolean(fieldError)}
                    helperText={fieldError}
                    required
                    FormHelperTextProps={{
                      sx: {
                        color: "error.main",
                      },
                    }}
                  />
                )}
                sx={{ width: 250, marginLeft: 3 }}
              />
            }
            showAddButton
            addButtonText="Import Students"
            addButtonIcon={<ImportExport />}
            onAddButtonClicked={handlePostStudents}
            options={{
              search: true,
              rowStyle: {
                boxShadow: "none",
                background: "transparent",
                backgroundColor: "transparent",
              },
            }}
            style={{
              backgroundColor: "transparent",
              boxShadow: "none",
            }}
          />
        )}
      </DialogContent>
      {isPending && <LoadingSpinner />}
    </Dialog>
  );
}

export default AddStudentFileDialog;
