import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { PlaceProvider, usePlaces } from './context/PlacesContext';
import { UserProvider, useUser } from './context/UserContext';
import HomePage from './components/HomePage';
import Login from './components/Login';
import 'bootstrap/dist/css/bootstrap.min.css';
import PlacesNeedingAttention from './components/PlacesNeedingAttention';
import CheckPlaceNeedsAttention from './components/CheckPlaceNeedsAttention';
import AdminCheckPlace from './components/AdminCheckPlace';
import { IPlace } from './model/Interfaces';
import Admin from './components/Admin';
import { Spinner } from 'react-bootstrap'; // Import Bootstrap Spinner

const App: React.FC = () => {
  return (
    <UserProvider>
      <PlaceProvider>
        <Router>
          <AppWrapper />
        </Router>
      </PlaceProvider>
    </UserProvider>
  );
};

const AppWrapper: React.FC = () => {
  const location = useLocation();
  const { updatePlaces } = usePlaces();
  const [loading, setLoading] = useState(true); // État pour gérer le chargement

  useEffect(() => {
    // Si l'utilisateur n'est pas sur les routes exclues, on appelle updatePlaces
    if (!['/login', '/admin', '/admin/check-place/:placeId'].includes(location.pathname)) {
      setLoading(true); // Début du chargement
      updatePlaces().finally(() => setLoading(false)); // Fin du chargement après la fin de la promesse
    }
  }, []);

  // Si loading est vrai, afficher l'animation de chargement
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Chargement...</span>
        </Spinner>
      </div>
    );
  }

  return (
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
              <Route path="/check-place/:placeId" element={<CheckPlaceNeedsAttentionWrapper />} />
            </Routes>
          </RequireAuth>
        }
      />
    </Routes>
  );
};

// Wrapper pour CheckPlaceNeedsAttention, permet de récupérer l'état "place" via location
const CheckPlaceNeedsAttentionWrapper: React.FC = () => {
  const location = useLocation();
  const place = location.state?.place as IPlace;

  if (!place) {
    return <div>Place not found</div>;
  }

  return <CheckPlaceNeedsAttention place={place} />;
};

// Composant RequireAuth pour vérifier si l'utilisateur est authentifié
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
