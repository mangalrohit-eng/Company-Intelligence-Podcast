# Fix AWS Permissions for Deployment

## The Issue

Your AWS user `Podcast` lacks the necessary permissions to deploy infrastructure using AWS CDK.

**Error**: `User: arn:aws:iam::098478926952:user/Podcast is not authorized to perform: cloudformation:DescribeStacks`

---

## Solution: Add IAM Permissions

You need to add permissions to your AWS user via the AWS Console.

### Option 1: Add AdministratorAccess (Recommended for Development)

**Easiest and fastest - gives full AWS access:**

1. **Sign in to AWS Console**: https://console.aws.amazon.com
2. **Go to IAM**: Search for "IAM" in the top search bar
3. **Click "Users"** in the left sidebar
4. **Click on "Podcast"** (your user)
5. **Click "Add permissions"** button
6. **Select "Attach policies directly"**
7. **Search for and check**: `AdministratorAccess`
8. **Click "Next"** then **"Add permissions"**

**Done!** Return to the terminal and continue deployment.

---

### Option 2: Add Minimal Required Permissions (More Secure)

**If you want to limit permissions to only what's needed:**

Create a custom policy with these permissions:

1. **Go to IAM** → **Policies** → **Create Policy**
2. **Switch to JSON tab**
3. **Paste this policy**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "s3:*",
        "iam:*",
        "lambda:*",
        "apigateway:*",
        "dynamodb:*",
        "cognito-idp:*",
        "states:*",
        "events:*",
        "sqs:*",
        "secretsmanager:*",
        "ses:*",
        "cloudfront:*",
        "elasticache:*",
        "opensearch:*",
        "logs:*",
        "ec2:DescribeAvailabilityZones",
        "ec2:DescribeVpcs",
        "ec2:DescribeSubnets",
        "ec2:DescribeSecurityGroups"
      ],
      "Resource": "*"
    }
  ]
}
```

4. **Click "Next"**
5. **Name it**: `PodcastPlatformDeployment`
6. **Click "Create policy"**
7. **Go back to Users** → **Podcast** → **Add permissions**
8. **Attach the new policy**: `PodcastPlatformDeployment`

---

## Verify Permissions

After adding permissions, verify they work:

```powershell
# Test CloudFormation access
aws cloudformation describe-stacks

# Should return: []  (empty array, not an error)
```

---

## Then Continue Deployment

Once permissions are added:

```powershell
# 1. Bootstrap CDK
cdk bootstrap aws://098478926952/us-east-1

# 2. Deploy infrastructure
npm run deploy
```

---

## Security Note

### For Production:
- Use Option 2 (minimal permissions)
- Create separate users for different purposes
- Enable MFA (Multi-Factor Authentication)
- Regularly rotate access keys

### For Development/Learning:
- Option 1 (AdministratorAccess) is fine
- Just be careful not to accidentally delete resources

---

## Next Steps After Adding Permissions

1. ✅ Add permissions in AWS Console (using Option 1 or 2 above)
2. 🔄 Return to terminal
3. 🚀 Continue deployment (I'll handle this automatically)

---

**Current Status:**
- ✅ AWS CLI installed
- ✅ AWS credentials configured
- ✅ AWS CDK installed
- ⏳ Waiting for IAM permissions to be added

Once you add the permissions, just let me know and I'll continue the deployment!

