import { normalizeApiError } from "./apiError";
import api from './customAxios';

//Get all Students
export const getGrades = async (session, term) => {
  try {
    const res = await api({
      method: 'GET',
      url: `/grades`,
      params: {
        session, term
      }
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getGrade = async (id) => {
  try {
    const res = await api({
      method: 'GET',
      url: `/grades/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const postGrades = async (newGrade) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/grades`,
      data: newGrade,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const putGrade = async (updatedGrade) => {
  try {
    const res = await api({
      method: 'PUT',
      url: `/grades`,
      data: updatedGrade,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const deleteGrade = async (id) => {
  // console.log(id)
  try {
    const res = await api({
      method: 'DELETE',
      url: `/grades/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
