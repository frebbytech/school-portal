import { normalizeApiError } from "./apiError";
import api from "./customAxios";

//Get all Students
export const getAllLevels = async (session, term) => {
  try {
    const res = await api({
      method: "GET",
      url: `/levels/session`,
      params: {
        session,
        term,
      },
    });

    return res.data;
  } catch (error) {
    //console.log(error.response.data);
    throw normalizeApiError(error);
  }
};

export const getPreviousLevels = async (session, term, student) => {
  try {
    const res = await api({
      method: "GET",
      url: `/levels/previous?session=${session}&term=${term}&student=${
        student || ""
      }`,
    });

    return res.data;
  } catch (error) {
    //console.log(error.response.data);
    throw normalizeApiError(error);
  }
};

export const getLevel = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/levels/${id}`,
    });

    return res.data;
  } catch (error) {
    //console.log(error.response.data);
    throw normalizeApiError(error);
  }
};

export const getAllPreviousLevels = async (session) => {
  try {
    const res = await api({
      method: "GET",
      url: `/levels/previous`,
      params: session,
    });

    return res.data;
  } catch (error) {
    //console.log(error.response.data);
  }
};

export const getAllStudentsBySession = async (session) => {
  try {
    const res = await api({
      method: "POST",
      url: `/levels/students/all`,
      data: {
        sessionId: session.sessionId,
        termId: session.termId,
      },
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};

//////////-------------SUBJECTS----------//////////

export const getSubjectsForLevel = async (levelId) => {
  try {
    const res = await api({
      method: "GET",
      url: `/levels/subject`,
      params: {
        levelId,
      },
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};

export const getTodaysBirth = async () => {
  try {
    const res = await api({
      method: "GET",
      url: `/levels/recent/birthday`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getDashboardInfo = async (info) => {
  try {
    const res = await api({
      method: "GET",
      url: `/levels/dashboard-info`,
      params: info,
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};
