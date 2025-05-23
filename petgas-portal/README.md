# Petgas Portal

This project is a Next.js application for the Petgas client portal and admin panel. It uses Supabase for the client-side database and authentication, and Firebase for admin panel authentication.

## Prerequisites

* Node.js (v18 or later recommended)
* npm or yarn

## Getting Started

1.  **Clone the repository (if applicable) or ensure you are in the project directory.**

2.  **Set up environment variables:**
    *   Create a copy of `.env.local.example` and name it `.env.local`.
    *   Update `.env.local` with your actual Supabase and Firebase project credentials:
        ```bash
        cp .env.local.example .env.local
        ```
    *   Open `.env.local` and fill in the required values:
        ```
        NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
        NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

        NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-firebase-auth-domain"
        NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-firebase-project-id"
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-firebase-storage-bucket"
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-firebase-messaging-sender-id"
        NEXT_PUBLIC_FIREBASE_APP_ID="your-firebase-app-id"
        ```

3.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

*   `src/app/`: Main application pages (Next.js App Router)
    *   `src/app/admin/`: Admin panel specific pages
    *   `src/app/client/`: Client portal specific pages
*   `src/components/`: Reusable UI components
*   `src/lib/`: Utility functions and client initializations
    *   `src/lib/supabaseClient.ts`: Supabase client instance
    *   `src/lib/firebaseClient.ts`: Firebase client instance
*   `src/services/`: (Placeholder for API service integrations if needed)
*   `public/`: Static assets
*   `.env.local.example`: Example environment variables

## Supabase Setup

*   **Project Creation:** Ensure you have a Supabase project created.
*   **Database Schema:** The required SQL schema is located in `supabase_schema.sql`. You can execute this against your Supabase project's SQL editor or using a `psql` client.
*   **Authentication:** Enable Email (Magic Link) provider in Supabase Auth settings.
*   **Storage:** Create a public bucket named `mitigation-images` in Supabase Storage. Set appropriate access policies (e.g., allow public reads, restrict uploads to authenticated users).

## Firebase Setup

*   **Project Creation:** Ensure you have a Firebase project created.
*   **Authentication:**
    *   Enable the Email/Password sign-in provider in Firebase Authentication.
    *   Manually create a single admin user in the Firebase console with a secure password. (The main agent will remind you to do this if you haven't already).

## Learn More (Next.js)

To learn more about Next.js, take a look at the following resources:

*   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
*   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
