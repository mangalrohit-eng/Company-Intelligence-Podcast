/**
 * Script to add org_id to existing Cognito users
 */

import { 
  CognitoIdentityProviderClient, 
  AdminUpdateUserAttributesCommand,
  ListUsersCommand 
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });
const USER_POOL_ID = 'us-east-1_lvLcARe2P';

async function fixUser(email: string) {
  console.log(`\n🔧 Fixing org_id for user: ${email}`);
  
  try {
    // List users to find the one with this email
    const listResponse = await client.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${email}"`,
    }));

    if (!listResponse.Users || listResponse.Users.length === 0) {
      console.error(`❌ User not found: ${email}`);
      return;
    }

    const user = listResponse.Users[0];
    const username = user.Username!;

    // Check if user already has org_id
    const orgIdAttr = user.Attributes?.find(attr => attr.Name === 'custom:org_id');
    if (orgIdAttr && orgIdAttr.Value) {
      console.log(`✅ User already has org_id: ${orgIdAttr.Value}`);
      return;
    }

    // Generate a unique org_id
    const orgId = `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Update user attributes
    await client.send(new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      UserAttributes: [
        {
          Name: 'custom:org_id',
          Value: orgId,
        },
      ],
    }));

    console.log(`✅ Successfully added org_id: ${orgId}`);
    console.log(`\n📝 User ${email} is now ready to create podcasts!`);
    console.log(`\n⚠️  IMPORTANT: User must log out and log back in for changes to take effect!`);

  } catch (error: any) {
    console.error(`❌ Error fixing user: ${error.message}`);
  }
}

async function fixAllUsers() {
  console.log('\n🔧 Fixing org_id for ALL users without it...\n');
  
  try {
    const listResponse = await client.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
    }));

    if (!listResponse.Users || listResponse.Users.length === 0) {
      console.log('No users found');
      return;
    }

    console.log(`Found ${listResponse.Users.length} users\n`);

    for (const user of listResponse.Users) {
      const email = user.Attributes?.find(attr => attr.Name === 'email')?.Value;
      const orgId = user.Attributes?.find(attr => attr.Name === 'custom:org_id')?.Value;
      const username = user.Username!;

      console.log(`\n👤 User: ${email}`);

      if (orgId) {
        console.log(`  ✅ Already has org_id: ${orgId}`);
        continue;
      }

      // Generate and set org_id
      const newOrgId = `org-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await client.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        UserAttributes: [
          {
            Name: 'custom:org_id',
            Value: newOrgId,
          },
        ],
      }));

      console.log(`  ✅ Added org_id: ${newOrgId}`);
    }

    console.log(`\n✅ All users fixed!`);
    console.log(`\n⚠️  IMPORTANT: All users must log out and log back in for changes to take effect!`);

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function main() {
  const email = process.argv[2];

  if (email) {
    await fixUser(email);
  } else {
    await fixAllUsers();
  }
}

main();

