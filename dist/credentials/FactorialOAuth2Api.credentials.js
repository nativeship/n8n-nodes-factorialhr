"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactorialOAuth2Api = void 0;
class FactorialOAuth2Api {
    constructor() {
        this.name = "factorialOAuth2Api";
        this.extends = [
            "oAuth2Api"
        ];
        this.displayName = "Factorial OAuth2 API";
        this.icon = {
            light: "file:../nodes/Factorial/factorial.svg",
            dark: "file:../nodes/Factorial/factorial.dark.svg"
        };
        this.documentationUrl = "https://api.factorialhr.com/api/2026-01-01/resources";
        this.properties = [
            {
                displayName: "Grant Type",
                name: "grantType",
                type: "hidden",
                default: "authorizationCode"
            },
            {
                displayName: "Authorization URL",
                name: "authUrl",
                type: "hidden",
                default: "https://api.factorialhr.com/oauth/authorize"
            },
            {
                displayName: "Access Token URL",
                name: "accessTokenUrl",
                type: "hidden",
                default: "https://api.factorialhr.com/oauth/token"
            },
            {
                displayName: "Scope",
                name: "scope",
                type: "hidden",
                default: ""
            }
        ];
    }
}
exports.FactorialOAuth2Api = FactorialOAuth2Api;
//# sourceMappingURL=FactorialOAuth2Api.credentials.js.map