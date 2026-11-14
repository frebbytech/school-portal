import axios from "axios";
import { installAuthRetry } from "./authRetry";

const BASE_URL = import.meta.env.VITE_BASE_URL;
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

axios.defaults.withCredentials = true;
api.defaults.withCredentials = true;

installAuthRetry(api);

export default api;
