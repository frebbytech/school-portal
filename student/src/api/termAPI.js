import api from "./customAxios";

//Get all Students
export const getAllTerms = async (session) => {
  try {
    const res = await api({
      method: "GET",
      url: `/terms`,
      params: {
        session,
      },
    });

    return res.data;
  } catch (error) {
    throw error.response.data;
  }
};

//Get all Students
export const getAllSessions = async (session) => {
  try {
    const res = await api({
      method: "GET",
      url: `/terms/sessions`,
      params: {
        session,
      },
    });

    return res.data;
  } catch (error) {
    throw error.response.data;
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
    throw error.response.data;
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
    throw error.response.data;
  }
};
