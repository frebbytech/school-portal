import {
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
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { EMPTY_IMAGES } from "@/config/images";
import { postBulkExams } from "@/api/ExaminationAPI";
import { generateCustomGrade } from "@/config/generateCustomGrade";
import Back from "@/components/Back";
import CustomTitle from "@/components/custom/CustomTitle";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import useLevelById from "@/components/hooks/useLevelById";
import { readXLSX } from "@/config/readXLSX";
import { UploadFileRounded } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";

const UploadSingleSubject = () => {
  const uploadedData = sessionStorage.getItem("course-upload-data");
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const { session } = useAuth()
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { levelId } = useParams();
  const queryClient = useQueryClient();
  const { state } = useLocation();
  const [data, setData] = useState(
    !_.isNull(uploadedData) ? JSON.parse(uploadedData) : []
  );

  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [mainError, setMainError] = useState("");

  const scorePreference = session?.exams?.scorePreference?.split("/");
  const classScorePreference = !_.isUndefined(scorePreference)
    ? scorePreference[0]
    : 50;
  const examsScorePreference = !_.isUndefined(scorePreference)
    ? scorePreference[1]
    : 50;

  const { levelName, gradeSystem, subjects, students } = useLevelById(levelId);

  const subject = subjects?.find((s) => s?._id === searchParams.get("_id"));

  //LOAD Results from file excel,csv
  async function handleLoadFile(e) {
    setMainError("");
    setData([]);
    const file = e?.target.files[0];
    if (subject?.name === "") {
      setFieldError("Please select a Subject!");

      return;
    }
    setMainError(false);
    setIsLoading(true);
    if (file) {
      try {
        const studentsIndexs = _.map(students, "indexnumber");
        const results = await readXLSX(file);

        const filteredResults = results.filter(
          (result) =>
            studentsIndexs.includes(result["index number"]) ||
            studentsIndexs.includes(result["indexnumber"])
        );

        if (filteredResults.length !== 0) {
          const modifiedResults = results.map((item) => {
            const classScore = Number(
              item["class score"] || item["classscore"] || 0
            );
            const examsScore = Number(
              item["exams score"] || item["examsscore"] || 0
            );

            if (
              classScore > classScorePreference ||
              examsScore > examsScorePreference
            ) {
              setMainError(
                `It seems there is some inconsistencies in your results.
                Class score show be from 0 - ${classScorePreference}*.
                 Exams score show be from 0 - ${examsScorePreference}*.`
              );
              setIsLoading(false);
              setData([]);
              throw `It seems there is some inconsistencies in your results.
              Class score show be from 0 - ${classScorePreference}*.
               Exams score show be from 0 - ${examsScorePreference}*.`;
            }

            return {
              indexnumber: _.toString(
                item["index number"] || item["indexnumber"]
              ),
              student: item["student"],
              _id: subject?._id,
              subject: subject?.name,
              classScore,
              examsScore,
              ...generateCustomGrade(
                Number(+classScore + +examsScore),
                gradeSystem?.ratings
              ),
            };
          });

          setData(modifiedResults);
          sessionStorage.setItem(
            "course-upload-data",
            JSON.stringify(modifiedResults)
          );
        } else {
          setMainError(`No student in ${levelName} was found!`);
        }
      } catch (error) {
        setMainError(error);
      } finally {
        setIsLoading(false);
      }
    }
  }

  const { mutate, isPending } = useMutation({
    mutationFn: postBulkExams,
  });

  const handlePostResults = () => {
    setFieldError("");

    Swal.fire({
      title: "Importing results",
      text: `Do you want to import ${subject?.name} results for ${levelName} ?`,
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
            queryClient.invalidateQueries({ queryKey: ["all-results"] });
            queryClient.invalidateQueries([
              "subject-score",
              levelId,
              subject?._id,
            ]);
            setIsLoading(false);
          },
          onSuccess: (data) => {
            schoolSessionDispatch(alertSuccess(data));
            sessionStorage.removeItem("course-upload-data");
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
  const handleCancelUploads = () => {
    Swal.fire({
      title: "Cancel Uploads",
      text: "Unsaved Changes will be lost. Are you sure?",
      showCancelButton: true,
      allowOutsideClick: false,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        setData([]);
        sessionStorage.removeItem("course-upload-data");
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
      // hidden: searchParams.get("sub"),
    },
    {
      title: "Class Score(50%)",
      field: "classScore",
    },
    {
      title: "Exams Score(50%)",
      field: "examsScore",
    },
    {
      title: "Total Score(100%)",
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

  if (!levelId || _.isEmpty(subject?._id)) {
    return <Navigate to={"/course/assign"} />;
  }

  return (
    <>
      <Back to={-1} color="primary.main" />
      <CustomTitle
        title="Exams Scores"
        subtitle={`Import ${subject?.name} exams results from excel or csv files.`}
        color="primary.main"
        right={<Typography variant="h6">{subject?.name}</Typography>}
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
          Select an <b>EXCEL</b> OR <b>CSV</b> file containing students&apos;{" "}
          {subject?.name} results information. Make sure the columns matches the
          accepted fields.
        </Typography>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems="start"
          spacing={3}
          pt={2}
        >
          <TextField
            value={subject?.name}
            contentEditable={false}
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
      </Stack>

      <Box>
        <>
          <CustomizedMaterialTable
            icon={EMPTY_IMAGES.score}
            search={true}
            exportFileName={`${searchParams.get("sub")} - `}
            title={searchParams.get("sub")}
            columns={columns}
            data={data}
            actions={[]}
            autoCompleteComponent={
              <>
                {data?.length > 0 && (
                  <Stack direction="row" spacing={3} justifyContent="flex-end">
                    <Button onClick={handleCancelUploads}>Cancel</Button>
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
      {(isPending || isLoading) && <LoadingSpinner value="Please Wait..." />}
    </>
  );
};

export default UploadSingleSubject;
