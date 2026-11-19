import { normalizeApiError } from "./apiError";
import api from './customAxios';


//Get all Students
export const getAllEvents = async () => {
  try {
    const res = await api({
      method: 'GET',
      url: `/events`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getEvent = async (id) => {
  try {
    const res = await api({
      method: 'GET',
      url: `/events/${id}`,

    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const postEvent = async (newEvent) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/events`,
      data: newEvent,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};



export const putEvent = async (event) => {
  try {
    const res = await api({
      method: 'PUT',
      url: `/events`,
      data: event,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const deleteEvent = async (id) => {
  try {
    const res = await api({
      method: 'DELETE',
      url: `/events/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
export const deleteEvents = async (events) => {
  try {
    const res = await api({
      method: 'PUT',
      url: `/events/remove`,
      data: events
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
