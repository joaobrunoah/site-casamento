import { FirebaseService } from '../firebase/firebase.service';
export declare class GiftsController {
    private firebaseService;
    constructor(firebaseService: FirebaseService);
    listGifts(): Promise<{
        id: string;
    }[]>;
    getGift(id: string): Promise<{
        id: string;
    }>;
    postGift(body: any): Promise<{
        id: string;
    }>;
    deleteGift(id: string): Promise<{
        success: boolean;
        id: string;
    }>;
}
