import React, { useContext } from "react";
import Swal from "sweetalert2";
import { UserContext } from "@/context/providers/UserProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteCourse, getCourseByTeacher } from "@/api/courseAPI";
import {
  List,
  ListItem,
  Typography,
  ListItemText,
  IconButton,
  ListSubheader,
  Divider,
  Tooltip,
  Button,
} from "@mui/material";
import {  RefreshRounded } from "@mui/icons-material";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { useParams } from "react-router-dom";
import QueryError from "@/components/QueryError";
import LoadingSpinner from "@/components/spinners/LoadingSpinner";

function TeacherCourses() {
  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const { id } = useParams();
  const {
    session
  } = useContext(UserContext);

  const courses = useQuery({
    queryKey: ["courses", id],
    queryFn: () =>
      getCourseByTeacher({
        teacher: id,
        session: session?.sessionId,
        term: session?.termId,
      }),
  });

  //Delete Course
  const { mutate, isPending } = useMutation({
    mutationFn: deleteCourse,
  });

  const removeCourse = (_id) => {
    Swal.fire({
      title: "Remove",
      text: "Do you want to revoke course from teacher?",
      showCancelButton: true,
      backdrop:false
    }).then((data) => {
      if (data.isConfirmed) {
        mutate(_id, {
          onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["courses", id] });
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

  if (courses.isPending) {
    return <Typography>Loading Courses</Typography>;
  }
  if (courses.isError) {
    return <Typography>An error has occurred!</Typography>;
  }

  return (
    <>
      {courses.isError && (
        <QueryError what="the courses" error={courses.error} onRetry={() => courses.refetch()} />
      )}
      <List
        subheader={
          <ListSubheader
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 4,
            }}
          >
            <ListItemText
              primary="Assign Courses"
              secondary="List of assigned courses"
              primaryTypographyProps={{
                fontSize: 18,
                color: "var(--secondary)",
              }}
              sx={{
                py: 2,
              }}
            />
            <Tooltip title="Refresh Courses">
              <IconButton onClick={courses.refetch}>
                <RefreshRounded />
              </IconButton>
            </Tooltip>
            <Divider />
          </ListSubheader>
        }
        sx={{
          pt: 4,
        }}
      >
        {courses?.data?.length > 0 ? (
          courses?.data?.map((course) => (
            <ListItem
              key={course?._id}
              divider
              secondaryAction={
                <Button
                  title="Remove Course"
                  color="error"
                  onClick={() => removeCourse(course?._id)}
                >
                  Remove
                </Button>
              }
            >
              <ListItemText primary={course?.level} />
              <ListItemText primary={course?.subject?.name} />
            </ListItem>
          ))
        ) : (
          <Typography textAlign="center">No Course Available</Typography>
        )}
      </List>
      {isPending && <LoadingSpinner value="Removing Course.Please wait..." />}
    </>
  );
}

export default TeacherCourses;
