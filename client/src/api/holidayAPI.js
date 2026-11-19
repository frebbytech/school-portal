import { normalizeApiError } from "./apiError";
import api from './customAxios';


//Get all Students
export const getAllHolidays = async (year) => {
    try {
        const res = await api({
            method: 'GET',
            url: `/holidays?year=${year}`,
        });

        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
};

export const getHoliday = async (id) => {
    try {
        const res = await api({
            method: 'GET',
            url: `/holidays/${id}`,

        });

        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
};

export const postHoliday = async (newHoliday) => {
    try {
        const res = await api({
            method: 'POST',
            url: `/holidays`,
            data: newHoliday,
        });

        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
};



export const putHoliday = async (holiday) => {
    try {
        const res = await api({
            method: 'PUT',
            url: `/holidays`,
            data: holiday,
        });

        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
};

export const deleteHoliday = async (id) => {
    try {
        const res = await api({
            method: 'DELETE',
            url: `/holidays/${id}`,
        });

        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
};
export const deleteHolidays = async (holidays) => {
    try {
        const res = await api({
            method: 'PUT',
            url: `/holidays/remove`,
            data: holidays
        });

        return res.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
};
