import React, { useCallback, useContext } from "react";
import * as XLSX from "xlsx";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  ButtonGroup,
  Container,
  Divider,
  Typography,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Card,
  CardContent,
  LinearProgress,
  Grid2,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  BookSharp,
  NoteOutlined,
  List,
  ChevronRight,
  RefreshRounded,
  Note,
  Book,
  Score,
} from "@mui/icons-material";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import { STUDENTS_EXAMS_COLUMN } from "@/mockup/columns/studentColumns";
import { getExamsDetails } from "@/api/ExaminationAPI";
import student_icon from "@/assets/images/header/student_ico.svg";
import { EMPTY_IMAGES } from "@/config/images";
import CustomTitle from "@/components/custom/CustomTitle";
import exams_icon from "@/assets/images/header/exams_ico.svg";
import { UserContext } from "@/context/providers/UserProvider";
import Back from "@/components/Back";
import { gradeColor } from "@/config/gradeColor";
import GradePopover from "../level/GradePopover";
import SubjectPopover from "../level/SubjectPopOver";
import useLevelById from "@/components/hooks/useLevelById";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import AssignLevelGrade from "../subject/AssignLevelGrade";
import ExamSummary from "./ExamSummary";

const ExamsLevel = ({ type }) => {
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.up("md"));
  const navigate = useNavigate();
  const { user, session } = useContext(UserContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const { levelId } = useParams();
  const level = searchParams.get("level");

  //Get Students in Current Level id
  const { gradeSystem, subjects, levelName } = useLevelById(levelId);

  const scorePreference = session?.exams?.scorePreference;

  //GET All Details about exams

  const examDetails = useQuery({
    queryKey: ["exams-details", levelId],
    queryFn: () =>
      getExamsDetails({
        level: levelId,
      }),
    enabled: !!levelId,
    initialData: {
      noOfStudents: 0,
      highestMarks: 0,
      lowestMarks: 0,
      averageMarks: 0,
      passStudents: 0,
      failStudents: 0,
      students: [],
      resultsCompleted: 0,
      scorePercentage: 0,
    },
  });

  const handleViewExamsDetails = (rowData) => {
    navigate(
      `/${type}/${levelId}/student?eid=${rowData?._id}&sid=${rowData?.studentId}`,
      {
        state: {
          prevPath: `/${type}/${levelId}`,
        },
      }
    );
  };

  const column = [
    ...STUDENTS_EXAMS_COLUMN,

    {
      field: null,
      title: "",
      width: "30%",
      render: () => <ChevronRight sx={{ width: 30, height: 30 }} />,
    },
  ];

  const handleImportResults = () => {
    navigate(`/${type}/${levelId}/upload`, {
      state: {
        prevPath: `/${type}/${levelId}`,
      },
    });
  };

  //Generate reports for whole level
  const handleGenerateReports = () => {
    navigate(`/${type}/${levelId}/reports`);
  };

  const downloadSheet = useCallback(() => {
    const columns = [
      "Index Number",
      "Student",
      "Class  Score",
      "Exams  Score",
      "Total  Score",
    ];
    const modifiedSheet = examDetails?.data?.students?.map((student) => {
      return {
        indexnumber: student?.indexnumber,
        student: student?.fullName,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(modifiedSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, levelName || "Subject");
    XLSX.utils.sheet_add_aoa(worksheet, [columns], {
      origin: "A1",
    });

    /* calculate column width */
    const max_width = modifiedSheet.reduce(
      (w, r) => Math.max(w, r?.student?.length),
      10
    );
    worksheet["!cols"] = [{ wch: max_width + 30 }];
    XLSX.writeFile(workbook, `${levelName || "Subject"}-Assessment.xlsx`, {
      compression: true,
    });
  }, [examDetails?.data?.students]);

  const handleShowAssignGrade = () => {
    setSearchParams((params) => {
      params.set("assign_grade", true);
      return params;
    });
  };
  return (
    <>
      {user?.role === "administrator" ? (
        <Back to={`/examination`} color="primary.main" />
      ) : (
        <Back to={"/course/level"} color="primary.main" />
      )}

      <Container
        sx={{
          display: "flex",
          flexDirection: { xs: "column-reverse", sm: "row" },
          justifyContent: "space-between",
          alignItems: "center",
          // gap: 2,
          bgcolor: "#fff",
          my: 2,
          borderRadius: "12px",
        }}
      >
        <CustomTitle
          title={`${levelName} Portal`}
          subtitle="Plan, Conduct, and Analyze Student Performance"
          img={exams_icon}
          // showBack={true}
          backColor="#012e54"
        />
        {/* <Typography
          sx={{ display: { size: "none", md: "inline-flex" } }}
          variant="h5"
          whiteSpace="nowrap"
        >
          {levelName}
        </Typography> */}
      </Container>

      <Typography variant="h5" py={2}>
        Exams Summary
      </Typography>
      <Divider />
      <ExamSummary data={examDetails.data} />

      {/* Dashboard hero  */}
      <Card sx={{ margin: "auto", padding: 2, mb: 3 }}>
        <CardContent>
          {/* Header */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            width="100%"
          >
            <Box
              display="flex"
              flexDirection={{
                xs: "column",
                md: "row",
              }}
              alignItems="center"
              gap={2}
              flex={1}
            >
              {/* Circular Progress with Text */}
              <Box>
                <Box
                  sx={{
                    position: "relative",
                    display: "inline-flex",
                  }}
                >
                  {/* Non-completed part */}
                  <CircularProgress
                    variant="determinate"
                    value={100} // Always render the full circle as light gray
                    size={90}
                    thickness={3}
                    sx={{
                      color: "lightgray",
                    }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={examDetails?.data?.scorePercentage}
                    size={90}
                    thickness={3}
                    sx={{
                      color: gradeColor(examDetails?.data?.scorePercentage).bg,

                      position: "absolute", // Stack it on top of the gray progress
                      left: 0,
                      // bgcolor:'lightgray'
                    }} // Optional styling for 100%
                  />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: "absolute",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      variant="h6"
                      component="div"
                      color="text.primary"
                    >
                      {examDetails?.data?.scorePercentage || 0}%
                    </Typography>
                  </Box>
                </Box>
                <Typography>Performance </Typography>
              </Box>
              <Box textAlign={{ xs: "center", md: "left" }}>
                <Typography variant="h6" fontWeight="bold">
                  {level ?? levelName ?? "Students"}
                </Typography>
                {typeof examDetails?.data?.completeStudents === "number" && (
                  <Typography variant="body2" color="text.secondary">
                    {examDetails.data.completeStudents} of {examDetails.data.noOfStudents} students have complete results
                  </Typography>
                )}
              </Box>
            </Box>
            <IconButton
              sx={{ justifySelf: "flex-end" }}
              onClick={examDetails.refetch}
            >
              <RefreshRounded
                sx={{ width: { xs: 24, md: 40 }, height: { xs: 24, md: 40 } }}
              />
            </IconButton>
          </Box>

          {/* Progress Section */}
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary">
              Gain insights into students&apos; academic progress and
              achievements.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monitor grades, assessments, and overall performance to support
              learning growth.
            </Typography>
            <Box mt={2} display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" fontWeight="bold" color="primary">
                Result Entry Progress
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={examDetails?.data?.resultsCompleted || 0}
              color="primary"
              sx={{
                height: 8,
                borderRadius: 1,
                mt: 1,
              }}
            />
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Progress: {examDetails?.data?.resultsCompleted || 0}%
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Statistics Section */}
          <Grid2 container spacing={2}>
            <Grid2 size={{ xs: 6, md: 2.5 }}>
              <Box textAlign="center">
                <Note color="info" />
                <Typography variant="h6" color="info">
                  {subjects?.length ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Subjects <SubjectPopover subjects={subjects} />
                </Typography>
              </Box>
            </Grid2>
            <Grid2 size={{ xs: 6, md: 2.5 }}>
              <Box textAlign="center">
                <Book color="success" />
                <Typography variant="body2" color="success">
                  {gradeSystem?.name || "N/A"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Grade System
                  {gradeSystem?.name && (
                    <GradePopover grades={gradeSystem?.ratings} />
                  )}
                  <button
                    style={{
                      border: "1px solid var(--primary)",
                      backgroundColor: "transparent",
                      padding: "4px",
                      borderRadius: "2px",
                      color: "var(--primary)",
                      fontSize: "12px",
                    }}
                    onClick={handleShowAssignGrade}
                  >
                    Assign Grade
                  </button>
                </Typography>
              </Box>
            </Grid2>
            <Grid2 size={{ xs: 6, md: 2.5 }}>
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">
                  Score Preference
                </Typography>
                <Score color="success" />
                <Typography variant="body2" color="success">
                  {scorePreference || "50/50"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  (Class Score / Exams Score)
                </Typography>
              </Box>
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>

      <CustomizedMaterialTable
        title={level ?? "Students"}
        icon={student_icon}
        isPending={examDetails.isPending}
        columns={column}
        search={true}
        data={examDetails?.data?.students}
        autoCompleteComponent={
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <ButtonGroup>
              <Tooltip title="Download Assessment Sheet">
                <Button startIcon={<NoteOutlined />} onClick={downloadSheet}>
                  {matches ? " Download Assessment Sheet" : ""}
                </Button>
              </Tooltip>

              <Tooltip title="Import Results">
                <Button startIcon={<BookSharp />} onClick={handleImportResults}>
                  {matches ? "Import Results" : ""}
                </Button>
              </Tooltip>

              <Tooltip title="View Students Report">
                <Button startIcon={<List />} onClick={handleGenerateReports}>
                  {matches ? "View Students Report" : ""}
                </Button>
              </Tooltip>
            </ButtonGroup>
          </Box>
        }
        actions={[]}
        handleRefresh={examDetails.refetch}
        addButtonImg={EMPTY_IMAGES.student}
        addButtonMessage="😑 No Students results available !!!!"
        onRowClick={(rowData) => handleViewExamsDetails(rowData)}
      />
      {examDetails.isPending && <LoadingSpinner value="Please Waiting.." />}

      <AssignLevelGrade levelName={levelName} />
    </>
  );
};

export default ExamsLevel;
