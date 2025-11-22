# AWS Console - Manual CodeBuild Project Setup

## Step-by-Step Instructions

### 1. Navigate to CodeBuild
1. Go to **AWS Console**: https://console.aws.amazon.com
2. Make sure you're in region: **us-east-1** (check top right)
3. Search for **"CodeBuild"** in the search bar
4. Click on **CodeBuild** service
5. Click **Build projects** in the left sidebar
6. Click **Create build project** button

---

### 2. Project Configuration

#### **Project name**
- Enter: `podcast-platform-build`

#### **Description** (optional)
- Enter: `Build Docker image for podcast platform app`

---

### 3. Source Configuration

#### **Source provider**
- Select: **Amazon S3**

#### **Bucket name**
- Enter: `podcast-platform-source-bucket-098478926952`
- **Note**: If this bucket doesn't exist yet, you'll need to create it first or use a different bucket name

#### **S3 object key or file path**
- Enter: `source.zip`

---

### 4. Primary Source Version

- Leave as default: **Use the latest source version**

---

### 5. Environment Configuration

#### **Environment image**
- Select: **Managed image**
- **Operating system**: **Ubuntu**
- **Runtime(s)**: **Standard**
- **Image**: **aws/codebuild/standard:7.0**
- **Image version**: **Always use the latest image for this runtime version**

#### **Environment type**
- Select: **Linux**

#### **Compute**
- Select: **3 GB memory, 2 vCPUs** (this is BUILD_GENERAL1_MEDIUM)

#### **Privileged**
- ✅ **Check this box** (Enable this flag if you want to build Docker images)
- This is required for Docker builds

#### **Service role**
- Select: **Existing service role**
- Enter or select: `arn:aws:iam::098478926952:role/codebuild-podcast-platform-build-role`
- **Note**: Make sure you created this IAM role in Step 1 of the manual setup

---

### 6. Buildspec

- Leave as: **Use a buildspec file**

---

### 7. Artifacts

#### **Type**
- Select: **No artifacts**

---

### 8. Logs

- Leave CloudWatch Logs enabled (default)
- **Log group name**: Will be auto-generated
- **Stream name**: Will be auto-generated

---

### 9. Environment Variables

Click **Add environment variable** for each of these:

#### Variable 1:
- **Name**: `ACCOUNT_ID`
- **Value**: `098478926952`
- **Type**: Plaintext

#### Variable 2:
- **Name**: `REPO_NAME`
- **Value**: `podcast-platform-app`
- **Type**: Plaintext

#### Variable 3:
- **Name**: `AWS_DEFAULT_REGION`
- **Value**: `us-east-1`
- **Type**: Plaintext

---

### 10. Create the Project

1. Scroll to the bottom
2. Review all your settings
3. Click **Create build project**

---

## Verification

After creating the project, you should see:
- ✅ Success message
- Project appears in the Build projects list
- Project name: `podcast-platform-build`

---

## Troubleshooting

### If the S3 bucket doesn't exist:
1. Go to **S3** service in AWS Console
2. Click **Create bucket**
3. Bucket name: `podcast-platform-source-bucket-098478926952`
4. Region: `us-east-1`
5. Click **Create bucket**
6. Then come back to CodeBuild and try again

### If the IAM role doesn't exist:
1. Go back to **Step 1** in `MANUAL_SETUP_INSTRUCTIONS.md`
2. Create the IAM role first: `codebuild-podcast-platform-build-role`
3. Then come back to create the CodeBuild project

### If you get permission errors:
- Make sure your AWS user has permissions to:
  - Create CodeBuild projects
  - Access the S3 bucket
  - Use the IAM role

---

## Next Steps

Once the project is created:
1. You can test it by creating a source zip file
2. Upload it to the S3 bucket
3. Start a build manually from the CodeBuild console

