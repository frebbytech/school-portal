import { normalizeApiError } from "./apiError";
import api from "./customAxios";

//Get all Students
export const getAllSessions = async () => {
  try {
    const res = await api({
      method: "GET",
      url: `/sessions`,
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};

export const getSession = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/sessions`,
      params: {
        id,
      },
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};

export const postSession = async (newSession) => {
  try {
    const res = await api({
      method: "POST",
      url: `/sessions`,
      data: newSession,
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};

export const putSession = async (updatedSession) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/sessions`,
      data: updatedSession,
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};


export const deleteSession = async (id) => {
  try {
    const res = await api({
      method: "DELETE",
      url: `/sessions/${id}`,
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};

export const uploadProfileImage = async ({ _id, profile, type, user }) => {
  const formData = new FormData();
  //Teacher
  formData.append("profile", profile);
  formData.append("_id", _id);
  formData.append("user", user || "");
  formData.append("school", "456-456");

  try {
    const res = await api({
      method: "PUT",
      url: `/${type}/profile`,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};

export const putBulkData = async ({
  dataCategory,
  dataType,
  data,
  onProgress,
}) => {
  let config;

  if (dataType === "photos") {
    const formData = new FormData();

    data?.students?.forEach((file) => {
      formData.append("profile", file);
    });

    config = {
      method: "PUT",
      url: `/${dataCategory}/bulk-profile`,
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      },
    };
  } else if (
    ["students", "teachers"].includes(dataCategory) &&
    dataType === "personal-data"
  ) {
    config = {
      method: "POST",
      url: `/${dataCategory}/many`,
      data,
    };
  } else {
    config = {
      method: "POST",
      url: dataCategory === "grades" ? `/grades` : "/subjects",
      data,
    };
  }

  try {
    const res = await api({
      ...config,
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      },
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
