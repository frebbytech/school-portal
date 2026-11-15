import {
  Autocomplete,
  Box,
  FormHelperText,
  FormLabel,
  Input,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React, { useContext, useState } from "react";
import Swal from "sweetalert2";
import Button from "@mui/material/Button";
import _ from "lodash";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { readXLSX } from "@/config/readXLSX";
import { UploadFileRounded } from "@mui/icons-material";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { EMPTY_IMAGES } from "@/config/images";
import { postBulkExams } from "@/api/ExaminationAPI";
import { generateCustomGrade } from "@/config/generateCustomGrade";
import { UserContext } from "@/context/providers/UserProvider";
import Back from "@/components/Back";
import CustomTitle from "@/components/custom/CustomTitle";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import useLevelById from "@/components/hooks/useLevelById";
import ImportProblems from "./ImportProblems";
import { checkImportRows, parseScorePreference } from "./scoreRules";

const LevelExamScoreInput = () => {
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const { session } = useContext(UserContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { levelId } = useParams();
  const queryClient = useQueryClient();
  const { state } = useLocation();
  const [data, setData] = useState([]);
  const [isPending, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [mainError, setMainError] = useState("");
  const [problems, setProblems] = useState([]);
  const [subject, setSubject] = useState({ _id: "", name: "" });

  const { levelLoading, levelName, subjects, gradeSystem, students } =
    useLevelById(levelId);

  const { classMax, examsMax } = parseScorePreference(session?.exams?.scorePreference);

  //LOAD Results from file excel,csv
  async function handleLoadFile(e) {
    setMainError("");
    setData([]);
    setFieldError("");
    setProblems([]);
    const file = e.target.files[0];
    if (!subject?._id) {
      setFieldError("Please select a Subject!");
      return;
    }
    if (!file) return;

    setIsLoading(true);
    try {
      const results = await readXLSX(file);
      if (results.length === 0) {
        setMainError("The file has no rows to import.");
        return;
      }
      // Every row is checked before anything is sent; rows that cannot be imported are
      // listed with the reason instead of failing the whole file with one message.
      const { valid, problems: found } = checkImportRows(results, {
        studentIndexNumbers: _.map(students, "indexnumber"),
        classMax,
        examsMax,
      });
      setProblems(found);
      if (valid.length === 0) {
        setMainError(`No row can be imported into ${levelName}. See the list below.`);
        return;
      }
      setData(
        valid.map((row) => ({
          ...row,
          _id: subject._id,
          subject: subject.name,
          ...generateCustomGrade(row.classScore + row.examsScore, gradeSystem?.ratings),
        }))
      );
    } catch (error) {
      setMainError(
        typeof error === "string"
          ? error
          : "The file could not be read. Use an Excel or CSV file with the columns Index Number, Student, Class Score and Exams Score."
      );
    } finally {
      setIsLoading(false);
    }
  }

  const { mutate } = useMutation({
    mutationFn: postBulkExams,
  });

  const handlePostResults = () => {
    setFieldError("");

    Swal.fire({
      title: "Importing results",
      text:
        `Import ${data.length} result${data.length === 1 ? "" : "s"} in ${subject?.name}?` +
        (problems.length ? ` ${problems.length} row${problems.length === 1 ? "" : "s"} with problems will be left out.` : ""),
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        setIsLoading(true);
        const students = {
          session: session?.sessionId,
          term: session?.termId,
          level: levelId,
          results: data,
        };

        mutate(students, {
          onSettled: () => {
            queryClient.invalidateQueries(["all-results"]);
            queryClient.invalidateQueries([
              "subject-score",
              levelId,
              searchParams.get("sub"),
            ]);
            setIsLoading(false);
          },
          onSuccess: (data) => {
            schoolSessionDispatch(alertSuccess(data));
            navigate(state?.prevPath);
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };

  //CLOSE File Dialog
  const handleClose = () => {
    Swal.fire({
      title: "Exiting",
      text: "Unsaved Changes will be lost. Are you sure?",
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        navigate(`/examination/${levelId}`);
        setData([]);
        setSubject({ _id: "", name: "" });
      }
    });
  };

  const columns = [
    {
      title: "Index Number",
      field: "indexnumber",
    },
    {
      title: "Student",
      field: "student",
    },
    {
      title: "Subject",
      field: "subject",
    },
    {
      title: `Class Score (0-${classMax})`,
      field: "classScore",
    },
    {
      title: `Exams Score (0-${examsMax})`,
      field: "examsScore",
    },
    {
      title: "Total Score (0-100)",
      field: "totalScore",
    },
    {
      title: "Grade",
      field: "grade",
    },
    {
      title: "Remarks",
      field: "remarks",
    },
  ];

  return (
    <>
      <Back to={state?.prevPath} color="primary.main" />
      <CustomTitle
        title="Exams Scores"
        subtitle="Import Student exams results from excel or csv files."
        color="primary.main"
      />

      <Stack
        spacing={2}
        py={4}
        px={2}
        my={4}
        border="1px solid lightgray"
        borderRadius={2}
      >
        <Typography>
          Select an <b>EXCEL</b> OR <b>CSV</b> file containing student results
          information. Make sure the columns matches the accepted fields.
        </Typography>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems="start"
          spacing={3}
          pt={2}
        >
          <Autocomplete
            options={subjects}
            loading={levelLoading}
            getOptionLabel={(option) => option?.name || ""}
            isOptionEqualToValue={(option, value) =>
              value?._id === undefined ||
              value?._id === "" ||
              value?._id === option?._id
            }
            // defaultValue={searchParams.get("sub")}
            value={subject}
            onChange={(e, value) => setSubject(value)}
            sx={{ minWidth: 300 }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Subject"
                size="small"
                error={fieldError !== ""}
                helperText={fieldError}
                required
                slotProps={{
                  formHelperText: {
                    sx: {
                      color: "error.main",
                    },
                  },
                }}
              />
            )}
          />
          <Button sx={{ bgcolor: "var(--primary)" }}>
            <FormLabel
              htmlFor="resultFile"
              title="Import Subjects from File"
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",

                gap: 1,
                color: "primary.main",
                cursor: "pointer",
                px: 2,
                py: 0.5,
              }}
            >
              <UploadFileRounded htmlColor="#fff" />
              <Typography variant="caption" color="#fff">
                Load Results
              </Typography>

              <Input
                type="file"
                id="resultFile"
                name="resultFile"
                hidden
                inputProps={{
                  accept: ".xlsx,.xls,.csv",
                }}
                onChange={handleLoadFile}
                onClick={(e) => {
                  e.target.value = null;
                  e.currentTarget.value = null;
                }}
              />
            </FormLabel>
          </Button>
        </Stack>
        {mainError && (
          <FormHelperText sx={{ color: "red" }}>{mainError}</FormHelperText>
        )}
        <ImportProblems problems={problems} />
      </Stack>

      <Box>
        <>
          <CustomizedMaterialTable
            icon={EMPTY_IMAGES.score}
            search={true}
            exportFileName={`${subject?.name} - `}
            isPending={isPending}
            title={subject?.name}
            columns={columns}
            data={data}
            actions={[]}
            autoCompleteComponent={
              <>
                {data?.length > 0 && (
                  <Stack direction="row" spacing={3} justifyContent="flex-end">
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button variant="contained" onClick={handlePostResults}>
                      Save Results
                    </Button>
                  </Stack>
                )}
              </>
            }
          />
        </>
      </Box>
      {isPending && <LoadingSpinner />}
    </>
  );
};

export default LevelExamScoreInput;
