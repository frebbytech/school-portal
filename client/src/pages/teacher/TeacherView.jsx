import {
  DeleteRounded,
  Edit,
  ListAlt,
  MessageRounded,
  Person,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  ButtonGroup,
  Container,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Swal from "sweetalert2";
import React, { useContext } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { deleteTeacher, getTeacher } from "@/api/teacherAPI";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";

import TeacherProfile from "./TeacherProfile";
import CustomTitle from "@/components/custom/CustomTitle";
import Back from "@/components/Back";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";
// import Back from "@/components/Back";

const TeacherView = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { breakpoints } = useTheme();
  const matches = useMediaQuery(breakpoints.up("sm"));

  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  const teacher = useQuery({
    queryKey: ["teacher", id],
    queryFn: () => getTeacher(id),
    initialData: queryClient
      .getQueryData(["teachers", id])
      ?.find((teacher) => teacher?._id === id),
    enabled: !!id,
  });

  //EDIT Teacher Info
  const editTeacherInfo = () => {
    navigate(`/teacher/${id}/edit`);
  };

  //DELETE Teacher Info

  const { mutate, isPending } = useMutation({
    mutationFn: deleteTeacher,
  });

  const handleDelete = () => {
    Swal.fire({
      title: "Deleting Teacher",
      text: "Do you want to delete?",
      showCancelButton: true,
      backdrop: false,
    }).then((data) => {
      if (data.isConfirmed) {
        mutate(id, {
          onSuccess: (data) => {
            navigate(`/teachers`);
            queryClient.invalidateQueries({ queryKey: ["teachers"] });
            schoolSessionDispatch(alertSuccess(data));
          },
          onError: (error) => {
            schoolSessionDispatch(alertError(error));
          },
        });
      }
    });
  };

  //OPEN Quick Message
  //CLOSE
  const openQuickMessage = () => {
    schoolSessionDispatch({
      type: "sendQuickMessage",
      payload: {
        open: true,
        data: {
          email: teacher?.data?.email,
          phonenumber: teacher?.data?.phonenumber,
        },
      },
    });
  };

  //Assign Level
  const goToAssignLevel = () => {
    navigate("levels");
  };
  //Assign Course
  const goToAssignCourse = () => {
    navigate(`courses`);
  };

  return (
    <>
      <Container>
        <Back to={-1} color="primary.main" />
        <CustomTitle
          title="Teacher Information"
          subtitle="Manage teachers profile and assigned levels and courses"
          color="primary.main"
        />

        <Box
          sx={{
            bgcolor: "#fff",
            borderRadius: "12px",
            py: 4,
            px: 2,
            my: 2,
          }}
        >
          <Typography variant="h5">Profile</Typography>
          <Stack>
            <Button
              sx={{ alignSelf: "flex-end" }}
              endIcon={<Edit />}
              onClick={editTeacherInfo}
            >
              Edit
            </Button>
          </Stack>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              justifyContent: { xs: "center", md: "space-evenly" },
              alignItems: { xs: "center", md: "start" },
              gap: 2,
            }}
          >
            <Stack alignItems={{ xs: "center", md: "start" }} spacing={1}>
              <Box
                sx={{
                  p: 1,
                  border: "1px solid lightgray",
                  borderRadius: "50%",
                }}
              >
                <Avatar
                  src={teacher?.data?.profile}
                  sx={{
                    width: { xs: 120, md: 200 },
                    height: { xs: 120, md: 200 },
                  }}
                />
              </Box>

              <Typography variant="h5">{teacher?.data?.fullname}</Typography>
              <Button startIcon={<MessageRounded />} onClick={openQuickMessage}>
                Send Message
              </Button>

              <ButtonGroup
                variant="contained"
                sx={{
                  display: "flex",
                  gap: 1,
                }}
              >
                {matches ? (
                  <>
                    <Button
                      color="secondary"
                      endIcon={<Person />}
                      // onClick={() => setOpenTeacherAssignLevel(true)}
                      onClick={goToAssignLevel}
                    >
                      Assign Level
                    </Button>
                    <Button
                      color="primary"
                      endIcon={<Person />}
                      // onClick={openAssignCourse}
                      onClick={goToAssignCourse}
                    >
                      Assign Course
                    </Button>
                  </>
                ) : (
                  <>
                    <Tooltip title="Assign Level">
                      <IconButton color="secondary" onClick={goToAssignLevel}>
                        <ListAlt />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title=" Assign Course">
                      <IconButton color="primary" onClick={goToAssignCourse}>
                        <Person />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </ButtonGroup>
            </Stack>
            <Stack spacing={2}>
              <TeacherProfile teacher={teacher?.data} />
              <Divider />
              <Button
                color="error"
                variant="contained"
                endIcon={<DeleteRounded />}
                onClick={handleDelete}
              >
                Remove Account
              </Button>
            </Stack>
          </Box>
        </Box>
      </Container>
      {isPending && <LoadingSpinner value="Removing Facilitator Information" />}
    </>
  );
};

export default React.memo(TeacherView);
