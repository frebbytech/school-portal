import { normalizeApiError } from "./apiError";
import api from "./customAxios";

//Get all Students
export const getAllNotifications = async () => {
  try {
    const res = await api({
      method: "GET",
      url: `/notifications`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getNotification = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/notifications/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const postNotification = async (newNotification) => {
  try {
    const res = await api({
      method: "POST",
      url: `/notifications`,
      data: newNotification,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const putNotification = async (notification) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/notifications`,
      data: notification,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const markNotificationAsRead = async (id) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/notifications/${id}/read`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const markAllNotificationAsRead = async (id) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/notifications/${id}/read-all`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const deleteNotification = async (id) => {
  try {
    const res = await api({
      method: "DELETE",
      url: `/notifications/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
export const deleteNotifications = async (id) => {
  try {
    const res = await api({
      method: "DELETE",
      url: `/notifications/${id}/all`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
