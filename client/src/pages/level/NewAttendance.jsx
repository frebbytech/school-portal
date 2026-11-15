import React, { useContext, useEffect, useState } from "react";
import dayjs from "@/lib/dates";
import {
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
import { isWeekend } from "@/config/helper";
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

function NewAttendance({ to }) {
  const { breakpoints } = useTheme();
  const matches = useMediaQuery(breakpoints.up("md"));
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, session } = useContext(UserContext);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const { levelName } = useLevelById(id);

  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [allStudents, setAllStudents] = useState([]);

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

  // Sync API data into state
  useEffect(() => {
    if (attendance?.data?.status?.length) {
      setAllStudents(attendance.data.status);
    }
  }, [attendance.data]);

  // Progress calculation
  const completedCount = allStudents.filter((s) =>
    ["Present", "Absent"].includes(s.status)
  ).length;
  const completedPercent = allStudents.length
    ? Math.round((completedCount / allStudents.length) * 100)
    : 0;

  // Mutations
  const { mutateAsync: saveAttendance, isPending: isPostingAttendance } =
    useMutation({ mutationFn: postAttendance });
  const { mutateAsync: saveStudentAttendance, isPending } = useMutation({
    mutationFn: postStudentAttendance,
  });

  const sanitizeStudents = (students) =>
    students.map(({ tableData, ...rest }) => rest);

  const handleSave = (students, apiFn) => {
    const payload = {
      level: id,
      date,
      session: session?.sessionId,
      term: session?.termId,
      status: sanitizeStudents(students),
    };

    apiFn(payload, {
      onSettled: () => queryClient.invalidateQueries(["attendance-history"]),
      onSuccess: (res) => schoolSessionDispatch(alertSuccess(res)),
      onError: (err) => schoolSessionDispatch(alertError(err)),
    });
  };

  const handleCheckAttendance = (value, student, eventTarget) => {
    if (value === "Absent") {
      // Show popover for reason
      setSelectedStudent(student);
      setReason(student.reason || "");
      setAnchorEl(eventTarget);
    } else {
      // Directly update
      setAllStudents((prev) =>
        prev.map((s) =>
          s._id === student._id ? { ...s, status: value, reason: "" } : s
        )
      );
    }
  };

  const handleReasonSubmit = () => {
    if (selectedStudent) {
      setAllStudents((prev) =>
        prev.map((s) =>
          s._id === selectedStudent._id ? { ...s, status: "Absent", reason } : s
        )
      );
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
                {rowData?.reason && (
                  <Stack direction="row" gap={1}>
                    <Typography variant="body2" fontWeight="bold">
                      Reason:
                    </Typography>
                    <Typography variant="body2">{rowData?.reason}</Typography>
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
                  onClick={() => {
                    const student = {
                      _id: rowData?._id,
                      fullName: rowData?.fullName,
                      gender: rowData?.gender,
                      status: rowData?.status,
                      reason: rowData?.reason,
                    };
                    handleSave([student], saveStudentAttendance);
                  }}
                  disabled={isPending}
                >
                  Save
                </Button>
              ) : (
                <Tooltip title="Save">
                  <IconButton
                    onClick={() => {
                      const student = {
                        _id: rowData?._id,
                        fullName: rowData?.fullName,
                        gender: rowData?.gender,
                        status: rowData?.status,
                      };
                      handleSave([student], saveStudentAttendance);
                    }}
                    disabled={isPending}
                  >
                    <SaveAltRounded color="secondary" />
                  </IconButton>
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
                setDate={(d) => setDate(dayjs(d).format("YYYY-MM-DD"))}
                disableFuture
                shouldDisableWeekends
              />
            </Box>
            <DialogActions sx={{ p: 2 }}>
              {!isWeekend(date) && (
                <Button
                  variant="contained"
                  startIcon={<SaveAsRounded />}
                  onClick={() => handleSave(allStudents, saveAttendance)}
                  disabled={isPostingAttendance}
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
