import { normalizeApiError } from "./apiError";
import api from "./customAxios";

//Get all Students
export const getAllExams = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/examinations`,
      params: {
        sessionId: id,
      },
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

//Get Exams by exams id
export const getExam = async (examsId) => {
  try {
    const res = await api({
      method: "GET",
      url: `/examinations/${examsId}`,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

//Get all level exams details
export const getExamsDetails = async (session) => {
  try {
    const res = await api({
      method: "GET",
      url: `/examinations/details`,
      params: session,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
//Get all level exams details
export const getSubjectScore = async (session) => {
  try {
    const res = await api({
      method: "GET",
      url: `/examinations/subject`,
      params: session,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

//GENERATE REPORTS
export const generateReports = async (session) => {
  try {
    const res = await api({
      method: "GET",
      url: `/examinations/reports`,
      params: session,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

// Publish the whole class's report cards (value: "sms" | "email" | "both").
// Answers at once with { publicationId, status: "queued" }: the sending runs in the background and
// the result arrives over the socket (and can be read from getPublications).
// `resend: true` is the person's confirmation to send again after an earlier completed publish.
export const publishReports = async ({ value, resend = false, ...session }) => {
  try {
    const res = await api({
      method: "POST",
      url: `/examinations/publish`,
      data: { ...session, type: value, ...(resend ? { resend: true } : {}) },
    });
    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

// Publish one student's report card (same background job).
export const publishReport = async ({ id, value, resend = false }) => {
  try {
    const res = await api({
      method: "POST",
      url: `/examinations/${id}/publish`,
      data: { type: value, ...(resend ? { resend: true } : {}) },
    });
    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

// What has been published for a class this term, newest first (status, progress, counts).
export const getPublications = async ({ levelId, termId }) => {
  try {
    const res = await api({
      method: "GET",
      url: `/examinations/publications`,
      params: { levelId, termId },
    });
    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

//Add new Exams
export const postExamsRemarks = async (comments) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/examinations/comments`,
      data: comments,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
//Add new Exams
export const postExams = async (newExam) => {
  try {
    const res = await api({
      method: "POST",
      url: `/examinations`,
      data: newExam,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

//Add new Exams
export const postBulkExams = async (newExam) => {
  try {
    const res = await api({
      method: "POST",
      url: `/examinations/bulk`,
      data: newExam,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

//Update Exams scores
export const updateExams = async (updatedScores) => {
  try {
    const res = await api({
      method: "POST",
      url: `/examinations/update`,
      data: updatedScores,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const putExams = async (updatedExam) => {
  try {
    const res = await api({
      method: "PUT",
      url: `/examinations`,
      data: updatedExam,
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

export const deleteExams = async (id) => {
  try {
    const res = await api({
      method: "DELETE",
      url: `/examinations`,
      params: {
        _id: id,
      },
    });

    return res.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};
