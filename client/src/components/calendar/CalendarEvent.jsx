import { Popover, Typography } from "@mui/material";
import dayjs from "@/lib/dates";
import React,{ useState } from "react";

function CalendarEvent({ timeText, event }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Handle mouse hover to open popover
  const handleEventMouseEnter = (info) => {
    setAnchorEl(info.el);
    setSelectedEvent(event);
  };

  // Close the popover
  const handleEventMouseLeave = () => {
    setAnchorEl(null);
    setSelectedEvent(null);
  };

  return (
    <div>
      <div>
        {/* <p>{timeText}</p> */}
        <p
          onMouseEnter={handleEventMouseEnter}
          onMouseLeave={handleEventMouseLeave}
          style={{
            textTransform: "uppercase",
            // whiteSpace: "wrap",
            // width: "30px",
          }}
        >
          {event?.title}
        </p>
      </div>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleEventMouseLeave}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        {selectedEvent && (
          <Typography sx={{ p: 2 }}>
            <strong>{selectedEvent.title}</strong>
            <br />
            <strong>Date:</strong>{" "}
            {dayjs(selectedEvent.start).format("MMMM Do, YYYY")}
          </Typography>
        )}
      </Popover>
    </div>
  );
}

export default CalendarEvent;
