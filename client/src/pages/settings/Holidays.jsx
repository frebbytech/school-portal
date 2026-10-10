import React, { use, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  FormControlLabel,
  IconButton,
  Modal,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { useMediaQuery, useTheme } from "@mui/material";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
// import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "@/theme/Calendar.css";
import { Add, CalendarMonth, Delete, Edit, ListAlt } from "@mui/icons-material";
import moment from "moment";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteHoliday,
  getAllHolidays,
  postHoliday,
  putHoliday,
} from "@/api/holidayAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";

const Holidays = () => {
  const { schoolSessionDispatch } = use(SchoolSessionContext);
  const queryClient = useQueryClient();

  const [toggleOption, setToggleOption] = useState("table");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState(new Date());
  const [isRecurring, setIsRecurring] = useState(false);

  //
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.up("md"));

  const holidays = useQuery({
    queryKey: ["holidays"],
    queryFn: () => getAllHolidays(""),
    initialData: [],
    // staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const createHoliday = useMutation({
    mutationFn: postHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries(["holidays"]);
      handleClose();
      schoolSessionDispatch(alertSuccess("New Holiday Added!"));
    },
    onError: (error) => {
      schoolSessionDispatch(alertError(error));
    },
  });

  const deleteHolidays = useMutation({
    mutationFn: deleteHoliday,
    onSuccess: () => {
      queryClient.invalidateQueries(["holidays"]);
      // queryClient.removeQueries(["holiday", deletedId]);
      schoolSessionDispatch(alertSuccess("Holiday Removed"));
    },
    onError: (error) => {
      schoolSessionDispatch(alertError(error));
    },
  });

  const updateHoliday = useMutation({
    mutationFn: putHoliday,
    onSuccess: (data) => {
      queryClient.invalidateQueries(["holidays"]);
      queryClient.setQueryData(["holidays", data._id], data);
      handleClose();
      schoolSessionDispatch(alertSuccess("Changes Saved!"));
    },
    onError: (error) => {
      schoolSessionDispatch(alertError(error));
    },
  });

  const handleToggleOption = (event, newToggleOption) => {
    setToggleOption(newToggleOption);
  };

  const handleViewHoliday = (holiday) => {
    setSelectedHoliday(holiday);
    setHolidayName(holiday.name);
    setHolidayDate(new Date(holiday.date));
    setIsRecurring(holiday.recurring);
    setIsModalOpen(true);
  };

  const handleSaveHoliday = async () => {
    const newHoliday = {
      name: holidayName,
      date: holidayDate,
      recurring: isRecurring,
    };

    await createHoliday.mutateAsync(newHoliday);
  };

  const handleEditHoliday = async () => {
    const newHoliday = {
      _id: selectedHoliday._id,
      name: holidayName,
      date: holidayDate,
      recurring: isRecurring,
    };

    await updateHoliday.mutateAsync(newHoliday);
  };

  const handleDeleteHoliday = async (id) => {
    await deleteHolidays.mutateAsync(id);
  };

  const resetForm = () => {
    setSelectedHoliday(null);
    setHolidayName("");
    setHolidayDate(new Date());
    setIsRecurring(false);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    resetForm();
  };
  return (
    <Container
      sx={{
        borderRadius: "12px",
        bgcolor: "#fff",
        p: 2,
      }}
    >
      <Box sx={{ placeSelf: "start", mb: 4 }}>
        <Typography variant="h6" color="primary">
          Holidays
        </Typography>
        <Typography variant="caption" color="text.secondary" fontStyle="italic">
          Manage school holidays and recurring events.
        </Typography>
        <Divider />
      </Box>

      {/* Add/Edit Holiday Modal */}
      <Modal open={isModalOpen} onClose={handleClose}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 2,
            borderRadius: 2,
            width: { xs: 300, md: 500 },
          }}
        >
          <h2>{selectedHoliday ? "Edit Holiday" : "Add Holiday"}</h2>
          <form>
            <Stack direction="column" py={2}>
              <TextField
                fullWidth
                size="small"
                id="name"
                name="name"
                label="Holiday Name"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                sx={{ mb: 3 }}
              />
              {/* Calendar View */}
              {/* <div className="calendar-container">
                <Calendar
                  onChange={setDate}
                  value={date}
                  onClickDay={handleDateClick}
                  tileClassName={({ date }) =>
                    holidays?.data.some(
                      (h) =>
                        new Date(h.date).toDateString() === date.toDateString()
                    )
                      ? "highlight"
                      : ""
                  }
                />
              </div> */}
              <TextField
                fullWidth
                size="small"
                id="name"
                name="name"
                label="Date"
                type="date"
                value={holidayDate.toISOString().split("T")[0]}
                onChange={(e) => setHolidayDate(new Date(e.target.value))}
                required
                sx={{ mb: 3 }}
              />

              <FormControlLabel
                label="Recurring Holiday"
                control={
                  <Checkbox
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                  />
                }
              />
            </Stack>
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button onClick={handleClose}>Cancel</Button>
              {selectedHoliday ? (
                <Button
                  variant="contained"
                  loading={updateHoliday.isPending}
                  onClick={handleEditHoliday}
                >
                  Save Changes
                </Button>
              ) : (
                <Button
                  variant="contained"
                  loading={createHoliday.isPending}
                  onClick={handleSaveHoliday}
                >
                  Save
                </Button>
              )}
            </Box>
          </form>
        </Box>
      </Modal>

      {/* List of Holidays */}
      <div className="holiday-list">
        <Box sx={{ display: "flex", justifyContent: "space-between", pb: 2 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Holiday
          </Button>
          <ToggleButtonGroup
            value={toggleOption}
            exclusive
            onChange={handleToggleOption}
            aria-label="toggle table"
          >
            <Tooltip placement="top" title="Table View">
              <ToggleButton value="table" aria-label="table view">
                <ListAlt />
              </ToggleButton>
            </Tooltip>
            <Tooltip placement="top" title="Calendar View">
              <ToggleButton value="calendar" aria-label="calendar view">
                <CalendarMonth />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Box>
        <h2>Holidays</h2>
        <p>List of selected holidays</p>
        {toggleOption === "table" && (
          <TableContainer
            component={Paper}
            // sx={{ width: { xs: 100, md: "100%" } }}
            sx={{ width: { xs: 300, sm: "100%" }, overflowX: "auto" }}
          >
            <Table
              // sx={{ minWidth: 650 }}
              stickyHeader
              aria-label="table"
            >
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Recurring</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {holidays?.data.map((holiday) => (
                  <TableRow
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    key={holiday._id}
                  >
                    <TableCell>{holiday.name}</TableCell>
                    <TableCell>
                      {moment(new Date(holiday.date)).format(
                        "dddd,Do MMMM YYYY"
                      )}
                    </TableCell>
                    <TableCell>{holiday.recurring ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleViewHoliday(holiday)}>
                        <Edit />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteHoliday(holiday._id)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {toggleOption === "calendar" && (
          <Box>
            <FullCalendar
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                interactionPlugin,
                listPlugin,
              ]}
              initialView="listWeek"
              headerToolbar={{
                left: matches ? "prev,next,today" : "prev,next",
                center: "title",
                right: matches
                  ? "dayGridMonth,timeGridWeek,timeGridDay,listWeek"
                  : "",
              }}
              editable={true}
              selectable={true}
              // select={handleDateSelect}
              selectMirror={true}
              dayMaxEvents={true}
              initialDate={moment().format("YYYY-MM-DD")}
              events={holidays?.data}
              // eventBackgroundColor="transparent"
              // eventBorderColor="white"
              // eventTextColor="#333"
              eventContent={(eventInfo) => (
                <Box
                  sx={{
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    // width: "20ch",
                    whiteSpace: "wrap",
                    pl: 1,
                  }}
                >
                  <strong>{eventInfo?.event?.extendedProps?.name}</strong>

                  <Box>
                    <IconButton
                      onClick={() =>
                        handleViewHoliday({
                          id: eventInfo.event.id,
                          date: eventInfo.event.start,
                          ...eventInfo?.event?.extendedProps,
                        })
                      }
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      onClick={() =>
                        handleDeleteHoliday(eventInfo.event?.extendedProps?._id)
                      }
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                  {/* <strong>{JSON.stringify(eventInfo?.event)}</strong> */}
                </Box>
              )}
            />
          </Box>
        )}
      </div>
    </Container>
  );
};

export default Holidays;
