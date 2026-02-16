import { AuthService } from '../auth/auth.service';
import { FirebaseService } from '../firebase/firebase.service';
export declare class ConfigController {
    private firebaseService;
    private authService;
    constructor(firebaseService: FirebaseService, authService: AuthService);
    getConfig(): Promise<{
        success: boolean;
        config: {
            'show-confirmation-form': boolean;
            'show-gifts-list': boolean;
        };
    } | {
        success: boolean;
        config: FirebaseFirestore.DocumentData;
    }>;
    updateConfig(updateData: any): Promise<{
        success: boolean;
        config: FirebaseFirestore.DocumentData;
    }>;
    login(body: {
        user: string;
        password: string;
    }): Promise<{
        success: boolean;
        message: string;
        hash: string;
    }>;
}
