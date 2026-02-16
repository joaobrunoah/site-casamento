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
}
