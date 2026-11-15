
import api from './customAxios';
import { normalizeApiError } from './apiError';

// Failures are thrown (not returned), so a rejected save reaches onError and is never shown
// as a success message.

//Get all Students
export const getAllAttendances = async () => {
  try {
    const res = await api({
      method: 'GET',
      url: `/attendances`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getAttendance = async (id, { date, session, term }) => {
  try {
    const res = await api({
      method: 'GET',
      url: `/attendances/${id}`,
      params: {
        date,
        session,
        term
      },
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const postAttendance = async (newAttendance) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/attendances`,
      data: newAttendance,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const postStudentAttendance = async (newAttendance) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/attendances/student`,
      data: newAttendance,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const putAttendance = async (updatedAttendance) => {
  try {
    const res = await api({
      method: 'PUT',
      url: `/attendances`,
      data: updatedAttendance,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const deleteAttendance = async (id) => {
  try {
    const res = await api({
      method: 'DELETE',
      url: `/attendances/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getAttendanceHistory = async ({ id, session, term }) => {
  try {
    const res = await api({
      method: 'GET',
      url: `/attendances/history/${id}?session=${session}&term=${term}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
