// interfaces.ts

export interface IImage {
    id: number;
    image_name: string;
    url: string;
}

export interface IPlace {
    place_id: number;
    place_name: string;
    wikipedia_link?: string;
    google_maps_link?: string;
    images: IImage[];
}

export interface ICity {
    [placeName: string]: IPlace[];
}

export interface ICountry {
    [cityName: string]: ICity;
}

export interface IResponseStructure {
    [countryName: string]: ICountry;
}