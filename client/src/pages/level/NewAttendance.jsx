import React, { useContext, useEffect, useMemo, useState } from "react";
import dayjs from "@/lib/dates";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  DialogActions,
  Divider,
  FormControlLabel,
  Radio,
  Typography,
  Popover,
  TextField,
  RadioGroup,
  Stack,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
} from "@mui/material";
import { SchoolRounded, SaveAsRounded } from "@mui/icons-material";
import SaveAltRounded from "@mui/icons-material/SaveAltRounded";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import CustomDatePicker from "@/components/inputs/CustomDatePicker";
import CustomizedMaterialTable from "@/components/tables/CustomizedMaterialTable";
import Back from "@/components/Back";
import CustomTitle from "@/components/custom/CustomTitle";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import {
  getAttendance,
  postAttendance,
  postStudentAttendance,
} from "@/api/attendanceAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { UserContext } from "@/context/providers/UserProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import useLevelById from "@/components/hooks/useLevelById";
import PropTypes from "prop-types";
import useUnsavedChangesWarning from "@/components/hooks/useUnsavedChangesWarning";
import {
  countMarked,
  entryOf,
  isMarked as isMarkedRow,
  isWeekendDay,
  latestWeekday,
  mergeMarks,
} from "./attendanceRules";

function NewAttendance({ to }) {
  const { breakpoints } = useTheme();
  const matches = useMediaQuery(breakpoints.up("md"));
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, session } = useContext(UserContext);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const { levelName } = useLevelById(id);

  // Today, or the last school day when it is a weekend (the picker refuses weekends).
  const [date, setDate] = useState(() => latestWeekday());
  // Marks not saved yet: { [studentId]: { status, reason } }. The saved register is never
  // copied into state, so reloading it cannot wipe what the teacher has just marked, and
  // changing the day cannot carry one day's students onto another.
  const [marks, setMarks] = useState({});

  // Popover state
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reason, setReason] = useState("");

  // Fetch Attendance
  const attendance = useQuery({
    queryKey: ["attendance", id, date],
    queryFn: () =>
      getAttendance(id, {
        date,
        session: session?.sessionId,
        term: session?.termId,
      }),
    enabled: Boolean(id && date),
  });

  const allStudents = useMemo(
    () => mergeMarks(attendance.data?.status || [], marks),
    [attendance.data, marks]
  );
  const hasUnsaved = Object.keys(marks).length > 0;
  useUnsavedChangesWarning(hasUnsaved);

  const completedCount = countMarked(allStudents);
  const notMarked = allStudents.length - completedCount;
  const completedPercent = allStudents.length
    ? Math.round((completedCount / allStudents.length) * 100)
    : 0;

  const changeDate = (next) => {
    if (next === date) return;
    if (hasUnsaved && !window.confirm("You have marks that are not saved. Change the date and lose them?")) return;
    setMarks({});
    setDate(next);
  };

  // Mutations
  const { mutateAsync: saveAttendance, isPending: isPostingAttendance } =
    useMutation({ mutationFn: postAttendance });
  const { mutateAsync: saveStudentAttendance, isPending } = useMutation({
    mutationFn: postStudentAttendance,
  });

  const handleSave = (students, apiFn) => {
    const payload = {
      level: id,
      date,
      session: session?.sessionId,
      term: session?.termId,
      status: students.map(entryOf),
    };

    apiFn(payload, {
      onSuccess: (res) => {
        // Saved marks are now on the server; keep only the ones not sent.
        const sent = new Set(students.map((st) => st._id));
        setMarks((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !sent.has(k))));
        queryClient.invalidateQueries({ queryKey: ["attendance", id] });
        queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
        schoolSessionDispatch(alertSuccess(res));
      },
      onError: (err) => schoolSessionDispatch(alertError(err)),
    });
  };

  const setMark = (studentId, change) =>
    setMarks((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), ...change } }));

  const openReason = (student, target) => {
    setSelectedStudent(student);
    setReason(student.reason || "");
    setAnchorEl(target);
  };

  const handleCheckAttendance = (value, student, eventTarget) => {
    if (value === "Absent") {
      // Ask for the reason; the mark is only made when the reason box is saved.
      openReason(student, eventTarget);
    } else {
      setMark(student._id, { status: value, reason: "" });
    }
  };

  const handleReasonSubmit = () => {
    if (selectedStudent) {
      setMark(selectedStudent._id, { status: "Absent", reason: reason.trim() });
    }
    setAnchorEl(null);
    setSelectedStudent(null);
    setReason("");
  };

  const navigateToHistory = () => {
    navigate(
      user?.role === "administrator"
        ? `/level/${id}/history`
        : `/${to}/${id}/history`
    );
  };

  return (
    <>
      {user?.role === "administrator" && (
        <Back to={`/level/${id}`} color="primary.main" />
      )}
      {user?.role === "teacher" && (
        <Back to="/course/level" color="primary.main" />
      )}

      <CustomTitle
        title="Track Attendance Records"
        subtitle="Monitor and manage student and staff attendance to ensure accurate record-keeping and identify patterns or issues promptly."
        icon={<SchoolRounded sx={{ width: 50, height: 50 }} />}
        color="primary.main"
        right={
          <Button variant="outlined" onClick={navigateToHistory}>
            View History
          </Button>
        }
      />

      {/* Progress */}
      <Box
        sx={{
          bgcolor: "#fff",
          p: 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
        }}
      >
        <CircularProgress
          variant="determinate"
          value={completedPercent}
          size={80}
          color={completedPercent ? "success" : "secondary"}
        />
        <Typography variant="h6">
          {completedCount}/{allStudents.length} completed
        </Typography>
      </Box>

      {attendance.isError && (
        <Alert severity="error" sx={{ my: 2 }} action={<Button color="inherit" size="small" onClick={() => attendance.refetch()}>Try again</Button>}>
          {typeof attendance.error === "string" ? attendance.error : attendance.error?.message || "Could not load the attendance register."}
        </Alert>
      )}
      {!attendance.isError && attendance.isSuccess && allStudents.length === 0 && (
        <Alert severity="info" sx={{ my: 2 }}>
          {isWeekendDay(date) ? "Attendance is not taken at weekends." : "There are no active students in this class."}
        </Alert>
      )}
      {hasUnsaved && (
        <Alert severity="warning" sx={{ my: 2 }}>
          You have marks that are not saved yet.
          {notMarked > 0 && ` ${notMarked} student${notMarked === 1 ? " is" : "s are"} still not marked and will be saved as blank.`}
        </Alert>
      )}

      <Divider textAlign="center" sx={{ py: 4 }}>
        <Chip label="Details" color="secondary" />
      </Divider>

      {/* Table */}
      <CustomizedMaterialTable
        search
        title={`Attendance for ${levelName}`}
        exportFileName={`Attendance-${levelName}-${date}`}
        data={allStudents}
        actions={[]}
        columns={[
          { field: "_id", title: "ID", hidden: true },
          { field: "fullName", title: "Full Name" },
          { field: "gender", title: "Gender" },
          {
            field: "status",
            title: "Status",
            render: (rowData) => (
              <>
                <RadioGroup
                  row
                  value={rowData.status || ""}
                  onChange={(e) =>
                    handleCheckAttendance(
                      e.target.value,
                      rowData,
                      e.currentTarget
                    )
                  }
                >
                  <FormControlLabel
                    value="Present"
                    control={<Radio size="small" />}
                    label="Present"
                  />
                  <FormControlLabel
                    value="Absent"
                    control={<Radio size="small" />}
                    label="Absent"
                  />
                </RadioGroup>
                {rowData?.status === "Absent" && (
                  <Stack direction="row" gap={1} alignItems="center">
                    <Typography variant="body2" fontWeight="bold">
                      Reason:
                    </Typography>
                    <Typography variant="body2">{rowData?.reason || "none given"}</Typography>
                    <Button size="small" onClick={(e) => openReason(rowData, e.currentTarget)}>
                      {rowData?.reason ? "Edit" : "Add"}
                    </Button>
                  </Stack>
                )}
              </>
            ),
          },
          {
            title: "Action",
            render: (rowData) =>
              matches ? (
                <Button
                  size="small"
                  startIcon={<SaveAltRounded color="secondary" />}
                  onClick={() => handleSave([rowData], saveStudentAttendance)}
                  disabled={isPending || !isMarkedRow(rowData)}
                >
                  Save
                </Button>
              ) : (
                <Tooltip title="Save">
                  <span>
                    <IconButton
                      aria-label={`Save ${rowData?.fullName}`}
                      onClick={() => handleSave([rowData], saveStudentAttendance)}
                      disabled={isPending || !isMarkedRow(rowData)}
                    >
                      <SaveAltRounded color="secondary" />
                    </IconButton>
                  </span>
                </Tooltip>
              ),
          },
        ]}
        autoCompleteComponent={
          <Box
            display="flex"
            flexDirection={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems="center"
            width="100%"
          >
            <Box width={280}>
              <CustomDatePicker
                label="Date of Attendance"
                date={dayjs(date)}
                setDate={(d) => d && dayjs(d).isValid() && changeDate(dayjs(d).format("YYYY-MM-DD"))}
                disableFuture
                shouldDisableWeekends
              />
            </Box>
            <DialogActions sx={{ p: 2 }}>
              {!isWeekendDay(date) && (
                <Button
                  variant="contained"
                  startIcon={<SaveAsRounded />}
                  onClick={() => handleSave(allStudents, saveAttendance)}
                  disabled={isPostingAttendance || allStudents.length === 0}
                >
                  {isPostingAttendance ? "Saving..." : "Save Attendance"}
                </Button>
              )}
              <Button variant="outlined" onClick={navigateToHistory}>
                View History
              </Button>
            </DialogActions>
          </Box>
        }
        options={{ pageSize: 10, selection: false }}
        handleRefresh={attendance.refetch}
      />

      {/* Absence Reason Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box p={2} display="flex" flexDirection="column" gap={2}>
          <Typography variant="subtitle1">Reason for Absence</Typography>
          <TextField
            size="small"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason"
            fullWidth
            multiline
          />
          <Button variant="contained" size="small" onClick={handleReasonSubmit}>
            Save Reason
          </Button>
        </Box>
      </Popover>

      {(isPending || isPostingAttendance) && (
        <LoadingSpinner value="Saving Attendance. Please Wait..." />
      )}
    </>
  );
}
NewAttendance.propTypes = {
  to: PropTypes.string.isRequired,
};

export default NewAttendance;
