import { normalizeApiError } from "./apiError";
import api from './customAxios';


//Get all Students
export const getAllSchools = async () => {
    try {
        const res = await api({
            method: 'GET',
            url: `/schools`,
        });

        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
};

export const getSchool = async ({ code }) => {
    try {
        const res = await api({
            method: 'GET',
            url: `/schools/${code}`,

        });

        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
};

export const postSchool = async (newSchool) => {
    try {
        const res = await api({
            method: 'POST',
            url: `/schools`,
            data: newSchool,
        });

        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
};



export const putSchool = async (school) => {
    try {
        const res = await api({
            method: 'PUT',
            url: `/schools`,
            data: school,
        });

        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
};

export const deleteSchool = async (id) => {
    try {
        const res = await api({
            method: 'DELETE',
            url: `/schools/${id}`,
        });

        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
};
export const deleteSchools = async (schools) => {
    try {
        const res = await api({
            method: 'PUT',
            url: `/schools/remove`,
            data: schools
        });

        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
};


export const updateSchoolLogo = async (data) => {
    const formData = new FormData();
    formData.append('code', data?.id);
    formData.append('badge', data?.badge);

    try {
        const res = await api({
            method: 'PUT',
            url: `/schools/badge`,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return res.data;
    } catch (error) {
        throw normalizeApiError(error);

    }
};