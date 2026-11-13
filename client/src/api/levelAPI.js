import { normalizeApiError } from "./apiError";
import api from './customAxios';



//Get all Students
export const getAllLevels = async (session, term) => {
  try {
    const res = await api({
      method: 'GET',
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
      method: 'GET',
      url: `/levels/previous?session=${session}&term=${term}&student=${student || ""}`,

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
      method: 'GET',
      url: `/levels/${id}`,

    });

    return res.data;
  } catch (error) {
    //console.log(error.response.data);
    throw normalizeApiError(error);
  }
};

export const postLevel = async (newLevel) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/levels`,
      data: newLevel,
    });

    return res.data;
  } catch (error) {
    //console.log(error.response.data);
    throw normalizeApiError(error);
  }
};
export const postLevels = async (newLevel) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/levels/many`,
      data: newLevel,
    });

    return res.data;
  } catch (error) {
    //console.log(error.response.data);
    throw normalizeApiError(error);
  }
};

export const generateNewCurrentLevelDetailsFromLevels = async (data) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/levels/generate`,
      data,
    });

    return res.data;
  } catch (error) {
    //console.log(error.response.data);
    throw normalizeApiError(error);
  }
};

export const putLevel = async (updatedLevel) => {
  try {
    const res = await api({
      method: 'PUT',
      url: `/levels`,
      data: updatedLevel,
    });

    return res.data;
  } catch (error) {
    //console.log(error.response.data);
    throw normalizeApiError(error);
  }
};

export const assignGradeToLevel = async (updatedLevel) => {
  try {
    const res = await api({
      method: 'PUT',
      url: `/levels/grade`,
      data: updatedLevel,
    });

    return res.data;
  } catch (error) {
    //console.log(error.response.data);
    throw normalizeApiError(error);
  }
};

export const deleteManyLevels = async (levels) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/levels/delete/many`,
      data: levels
    });

    return res.data;
  } catch (error) {
    //console.log(error.response.data);
    throw normalizeApiError(error);
  }
};
export const deleteLevel = async ({ id, sessionId, termId }) => {
  try {
    const res = await api({
      method: 'DELETE',
      url: `/levels`,
      params: {
        id,
        sessionId,
        termId,
      },
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
    return error.response.data
  }
};




//////////-------------SUBJECTS----------//////////

export const getSubjectsForLevel = async (levelId) => {
  try {
    const res = await api({
      method: 'GET',
      url: `/levels/subject`,
      params: {
        levelId,
      },
    });

    return res.data;
  } catch (error) {
    return error.response.data

  }
};

export const addSubjectsToLevel = async (data) => {
  try {
    const res = await api({
      method: 'PUT',
      url: `/levels/subject`,
      data,
    });

    return res.data;
  } catch (error) {
    return error.response.data

  }
};

export const getTodaysBirth = async () => {
  try {
    const res = await api({
      method: 'GET',
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
      method: 'GET',
      url: `/levels/dashboard-info`,
      params: info,
    });

    return res.data;
  } catch (error) {
    return error.response.data
  }
};

///Teacher

//Get Teacher assigned Level
export const getTeacherLevel = async (assignedLevelDetails) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/levels/assign-teacher`,
      data: assignedLevelDetails,
    });

    return res.data;
  } catch (error) {
    return error.response.data
  }
};

export const assignTeacherLevel = async (updatedLevel) => {
  try {
    const res = await api({
      method: 'PUT',
      url: `/levels/assign-teacher`,
      data: updatedLevel,
    });

    return res.data;
  } catch (error) {
    return error.response.data
  }
};

export const unassignTeacherLevel = async (id) => {
  try {
    const res = await api({
      method: 'PUT',
      url: `/levels/unassign-teacher`,
      params: {
        id,
      },
    });

    return res.data;
  } catch (error) {
    return error.response.data
  }
};
