import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { PlaceProvider } from './context/PlacesContext';
import { UserProvider, useUser } from './context/UserContext';
import HomePage from './components/HomePage';
import Login from './components/Login';
import 'bootstrap/dist/css/bootstrap.min.css';
import PlacesNeedingAttention from './components/PlacesNeedingAttention';
import CheckPlaceNeedsAttention from './components/CheckPlaceNeedsAttention';
import AdminCheckPlace from './components/AdminCheckPlace'; // Importer AdminCheckPlace
import { IPlace } from './model/Interfaces';
import Admin from './components/Admin';

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
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/admin/check-place/:placeId" element={<AdminCheckPlace />} />

                    <Route
                      path="/check-place-with-state/:placeId"
                      element={
                        <CheckPlaceNeedsAttentionWrapper />
                      }
                    />
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

const CheckPlaceNeedsAttentionWrapper: React.FC = () => {
  const location = useLocation();
  const place = location.state?.place as IPlace;

  if (!place) {
    return <div>Place not found</div>;
  }

  return <CheckPlaceNeedsAttention place={place} />;
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
