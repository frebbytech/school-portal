import React, { useContext } from "react";
import {
  Button,
  Drawer,
  IconButton,
  Stack,
  Typography,
  Tooltip,
} from "@mui/material";
import { AnimatePresence } from "framer-motion";
import { Close, NotificationsRounded, Refresh } from "@mui/icons-material";
import CustomNotificationItem from "../custom/CustomNotificationItem";
import { UserContext } from "@/context/providers/UserProvider";
import {
  useDeleteAllNotifications,
  useMarkAll,
  useNotifications,
} from "@/hooks/useNotifications";
import PropTypes from "prop-types";
import QueryError from "@/components/QueryError";

const NotificationDrawer = ({ open, setOpen }) => {
  const { user } = useContext(UserContext);
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
            <IconButton onClick={() => refetch()} aria-label="Refresh notifications">
              <Refresh />
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
          <span>
            <Button size="small" onClick={handleMarkAllAsRead} disabled={!data?.some((n) => n?.active) || markAllAsRead.isPending}>
              Mark all as read
            </Button>
          </span>

          <span>
            <Button size="small" onClick={handleRemoveAll} disabled={!data?.length || deleteNotification.isPending}>
              Clear All
            </Button>
          </span>
        </Stack>

        {isError ? (
          <Stack px={1.5}>
            <QueryError what="your notifications" error={error} onRetry={refetch} />
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
NotificationDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  setOpen: PropTypes.func.isRequired,
};

export default NotificationDrawer;
