import { normalizeApiError } from "./apiError";
import api from './customAxios';


//Get all Students
export const getAllFees = async (session) => {
  try {
    const res = await api({
      method: "GET",
      url: `/fees/all`,
      data: session,
      params: {
        session: session?.sessionId,
        term: session?.termId,
      }
    });

    return res.data;
  } catch (error) {

    throw normalizeApiError(error);
  }
};




export const getFee = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/fees/${id}`,
    });

    return res.data;
  } catch (error) {

    throw normalizeApiError(error);
  }
};

export const getAllFeesByCurrentLevel = async (session) => {
  try {
    const res = await api({
      method: "POST",
      url: `/fees/current-level/all`,
      data: session,
    });
    return res.data;
  } catch (error) {

    throw normalizeApiError(error);
  }
};
export const getFeeForCurrentLevel = async (session, level) => {
  try {
    const res = await api({
      method: "POST",
      url: `/fees/current-level`,
      data: {
        ...session,
        level,
      },
    });
    return res.data;
  } catch (error) {

    throw normalizeApiError(error);
  }
};

export const postFee = async (newFee) => {
  try {
    const res = await api({
      method: "POST",
      url: `/fees`,
      data: newFee,
    });

    return res.data;
  } catch (error) {

    throw normalizeApiError(error);
  }
};

export const putFee = async (updatedFee) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/fees`,
      data: updatedFee,
    });

    return res.data;
  } catch (error) {

    throw normalizeApiError(error);
  }
};

export const deleteFee = async (id) => {
  try {
    const res = await api({
      method: "DELETE",
      url: `/fees/${id}`,
    });

    return res.data;
  } catch (error) {

    throw normalizeApiError(error);
  }
};
