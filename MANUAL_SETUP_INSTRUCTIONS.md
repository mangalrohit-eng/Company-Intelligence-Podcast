# Manual AWS CodeBuild Setup Instructions

## Step 1: Create IAM Role for CodeBuild

### Trust Policy JSON
Copy and paste this JSON into the AWS Console:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "codebuild.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Instructions:
1. Go to **AWS Console** → **IAM** → **Roles** → **Create role**
2. Select **AWS service** → **CodeBuild**
3. Click **Next**
4. On the **Add permissions** page, click **Next** (we'll add policies after)
5. On the **Name, review, and create** page:
   - **Role name**: `codebuild-podcast-platform-build-role`
   - Click **Create role**
6. After the role is created, click on the role name
7. Go to the **Trust relationships** tab
8. Click **Edit trust policy**
9. Replace the existing JSON with the trust policy JSON above
10. Click **Update policy**

### Attach Required Policies:
1. Still in the role page, go to the **Permissions** tab
2. Click **Add permissions** → **Attach policies**
3. Search for and attach these three policies:
   - `CloudWatchLogsFullAccess`
   - `AmazonEC2ContainerRegistryPowerUser`
   - `AmazonS3FullAccess`
4. Click **Add permissions**

---

## Step 2: Create CodeBuild Project

### CodeBuild Project JSON
Copy and paste this JSON (with your account ID: `098478926952`):

```json
{
  "name": "podcast-platform-build",
  "description": "Build Docker image for podcast platform app",
  "source": {
    "type": "S3",
    "location": "podcast-platform-source-bucket-098478926952/source.zip"
  },
  "artifacts": {
    "type": "NO_ARTIFACTS"
  },
  "environment": {
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/standard:7.0",
    "computeType": "BUILD_GENERAL1_MEDIUM",
    "privilegedMode": true,
    "environmentVariables": [
      {
        "name": "ACCOUNT_ID",
        "value": "098478926952"
      },
      {
        "name": "REPO_NAME",
        "value": "podcast-platform-app"
      },
      {
        "name": "AWS_DEFAULT_REGION",
        "value": "us-east-1"
      }
    ]
  },
  "serviceRole": "arn:aws:iam::098478926952:role/codebuild-podcast-platform-build-role"
}
```

### Instructions (Option A - Using AWS CLI with JSON file - RECOMMENDED):

**This is where you use the JSON file! The AWS Console doesn't accept JSON directly.**

1. The JSON file `codebuild-project.json` is already created in your project directory
2. Run this command from your project directory:
```powershell
aws codebuild create-project --cli-input-json file://codebuild-project.json --region us-east-1
```

**If that doesn't work, try with the full path:**
```powershell
$jsonPath = (Resolve-Path codebuild-project.json).Path.Replace('\', '/')
aws codebuild create-project --cli-input-json "file:///$jsonPath" --region us-east-1
```

**Or use the absolute path directly:**
```powershell
aws codebuild create-project --cli-input-json file:///C:/Users/rohit.m.mangal/Cursor/company-intel-podcast/codebuild-project.json --region us-east-1
```

---

### Instructions (Option B - Using AWS Console - Manual Form):

**Note**: The AWS Console doesn't accept JSON directly. You'll need to fill out the form manually using the values from the JSON above.

1. Go to **AWS Console** → **CodeBuild** → **Build projects** → **Create build project**
2. Fill in the form with these values (from the JSON above):
   - **Project name**: `podcast-platform-build`
   - **Description**: `Build Docker image for podcast platform app`
   - **Source provider**: **Amazon S3**
   - **Bucket name**: `podcast-platform-source-bucket-098478926952`
   - **S3 object key or file path**: `source.zip`
   - **Artifacts**: **No artifacts**
   - **Environment**:
     - **Operating system**: **Ubuntu**
     - **Runtime(s)**: **Standard**
     - **Image**: **aws/codebuild/standard:7.0**
     - **Image version**: **Always use the latest image for this runtime version**
     - **Environment type**: **Linux**
     - **Compute**: **3 GB memory, 2 vCPUs** (BUILD_GENERAL1_MEDIUM)
     - **Privileged**: ✅ **Enable this flag** (for Docker builds)
   - **Service role**: `arn:aws:iam::098478926952:role/codebuild-podcast-platform-build-role`
   - **Environment variables** (click "Add environment variable" for each):
     - Name: `ACCOUNT_ID`, Value: `098478926952`
     - Name: `REPO_NAME`, Value: `podcast-platform-app`
     - Name: `AWS_DEFAULT_REGION`, Value: `us-east-1`
3. Click **Create build project**

---

## Step 3: Verify Setup

### Check IAM Role:
```powershell
aws iam get-role --role-name codebuild-podcast-platform-build-role
```

### Check CodeBuild Project:
```powershell
aws codebuild list-projects --region us-east-1
```

### Check ECR Repository:
```powershell
aws ecr describe-repositories --repository-names podcast-platform-app --region us-east-1
```

---

## Next Steps

After manual setup is complete, you can:
1. Create a source zip file: `.\scripts\prepare-codebuild-source.ps1`
2. Upload to S3 and trigger build: `.\scripts\trigger-codebuild.ps1`

---

## Troubleshooting

### If IAM Role creation fails:
- Make sure you have IAM permissions to create roles
- Verify the trust policy JSON is valid (no extra commas, proper quotes)

### If CodeBuild project creation fails:
- Verify the IAM role exists and has the correct ARN
- Check that the S3 bucket name is correct
- Ensure all environment variables are set correctly

### If you get "Invalid JSON" errors:
- Copy the JSON exactly as shown above
- Make sure there are no hidden characters
- Validate the JSON using an online JSON validator before pasting

