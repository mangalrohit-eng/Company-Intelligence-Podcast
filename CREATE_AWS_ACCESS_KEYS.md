# How to Create AWS Access Keys for Amplify

## Step-by-Step Guide

### Step 1: Create IAM User

1. **Go to AWS Console**
   - Sign in: https://console.aws.amazon.com
   - Search for "IAM" in the top search bar
   - Click **"IAM"** service

2. **Navigate to Users**
   - In the left sidebar, click **"Users"**
   - Click the **"Create user"** button (top right)

3. **Configure User**
   - **User name**: `amplify-api-s3-access` (or any name you prefer)
   - **Uncheck** "Provide user access to the AWS Management Console" (we only need programmatic access)
   - Click **"Next"**

### Step 2: Attach S3 Permissions

1. **Select Permission Type**
   - Click **"Attach policies directly"** tab
   - In the search box, type: `AmazonS3ReadOnlyAccess`
   - **Check the box** next to `AmazonS3ReadOnlyAccess`
   - Click **"Next"**

2. **Review and Create**
   - Review the settings
   - Click **"Create user"**

### Step 3: Create Access Keys

1. **Open the User**
   - Click on the user name you just created (`amplify-api-s3-access`)
   - Click the **"Security credentials"** tab

2. **Create Access Key**
   - Scroll down to **"Access keys"** section
   - Click **"Create access key"** button

3. **Select Use Case**
   - Select: **"Application running outside AWS"**
   - Click **"Next"**
   - (Optional) Add a description: "For Amplify Next.js API routes to access S3"
   - Click **"Next"**

4. **Create and Copy Keys**
   - Click **"Create access key"**
   - **IMPORTANT**: You'll see two values:
     - **Access key ID**: Starts with `AKIA...` (you can see this later)
     - **Secret access key**: Long string (you can ONLY see this once!)
   - **Copy both values immediately** and store them securely
   - Click **"Done"**

### Step 4: Add to Amplify Environment Variables

1. **Go to Amplify Console**
   - Go to: https://console.aws.amazon.com/amplify
   - Click on your app: **Company-Intelligence-Podcast**

2. **Open Environment Variables**
   - In the left sidebar, click **"Environment variables"**
   - Click **"Manage variables"** or **"Add variable"**

3. **Add Variables**
   - Click **"Add variable"**
   - Add first variable:
     - **Key**: `AMPLIFY_ACCESS_KEY_ID`
     - **Value**: (paste your Access key ID)
   - Click **"Add variable"** again
   - Add second variable:
     - **Key**: `AMPLIFY_SECRET_ACCESS_KEY`
     - **Value**: (paste your Secret access key)
   - Click **"Save"**

### Step 5: Wait for Rebuild

- Amplify will automatically trigger a rebuild
- Wait ~5-10 minutes for the build to complete
- Check the build status in the Amplify Console

## Security Notes

⚠️ **Important Security Practices:**
- Never commit access keys to Git
- Store them securely (password manager, AWS Secrets Manager)
- Rotate keys periodically (every 90 days recommended)
- Delete unused access keys
- Use IAM roles when possible (but Amplify API routes need explicit keys)

## Troubleshooting

**If you lose the Secret Access Key:**
- You cannot retrieve it again
- Delete the old access key and create a new one

**If access keys don't work:**
- Verify the IAM user has `AmazonS3ReadOnlyAccess` policy attached
- Check that the keys are correctly set in Amplify (no extra spaces)
- Wait for Amplify rebuild to complete
- Check Amplify build logs for errors

## Alternative: Custom Policy (More Secure)

Instead of `AmazonS3ReadOnlyAccess`, you can create a custom policy that only allows access to your specific bucket:

1. **IAM Console** → **Policies** → **Create policy**
2. Switch to **JSON** tab
3. Paste:
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
4. Name it: `AmplifyS3ReadOnlyAccess`
5. Attach this policy to your IAM user instead of `AmazonS3ReadOnlyAccess`

