import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useUser } from '../context/UserContext';
import apiClient from '../util/apiClient';
import validator from 'validator';
import Cookies from 'js-cookie';

const Login: React.FC = () => {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { setUser } = useUser();

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!validator.isAlphanumeric(login)) {
            setError('Invalid input. Ensure login is alphanumeric.');
            return;
        }

        try {
            const response = await apiClient.post('/front/login', { login, password });

            const { login: userLogin, userId: userId, admin: admin } = response.data;

            if (userLogin && userId) {
                setUser({ login: userLogin, userId: userId, admin: admin });
                Cookies.set('user', JSON.stringify({ login: userLogin, userId: userId, admin: admin }), { expires: 1 / 12 }); // 2h
                navigate('/');
            } else {
                setError('Invalid login or password');
            }
        } catch (error) {
            setError('Error logging in');
        }
    };



    return (
        <div className="d-flex justify-content-center align-items-center vh-100">
            <div className="card p-4" style={{ width: '20rem' }}>
                <h2 className="card-title text-center">Login</h2>
                {error && <div className="alert alert-danger">{error}</div>}
                <form onSubmit={handleLogin}>
                    <div className="mb-3">
                        <label htmlFor="login" className="form-label">Login</label>
                        <input
                            type="text"
                            className="form-control"
                            id="login"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label htmlFor="password" className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-100">Login</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
