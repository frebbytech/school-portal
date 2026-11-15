import React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { Box, Tooltip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getAllEvents } from "../../api/eventAPI";
import { useQuery } from "@tanstack/react-query";
import dayjs from "@/lib/dates";
import { useMediaQuery, useTheme } from "@mui/material";
import { Typography } from "@mui/material";
import { use } from "react";
import { UserContext } from "@/context/providers/UserProvider";
import { getAllHolidays } from "@/api/holidayAPI";
import _ from "lodash";

function CustomEvent() {
  const { session } = use(UserContext);
  const navigate = useNavigate();
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.up("md"));

  // const [anchorEl, setAnchorEl] = useState(null);
  // const [selectedEvent, setSelectedEvent] = useState(null);

  const events = useQuery({
    queryKey: ["events"],
    queryFn: () => getAllEvents(),
    initialData: [],
  });

  const holidays = useQuery({
    queryKey: ["holidays"],
    queryFn: () => getAllHolidays(""),
    initialData: [],
    select: (holidays) => {
      return holidays.map((holiday) => {
        return {
          title: holiday.name,
          start: holiday.date,
          end: holiday.date,
          type: "holiday",
        };
      });
    },
    // staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // const handleDateSelect = (selectInfo) => {
  //   // const { start, end } = selectInfo;
  //   // console.log("Selected range:", start, end);
  //   // Add any other logic you need here, such as updating state or making an API call
  // };
  // Handle mouse hover to open popover
  // const handleEventMouseEnter = (info) => {
  //   setAnchorEl(info.el);
  //   setSelectedEvent(info.event);
  // };

  // // Close the popover
  // const handleEventMouseLeave = () => {
  //   setAnchorEl(null);
  //   setSelectedEvent(null);
  // };

  const eventDetails = _.union(events?.data, holidays.data, [
    {
      _id: "1",
      title: `Start of ${session?.term} (${session?.academicYear})`,
      date: dayjs(new Date(session?.from)).format("YYYY-MM-DD"),
      color: theme?.palette?.error?.main,
    },
    {
      _id: "2",
      title: `MidTerm Examination Week`,
      start: dayjs(new Date(session?.exams?.midTermExams?.from)).format(
        "YYYY-MM-DD"
      ),
      end: dayjs(new Date(session?.exams?.midTermExams?.to)).format(
        "YYYY-MM-DD"
      ),
      color: theme?.palette?.info?.main,
    },
    {
      _id: "3",
      title: `Revision Week`,
      start: dayjs(new Date(session?.exams?.revisionWeek?.from)).format(
        "YYYY-MM-DD"
      ),
      end: dayjs(new Date(session?.exams?.revisionWeek?.to)).format(
        "YYYY-MM-DD"
      ),
      color: theme?.palette?.warning?.main,
    },
    {
      _id: "4",
      title: `Examination Week`,
      start: dayjs(new Date(session?.exams?.finalExams?.from)).format(
        "YYYY-MM-DD"
      ),
      end: dayjs(new Date(session?.exams?.finalExams?.to)).format(
        "YYYY-MM-DD"
      ),
      color: "teal",
    },
    {
      _id: "5",
      title: `End of ${session?.term} (${session?.academicYear})`,
      date: dayjs(new Date(session?.to)).format("YYYY-MM-DD"),
      color: theme?.palette?.success?.main,
    },
    {
      _id: "6",
      title: `Vacation Date for ${session?.term}`,
      date: dayjs(new Date(session?.vacationDate)).format("YYYY-MM-DD"),
      color: theme?.palette?.success?.main,
    },
  ]);

  return (
    <Box
      sx={{
        bgcolor: "#fff",
        borderRadius: 2,
        boxShadow: "0 2px 3px rgba(0,0,0,0.1)",
        p: 2,
      }}
    >
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
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
        initialDate={dayjs().format("YYYY-MM-DD")}
        events={eventDetails}
        eventBackgroundColor="var(--primary)"
        eventBorderColor="white"
        // eventTextColor="#333"
        eventContent={(eventInfo) => (
          <Tooltip
            slotProps={{
              tooltip: {
                sx: { fontSize: 14, textTransform: "uppercase" },
              },
            }}
            title={eventInfo?.event?.extendedProps?.type}
          >
            <Box
              sx={{
                cursor: "pointer",
                // width: "20ch",
                // whiteSpace: "wrap",
                // width: "12ch",
                // fontSize: "11px",
                px: 1,
                bgcolor:
                  eventInfo?.event?.extendedProps?.type === "holiday"
                    ? "var(--secondary)"
                    : null,
              }}
            >
              <Typography>{eventInfo?.event?.title}</Typography>
            </Box>
          </Tooltip>
        )}
        // eventMouseEnter={handleEventMouseEnter}
        // eventMouseLeave={handleEventMouseLeave}
        eventClick={({ event: { extendedProps } }) => {
          if (extendedProps?._id) {
            if (["1", "2", "3", "4", "5", "6"].includes(extendedProps?._id)) {
              return;
            }
            navigate(`/events/${extendedProps?._id}`);
          }
        }}
        loading={events.isPending || holidays.isPending}
      />

      {/* <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleEventMouseLeave}
      >
        {selectedEvent && (
          <Typography sx={{ p: 2 }}>
            <strong>{selectedEvent.title}</strong>
            <br />
            <strong>Date:</strong>{" "}
            {dayjs(selectedEvent.start).format("MMMM Do, YYYY")}
          </Typography>
        )}
      </Popover> */}
    </Box>
  );
}

export default CustomEvent;
