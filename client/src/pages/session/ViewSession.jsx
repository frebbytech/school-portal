import React from "react";
import dayjs from "@/lib/dates";
import {
  Stack,
  Typography,
  Container,
  TextField,
  Button,
  FormControl,
  Box,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTerm } from "@/api/termAPI";

import CustomTitle from "@/components/custom/CustomTitle";
import Edit from "@mui/icons-material/Edit";
import CustomFormControl from "@/components/inputs/CustomFormControl";

const ViewSession = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: ["terms/:id", id],
    queryFn: () => getTerm(id),
    initialData: queryClient
      .getQueryData(["terms"])
      ?.find((term) => term?.termId === id),
    enabled: !!id,
  });

  //Edit session
  const handleEditSession = () => {
    navigate("edit");

    // setSearchParams((params) => {
    //   params.set("_id", id);
    //   params.set("edit_session", true);

    //   return params;
    // });
  };

  return (
    <Container>
      <CustomTitle
        title={`${session?.data?.core?.academicYear},${session?.data?.core?.term}`}
        subtitle="Create, update, and oversee academic sessions to ensure smooth academic operations"
        // img={session_icon}
        color="primary.main"
        showBack={true}
        to={-1}
        right={
          <Button
            startIcon={<Edit />}
            sx={{ bgcolor: "rgba(1, 46, 84,0.1)" }}
            onClick={handleEditSession}
          >
            Edit Session
          </Button>
        }
      />
      {session?.isPending ? (
        <p>Please Wait..</p>
      ) : (
        <>
          <Container
            sx={{
              bgcolor: "#fff",
              py: 4,
              mb: 2,
            }}
          >
            <Typography variant="h5">Basic Session Details</Typography>
            <Stack spacing={2} paddingY={2}>
              <TextField
                label="Academic Year"
                value={session?.data?.core?.academicYear}
                InputProps={{ readOnly: true }}
                fullWidth
                margin="normal"
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />
              <TextField
                label="Term/Semester"
                value={session?.data?.core?.term}
                InputProps={{ readOnly: true }}
                fullWidth
                margin="normal"
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />

              <Typography fontSize={13}>Academic Session</Typography>

              <PreviewField
                label="Start of Academic Term/Semester"
                value={new Date(session?.data?.core?.from)}
              />

              <PreviewField
                label="End of Academic Term/Semester"
                value={new Date(session?.data?.core?.to)}
              />

              <Typography fontSize={13}>Vacation</Typography>

              <PreviewField
                label="Vacation Date"
                value={new Date(session?.data?.core?.vacationDate)}
              />

              <PreviewField
                label="Next Term Begins"
                value={new Date(session?.data?.core?.reOpeningDate)}
              />
            </Stack>
          </Container>

          {/* Exams  */}
          <Container
            sx={{
              bgcolor: "#fff",
              py: 4,
              mb: 2,
            }}
          >
            <Typography variant="h5">Exam & Assessment</Typography>
            <Stack paddingY={1}>
              <FormControl>
                <Typography variant="body2">Mid Term Examination</Typography>
                <CustomFormControl>
                  <PreviewField
                    label="From"
                    value={new Date(session?.data?.exams?.midTermExams?.from)}
                  />
                  <PreviewField
                    label="To"
                    value={new Date(session?.data?.exams?.midTermExams?.to)}
                  />
                </CustomFormControl>
              </FormControl>

              <FormControl>
                <Typography variant="body2">Revision Week</Typography>
                <CustomFormControl>
                  <PreviewField
                    label="From"
                    value={new Date(session?.data?.exams?.revisionWeek?.from)}
                  />
                  <PreviewField
                    label="To"
                    value={new Date(session?.data?.exams?.revisionWeek?.to)}
                  />
                </CustomFormControl>
              </FormControl>

              <FormControl>
                <Typography variant="body2">Examination Week</Typography>
                <CustomFormControl>
                  <PreviewField
                    label="From"
                    value={new Date(session?.data?.exams?.finalExams?.from)}
                  />
                  <PreviewField
                    label="To"
                    value={new Date(session?.data?.exams?.finalExams?.to)}
                  />
                </CustomFormControl>
              </FormControl>
            </Stack>
          </Container>

          {/* Headmaster  */}
          <Container
            sx={{
              bgcolor: "#fff",
              py: 4,
              mb: 2,
            }}
          >
            <Typography variant="h5">Head Master</Typography>
            <Stack direction={{ xs: "column", md: "row" }} width="100%" gap={3}>
              <Stack spacing={2} paddingY={2} flexGrow={1}>
                <PreviewField
                  label="Full Name"
                  value={session?.data?.headmaster?.name}
                />
                <PreviewField
                  label="Contact"
                  value={session?.data?.headmaster?.phone}
                />
              </Stack>
              <Box border="1px solid var(--primary)" p={2}>
                <Typography textAlign="center">
                  Headmaster&apos;s Signature
                </Typography>
                <img
                  alt="headmaster's signature"
                  src={session?.data?.headmaster?.signature}
                  style={{
                    maxWidth: "100%",
                    width: 200,
                    height: 200,
                    objectFit: "contain",
                    aspectRatio: "1/1",
                  }}
                />
              </Box>
            </Stack>
          </Container>

          {/* Report  */}
          <Container
            sx={{
              bgcolor: "#fff",
              py: 4,
              mb: 2,
            }}
          >
            <Typography variant="h5">Report Customization</Typography>
            <Stack spacing={2} paddingY={2}>
              <PreviewField
                label="Report"
                value={session?.data?.report?.template}
              />
              <PreviewField
                label="Dimension"
                value={session?.data?.report?.dimension}
              />
            </Stack>
          </Container>
        </>
      )}
    </Container>
  );
};

const PreviewField = ({ label, value }) => {
  return (
    <TextField
      label={label}
      value={
        typeof value === "object"
          ? dayjs(value)?.format("Do MMMM YYYY")
          : value
      }
      InputProps={{ readOnly: true }}
      fullWidth
      margin="normal"
      size="small"
      slotProps={{
        inputLabel: {
          shrink: true,
        },
      }}
    />
  );
};

export default ViewSession;
