import { normalizeApiError } from "./apiError";

import api from './customAxios';

//Get all Students
export const getAllParents = async () => {
  try {
    const res = await api({
      method: 'GET',
      url:  `/parents`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getParentByStudentId = async (id) => {
  try {
    const res = await api({
      method: 'GET',
      url:  `/parents/student`,
      params: {
        id,
      },
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
export const getParent = async (id) => {
  try {
    const res = await api({
      method: 'GET',
      url:  `/parents/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const postParent = async (newParent) => {
  try {
    const res = await api({
      method: 'POST',
      url:  `/parents`,
      data: newParent,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const putParent = async (updatedParent) => {
  try {
    const res = await api({
      method: 'PUT',
      url:  `/parents`,
      data: updatedParent,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const deleteParent = async (id) => {
  try {
    const res = await api({
      method: 'DELETE',
      url:  `/parents/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
