import {
  Button,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Typography,
  IconButton,
  Divider,
  Tooltip,
} from "@mui/material";
import Swal from "sweetalert2";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import React, { useContext, useMemo } from "react";
import { RefreshRounded } from "@mui/icons-material";
import useLevel from "@/components/hooks/useLevel";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { unassignTeacherLevel } from "@/api/levelAPI";
import { UserContext } from "@/context/providers/UserProvider";

function TeacherLevels() {
  const {
    session
  } = useContext(UserContext);
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();
  const { id } = useParams();
  const { levelsOption } = useLevel();

  const assigned = useMemo(() => {
    return levelsOption?.filter((level) => level?.teacher?._id === id);
  }, [levelsOption, id]);

  //UNASSIGN Teacher from level
  const { mutate: unassignTeacher } = useMutation({
    mutationFn: unassignTeacherLevel,
  });
  const handleUnassignTeacher = (id) => {
    Swal.fire({
      title: "Unassign Teacher",
      text: "Do you want to unassign teacher from this level?",
      showCancelButton: true,
      backdrop: false,
    }).then((data) => {
      if (data.isConfirmed) {
        unassignTeacher(id, {
          onSettled: () => {
            queryClient.invalidateQueries({
              queryKey: ["levels", session.sessionId, session.termId],
            });
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

  return (
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
            primary="Assign Levels"
            secondary="List of assigned levels"
            primaryTypographyProps={{
              fontSize: 18,
              color: "var(--secondary)",
            }}
            sx={{
              py: 2,
            }}
          />
          <Tooltip title="Refresh Levels">
            <IconButton>
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
      {assigned?.length > 0 ? (
        assigned?.map((level) => (
          <ListItem
            key={level?._id}
            divider
            secondaryAction={
              <Button
                title="Remove Level"
                color="error"
                onClick={() => handleUnassignTeacher(level?._id)}
              >
                Remove
              </Button>
            }
          >
            <ListItemText primary={level?.type} />
          </ListItem>
        ))
      ) : (
        <Typography>No data available</Typography>
      )}
    </List>
  );
}

export default TeacherLevels;
