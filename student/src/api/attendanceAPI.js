import { normalizeApiError } from "./apiError";
import api from "./customAxios";

//Get all Students
export const getAllAttendances = async () => {
  try {
    const res = await api({
      method: "GET",
      url: `/attendances`,
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};

export const getAttendance = async (id, { date, session, term }) => {
  try {
    const res = await api({
      method: "GET",
      url: `/attendances/${id}`,
      params: {
        date,
        session,
        term,
      },
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};



export const getAttendanceHistory = async ({ id, session, term }) => {
  try {
    const res = await api({
      method: "GET",
      url: `/attendances/history/${id}?session=${session}&term=${term}`,
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};

//Get all level exams details
export const getAttendanceDashboardInfo = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/attendances/level/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
