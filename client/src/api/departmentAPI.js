import { normalizeApiError } from "./apiError";
import api from "./customAxios";

//Get all Departments
export const getAllDepartments = async () => {
  try {
    const res = await api({
      method: "GET",
      url: `/departments`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getDepartment = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/departments/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const postDepartment = async (newDepartment) => {
  try {
    const res = await api({
      method: "POST",
      url: `/departments`,
      data: newDepartment,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const putDepartment = async (id, department) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/departments/${id}`,
      data: department,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const deleteDepartment = async (id) => {
  try {
    const res = await api({
      method: "DELETE",
      url: `/departments/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
export const deleteDepartments = async (departments) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/departments/remove`,
      data: departments,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
