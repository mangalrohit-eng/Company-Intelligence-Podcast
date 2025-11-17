/**
 * AWS Amplify Configuration for Cognito
 */

import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { defaultStorage } from 'aws-amplify/utils';

export const configureAmplify = () => {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_lvLcARe2P',
        userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '3lm7s5lml6i0va070cm1c3uafn',
        loginWith: {
          email: true,
        },
        signUpVerificationMethod: 'code',
        userAttributes: {
          email: {
            required: true,
          },
          name: {
            required: true,
          },
        },
        passwordFormat: {
          minLength: 8,
          requireLowercase: true,
          requireUppercase: true,
          requireNumbers: true,
          requireSpecialCharacters: true,
        },
      },
    },
  });

  // Configure token storage to use localStorage
  cognitoUserPoolsTokenProvider.setKeyValueStorage(defaultStorage);
};

