import axios from "axios";

/**
 * Platform administration API. It deliberately does not use the school `api`
 * instance: that one carries the school session's token and refresh cookie, while a
 * platform administrator belongs to no school and signs in separately. The token is
 * passed in explicitly and is never stored (a page reload means signing in again).
 */
const platform = axios.create({
  baseURL: `${import.meta.env.VITE_BASE_URL}/platform`,
});

// The server answers with a plain string or `{ message }`
const errorMessage = (error) => {
  const data = error?.response?.data;
  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;
  return "Something went wrong. Please try again.";
};

const call = async (token, config) => {
  try {
    const res = await platform({
      ...config,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return res.data;
  } catch (error) {
    const err = new Error(errorMessage(error));
    err.status = error?.response?.status;
    throw err;
  }
};

export const platformLogin = ({ username, password }) =>
  call(null, { method: "POST", url: "/login", data: { username, password } });

export const getPlatformSchools = (token) =>
  call(token, { method: "GET", url: "/schools" });

export const postPlatformSchool = (token, school) =>
  call(token, { method: "POST", url: "/schools", data: school });

export const putPlatformSchool = (token, { _id, ...school }) =>
  call(token, { method: "PUT", url: `/schools/${_id}`, data: school });

export const postSchoolAdministrator = (token, { schoolId, ...administrator }) =>
  call(token, {
    method: "POST",
    url: `/schools/${schoolId}/administrators`,
    data: administrator,
  });
