import { FirebaseService } from '../firebase/firebase.service';
export declare class HealthController {
    private firebaseService;
    constructor(firebaseService: FirebaseService);
    root(): {
        status: string;
        message: string;
        service: string;
    };
    health(): {
        status: string;
        message: string;
        service: string;
    };
    testFirestore(): Promise<{
        status: string;
        message: string;
        emulator: string;
        invitesCount: number;
        error?: undefined;
    } | {
        status: string;
        error: string;
        emulator: string;
        message?: undefined;
        invitesCount?: undefined;
    }>;
    getEnv(): {
        NODE_ENV: string;
        isProduction: boolean;
        FIRESTORE_EMULATOR_HOST: string;
        ADMIN_USER: string;
        ADMIN_PASSWORD: string;
        GCP_PROJECT: string;
        GCLOUD_PROJECT: string;
        GOOGLE_CLOUD_PROJECT: string;
        firebaseInitialized: boolean;
    };
}
