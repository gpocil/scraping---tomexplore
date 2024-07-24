import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { PlaceProvider } from './context/PlacesContext';
import { UserProvider } from './context/UserContext';
import HomePage from './components/HomePage';
import Login from './components/Login';
import 'bootstrap/dist/css/bootstrap.min.css';

const App: React.FC = () => {
  return (
    <UserProvider>
      <PlaceProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/city/:countryName/:cityName" element={<HomePage />} />
            <Route path="/place/:place_id" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </Router>
      </PlaceProvider>
    </UserProvider>
  );
};

export default App;
