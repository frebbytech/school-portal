import { normalizeApiError } from "./apiError";
import api from "./customAxios";

//Get all Students
export const getAllTerms = async (session) => {
  try {
    const res = await api({
      method: "GET",
      url: `/terms?type=${session || ""}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getTerm = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/terms/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getValidTerm = async ({ academicYear, term }) => {
  try {
    const res = await api({
      method: "GET",
      url: `/terms/valid?academicYear=${academicYear}&term=${term}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const postTerm = async (newTerm) => {
  try {
    const res = await api({
      method: "POST",
      url: `/terms`,
      data: newTerm,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const putTerm = async (updatedSession) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/terms`,
      data: updatedSession,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
export const updateTermDetails = async (updatedSession) => {
  try {
    const res = await api({
      method: "PATCH",
      url: `/terms`,
      data: updatedSession,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const disableSessionAccount = async ({ _id, active }) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/terms/account`,
      data: {
        id: _id,
        active,
      },
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
export const deleteManyTerms = async (terms) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/terms/remove`,
      data: terms,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
export const switchTerm = async ({ id, status }) => {
  try {
    const res = await api({
      method: "PATCH",
      url: `/terms/${id}?status=${status}`,
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};

export const deleteTerm = async (id) => {
  try {
    const res = await api({
      method: "DELETE",
      url: `/terms/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
