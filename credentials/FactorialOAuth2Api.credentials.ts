import { type Icon, type ICredentialType, type INodeProperties } from "n8n-workflow";

// Generated with ts-morph
export class FactorialOAuth2Api implements ICredentialType {
  name = "factorialOAuth2Api";
  extends = [
        "oAuth2Api"
    ];
  displayName = "Factorial OAuth2 API";
  icon: Icon = {
        light: "file:../nodes/Factorial/factorial.svg",
        dark: "file:../nodes/Factorial/factorial.dark.svg"
    };
  documentationUrl = "https://api.factorialhr.com/api/2026-01-01/resources";
  properties: INodeProperties[] = [
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
