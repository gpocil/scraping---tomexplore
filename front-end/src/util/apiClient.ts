import axios from 'axios';
import config from './config';

const axiosInstance = axios.create({
    baseURL: config.dev ? config.apiBaseUrlDev : config.apiBaseUrlProd
});

export default axiosInstance;
