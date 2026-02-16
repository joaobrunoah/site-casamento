import { FirebaseService } from '../firebase/firebase.service';
export declare class SearchController {
    private firebaseService;
    constructor(firebaseService: FirebaseService);
    private fetchGuestsForInvite;
    private normalizeText;
    private levenshteinDistance;
    private calculateSimilarityScore;
    searchInvitesByGuestName(name: string): Promise<{
        success: boolean;
        message: string;
        invite?: undefined;
        matchedGuest?: undefined;
    } | {
        success: boolean;
        invite: any;
        matchedGuest: any;
        message?: undefined;
    }>;
}
