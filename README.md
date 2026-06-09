# Jchatt Project

Welcome to the Jchatt project repository!

## For the Team: How to get started

Since we are using Git to collaborate, you do not need to upload the entire 1.6GB of files. The `node_modules` and build files are ignored by git to keep the repository fast and lightweight.

Here is what you need to do when you clone this project:

### 1. Install Dependencies
The main web application is located inside the `jchatt_web_v2` directory. You need to install the Node.js packages before you can run the app locally.

Open your terminal, navigate to the web app directory, and install dependencies:
```bash
cd jchatt_web_v2
npm install
```

### 2. Run the App Locally
To start the local development server (powered by Vite):
```bash
npm run dev
```
This will start a local server (usually on `http://localhost:5173`) where you can test your changes.

### 3. Build for Production
When we deploy to Firebase, the app needs to be "built" first. 
```bash
npm run build
```
This creates a `dist` folder, which is the folder Firebase Hosting actually serves to users (as defined in our `firebase.json`).

### 4. Deploying to Firebase (Manual Deployment)
If you have access to deploy directly, you can run:
```bash
firebase deploy --only hosting
```
*(Note: You will need to run `firebase login` first if you haven't authenticated on your machine).*

---

## Setting up GitHub Actions for Automatic Deployment (CI/CD)

Instead of manually deploying, we can connect this GitHub repository to Firebase. When any team member pushes their code to the `main` branch, Firebase will automatically build and deploy the app!

**To set this up (Admin only):**
1. Run `firebase init hosting:github` in the terminal.
2. Log into your GitHub account when prompted.
3. Select this repository.
4. It will automatically generate GitHub action workflows in `.github/workflows/`. Commit these to the repository!
