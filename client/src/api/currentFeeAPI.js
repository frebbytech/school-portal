import api from './customAxios';
import { normalizeApiError } from './apiError';

// Failures are thrown, never returned: a refused payment must reach onError, not onSuccess.

//Get all Students
export const getAllCurrentFees = async () => {
  try {
    const res = await api({
      method: 'GET',
      url: `/current-fees`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};



//Get all fees Summary
export const getAllCurrentFeesPaymentHistoryByDate = async (data) => {
  try {
    const res = await api({
      method: 'get',
      url: `/current-fees/day`,
      params: data,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

//Get all fees Summary
export const getAllCurrentFeesSummary = async (sessionInfo) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/current-fees/summary`,
      data: sessionInfo,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

//Get all fees by level
export const getAllCurrentFeesByLevel = async (sessionInfo) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/current-fees/level`,
      data: sessionInfo,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getCurrentFee = async (session, level) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/current-fees/current-level`,
      data: {
        ...session,
        level,
      },
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const getCurrentFeeForStudent = async (info) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/current-fees/student`,
      data: info,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};


export const getStudentFeeHistory = async (studentId) => {
  try {
    const res = await api({
      method: 'GET',
      url: `/current-fees/history?studentId=${studentId}`,

    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const postCurrentFee = async (newCurrentFee) => {
  try {
    const res = await api({
      method: 'POST',
      url: `/current-fees`,
      data: newCurrentFee,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const putCurrentFee = async (updatedCurrentFee) => {
  try {
    const res = await api({
      method: 'PUT',
      url: `/current-fees`,
      data: updatedCurrentFee,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const deleteCurrentFee = async (id) => {
  try {
    const res = await api({
      method: 'DELETE',
      url: `/fees/${id}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
