import React, { useContext, useState } from "react";
import * as XLSX from "xlsx";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Autocomplete,
  TextField,
  List,
  Alert,
  Typography,
  Divider,
  Checkbox,
  FormLabel,
  Input,
  Link,
  FormHelperText,
  FormControlLabel,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import _ from "lodash";
import { DATA_HEADERS, SUBJECTS } from "@/mockup/columns/sessionColumns";

import SubjectItem from "@/components/list/SubjectItem";
import CustomDialogTitle from "@/components/dialog/CustomDialogTitle";
import { postSubjects } from "@/api/subjectAPI";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { NoteRounded } from "@mui/icons-material";
import { downloadTemplate } from "@/api/userAPI";
import { UserContext } from "@/context/providers/UserProvider";
import { validateExcelHeaders } from "@/config/helper";


const AddSubject = ({ open, setOpen }) => {
  const { session } = useContext(UserContext);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState({
    severity: "",
    text: "",
  });


  const [subjectList, setSubjectList] = useState([]);

  const appendSubjectCode = (subject) => {
    const newSubjects = _.values(
      _.merge(_.keyBy([...subjectList, subject], "name"))
    );
    setSubjectList(newSubjects);
  };

  const handleAddSubject = () => {
    const newSubjects = _.values(
      _.merge(_.keyBy([...subjectList, ...subjects], "name"))
    );

    setSubjectList(newSubjects);

    setSubjects([]);
  };

  const handleRemoveSubject = (searchSubject) => {
    setSubjectList((prev) => {
      const filteredSubjects = prev.filter(
        ({ name }) => name !== searchSubject
      );

      return filteredSubjects;
    });
  };

  const handleIsCoreSubject = (searchSubject, isCore) => {
    const filteredSubject = subjectList.find(
      ({ name }) => name === searchSubject
    );

    filteredSubject.isCore = isCore;

    const newSubjects = _.values(
      _.merge(_.keyBy([...subjectList, filteredSubject], "name"))
    );

    setSubjectList(newSubjects);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: postSubjects,
  });

  const handleSaveSubjects = () => {
    setMsg({ text: "" });

    // console.log(subjectList);
    // return;

    mutate(
      {
        session: session?.sessionId,
        term: session?.termId,
        subjects: subjectList,
      },
      {
        onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ["subjects"] });
        },
        onSuccess: (data) => {
          schoolSessionDispatch(alertSuccess(data));
          setSubjectList([]);
          setOpen(false);
        },
        onError: (error) => {
          schoolSessionDispatch(alertError(error));
        },
      }
    );
  };

  const handleFileUpload = async (event) => {
    setError("");
    const headers = DATA_HEADERS.SUBJECTS;

    const file = event.target.files[0];
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
          const workbook = XLSX.read(binaryStr, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          const modifiedData = jsonData.filter((row) =>
            Object.values(row).some(
              (value) => value !== undefined && value !== ""
            )
          );

          const headers = modifiedData[0].map((header) => _.camelCase(header));
          const rows = modifiedData.slice(1);

          const formattedData = rows.map((row) => {
            const rowData = {
              code: _.uniqueId("10"),
            };
            headers.forEach((header, index) => {
              rowData[header] = row[index];
            });
            return rowData;
          });

          setSubjectList(formattedData);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate("subjects");
    } catch (error) {
      schoolSessionDispatch(alertError(error));
    }
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
      <CustomDialogTitle
        title="New Subjects"
        subtitle="Add new subjects to your school's curriculum."
        onClose={() => setOpen(false)}
      />
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
              defaultValue={SUBJECTS}
              options={SUBJECTS}
              disableCloseOnSelect
              getOptionLabel={(option) => option?.name || ""}
              renderOption={(props, option) => {
                const isSelected = [...subjects, ...subjectList].some(
                  (item) => item.name === option.name
                );
                return (
                  <FormControlLabel
                    {...props}
                    key={option?.name}
                    label={option?.name}
                    slotProps={{
                      typography: {
                        fontSize: 12,
                      },
                    }}
                    control={<Checkbox checked={isSelected} size="small" />}
                  />
                );
              }}
              value={subjects}
              onChange={(e, value) =>
                setSubjects(
                  _.map(value, (subject) => ({
                    ...subject,
                    code: _.uniqueId("10"),
                  }))
                )
              }
              renderInput={(params) => (
                <TextField {...params} label="Select Subject" size="small" />
              )}
            />
            <Button variant="contained" size="small" onClick={handleAddSubject}>
              Add
            </Button>
          </Stack>
          <Button sx={{ bgcolor: "var(--secondary)" }}>
            <FormLabel
              htmlFor="studentFile"
              title="Import Subjects from File"
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",

                gap: 1,
                color: "primary.main",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              <NoteRounded htmlColor="#fff" />
              <Typography variant="caption" color="#fff">
                Import Subjects (.xlsx,.xls,.csv)
              </Typography>

              <Input
                type="file"
                id="studentFile"
                name="studentFile"
                hidden
                inputProps={{
                  accept: ".xlsx,.xls,.csv",
                }}
                onChange={handleFileUpload}
                onClick={(e) => {
                  e.target.value = null;
                  e.currentTarget.value = null;
                }}
              />
            </FormLabel>
          </Button>
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
            sx={{
              alignSelf: "flex-end",
              textDecoration: "underline",
              fontSize: 13,
            }}
            onClick={handleDownloadTemplate}
          >
            Download Subject Template here
          </Link>
          <List sx={{ maxHeight: 400 }}>
            {_.isEmpty(subjectList) ? (
              <Typography>No Subject selected</Typography>
            ) : (
              subjectList.map((subject) => {
                return (
                  <SubjectItem
                    key={subject?.name}
                    {...subject}
                    removeSubject={handleRemoveSubject}
                    appendCode={appendSubjectCode}
                    handleIsCore={handleIsCoreSubject}
                  />
                );
              })
            )}
          </List>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ padding: 2 }}>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          disabled={subjectList.length === 0}
          variant="contained"
          onClick={handleSaveSubjects}
          loading={isPending}
        >
          {isPending ? "Please wait" : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddSubject;
