import { OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
export declare class FirebaseService implements OnModuleInit {
    private db;
    private initialized;
    onModuleInit(): void;
    private testEmulatorConnection;
    getFirestore(): admin.firestore.Firestore;
    isInitialized(): boolean;
    getFieldValue(): typeof FieldValue;
}
