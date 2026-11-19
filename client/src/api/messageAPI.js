import { normalizeApiError } from "./apiError";

import api from './customAxios';


//Get all Students
export const getAllMessages = async () => {
  try {
    const res = await api({
      method: 'GET',
      url:  `/messages`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getMessage = async (id) => {
  try {
    const res = await api({
      method: 'GET',
      url:  `/messages`,
      params: {
        id,
      },
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const postMessage = async (newMessage) => {
  try {
    const res = await api({
      method: 'POST',
      url:  `/messages/${newMessage.rate}`,
      data: newMessage,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const resendMessage = async (messageInfo) => {
  try {
    const res = await api({
      method: 'POST',
      url:  `/messages/resend`,
      data: messageInfo,
    });

    return res.data;
  } catch (error) {
    console.log(error.response.data);
  }
};

export const putMessage = async (updatedMessage) => {
  try {
    const res = await api({
      method: 'PUT',
      url:  `/messages`,
      data: updatedMessage,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const deleteMessage = async (id) => {
  try {
    const res = await api({
      method: 'DELETE',
      url:  `/messages/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
