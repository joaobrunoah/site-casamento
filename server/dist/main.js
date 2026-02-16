"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    console.log('🚀 Starting NestJS application bootstrap...');
    console.log(`📋 Node version: ${process.version}`);
    console.log(`📋 Platform: ${process.platform}`);
    console.log(`📋 PORT: ${process.env.PORT || '8080 (default)'}`);
    console.log(`📋 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    try {
        console.log('🔧 Creating NestJS application...');
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        console.log('✅ NestJS application created successfully');
        app.enableCors({
            origin: '*',
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
            allowedHeaders: 'Content-Type, Authorization, X-Auth-Hash',
            maxAge: 3600,
        });
        const port = process.env.PORT || 8080;
        const host = '0.0.0.0';
        await app.listen(port, host);
        console.log(`🚀 Application is running on: http://${host}:${port}`);
        console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔧 PORT env var: ${process.env.PORT || 'not set (using default 8080)'}`);
    }
    catch (error) {
        console.error('❌ Failed to start application:', error);
        process.exit(1);
    }
}
bootstrap().catch((error) => {
    console.error('❌ Unhandled error during bootstrap:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map