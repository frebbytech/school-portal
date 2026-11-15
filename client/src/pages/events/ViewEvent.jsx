import {
  Container,
  Box,
  Typography,
  Avatar,
  Divider,
  Stack,
  Chip,
} from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import React from "react";
import { EMPTY_IMAGES } from "../../config/images";
import { getEvent } from "../../api/eventAPI";
import dayjs from "@/lib/dates";
import CustomTitle from "@/components/custom/CustomTitle";

function ViewEvent() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { id } = useParams();

  const event = useQuery({
    queryKey: ["event", id],
    queryFn: () => getEvent(id),
    initialData: queryClient
      .getQueryData(["events", id])
      ?.find((event) => event?._id === id),
    enabled: !!id,
  });

  const data = event?.data;

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <CustomTitle
        title={data?.title || "Event"}
        subtitle={data?.caption || ""}
        showBack={true}
        to={searchParams.get("redirect_to") || "/"}
      />

      {/* Hero Section */}
      <Box
        sx={{
          position: "relative",
          height: { xs: 280, md: 400 },
          borderRadius: 3,
          overflow: "hidden",
          mb: 4,
          background: `url(${
            data?.album || EMPTY_IMAGES?.level
          }) center/cover no-repeat`,
        }}
      >
        {/* Overlay */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            color: "white",
            px: 2,
          }}
        >
          <Box>
            <Typography
              variant="h3"
              component="h1"
              sx={{ fontWeight: 700, mb: 2 }}
            >
              {data?.title}
            </Typography>
            <Typography
              variant="h6"
              component="p"
              sx={{ maxWidth: "700px", mx: "auto", opacity: 0.9 }}
            >
              {data?.caption}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Author + Meta */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        mb={4}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: "primary.main" }}>
            {data?.createdBy?.fullname?.[0]}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {data?.createdBy?.fullname}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {dayjs(data?.createdAt).format("MMMM D, YYYY • h:mm A")}
            </Typography>
          </Box>
        </Stack>

        <Chip
          label="Event Details"
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      </Stack>

      <Divider sx={{ mb: 4 }} />

      {/* Content */}
      <Box
        sx={{
          typography: "body1",
          lineHeight: 1.8,
          fontSize: "1.05rem",
          "& img": {
            maxWidth: "100%",
            borderRadius: 2,
            my: 3,
          },
          "& h2, & h3, & h4": {
            mt: 4,
            mb: 2,
            fontWeight: 600,
          },
          "& p": {
            mb: 2,
          },
        }}
        dangerouslySetInnerHTML={{ __html: data?.description }}
      />
    </Container>
  );
}

export default ViewEvent;
