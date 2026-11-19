import { normalizeApiError } from "./apiError";
import api from './customAxios';




//Get all Students
export const getSubjects = async ({ session, term }) => {
  try {
    const res = await api({
      method: 'GET',
      url: `/subjects?session=${session}&term=${term}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getSubject = async (id) => {
  try {
    const res = await api({
      method: 'GET',
      url: `/subjects`,
      params: {
        id,
      },
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const postSubjects = async (newSubject) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/subjects`,
      data: newSubject,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const putSubject = async (updatedSubject) => {
  try {
    const res = await api({
      method: 'PUT',
      url: `/subjects`,
      data: updatedSubject,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const deleteSubject = async (id) => {
  // console.log(id)
  try {
    const res = await api({
      method: 'DELETE',
      url: `/subjects/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
