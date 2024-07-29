import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate } from 'react-router-dom';
import { PlaceProvider } from './context/PlacesContext';
import { UserProvider, useUser } from './context/UserContext';
import HomePage from './components/HomePage';
import Login from './components/Login';
import 'bootstrap/dist/css/bootstrap.min.css';
import PlacesNeedingAttention from './components/PlacesNeedingAttention';
import CheckPlaceNeedsAttention from './components/CheckPlaceNeedsAttention';

const App: React.FC = () => {
  return (
    <UserProvider>
      <PlaceProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/city/:countryName/:cityName" element={<HomePage />} />
                    <Route path="/place/:place_id" element={<HomePage />} />
                    <Route path="/places-needing-attention" element={<PlacesNeedingAttention />} />
                    <Route path="/check-place/:placeId" element={<CheckPlaceNeedsAttention />} />
                  </Routes>
                </RequireAuth>
              }
            />
          </Routes>
        </Router>
      </PlaceProvider>
    </UserProvider>
  );
};

const RequireAuth: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { checkCookie } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!checkCookie()) {
      navigate('/login');
    }
  }, [checkCookie, navigate]);

  return children;
};

export default App;
