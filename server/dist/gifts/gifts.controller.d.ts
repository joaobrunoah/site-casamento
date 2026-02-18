import { FirebaseService } from '../firebase/firebase.service';
export declare class GiftsController {
    private firebaseService;
    constructor(firebaseService: FirebaseService);
    private getSoldQuantityByGiftId;
    listGifts(): Promise<{
        estoque: number;
        disponivel: number;
        id: string;
    }[]>;
    getGift(id: string): Promise<{
        estoque: number;
        disponivel: number;
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
