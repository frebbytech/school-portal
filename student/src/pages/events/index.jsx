// MoreEvents.tsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Pagination,
  IconButton,
  Stack,
  Container,
} from "@mui/material";
import dayjs from "dayjs";
import CustomTitle from "@/components/custom/CustomTitle";
import subject_ico from "../../assets/images/header/subject.svg";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAllEvents } from "@/api/eventAPI";
import moment from "moment";
import { RefreshRounded } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import EventSkeleton from "@/components/skeleton/EventSkeleton";
import EmptyDataContainer from "@/components/EmptyDataContainer";

const pageSize = 10;
const Events = () => {
  const [filter, setFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const {
    data: events,
    refetch,
    isPending,
    isLoading,
    onError,
  } = useQuery({
    queryKey: ["events"],
    queryFn: () => getAllEvents(),
    initialData: [],
  });

  const handleViewEvent = (id) => {
    navigate(`/events/${id}?redirect_to=/events`, {
      state: {
        prevPath: "/events",
      },
    });
  };
  const handleFilterChange = (event) => setFilter(event.target.value);
  const handleSearchChange = (event) =>
    setSearchTerm(event.target.value.toLowerCase());
  const handlePageChange = (_, value) => setPage(value);

  // Filter events based on date
  const filterEventsByDate = () => {
    const today = dayjs();
    switch (filter) {
      case "today":
        return events.filter((a) => dayjs(a?.createdAt).isSame(today, "day"));
      case "yesterday":
        return events.filter((a) =>
          dayjs(a?.createdAt).isSame(today.subtract(1, "day"), "day")
        );
      case "thisWeek":
        return events.filter((a) => dayjs(a?.createdAt).isSame(today, "week"));
      case "lastWeek":
        return events.filter((a) =>
          dayjs(a?.createdAt).isSame(today.subtract(1, "week"), "week")
        );
      case "thisMonth":
        return events.filter((a) => dayjs(a?.createdAt).isSame(today, "month"));
      case "lastMonth":
        return events.filter((a) =>
          dayjs(a?.createdAt).isSame(today.subtract(1, "month"), "month")
        );
      default:
        return events;
    }
  };

  // Apply both search and date filters
  const filteredEvents = filterEventsByDate().filter(
    (event) =>
      event.title.toLowerCase().includes(searchTerm) ||
      event.date.includes(searchTerm)
  );

  // Pagination Logic
  const paginatedEvents = filteredEvents.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  const totalPages = Math.ceil(filteredEvents.length / pageSize);

  return (
    <Container maxWidth="lg">
      <CustomTitle
        title="Events"
        subtitle="Organize and oversee exams, schedule, and results to ensure a fair and efficient examination process."
        img={subject_ico}
        color="primary.main"
        right={
          <IconButton onClick={refetch}>
            <RefreshRounded />
          </IconButton>
        }
      />
      {isPending || isLoading ? (
        <EventSkeleton />
      ) : onError ? (
        <p>Error</p>
      ) : (
        <>
          {/* MUI Select for Filtering */}
          <Box
            sx={{
              pt: 2,
              display: "flex",
              flexDirection: { xs: "column-reverse", sm: "row" },
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <TextField
              label="Search for event"
              variant="outlined"
              // size=''
              fullWidth
              value={searchTerm}
              onChange={handleSearchChange}
              sx={{ flexGrow: 1, maxWidth: { xs: "100%", sm: 300 } }}
            />
            <FormControl
              sx={{
                minWidth: 200,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <InputLabel>Sort by</InputLabel>
              <Select
                value={filter}
                onChange={handleFilterChange}
                // size="small"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="yesterday">Yesterday</MenuItem>
                <MenuItem value="thisWeek">This Week</MenuItem>
                <MenuItem value="lastWeek">Last Week</MenuItem>
                <MenuItem value="thisMonth">This Month</MenuItem>
                <MenuItem value="lastMonth">Last Month</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Events List */}
          <AnimatePresence>
            <Stack spacing={2} sx={{ height: "60svh", overflowY: "auto" }}>
              {paginatedEvents.length > 0 ? (
                paginatedEvents.map((event, index) => (
                  <Box key={event._id}>
                    <motion.div
                      initial={{ opacity: 0, x: -100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 100 }}
                      transition={{ duration: 0.3, delay: 0.1 * index }}
                    >
                      <Card
                        sx={{
                          borderRadius: "12px",
                          backgroundColor: event.bgColor,
                          cursor: "pointer",
                        }}
                        onClick={() => handleViewEvent(event._id)}
                      >
                        <CardContent>
                          <Typography variant="h6" fontWeight="bold">
                            {event.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            className="truncate-lines"
                          >
                            {event.caption.substring(0, 50) + "..."}
                          </Typography>

                          <Typography
                            variant="body2"
                            color="secondary"
                            textAlign="right"
                            width="100%"
                            mt={1}
                          >
                            {event.createdBy?.fullname}
                          </Typography>
                          <Typography
                            variant="body2"
                            textAlign="right"
                            width="100%"
                            color="textSecondary"
                            fontSize="12px"
                          >
                            {moment(event?.createdAt)?.format("LLL")}
                          </Typography>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Box>
                ))
              ) : (
                <EmptyDataContainer message="No event available." />
              )}
            </Stack>
          </AnimatePresence>

          {/* Pagination Component */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Pagination
              variant="outlined"
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        </>
      )}
    </Container>
  );
};

export default Events;
