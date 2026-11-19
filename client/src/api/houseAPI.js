import { normalizeApiError } from "./apiError";
import api from "./customAxios";

//Get all Houses
export const getAllHouses = async () => {
  try {
    const res = await api({
      method: "GET",
      url: `/houses`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getHouse = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/houses/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const postHouse = async (newHouse) => {
  try {
    const res = await api({
      method: "POST",
      url: `/houses`,
      data: newHouse,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const putHouse = async (id, house) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/houses/${id}`,
      data: house,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const deleteHouse = async (id) => {
  try {
    const res = await api({
      method: "DELETE",
      url: `/houses/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
export const deleteHouses = async (houses) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/houses/remove`,
      data: houses,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
