import { useContext } from "react";
import {
  deleteNotification,
  markAllNotificationAsRead,
  markNotificationAsRead,
  deleteNotifications,
  getAllNotifications,
} from "@/api/notificationAPI";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { SchoolSessionContext } from "@/context/providers/SchoolSessionProvider";
import { alertError, alertSuccess } from "@/context/actions/globalAlertActions";
import { useAuth } from "./useAuth";

export const useNotifications = () => {
  const { user } = useAuth();

  const notifications = useQuery({
    queryKey: ["notifications", user?._id],
    queryFn: getAllNotifications,
    enabled: !!user?._id,
    refetchOnMount: true,
  });

  // `data` is a list while loading and when loading failed; use isPending / isError to
  // tell "nothing yet" from "nothing to show".
  return {
    ...notifications,
    data: Array.isArray(notifications.data) ? notifications.data : [],
  };
};

export const useMarkAsRead = () => {
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      // schoolSessionDispatch(alertSuccess("Marked As Read"));
    },
    onError: (error) => {
      schoolSessionDispatch(alertError(error));
    },
  });
};
export const useMarkAll = () => {
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => markAllNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      schoolSessionDispatch(alertSuccess("Marked As Read"));
    },
    onError: (error) => {
      schoolSessionDispatch(alertError(error));
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  return useMutation({
    mutationFn: (id) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      // schoolSessionDispatch(alertSuccess("Notification Removed"));
    },
    onError: (error) => {
      schoolSessionDispatch(alertError(error));
    },
  });
};

export const useDeleteAllNotifications = () => {
  const queryClient = useQueryClient();
  const { schoolSessionDispatch } = useContext(SchoolSessionContext);

  return useMutation({
    mutationFn: (id) => deleteNotifications(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      schoolSessionDispatch(alertSuccess("Notifications Removed"));
    },
    onError: (error) => {
      schoolSessionDispatch(alertError(error));
    },
  });
};
