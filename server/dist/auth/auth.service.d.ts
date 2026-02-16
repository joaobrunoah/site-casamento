export declare class AuthService {
    private readonly adminHash;
    constructor();
    generateAdminHash(): string;
    validateHash(authHash: string): boolean;
    validateCredentials(user: string, password: string): boolean;
}
