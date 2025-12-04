import axios from "axios";
import api from "./customAxios";

//Get all Users
export const getAllUsers = async () => {
  try {
    const res = await api({
      method: "GET",
      url: `/users`,
    });

    return res.data;
  } catch (error) {
    throw error.response.data;
  }
};

export const getUserAuth = async (userInfo) => {
  try {
    const res = await axios({
      method: "POST",
      url: `${import.meta.env.VITE_BASE_URL}/users/login`,
      data: userInfo,
    });

    return res.data;
  } catch (error) {
    throw error.response.data;
  }
};

export const verifyUser = async () => {
  const token = JSON.parse(localStorage.getItem("@user")) || "";

  try {
    const res = await axios({
      method: "GET",
      url: `${import.meta.env.VITE_BASE_URL}/users/verify`,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data;
  } catch (error) {
    throw error?.response?.data || "Session has expired.Please login again";
  }
};

export const getUser = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/users/${id}`,
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};

export const postUser = async (user) => {
  const formData = new FormData();
  //User
  formData.append("profile", user.profile);
  formData.append("firstname", user.firstname);
  formData.append("lastname", user.lastname);
  formData.append("fullname", user.fullname);
  formData.append("username", user.username);
  formData.append("dateofbirth", user.dateofbirth);
  formData.append("gender", user.gender);
  formData.append("role", user.role);
  formData.append("email", user.email);
  formData.append("phonenumber", user.phonenumber);
  formData.append("address", user.address);
  formData.append("residence", user.residence);
  formData.append("nationality", user.nationality);
  formData.append("password", user.password);

  try {
    const res = await api({
      method: "POST",
      url: `/users`,
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

export const updateUserProfileImage = async ({ _id, profile }) => {
  const formData = new FormData();
  //User
  formData.append("profile", profile);
  formData.append("_id", _id);

  try {
    const res = await api({
      method: "PUT",
      url: `/users/profile`,
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

export const updateUserPassword = async (passwordInfo) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/users/reset-password`,
      data: passwordInfo,
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};

export const putUser = async (updatedUser) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/users`,
      data: updatedUser,
    });

    return res.data;
  } catch (error) {
    return error?.response?.data;
  }
};

export const logOut = async () => {
  try {
    const res = await api({
      method: "PUT",
      url: `/users/logout`,
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};

export const enableOrDisableAccount = async (info) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/users/account`,
      data: info,
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};

export const deleteUser = async (id) => {
  try {
    const res = await api({
      method: "DELETE",
      url: `/users/${id}`,
    });

    return res.data;
  } catch (error) {
    return error.response.data;
  }
};



export const downloadTemplate = async (templateName) => {
  try {
    const response = await api({
      url: `/template?name=${templateName}`,
      method: "GET",
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${templateName}.xlsx`);

    document.body.appendChild(link);
    link.click();

    window.URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.log(error);
  }
};
