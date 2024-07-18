import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { PlaceProvider } from './context/PlacesContext';
import HomePage from './components/HomePage';
import PhotoSelector from './components/PhotoSelector';
import 'bootstrap/dist/css/bootstrap.min.css';

const App: React.FC = () => {
  return (
    <PlaceProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/city/:countryName/:cityName" element={<PhotoSelector />} />
        </Routes>
      </Router>
    </PlaceProvider>
  );
};

export default App;
