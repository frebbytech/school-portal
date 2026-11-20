import {
  deleteNotification,
  markAllNotificationAsRead,
  markNotificationAsRead,
  deleteNotifications,
  getAllNotifications,
} from "@/api/notificationAPI";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthProvider";
import { useAlert } from "@/context/AlertProvider";
import { errorMessage } from "@/lib/errorMessage";

export const useNotifications = () => {
  const { user } = useAuth();
  const notifications = useQuery({
    queryKey: ["notifications", user?._id],
    queryFn: getAllNotifications,
    enabled: !!user?._id,
  });

  // a list while loading and when loading failed; isPending / isError tell them apart
  return {
    ...notifications,
    data: Array.isArray(notifications.data) ? notifications.data : [],
  };
};

export const useMarkAsRead = () => {
  const { openAlert } = useAlert();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      // openAlert("success","Marked As Read");
    },
    onError: (error) => {
      openAlert("error", errorMessage(error, "An unknown error has occurred!"));
    },
  });
};
export const useMarkAll = () => {
  const { openAlert } = useAlert();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => markAllNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      openAlert("success", "Marked As Read");
    },
    onError: (error) => {
      openAlert("error", errorMessage(error, "An unknown error has occurred!"));
    },
  });
};

export const useDeleteNotification = () => {
  const queryClient = useQueryClient();
  const { openAlert } = useAlert();

  return useMutation({
    mutationFn: (id) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      // openAlert("success","Notification Removed");
    },
    onError: (error) => {
      openAlert("error", errorMessage(error, "An unknown error has occurred!"));
    },
  });
};

export const useDeleteAllNotifications = () => {
  const queryClient = useQueryClient();
  const { openAlert } = useAlert();

  return useMutation({
    mutationFn: (id) => deleteNotifications(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      openAlert("success", "Notifications Removed");
    },
    onError: (error) => {
      openAlert("error", errorMessage(error, "An unknown error has occurred!"));
    },
  });
};
