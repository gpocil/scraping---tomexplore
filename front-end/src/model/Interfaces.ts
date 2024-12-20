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
