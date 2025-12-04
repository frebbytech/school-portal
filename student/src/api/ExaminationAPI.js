import api from "./customAxios";

//Get Exams by exams id
export const getExam = async (examsId) => {
  try {
    const res = await api({
      method: "GET",
      url: `/examinations/${examsId}`,
    });

    return res.data;
  } catch (error) {
    throw error.response.data;
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
    throw error.response.data;
  }
};
//Get all level exams details
export const getExamsDashboardAnalytics = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/examinations/analytics/${id}`,
    });

    return res.data;
  } catch (error) {
    throw error.response.data;
  }
};

//GENERATE REPORTS
// export const publishReports = async ({ onProgress, value, ...session }) => {
//   try {
//     const res = await api({
//       method: "GET",
//       url: `/examinations/publish?type=${value}`,
//       params: session,
//       onUploadProgress: (progressEvent) => {
//         const percentCompleted = Math.round(
//           (progressEvent.loaded * 100) / progressEvent.total
//         );
//         onProgress(percentCompleted);
//       },
//     });

//     return res.data;
//   } catch (error) {
//     throw error.response.data;
//   }
// };

// //GENERATE REPORTS
// export const publishReport = async ({ id, value, onProgress }) => {
//   try {
//     const res = await api({
//       method: "GET",
//       url: `/examinations/${id}?type=${value}&publish=true`,
//       onUploadProgress: (progressEvent) => {
//         const percentCompleted = Math.round(
//           (progressEvent.loaded * 100) / progressEvent.total
//         );
//         onProgress(percentCompleted);
//       },
//     });

//     return res.data;
//   } catch (error) {
//     throw error.response.data;
//   }
// };

//Get all level exams details
export const getAcademicDashboardInfo = async (id) => {
  try {
    const res = await api({
      method: "GET",
      url: `/examinations/academic/${id}`,
    });

    return res.data;
  } catch (error) {
    throw error.response.data;
  }
};
