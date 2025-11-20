# Fix Amplify S3 Access - "Could not load credentials from any providers"

## The Problem

Amplify's Next.js API routes are getting the error: `"Could not load credentials from any providers"` when trying to access S3.

**Important:** Amplify's Next.js API routes may not automatically use the service role. They might need explicit AWS credentials via environment variables.

## Solution: Add S3 Permissions to Amplify Service Role

### Step 1: Find Amplify Service Role

1. Go to **AWS Amplify Console** → Your App → **General** → **Service role**
2. Note the IAM role ARN (e.g., `arn:aws:iam::098478926952:role/amplify-Company-Intelligence-Podcast-main-xxxxx`)

### Step 2: Add S3 Permissions

1. Go to **IAM Console** → **Roles**
2. Search for the role name from Step 1 (or click the role ARN link)
3. Click **"Add permissions"** → **"Attach policies"**
4. Search for and select: **`AmazonS3ReadOnlyAccess`** (or `AmazonS3FullAccess` if you need write access)
5. Click **"Add permissions"**

### Step 3: Alternative - Create Custom Policy (More Secure)

If you want to limit access to only your specific bucket:

1. Go to **IAM Console** → **Policies** → **Create policy**
2. Switch to **JSON** tab
3. Paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::podcast-platform-media-098478926952",
        "arn:aws:s3:::podcast-platform-media-098478926952/*"
      ]
    }
  ]
}
```

4. Name it: `AmplifyS3ReadAccess`
5. Click **"Create policy"**
6. Go back to the Amplify service role
7. Click **"Add permissions"** → **"Attach policies"**
8. Search for `AmplifyS3ReadAccess` and attach it

### Step 4: Verify

After adding permissions, wait a few minutes for the changes to propagate, then try accessing a debug JSON file again.

## Why This Happens

- Amplify's service role is created automatically when you set up Amplify
- By default, it only has minimal permissions
- S3 access needs to be explicitly granted
- The AWS SDK uses IAM roles (not environment variables) in Amplify

## Code Changes Already Made

The code has been updated to:
- Use `defaultProvider()` for credentials (supports IAM roles)
- Detect AWS environments properly
- Fallback to known bucket name if env vars aren't set

After adding IAM permissions, the S3 access should work!

