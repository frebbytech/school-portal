/* eslint-disable react/display-name */
import React, {
  useCallback,
  use,
  useEffect,
  useRef,
  useState,
  useTransition,
  useMemo,
} from "react";
import InputAdornment from "@mui/material/InputAdornment";
import {
  Typography,
  Button,
  Container,
  Stack,
  ButtonGroup,
  TextField,
  IconButton,
  Grid2 as Grid,
} from "@mui/material";
import Swal from "sweetalert2";
import { useReactToPrint } from "react-to-print";
import { FixedSizeList } from "react-window";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { generateReports, publishReports } from "@/api/ExaminationAPI";
import { UserContext } from "@/context/providers/UserProvider";
import ViewScoreSheet from "./ViewScoreSheet";
import {
  ArrowUpwardSharp,
  Note,
  RefreshRounded,
  Search,
} from "@mui/icons-material";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import ViewListIcon from "@mui/icons-material/ViewList";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import CustomTitle from "@/components/custom/CustomTitle";
import ReportCard from "./ReportCard";
import { REPORT_CARD_PAGE_STYLE } from "./reportCardPrint";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { StudentContext } from "@/context/providers/StudentProvider";
import PublishResultOption from "@/components/modals/PublishResultOption";
import { publishAlert, publishConfirmText, publishFailure, publishOutcome } from "./publishOutcome";
import { debounce } from "lodash";

