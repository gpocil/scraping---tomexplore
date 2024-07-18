import React from 'react';
import { Link } from 'react-router-dom';
import { usePlaces } from '../context/PlacesContext';

const HomePage = () => {
    const places = usePlaces();

    const getTotalCounts = () => {
        let totalCountries = 0;
        let totalCities = 0;
        let totalPlaces = 0;

        totalCountries = Object.keys(places).length;
        for (const country of Object.keys(places)) {
            totalCities += Object.keys(places[country]).length;
            for (const city of Object.keys(places[country])) {
                totalPlaces += Object.keys(places[country][city]).length;
            }
        }

        return { totalCountries, totalCities, totalPlaces };
    };

    const getCountsForCountry = (countryName: string) => {
        const country = places[countryName];
        let cityCount = 0;
        let placeCount = 0;

        cityCount = Object.keys(country).length;
        for (const city of Object.keys(country)) {
            placeCount += Object.keys(country[city]).length;
        }

        return { cityCount, placeCount };
    };

    const getCountsForCity = (countryName: string, cityName: string) => {
        return Object.keys(places[countryName][cityName]).length;
    };

    const { totalCountries, totalCities, totalPlaces } = getTotalCounts();

    return (
        <div className="container mt-5">
            <h1 className="mb-4">Overview</h1>
            <ul className="list-group mb-4">
                <li className="list-group-item">
                    <strong>Countries:</strong> {totalCountries}
                </li>
                <li className="list-group-item">
                    <strong>Cities:</strong> {totalCities}
                </li>
                <li className="list-group-item">
                    <strong>Places:</strong> {totalPlaces}
                </li>
            </ul>
            {Object.keys(places).map(countryName => {
                const { cityCount, placeCount } = getCountsForCountry(countryName);
                return (
                    <div key={countryName} className="mb-4 card shadow-sm">
                        <div className="card-header bg-dark text-white">
                            <h5 className="card-title m-0">{countryName} ({cityCount} cities, {placeCount} places)</h5>
                        </div>
                        <div className="card-body">
                            {Object.keys(places[countryName]).map(cityName => (
                                <div key={cityName} className="mb-2">
                                    <h6 className="text-secondary">
                                        <Link to={`/city/${countryName}/${cityName}`} className="text-decoration-none text-dark">
                                            {cityName} ({getCountsForCity(countryName, cityName)} places)
                                        </Link>
                                    </h6>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default HomePage;
