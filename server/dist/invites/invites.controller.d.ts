import { FirebaseService } from '../firebase/firebase.service';
export declare class InvitesController {
    private firebaseService;
    constructor(firebaseService: FirebaseService);
    private fetchGuestsForInvite;
    listInvites(): Promise<{
        guests: any[];
        id: string;
    }[]>;
    getInvite(id: string): Promise<{
        guests: any[];
        id: string;
    }>;
    postInvite(body: any): Promise<{
        guests: any[];
        id: string;
    }>;
    updateInvite(id: string, updateData: any): Promise<{
        guests: any[];
        id: any;
    }>;
    deleteInvite(id: string, body?: any): Promise<{
        success: boolean;
        message: string;
        id: any;
    }>;
    updateInviteConfirmation(body: any): Promise<{
        guests: any[];
        success: boolean;
        id: any;
    }>;
}
