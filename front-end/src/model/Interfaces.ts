// interfaces.ts

export interface IImage {
    id: number;
    image_name: string;
    url: string;
    source: string | null;
}

export interface IPlace {
    place_id: number;
    place_name: string;
    place_name_original?: string;
    wikipedia_link?: string;
    google_maps_link?: string;
    unsplash_link?: string;
    instagram_link?: string;
    type?: string;
    checked?: boolean;
    needs_attention?: boolean;
    to_be_deleted?: boolean;
    images: IImage[];
    details?: string;
    city_name?: string;
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

export interface ICountResponse {
    place_count: number;
    image_count: number;
}

export interface ICityCountResponse {
    [placeName: string]: ICountResponse;
}

export interface ICountryCountResponse {
    [cityName: string]: ICityCountResponse;
}

export interface IPreviewResponseStructure {
    checked: { [countryName: string]: ICountryCountResponse };
    unchecked: { [countryName: string]: ICountryCountResponse };
    needs_attention: { [countryName: string]: ICountryCountResponse };
    to_be_deleted: { [countryName: string]: ICountryCountResponse };
}

export interface IPlaceDetail {
    place_id: number;
    place_name: string;
    place_name_original?: string;
    wikipedia_link?: string;
    google_maps_link: string;
    instagram_link?: string;
    unsplash_link?: string;
    type?: string;
    needs_attention?: boolean;
    details?: string;
    images: IImage[];
}

export interface IPlacesByCity {
    city: string;
    country: string;
    places: IPlaceDetail[];
}

export interface IPlaceNeedingAttention {
    place_id: number;
    place_name: string;
    place_name_original?: string;
    wikipedia_link?: string;
    google_maps_link: string;
    instagram_link?: string;
    unsplash_link?: string;
    type: string;
    details?: string;
    city_name: string;
    country_name: string;
    images: IImage[];
}
