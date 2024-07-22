import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { PlaceProvider } from './context/PlacesContext';
import HomePage from './components/HomePage';
import 'bootstrap/dist/css/bootstrap.min.css';

const App: React.FC = () => {
  return (
    <PlaceProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/city/:countryName/:cityName" element={<HomePage />} />
          <Route path="/place/:place_id" element={<HomePage />} />
        </Routes>
      </Router>
    </PlaceProvider>
  );
};

export default App;
