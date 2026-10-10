// MoreAnnouncements.tsx
import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Modal,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Pagination,
  Checkbox,
  Stack,
  Container,
  IconButton,
} from "@mui/material";

import dayjs from "dayjs";
import { AnimatePresence, motion } from "framer-motion";
import CustomTitle from "@/components/custom/CustomTitle";
import { useQuery } from "@tanstack/react-query";
import { getAllAnnouncements } from "@/api/announcementAPI";
import { useSearchParams } from "react-router-dom";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useAuth } from "@/context/AuthProvider";
import EmptyDataContainer from "@/components/EmptyDataContainer";
import announcement_ico from "../../assets/images/header/sms_ico.svg";
import { RefreshRounded } from "@mui/icons-material";
import EventSkeleton from "@/components/skeleton/EventSkeleton";

const pageSize = 10;
const Announcements = () => {
  const [selectedColor, setSelectedColor] = useLocalStorage(
    "announcement-text",
    "#333"
  );
  const { user } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("_title") || ""
  );
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedAnnouncements, setSelectedAnnouncements] = useState([]);

  const {
    data: announcements,
    refetch,
    isPending,
  } = useQuery({
    queryKey: ["announcements", user?._id],
    queryFn: getAllAnnouncements,
    initialData: () => [],
    enabled: !!user?._id,
  });

  const handleCloseModal = () => setSelectedAnnouncement(null);
  const handleFilterChange = (event) => setFilter(event.target.value);
  const handleSearchChange = (event) =>
    setSearchTerm(event.target.value.toLowerCase());
  const handlePageChange = (_, value) => setPage(value);

  if (isPending) {
    return (
      <Container maxWidth="lg">
        <CustomTitle
          title="Announcements"
          subtitle="Organize and oversee exams, schedule, and results to ensure a fair and efficient examination process."
          img={announcement_ico}
          color="primary.main"
        />
        <EventSkeleton />
      </Container>
    );
  }

  const sortedAnnouncement = useMemo(() => {
    const filterAnnouncementsByDate = () => {
      const today = dayjs();
      switch (filter) {
        case "today":
          return announcements.filter((a) =>
            dayjs(a.createdAt).isSame(today, "day")
          );
        case "yesterday":
          return announcements.filter((a) =>
            dayjs(a.createdAt).isSame(today.subtract(1, "day"), "day")
          );
        case "thisWeek":
          return announcements.filter((a) =>
            dayjs(a.createdAt).isSame(today, "week")
          );
        case "lastWeek":
          return announcements.filter((a) =>
            dayjs(a.createdAt).isSame(today.subtract(1, "week"), "week")
          );
        case "thisMonth":
          return announcements.filter((a) =>
            dayjs(a.createdAt).isSame(today, "month")
          );
        case "lastMonth":
          return announcements.filter((a) =>
            dayjs(a.createdAt).isSame(today.subtract(1, "month"), "month")
          );
        default:
          return announcements;
      }
    };

    // Apply both search and date filters
    const filteredAnnouncements = filterAnnouncementsByDate().filter(
      (announcement) =>
        announcement.title.toLowerCase().includes(searchTerm) ||
        announcement.createdAt.includes(searchTerm)
    );

    // Pagination Logic
    const paginatedAnnouncements = filteredAnnouncements.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

    const totalPages = Math.ceil(filteredAnnouncements.length / pageSize);

    return {
      announcements: paginatedAnnouncements,
      total: filteredAnnouncements.length,
      totalPages,
    };
  }, [announcements, searchTerm, filter, page]);
  // Filter announcements based on date

  // Toggle checkbox selection
  const handleSelect = (id) => {
    setSelectedAnnouncements((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <Container maxWidth="lg">
      <CustomTitle
        title="Announcements"
        subtitle="Organize and oversee exams, schedule, and results to ensure a fair and efficient examination process."
        img={announcement_ico}
        color="primary.main"
        right={
          <IconButton onClick={refetch}>
            <RefreshRounded />
          </IconButton>
        }
      />

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
          label="Search for announcement"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ flexGrow: 1, maxWidth: { xs: "100%", sm: 300 } }}
          // size="small"
        />

        <FormControl
          sx={{
            minWidth: 200,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <InputLabel>Sort by</InputLabel>
          <Select value={filter} onChange={handleFilterChange}>
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
      {/* <Stack
        width="100%"
        alignItems="center"
        justifyContent="flex-end"
        direction="row"
        p={2}
        spacing={2}
      >
        <ToggleButtonGroup
          value={selectedColor}
          exclusive
          onChange={(e, value) => setSelectedColor(value)}
          aria-label="color palette"
          sx={{
            mt: 6,
          }}
        >
          <ToggleButton
            value="#fff"
            sx={{
              backgroundColor: "#fff",
              color: "#000",
            }}
          >
            White
          </ToggleButton>
          <ToggleButton
            value="#333"
            sx={{
              backgroundColor: "#ccc",
              color: "#333",
            }}
          >
            Gray
          </ToggleButton>
          <ToggleButton
            value="#000"
            sx={{
              bgcolor: "#000",
              color: "#fff",
            }}
          >
            Black
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack> */}

      {/* Announcements List */}
      {selectedAnnouncements.length > 0 && (
        <Typography gutterBottom p={2} bgcolor="lightgray">
          {selectedAnnouncements.length} Announcements Selected
        </Typography>
      )}
      <AnimatePresence>
        <Stack
          spacing={2}
          sx={{ minHeight: "50svh", mb: 10, overflowY: "auto" }}
        >
          {sortedAnnouncement.announcements.length > 0 ? (
            sortedAnnouncement.announcements.map((announcement, index) => (
              <Box key={announcement._id}>
                <motion.div
                  initial={{ opacity: 0, x: -100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  transition={{ duration: 0.3, delay: 0.1 * index }}
                >
                  <Card
                    sx={{
                      backgroundColor: announcement.bgColor,
                      borderRadius: "12px",
                      cursor: "pointer",
                      position: "relative",
                      overflow: "hidden",
                      "&:hover": { boxShadow: 6 },
                    }}
                  >
                    {/* Checkbox for selection */}
                    {user?.role === "administrator" && (
                      <Checkbox
                        checked={selectedAnnouncements.includes(
                          announcement._id
                        )}
                        onChange={() => handleSelect(announcement._id)}
                        sx={{ position: "absolute", top: 8, left: 8 }}
                      />
                    )}
                    <CardContent sx={{ px: 8 }}>
                      <Typography
                        variant="h6"
                        fontWeight="bold"
                        color={selectedColor}
                      >
                        {announcement.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {dayjs(announcement.createdAt).format("D MMMM, YYYY")}
                      </Typography>
                      <Typography variant="body2" mt={1} color={selectedColor}>
                        {announcement.description}
                      </Typography>
                    </CardContent>
                    {/* Show Edit and Delete Icons on Hover */}
                  </Card>
                </motion.div>
              </Box>
            ))
          ) : (
            <EmptyDataContainer message="No announcements found." />
          )}
        </Stack>
      </AnimatePresence>

      {/* Pagination Component */}
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <Pagination
          variant="outlined"
          count={sortedAnnouncement.totalPages}
          page={page}
          onChange={handlePageChange}
          color="primary"
        />
      </Box>

      {/* Announcement Details Modal */}
      <Modal open={Boolean(selectedAnnouncement)} onClose={handleCloseModal}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          {selectedAnnouncement && (
            <>
              <Typography variant="h6" fontWeight="bold">
                {selectedAnnouncement.title}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {selectedAnnouncement.date}
              </Typography>
              <Typography variant="body1" mt={2}>
                {selectedAnnouncement.description}
              </Typography>
              <Box sx={{ textAlign: "right", mt: 2 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleCloseModal}
                >
                  Close
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </Container>
  );
};

export default Announcements;
