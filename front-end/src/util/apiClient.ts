import axios from 'axios';
import config from './config';

const axiosInstance = axios.create({
    baseURL: config.apiBaseUrl
});

export default axiosInstance;
