import React from "react";
import { Box, Typography, Card, CardContent, Stack } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import _ from "lodash";
import { getAllEvents } from "@/api/eventAPI";
import { useQuery } from "@tanstack/react-query";
import dayjs from "@/lib/dates";

const Event = () => {
  const navigate = useNavigate();

  const { data: events } = useQuery({
    queryKey: ["events"],
    queryFn: () => getAllEvents(),
    initialData: [],
  });

  const handleOpenModal = (id) => {
    navigate(`/events/${id}`);
  };

  return (
    <Box>
      {events.length !== 0 ? (
        <>
          <Stack spacing={2} sx={{ minHeight: 400 }}>
            {_.take(events, 5).map((event) => (
              <Card
                key={event?._id}
                sx={{
                  borderTop: `2px solid #d4edda`,
                  borderRadius: 2,
                  cursor: "pointer",
                }}
                onClick={() => handleOpenModal(event._id)}
              >
                <CardContent>
                  <Typography variant="body1" fontWeight="bold">
                    {event.title}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {dayjs(event.createdAt).format("D MMMM, YYYY")}
                  </Typography>
                  <Typography variant="caption" display="block" mt={1}>
                    {event.caption}...
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>

          {/* View More Button */}
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Link
              to="/events"
              style={{ fontSize: "12px", color: "var(--primary-color)" }}
            >
              View More
            </Link>
          </Box>
        </>
      ) : (
        <Stack
          sx={{ minHeight: 250 }}
          justifyContent="center"
          alignItems="center"
        >
          <Typography>No Events </Typography>
        </Stack>
      )}
    </Box>
  );
};

export default Event;
