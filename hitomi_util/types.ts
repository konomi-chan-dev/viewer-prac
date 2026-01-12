
export type ImageInfo = {
    hash: string;
    name: string;
    width: number;
    height: number;
    hasavif: boolean;
};
export type GalleryInfo = {
    related: number[];
    galleryurl: string;
    type: string;
    title: string;
    language: string;
    language_localname: string;
    language_url: string;
    blocked: boolean;
    date: string;

    groups: {
        group: string;
        url: string;
    }[] | null;
    artists: {
        artist: string;
        url: string;
    }[] | null;
    parodys: {
        parody: string;
        url: string;
    }[] | null;
    characters: {
        character: string;
        url: string;
    }[] | null;
    tags: {
        url: string;
        tag: string;
        male: string;
        female: string;
    }[] | null;

    
    files: ImageInfo[];
}
export type GallerySearchOption = {
    type: string;
    name: string;
    populer: 'week' | 'month' | 'year' | '';
    language: string;
    page: number;
}