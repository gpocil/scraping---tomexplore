const config = {
    apiBaseUrl: process.env.REACT_APP_DEV === 'true'
        ? process.env.REACT_APP_API_BASE_URL_DEV
        : process.env.REACT_APP_API_BASE_URL_PROD,
    dev: process.env.REACT_APP_DEV === 'true'
};

export default config;
