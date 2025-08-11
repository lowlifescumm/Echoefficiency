# Deploying to Render

This is a step-by-step guide to deploying your Node.js application to Render.

## 1. Create a Render Account

First, you'll need a Render account. You can sign up at [render.com](https://render.com/).

## 2. Create a New Web Service

From the Render dashboard, click **New +** and select **Web Service**.

## 3. Connect Your Repository

Connect your GitHub (or GitLab/Bitbucket) account and select the repository for this application.

## 4. Configure Your Web Service

On the configuration screen, fill in the following details:

*   **Name**: Choose a name for your service (e.g., `echoefficiency`).
*   **Region**: Select a region close to you or your users.
*   **Branch**: Choose the branch you want to deploy (e.g., `main` or `master`).
*   **Root Directory**: Leave this blank if your `package.json` is in the root of the repository.
*   **Runtime**: Select **Node**.
*   **Build Command**: `npm install`
*   **Start Command**: `node server.js`
*   **Instance Type**: The **Free** plan is a good starting point.

## 5. Add a Database & Redis

This application requires both a MongoDB database and a Redis instance for background jobs.

### MongoDB Setup
You have two main options:

*   **Use Render's MongoDB**: You can create a new MongoDB instance directly on Render. It's easy to set up and will be in the same region as your web service.
*   **Use MongoDB Atlas**: If you prefer, you can use a free-tier database from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).

Once you have your database, you will get a **connection string** (URL). You'll need this for the environment variables.

### Redis Setup
From the Render dashboard, click **New +** and select **Redis**. Create a new Redis instance. The free tier is sufficient to start. Once created, Render will provide you with a **Redis URL**.

## 6. Add Environment Variables

This is the most important step. In the **Environment** section of your web service settings, add the following variables:

*   `DATABASE_URL`: The connection string for your MongoDB database.
*   `SESSION_SECRET`: A long, random string that you create. You can use a password generator to create this.
*   `STRIPE_PUBLIC_KEY`: Your "Publishable key" from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys).
*   `STRIPE_SECRET_KEY`: Your "Secret key" from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys).
*   `STRIPE_PRICE_ID`: The ID of the subscription **Price** in Stripe. You can find this in your Stripe Dashboard. Go to the Product, and under the "Pricing" section, you will find the Price ID (it starts with `price_`).
*   `REDIS_URL`: The connection URL for your Redis instance from the Render dashboard.

### Email Configuration (Optional)

The following variables are for sending password reset emails. If you do not configure them, the application will still run, and password reset links will be printed to the console logs instead.

*   `EMAIL_HOST`: Your SMTP host (e.g., `smtp.mailgun.org`).
*   `EMAIL_PORT`: Your SMTP port (e.g., 587).
*   `EMAIL_USER`: Your SMTP username.
*   `EMAIL_PASS`: Your SMTP password.
*   `EMAIL_FROM`: The "From" address for sending emails (e.g., `noreply@yourdomain.com`).

**Important**: Do not share your `SESSION_SECRET` or `STRIPE_SECRET_KEY` with anyone.

## 7. Create the Web Service

Click the **Create Web Service** button at the bottom of the page. Render will now build and deploy your application. You can watch the progress in the logs.

## 8. Check the Deployment

Once the deployment is complete, your application will be available at the URL provided by Render (e.g., `https://your-app-name.onrender.com`).

That's it! Your application should now be live on Render.
