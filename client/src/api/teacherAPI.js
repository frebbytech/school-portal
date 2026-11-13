import { normalizeApiError } from "./apiError";
import api from "./customAxios";

//Get all Teachers
export const getAllTeachers = async () => {
  try {
    const res = await api({
      method: "GET",
      url: `/teachers`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getTeacher = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/teachers/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
export const getAllCourseAssignedToTeacher = async () => {
  try {
    const res = await api({
      method: "GET",
      url: `/teachers/courses`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const postTeacher = async (teacher) => {
  const formData = new FormData();
  //Teacher
  formData.append("profile", teacher.profile);
  formData.append("firstname", teacher.firstname);
  formData.append("lastname", teacher.lastname);
  formData.append("username", teacher.username);
  formData.append("dateofbirth", teacher.dateofbirth);
  formData.append("gender", teacher.gender);
  formData.append("email", teacher.email);
  formData.append("phonenumber", teacher.phonenumber);
  formData.append("address", teacher.address);
  formData.append("residence", teacher.residence);
  formData.append("nationality", teacher.nationality);

  try {
    const res = await api({
      method: "POST",
      url: `/teachers`,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const updateTeacherProfileImage = async ({ _id, profile }) => {
  const formData = new FormData();
  //Teacher
  formData.append("profile", profile);
  formData.append("_id", _id);

  try {
    const res = await api({
      method: "PUT",
      url: `/teachers/profile`,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
    // throw new Error(error.response.data || 'Error Updating profile');
  }
};

export const putTeacher = async (updatedTeacher) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/teachers`,
      data: updatedTeacher,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const deleteTeacher = async (id) => {
  try {
    const res = await api({
      method: "DELETE",
      url: `/teachers/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
