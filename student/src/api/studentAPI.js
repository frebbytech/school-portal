import api from "./customAxios";

//Get all Students details
export const getAllStudentsDetails = async (session) => {
  // console.log(session);
  try {
    const res = await api({
      method: "GET",
      url: `/students/details`,
      params: session,
    });

    return res.data;
  } catch (error) {
    throw error.response.data;
  }
};

//Get all Students
export const getAllStudents = async () => {
  try {
    const res = await api({
      method: "GET",
      url: `/students`,
    });

    return res.data;
  } catch (error) {
    throw error.response.data;
  }
};
//Get all Students
export const getAllStudentID = async () => {
  try {
    const res = await api({
      method: "GET",
      url: `/students/ids`,
    });

    return res.data;
  } catch (error) {
    throw error.response.data;
  }
};

//Get all Students
export const getAllStudentsByCurrentLevel = async (currentLevelId) => {
  try {
    const res = await api({
      method: "GET",
      url: `/students/current`,
      params: {
        currentLevelId,
      },
    });

    return res.data;
  } catch (error) {
    throw error.response.data;
  }
};

export const getStudent = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/students/${id}`,
    });

    return res.data;
  } catch (error) {
    throw error.response.data;
  }
};

export const getStudentByIndexNumber = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/students/index-number?id=${id}`,
    });

    return res.data;
  } catch (error) {
    throw error.response.data;
  }
};

export const getParentByStudentId = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/students/parent`,
      params: {
        id,
      },
    });

    return res.data;
  } catch (error) {
    throw error.response.data;
  }
};


