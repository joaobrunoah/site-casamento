"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_module_1 = require("./config/config.module");
const auth_module_1 = require("./auth/auth.module");
const payment_module_1 = require("./payment/payment.module");
const firebase_module_1 = require("./firebase/firebase.module");
const config_controller_1 = require("./config/config.controller");
const invites_controller_1 = require("./invites/invites.controller");
const guests_controller_1 = require("./guests/guests.controller");
const gifts_controller_1 = require("./gifts/gifts.controller");
const search_controller_1 = require("./search/search.controller");
const health_controller_1 = require("./health/health.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [firebase_module_1.FirebaseModule, config_module_1.ConfigModule, auth_module_1.AuthModule, payment_module_1.PaymentModule],
        controllers: [
            config_controller_1.ConfigController,
            invites_controller_1.InvitesController,
            guests_controller_1.GuestsController,
            gifts_controller_1.GiftsController,
            search_controller_1.SearchController,
            health_controller_1.HealthController,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map