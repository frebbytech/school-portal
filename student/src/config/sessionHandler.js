//Get all Users
// const ACCESS_EXPIRATION = new Date(Date.now() + 3600000);

import _ from "lodash";

export const getUser = () => {
  const user = localStorage.getItem("@_uid");

  if (user === undefined || user === null || user === "undefined") {
    return {
      id: "",
      _id: "",
    };
  }

  return JSON.parse(user);
};

export const saveUser = (accessToken) => {
  if (accessToken === "undefined" || accessToken === undefined) {
    return;
  }
  localStorage.setItem("@_uid", JSON.stringify(accessToken));
};

export const deleteUser = () => {
  localStorage.removeItem("@user");
  localStorage.removeItem("@_uid");
  localStorage.removeItem("@school_info");
  localStorage.removeItem("@school_session");
};

export const isAuthenticated = () => {
  const token = getUser();
  if (!token) return false;

  try {
    const decoded = parseJwt(token);
    return decoded.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};

// "Remember me" keeps the student ID only, never the password.
export const saveLoginInfo = (studentId, rememberMe) => {
  if (rememberMe) {
    localStorage.setItem("rememberStudentId", studentId);
  } else {
    localStorage.removeItem("rememberStudentId");
  }
};

export const getSavedLoginInfo = () => ({
  studentId: localStorage.getItem("rememberStudentId") || "",
});

// Older versions saved the password in plain text. Removes it wherever it is found.
export const purgeSavedPassword = () => {
  try {
    localStorage.removeItem("rememberPassword");
  } catch {
    // storage blocked: nothing to remove
  }
};

export function parseJwt(token) {
  if (!token || token === undefined || token === "undefined") {
    return null;
  } else {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );

    return JSON.parse(jsonPayload);
  }
}
