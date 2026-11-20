import React from "react";
import {
  Alert,
  Button,
  Drawer,
  IconButton,
  Stack,
  Typography,
  Tooltip,
} from "@mui/material";
import _ from "lodash";
import { AnimatePresence } from "framer-motion";
import { Close, NotificationsRounded, Refresh } from "@mui/icons-material";
import CustomNotificationItem from "../custom/CustomNotificationItem";
import {
  useDeleteAllNotifications,
  useMarkAll,
  useNotifications,
} from "@/hooks/useNotifications";
import { useAuth } from "@/context/AuthProvider";
import { errorMessage } from "@/lib/errorMessage";

const NotificationDrawer = ({ open, setOpen }) => {
  const { user } = useAuth();
  // console.log(user);
  const { data, refetch, isPending, isError, error } = useNotifications();
  const markAllAsRead = useMarkAll();
  const deleteNotification = useDeleteAllNotifications();
  const handleClose = () => setOpen(false);

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate(user?.id);
  };
  const handleRemoveAll = () => {
    deleteNotification.mutate(user?.id);
  };


  return (
    <Drawer
      open={open}
      onClose={handleClose}
      sx={{ zIndex: 99999999 }}
      anchor="right"
    >
      <Stack
        sx={{
          minHeight: "100vh",
          width: "100%",
          minWidth: { xs: 300, md: 500 },
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          pb: 1,
        }}
        // bgcolor="secondary.main"
        spacing={1}
      >
        <Stack
          // bgcolor="secondary.main"
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          p={1}
        >
          <Stack
            direction="row"
            sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}
            spacing={1}
          >
            <NotificationsRounded />
            <Typography variant="body1"> Notifications</Typography>
          </Stack>

          <Tooltip title="Refresh Notifications">
            <IconButton>
              <Refresh onClick={() => refetch()} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton onClick={handleClose}>
              <Close />
            </IconButton>
          </Tooltip>
        </Stack>
        <Stack
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
          spacing={1}
        >
          <Tooltip title="Mark all">
            <Button size="small" onClick={handleMarkAllAsRead}>
              Mark all as read
            </Button>
          </Tooltip>

          <Tooltip title="Clear All">
            <Button size="small" onClick={handleRemoveAll}>
              Clear All
            </Button>
          </Tooltip>
        </Stack>

        {isError ? (
          <Stack px={1.5}>
            <Alert
              severity="error"
              role="alert"
              action={
                <Button color="inherit" size="small" onClick={() => refetch()}>
                  Try again
                </Button>
              }
            >
              {`Could not load your notifications. ${errorMessage(error, "")}`.trim()}
            </Alert>
          </Stack>
        ) : isPending ? (
          <Stack height="80svh" justifyContent="center" alignItems="center">
            <Typography>Loading notifications...</Typography>
          </Stack>
        ) : data?.length === 0 ? (
          <Stack
            spacing={2}
            height="80svh"
            justifyContent="center"
            alignItems="center"
            overflow="auto"
          >
            <Typography>No new Notifications</Typography>
          </Stack>
        ) : (
          <AnimatePresence>
            <Stack spacing={1} height="90svh" overflow="auto" px={1.5}>
              {data?.map((notification, index) => {
                return (
                  <CustomNotificationItem
                    key={notification?._id}
                    {...notification}
                    closeDrawer={setOpen}
                    index={index}
                  />
                );
              })}
            </Stack>
          </AnimatePresence>
        )}

        <Typography variant="caption" textAlign="center">
          Frebby Tech Consults &copy; {new Date().getFullYear()}
        </Typography>
      </Stack>
    </Drawer>
  );
};

export default NotificationDrawer;