const ViewExamsReports = () => {
  const [openPublishOption, setOpenPublishOption] = useState(false);
  const [value, setValue] = useState("sms");
  const [viewMode, setViewMode] = useState("list");
  const { session } = use(UserContext);
  const [isPending, startTransition] = useTransition();
  const { studentDispatch } = use(StudentContext);
  const { schoolSessionDispatch } = use(SchoolSessionContext);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [openScoreSheet, setOpenScoreSheet] = useState(false);
  const { levelId } = useParams();
  const componentRef = useRef();

  const reports = useQuery({
    queryKey: ["exams-reports", levelId, session.sessionId, session.termId],
    queryFn: () =>
      generateReports({
        sessionId: session.sessionId,
        termId: session.termId,
        levelId,
      }),
    enabled: !!levelId && !!session.sessionId && !!session.termId,
    initialData: [],
  });

  useEffect(() => {
    studentDispatch({ type: "getReportDetails", payload: reports?.data });
    setFilteredData(reports?.data?.results);
  }, [reports.data]);

  const { mutate, isPending: publishIsPending } = useMutation({
    mutationFn: publishReports,
  });
  const handlePublishReports = () => {
    Swal.fire({
      title: "Publishing Reports",
      text: publishConfirmText(
        value,
        reports?.data?.results?.length ? `${reports.data.results.length} students` : "all students"
      ),
      showCancelButton: true,
      backdrop: false,
    }).then(({ isConfirmed }) => {
      if (!isConfirmed) return;
      mutate(
        { sessionId: session.sessionId, termId: session.termId, levelId, value },
        {
          // The result (with the counts) replaces the "please wait" message; it is not closed afterwards.
          onSuccess: (data) => {
            schoolSessionDispatch(publishAlert(publishOutcome(data)));
            handleCloseOption();
          },
          onError: (error) => {
            schoolSessionDispatch(publishAlert(publishFailure(error)));
          },
        }
      );
    });
  };

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth", // Optional: animated scroll
    });
  };

  const handleCloseOption = () => {
    setOpenPublishOption(false);
    setValue("sms");
  };

  const handlOpenScoreSheet = () => setOpenScoreSheet(true);

  const reactToPrintFn = useReactToPrint({
    documentTitle: "Student Report",
    contentRef: componentRef,
    pageStyle: REPORT_CARD_PAGE_STYLE,
  });

  // ✅ Optimized search with debounce
  const handleSearch = useMemo(
    () =>
      debounce((value) => {
        // console.log(reports.data?.results);
        startTransition(() => {
          const lower = value.toLowerCase();
          const results = reports.data?.results?.filter(
            (item) =>
              item?.fullName?.toLowerCase().includes(lower) ||
              item?.indexnumber?.toLowerCase().includes(lower)
          );
          setFilteredData(results);
        });
      }, 300),
    [reports.data]
  );

  const onSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    handleSearch(value);
  };

  // Example fixed-size array
  // const columnCount = 2; // Number of columns in the grid
  // const rowCount = Math.ceil(reports?.data?.results?.length / columnCount); // Total rows

  const generatedReports = ({ data, index }) => {
    return <ReportCard key={index} student={data[index]} />;
  };

  const reportCard = useCallback(
    (report) => {
      return <ReportCard key={report?._id} student={report} />;
    },
    [reports?.data?.results]
  );

  return (
    <>
      <Container maxWidth="lg" sx={{ overflowX: "scroll" }}>
        <CustomTitle
          title="Student Reports"
          subtitle="Show details of student performance"
          color="primary.main"
          right={
            <Stack direction="row" spacing={1}>
              <IconButton
                size="large"
                onClick={() => {
                  reports.refetch();
                }}
              >
                <RefreshRounded sx={{ width: 36, height: 36 }} />
              </IconButton>
              {/* 🔑 Toggle button */}
              <IconButton
                size="large"
                onClick={() =>
                  setViewMode((prev) => (prev === "list" ? "grid" : "list"))
                }
              >
                {viewMode === "list" ? <ViewModuleIcon /> : <ViewListIcon />}
              </IconButton>
            </Stack>
          }
          showBack={true}
        />
        <Stack py={2}>
          <ButtonGroup
            variant="contained"
            sx={{
              mb: 4,
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "none",
            }}
          >
            <Button
              disabled={publishIsPending}
              color="info"
              onClick={handlOpenScoreSheet}
            >
              View Score Sheet
            </Button>

            <Button
              disabled={publishIsPending}
              onClick={() => reactToPrintFn()}
            >
              Print Reports
            </Button>

            <Button
              loading={publishIsPending}
              loadingPosition="start"
              startIcon={<Note />}
              onClick={() => setOpenPublishOption(true)}
              color="success"
            >
              {publishIsPending ? "Please Wait" : "Publish Reports"}
            </Button>
          </ButtonGroup>
          <TextField
            placeholder="Search for Report"
            value={searchTerm}
            onChange={onSearchChange}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    {isPending && <div className="spinner-loader"></div>}
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>
      </Container>

      {reports.isError && (
        <Typography>Error loading report info.....</Typography>
      )}
      {filteredData && filteredData?.length === 0 && (
        <Typography>No Report Available.....</Typography>
      )}

      {viewMode === "list" ? (
        <FixedSizeList
          height={1096}
          width={"215mm"}
          itemSize={1200}
          itemCount={filteredData?.length}
          itemData={filteredData}
          style={{
            marginInline: "auto",
            backgroundColor: "#fff",
            overflowX: "scroll",
          }}
        >
          {generatedReports}
        </FixedSizeList>
      ) : (
        <Container
          maxWidth="lg"
          sx={{ minWidth: 300, py: 2, overflowX: "scroll" }}
        >
          <Grid container spacing={2}>
            {filteredData?.map((report) => (
              <Grid
                size={{
                  xs: 12,
                  sm: 6,
                  md: 6,
                }}
                sx={{ bgcolor: "#fff" }}
                key={report._id}
              >
                <ReportCard student={report} compact />
              </Grid>
            ))}
          </Grid>
        </Container>
      )}

      <div ref={componentRef} className="print-container">
        {filteredData?.map((report) => {
          return reportCard(report);
        })}
      </div>

      <PublishResultOption
        open={openPublishOption}
        setOpen={setOpenPublishOption}
        value={value}
        setValue={setValue}
        onClose={handleCloseOption}
        handlePublish={handlePublishReports}
      />

      {reports?.data && (
        <ViewScoreSheet
          open={openScoreSheet}
          setOpen={setOpenScoreSheet}
          reportDetails={reports?.data}
        />
      )}
      {reports.isPending && (
        <LoadingSpinner value="Loading Reports.Please Wait..." />
      )}

      {publishIsPending && <LoadingSpinner value="Publishing. This might take a while, please wait..." />}

      <IconButton onClick={handleScrollToTop} className="scroll-to-top-button">
        <ArrowUpwardSharp />
      </IconButton>
    </>
  );
};

export default React.memo(ViewExamsReports);
