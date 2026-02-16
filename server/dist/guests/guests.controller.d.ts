import { FirebaseService } from '../firebase/firebase.service';
export declare class GuestsController {
    private firebaseService;
    constructor(firebaseService: FirebaseService);
    getGuest(id: string): Promise<{
        id: string;
    }>;
    postGuest(body: any): Promise<{
        id: string;
    }>;
    updateGuest(id: string, updateData: any): Promise<{
        id: any;
    }>;
    deleteGuest(id: string, body?: any): Promise<{
        success: boolean;
        message: string;
        id: any;
    }>;
}
