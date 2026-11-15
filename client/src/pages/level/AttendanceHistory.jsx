import React, { use } from "react";
import _ from "lodash";
import { DeleteOutlineRounded, Refresh } from "@mui/icons-material";
import {
  Container,
  ListItemText,
  IconButton,
  Box,
  Alert,
  Button,
} from "@mui/material";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import { PropTypes } from "prop-types";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteAttendance, getAttendanceHistory } from "@/api/attendanceAPI";
import dayjs from "@/lib/dates";
import Back from "@/components/Back";
import CustomTitle from "@/components/custom/CustomTitle";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
import { UserContext } from "@/context/providers/UserProvider";
import DataSkeleton from "@/components/skeleton/DataSkeleton";
import Swal from "sweetalert2";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";

function AttendanceHistory() {
  const { user, session } = use(UserContext);
  const { schoolSessionDispatch } = use(SchoolSessionContext);
  const queryClient = useQueryClient();
  const { id } = useParams();

  const attendanceHistory = useQuery({
    queryKey: ["attendance-history", id],
    queryFn: () =>
      getAttendanceHistory({
        id: id,
        session: session?.sessionId,
        term: session?.termId,
      }),
    enabled: !!id,
  });

  const { mutateAsync, isPending } = useMutation({
    mutationFn: deleteAttendance,
  });

  const levelId = id;
  const handleDeleteAttendance = (attendanceId) => {
    Swal.fire({
      title: "Removing Attendance",
      text: `You are about to remove the selected attendance.Changes cannot be undone.`,
      showCancelButton: true,
    }).then(({ isConfirmed }) => {
      if (isConfirmed) {
        mutateAsync(attendanceId, {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["attendance-history", levelId] });
          },
          onSuccess: (data) => {
            schoolSessionDispatch(alertSuccess(data));
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };

  if (attendanceHistory.isPending) {
    return <DataSkeleton />;
  }

  if (attendanceHistory.isError) {
    const why = typeof attendanceHistory.error === "string" ? attendanceHistory.error : attendanceHistory.error?.message;
    return (
      <Container>
        <Alert severity="error" sx={{ my: 4 }} action={<Button color="inherit" size="small" onClick={() => attendanceHistory.refetch()}>Try again</Button>}>
          {why || "Could not load the attendance history."}
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      {user?.role === "administrator" && (
        <Back to={`/level/${id}/attendance`} color="primary.main" />
      )}

      {user?.role === "teacher" && (
        <Back to={`/course/level/${id}/attendance`} color="primary.main" />
      )}

      <CustomTitle
        title="Attendance History"
        subtitle="Review past attendance records to analyze trends, identify issues, and ensure comprehensive tracking of student and staff presence."
        color="primary.main"
        right={
          <IconButton aria-label="Refresh" onClick={() => attendanceHistory.refetch()}>
            <Refresh sx={{ width: 36, height: 36 }} />
          </IconButton>
        }
      />

      <Box sx={{ bgcolor: "#fff", p: 2 }}>
        <ListItemText
          primary="Attendance"
          secondary={`${attendanceHistory?.data?.length ?? 0} days`}
          slotProps={{
            primary: {
              fontSize: 20,
              fontWeight: "bold",
              // textAlign: "right",
            },
            secondary: {
              color: "#1976d2",
              fontWeight: "bold",
            },
          }}
        />

        <TableContainer
          component={Paper}
          sx={{ maxHeight: "70svh", overflowY: "auto" }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Present</TableCell>
                <TableCell>Absent</TableCell>
                <TableCell>Marked By</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendanceHistory.data &&
                attendanceHistory.data.map((attendance) => (
                  <TableRow key={attendance.date}>
                    <TableCell>
                      {dayjs(new Date(attendance.date)).format(
                        "Do MMMM, YYYY"
                      )}
                      <br />
                      <span style={{ color: "#1976d2", fontWeight: "bold" }}>
                        {dayjs(new Date(attendance.date)).format("dddd")}
                      </span>
                    </TableCell>
                    <TableCell>{attendance.present}</TableCell>
                    <TableCell>{attendance.absent}</TableCell>
                    <TableCell>
                      {attendance.createdBy?.id === user.id
                        ? "You"
                        : attendance.createdBy?.name}
                    </TableCell>
                    <TableCell>
                      {attendance.createdBy?.id === user.id && (
                        <IconButton
                          color="error"
                          onClick={() =>
                            handleDeleteAttendance(attendance?._id)
                          }
                        >
                          <DeleteOutlineRounded />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

              {/* Total Row */}
              <TableRow sx={{ fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                <TableCell>Total</TableCell>
                <TableCell>
                  {_.sumBy(attendanceHistory.data, "present")}
                </TableCell>
                <TableCell>
                  {_.sumBy(attendanceHistory.data, "absent")}
                </TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      {isPending && <LoadingSpinner value="Removing.Please Wait..." />}
    </Container>
  );
}
AttendanceHistory.propTypes = {
  open: PropTypes.bool,
  setOpen: PropTypes.func,
};

export default AttendanceHistory;
