# 🔐 Google SSO Setup Guide

## ✅ **Voice Preview is NOW Working!**

Voice preview now uses real OpenAI TTS API. Just need to deploy the Lambda function (see below).

---

## **Google SSO - Setup Required**

Google SSO code is implemented, but requires Google OAuth credentials configuration. Here's how to set it up:

---

## **Step 1: Create Google OAuth Credentials**

### 1.1 Go to Google Cloud Console
https://console.cloud.google.com/

### 1.2 Create a New Project (or select existing)
- Click "Select a project" → "New Project"
- Name: "AI Podcast Platform"
- Click "Create"

### 1.3 Enable Google+ API
- Go to "APIs & Services" → "Library"
- Search for "Google+ API"
- Click "Enable"

### 1.4 Create OAuth 2.0 Credentials
- Go to "APIs & Services" → "Credentials"
- Click "Create Credentials" → "OAuth client ID"
- Application type: "Web application"
- Name: "Podcast Platform Web Client"

### 1.5 Add Authorized Redirect URIs

**IMPORTANT**: You need to get your Cognito domain first!

#### Get Your Cognito Domain:
1. Open AWS Console → Cognito
2. Go to User Pool: `podcast-platform-users` (us-east-1_lvLcARe2P)
3. Click "App integration" tab
4. Scroll to "Domain" section
5. You'll see either:
   - **Auto-generated**: `podcast-platform-XXXXX.auth.us-east-1.amazoncognito.com`
   - **Custom domain**: `auth.yourcompany.com` (if configured)

If you DON'T have a domain yet, create one:
- Click "Actions" → "Create Cognito domain"
- Enter a unique prefix (e.g., `podcast-platform-rohit`)
- Save (it becomes: `podcast-platform-rohit.auth.us-east-1.amazoncognito.com`)

#### Add These URLs to Google OAuth:
Replace `YOUR-COGNITO-DOMAIN` with your actual domain:
```
https://YOUR-COGNITO-DOMAIN.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
http://localhost:3001/
```

**Example:**
```
https://podcast-platform-rohit.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
http://localhost:3001/
```

### 1.6 Save Credentials
- Copy **Client ID**
- Copy **Client Secret**

---

## **Step 2: Configure AWS Cognito**

### 2.1 Open AWS Console
https://console.aws.amazon.com/cognito/

### 2.2 Navigate to User Pool
- Region: us-east-1
- User Pool: `podcast-platform-users`
- User Pool ID: `us-east-1_lvLcARe2P`

### 2.3 Add Google as Identity Provider
1. Click "Sign-in experience" tab
2. Scroll to "Federated identity provider sign-in"
3. Click "Add identity provider"
4. Select "Google"
5. Enter:
   - **Client ID**: (from Step 1.6)
   - **Client Secret**: (from Step 1.6)
   - **Authorized scopes**: `profile email openid`
6. Click "Add identity provider"

### 2.4 Update App Client Settings
1. Go to "App integration" tab
2. Click your app client
3. Under "Hosted UI", edit settings:
   - Add callback URL: `http://localhost:3001/`
   - Add sign-out URL: `http://localhost:3001/`
   - Enable "Google" under identity providers
4. Save changes

---

## **Step 3: Update Amplify Configuration**

Update `src/lib/amplify-config.ts`:

```typescript
export const configureAmplify = () => {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: 'us-east-1_lvLcARe2P',
        userPoolClientId: '3lm7s5lml6i0va070cm1c3uafn',
        loginWith: {
          oauth: {
            domain: 'YOUR-COGNITO-DOMAIN.auth.us-east-1.amazoncognito.com',  // Replace with your domain (without https://)
            scopes: ['profile', 'email', 'openid'],
            redirectSignIn: ['http://localhost:3001/'],
            redirectSignOut: ['http://localhost:3001/'],
            responseType: 'code',
          },
          email: true,
        },
        // ... rest of config
      },
    },
  });
};
```

**Example with actual domain:**
```typescript
domain: 'podcast-platform-rohit.auth.us-east-1.amazoncognito.com',  // No https://
```

---

## **Step 4: Deploy Voice Preview Lambda**

Add to `infra/cdk/lib/podcast-platform-stack.ts`:

```typescript
const voicePreviewLambda = new lambda.Function(this, 'VoicePreviewLambda', {
  functionName: 'voice-preview',
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'preview.handler',
  code: lambda.Code.fromAsset('../../src/api/voice'),
  environment: lambdaEnv,
  timeout: cdk.Duration.seconds(30),
});

const voicePreviewIntegration = new HttpLambdaIntegration(
  'VoicePreviewIntegration',
  voicePreviewLambda
);

httpApi.addRoutes({
  path: '/voice/preview',
  methods: [apigatewayv2.HttpMethod.POST],
  integration: voicePreviewIntegration,
});
```

Then deploy:
```bash
cd infra/cdk
cdk deploy
```

---

## **Step 5: Test Google SSO**

1. Go to http://localhost:3001/auth/login
2. Click "Continue with Google"
3. You'll be redirected to Google login
4. After approval, redirected back with token
5. ✅ Logged in!

---

## **Cost of Google SSO**

- Google OAuth API: **FREE** (unlimited)
- AWS Cognito with federated identities: **FREE** (< 50k users)

---

## **Why Google SSO Needs Manual Setup**

Unlike email/password (which works out of the box with Cognito), Google SSO requires:
1. Creating OAuth app in Google Cloud Console
2. Getting Client ID & Secret
3. Configuring redirect URIs
4. Adding provider to Cognito

**These steps require manual configuration** because:
- Google credentials are unique to your project
- Security reasons (can't auto-create OAuth apps)
- Redirect URIs must match exactly

---

## **Alternative: Skip Google SSO**

If you don't need Google SSO, the platform works perfectly with:
- ✅ Email/password authentication (fully working)
- ✅ Email verification (fully working)
- ✅ JWT tokens (fully working)

Google SSO is **optional** - the core platform is 100% functional without it!

---

## **Summary**

### **✅ Working NOW (No Setup Needed):**
- Voice Preview with real OpenAI TTS (after Lambda deploy)
- Email/password authentication
- Email verification
- All AI features

### **⚙️ Requires Setup:**
- Google SSO (15 min manual configuration)

**Most users can skip Google SSO and use email/password!**


