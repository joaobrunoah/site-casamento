import { OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
export declare class FirebaseService implements OnModuleInit {
    private db;
    private initialized;
    onModuleInit(): void;
    private testEmulatorConnection;
    private seedGifts;
    getFirestore(): admin.firestore.Firestore;
    isInitialized(): boolean;
    getFieldValue(): typeof FieldValue;
    getStorage(): admin.storage.Storage;
    downloadAndUploadImage(imageUrl: string, destinationPath: string): Promise<string>;
}
