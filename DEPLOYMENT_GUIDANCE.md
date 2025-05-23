# Petgas Portal: Security, Scalability & Deployment Guidance

## 1. Introduction

This document provides guidance on security best practices, scalability considerations, deployment procedures, and ongoing maintenance for the Petgas Portal application. It aims to equip the Petgas team with the knowledge to manage and evolve the portal effectively, keeping in mind the desire for an "ultra-modern design" and future "Web3 scalability."

## 2. Security Best Practices

Security is paramount for protecting user data and maintaining the integrity of the Petgas platform.

### Supabase Row Level Security (RLS)

RLS is a critical feature of Supabase (PostgreSQL) that ensures users can only access and modify data they are authorized to. It's the primary defense layer for your database.

*   **Core Principle:** By default, tables should have RLS enabled, and no policies should mean no access. Policies then grant specific permissions.
*   **Client Portal Data:**
    *   **`clients` table:** Users should only be able to view and update their own profile.
        ```sql
        -- Example: Allow users to select their own record
        CREATE POLICY "Allow individual read access" ON clients
        FOR SELECT USING (auth.uid() = id);

        -- Example: Allow users to update their own record (specific columns)
        CREATE POLICY "Allow individual update access" ON clients
        FOR UPDATE USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id); 
        -- For "WITH CHECK", you might specify allowed updatable columns:
        -- e.g., USING (auth.uid() = id AND (column_name = (SELECT column_name FROM clients WHERE id = auth.uid())))
        ```
    *   **`plastic_mitigation_entries`, `petgas_consumption_entries`, `mitigation_activity_images`, `client_rewards`:** Users should only be able to create, read, update, and delete their own entries.
        ```sql
        -- Example for plastic_mitigation_entries:
        CREATE POLICY "Allow full access to own mitigation entries" ON plastic_mitigation_entries
        FOR ALL USING (client_id = auth.uid()) -- Assuming client_id in this table maps to auth.uid()
        WITH CHECK (client_id = auth.uid());
        ```
*   **Admin Access:** For admin users (if they interact with Supabase directly, though current setup uses Firebase for admin auth), you would typically bypass RLS using the `service_role` key on a secure backend or rely on Firebase rules if data is mirrored/managed there. If admins use Supabase directly, custom RLS policies checking an admin role (e.g., via custom claims or a separate admin users table) would be needed.
    *   **Caution:** Granting broad admin access directly via RLS needs careful implementation. Often, admin operations are better handled via trusted server-side logic (e.g., Supabase Edge Functions) using the service role key.
*   **Storage Security (`mitigation-images` bucket):**
    *   Public read access is acceptable if image URLs are not guessable and data sensitivity is low.
    *   Uploads should be restricted. A common policy is to allow authenticated users to upload into a folder matching their `user_id`.
        ```sql
        -- Example Storage Policy for Uploads (set in Supabase Dashboard -> Storage -> Policies)
        -- Allows authenticated users to insert into a folder named after their UID
        ((bucket_id = 'mitigation-images'::text) AND ((storage.foldername(name))[1] = auth.uid()::text))
        ```

### Environment Variables

All sensitive information (API keys, database URLs, JWT secrets) **must** be stored in environment variables, not hardcoded into the application.

*   **Local Development:** Use `.env.local` (gitignored by default in Next.js). Copy `.env.local.example` and fill in actual values.
*   **Production:** Configure environment variables directly on your hosting platform (e.g., Vercel, Netlify, AWS).
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   `NEXT_PUBLIC_FIREBASE_API_KEY`
    *   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
    *   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
    *   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
    *   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
    *   `NEXT_PUBLIC_FIREBASE_APP_ID`
    *   Supabase Service Role Key (if used in backend functions, **never** expose this to the client-side): `SUPABASE_SERVICE_KEY`

### Input Validation

Validate all inputs on both the client-side (for UX) and server-side (for security).

*   **Client-Side:** Use HTML5 validation attributes, form libraries (e.g., React Hook Form with Zod/Yup for schema validation).
*   **Server-Side (Supabase):**
    *   Use PostgreSQL column constraints (e.g., `NOT NULL`, `CHECK constraints`).
    *   For complex business logic or operations requiring the service role, use Supabase Edge Functions and validate inputs there before interacting with the database.

### Cross-Site Scripting (XSS) & Cross-Site Request Forgery (CSRF)

*   **XSS:** React and Next.js help mitigate XSS by escaping content rendered in JSX. However, be cautious when using `dangerouslySetInnerHTML` or injecting HTML from untrusted sources. Always sanitize such content.
*   **CSRF:** Next.js generally provides some protection against CSRF for API routes when using standard methods. For Supabase interactions, RLS and the fact that operations are tied to the authenticated user's JWT provide primary protection.

### Firebase Admin Auth Security

*   **Strong Admin Credentials:** The single admin account created in Firebase **must** have a very strong, unique password. Consider enabling Multi-Factor Authentication (MFA) for this Firebase account if possible through Firebase console settings for the project owner.
*   **Firebase Security Rules:** While the client portal uses Supabase, Firebase Auth is used for the admin panel. Review Firebase Authentication security rules. For a single, manually created admin, the rules are simpler as you're not allowing public sign-up. Ensure rules don't unintentionally allow broader access than intended.

### Dependency Management

*   Regularly update dependencies: `npm audit` or `yarn audit` can help identify known vulnerabilities.
*   Use tools like Dependabot (GitHub) or Snyk to automate vulnerability scanning and update suggestions.

## 3. Scalability Considerations

### Database (Supabase)

*   **Indexing:** Ensure proper database indexes are created for columns frequently used in `WHERE` clauses, `JOIN` conditions, and `ORDER BY` clauses. Supabase automatically indexes primary keys. Analyze query performance using `EXPLAIN ANALYZE`.
*   **Connection Pooling:** Supabase handles connection pooling automatically, which is essential for serverless environments.
*   **Read Replicas:** For read-heavy workloads, Supabase offers read replicas on higher-tier paid plans. This can offload read traffic from the primary database.
*   **Query Optimization:** Write efficient SQL queries. Avoid `SELECT *` where possible; only fetch the columns you need. Use joins effectively.
*   **Data Archiving/Purging:** For tables that grow indefinitely (e.g., activity logs), consider strategies for archiving or purging old data if it's no longer needed for active operations.

### Application Server (Next.js)

*   **Statelessness:** Next.js API routes and server components are generally stateless, making them easy to scale horizontally.
*   **Serverless Deployment:** Deploying to platforms like Vercel or Netlify leverages serverless functions, which automatically scale with demand.
*   **Caching:**
    *   **Next.js ISR (Incremental Static Regeneration):** For pages that can be partially static but need periodic updates.
    *   **Client-Side Caching:** Use libraries like SWR or React Query for caching data fetched on the client, reducing redundant API calls.
    *   **Edge Caching (CDN):** Platforms like Vercel automatically distribute static assets and serverless functions globally via CDN, reducing latency.

### Web3 Scalability (Incorporating User Feedback)

This section addresses the desire for future Web3 integration and scalability.

*   **Wallet Interactions:**
    *   **Current:** Solana and BNB wallet addresses are stored as text fields.
    *   **Future:** Integrate direct wallet connections using libraries like:
        *   Web3Modal (multi-wallet support)
        *   Ethers.js (for EVM-compatible chains like BNB Smart Chain)
        *   `@solana/wallet-adapter` (for Solana)
    *   **UX Implications:** This improves UX by allowing users to connect their wallets directly, pre-filling addresses and enabling on-chain interactions.
    *   **Security:** Wallet interactions must be handled securely. Never ask for private keys. All transactions should be signed by the user on the client-side. Backend verification of on-chain actions might be needed.

*   **Smart Contract Interaction:**
    *   **PGC & Rewards On-Chain:** If Petgas Coin (PGC) or reward distribution mechanisms move to smart contracts:
        *   **Supabase Edge Functions as Intermediaries:** These can securely manage interactions with smart contracts. An admin action (e.g., "approve mitigation and issue PGC") could trigger an Edge Function. This function, using a secure admin wallet or service, would then call the appropriate smart contract function. This keeps private keys and sensitive logic off the client-side.
        *   **Gas Fees:** On-chain transactions require gas fees. Plan for who covers these (user or Petgas) and how they are managed.
        *   **Transaction Monitoring:** Implement ways to track on-chain transaction statuses.

*   **Decentralized Storage (for Mitigation Images):**
    *   **Current:** Images are stored in Supabase Storage (backed by S3 or similar).
    *   **Future:** Consider IPFS (InterPlanetary File System) or Arweave for enhanced decentralization, censorship resistance, and data permanence.
        *   **Pros:**
            *   Decentralized: Not reliant on a single provider.
            *   Censorship-resistant: Difficult to remove content.
            *   Verifiable content (content addressing with CIDs on IPFS).
        *   **Cons:**
            *   **IPFS:** Requires pinning services (e.g., Pinata, Infura, Filebase) to ensure data remains available, which has costs. Retrieval can sometimes be slower if content is not well-seeded.
            *   **Arweave:** Permanent storage with an upfront cost model. Retrieval is generally faster than unpinned IPFS content.
        *   **Implementation:** Images could be uploaded to Supabase Storage first, then an Edge Function could asynchronously push them to IPFS/Arweave and update the `image_url` to point to the decentralized location (e.g., an IPFS gateway URL or Arweave transaction ID).

*   **Data Integrity & Auditability (Blockchain Anchoring):**
    *   For critical data points like approved plastic mitigation amounts, PGC transaction summaries, or reward issuance records:
        *   **Hashing & Anchoring:** Periodically, a batch of these records can be hashed, and this single hash can be recorded on a public blockchain (e.g., Solana, BNB Smart Chain, or a Layer 2 solution for lower costs).
        *   **Benefits:** Provides a high degree of tamper-resistance and public auditability for key metrics without storing all raw data on-chain.
        *   **Implementation:** This would likely involve a scheduled Supabase Edge Function or a dedicated backend service.

## 4. Deployment Guidance

### Build Process

*   The standard Next.js build command is `npm run build` or `yarn build`. This creates an optimized production build in the `.next` directory.

### Hosting Platforms

*   **Vercel (Recommended for Next.js):**
    *   **Pros:** Built by the creators of Next.js, seamless integration, CI/CD out-of-the-box, serverless functions, global CDN, environment variable management, custom domains, analytics.
    *   **Setup:** Connect your Git repository (GitHub, GitLab, Bitbucket) to Vercel. It will automatically detect it's a Next.js project and configure build settings.
*   **Netlify:**
    *   **Pros:** Similar benefits to Vercel, strong CI/CD, serverless functions (Netlify Functions), global CDN.
    *   **Setup:** Similar Git integration process.
*   **AWS (More Control, More Complexity):**
    *   **AWS Amplify:** Provides a managed experience for deploying web and mobile apps, including Next.js.
    *   **EC2/Containers (ECS, EKS):** For traditional server-based or containerized deployments. Requires more manual setup for load balancing, scaling, and CI/CD pipelines. Use a Node.js server for `next start`.
*   **Other Cloud Providers (Azure, Google Cloud):**
    *   Offer similar services (App Service, Cloud Run) for deploying Node.js applications or containers.

### Environment Variables in Production

*   Access your hosting platform's dashboard.
*   Navigate to project settings, usually under "Environment Variables" or a similar section.
*   Add the same variable names used in `.env.local.example` (e.g., `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_FIREBASE_API_KEY`).
*   **Crucially, ensure `SUPABASE_SERVICE_KEY` is NOT prefixed with `NEXT_PUBLIC_` if you ever use it in backend functions, as this prefix exposes it to the client.** For this project, all current variables are client-side.

### Database Migrations (Supabase)

*   **Development:** Use Supabase Studio (SQL Editor in the dashboard) or Supabase CLI for schema changes. Generate migrations if using the CLI.
*   **Production:**
    *   **Caution:** Direct schema changes in a live production database are risky. Test thoroughly in a staging environment.
    *   **Methods:**
        *   Apply saved migration files using Supabase CLI against the production database.
        *   Carefully execute SQL scripts via the Supabase SQL Editor in the production project dashboard.
    *   Always back up your database before significant schema changes if possible (Supabase does automated backups, but an extra manual one for critical changes offers peace of mind).
    *   Plan for downtime or maintenance windows if changes are complex or might impact live operations.

## 5. Maintenance Guidance

### Dependency Updates

*   Regularly check for updates to:
    *   Next.js (`next`)
    *   React (`react`, `react-dom`)
    *   Supabase client (`@supabase/supabase-js`)
    *   Firebase client (`firebase`)
    *   Other npm packages.
*   Use `npm outdated` or `yarn outdated` to list outdated packages.
*   Update packages carefully, testing for breaking changes, especially for major version updates.

### Monitoring

*   **Application Performance Monitoring (APM):**
    *   **Vercel Analytics:** Provides insights into traffic and performance if deploying on Vercel.
    *   **Sentry:** Excellent for error tracking and performance monitoring.
    *   **New Relic, Datadog:** Comprehensive APM solutions for larger-scale applications.
*   **Supabase Project Monitoring:**
    *   Use the Supabase Dashboard to monitor database health, API usage, query performance, and logs.
    *   Set up alerts if available for critical issues.
*   **Firebase Project Monitoring:**
    *   Use the Firebase Console to monitor Authentication usage and any other Firebase services utilized.

### Backups (Supabase)

*   Supabase automatically handles database backups. Familiarize yourself with their backup policy (frequency, retention, point-in-time recovery capabilities) based on your Supabase project's plan.
*   For critical data or before major operations, consider manual backups if Supabase plans allow, or export data using `pg_dump`.

### Security Audits

*   Periodically review:
    *   Supabase Row Level Security (RLS) policies to ensure they are still appropriate and effective.
    *   Firebase security rules (if applicable beyond basic auth).
    *   Application code for potential security vulnerabilities (e.g., input validation, XSS).
    *   Access controls for admin users.

## 6. Maintaining an "Ultra-Modern Design"

Achieving and maintaining an "ultra-modern design" is an ongoing process.

*   **Stay Current with Trends:**
    *   Follow design blogs, showcases (Dribbble, Behance with a critical eye), and tech news to stay informed about emerging UI/UX trends.
    *   Pay attention to how leading web applications evolve their interfaces.
*   **Leverage Tailwind CSS Effectively:**
    *   **Consistency:** Use the `tailwind.config.js` theme extensively (colors, fonts, spacing) to maintain brand consistency. The CSS variables defined in `globals.css` are a good start.
    *   **Utility-First Power:** Embrace utility classes for rapid prototyping and custom designs. Avoid premature abstraction into components unless a pattern is clearly reusable.
    *   **Responsive Design:** Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) diligently.
*   **Component Libraries (Use Judiciously):**
    *   If complex UI elements are needed (e.g., advanced date pickers, multi-select dropdowns with rich features, complex modals/drawers):
        *   **Shadcn UI:** Excellent, accessible components that you copy and paste into your project, giving full control over styling. Built on Radix UI.
        *   **Radix UI Primitives:** Headless UI components providing accessibility and behavior, allowing full styling control with Tailwind.
        *   **Mantine UI, Headless UI:** Other good options offering modern, accessible components.
    *   **Styling:** Ensure any library can be styled to perfectly match the Petgas brand aesthetics. Avoid libraries that impose a very rigid, hard-to-override look.
*   **Performance is Key to Modern Feel:**
    *   **Image Optimization:** Use Next.js `<Image>` component for automatic optimization (resizing, WebP format).
    *   **Code Splitting:** Next.js handles automatic code splitting per page.
    *   **Lazy Loading:** Lazy load offscreen images or components.
    *   **Bundle Size Analysis:** Periodically use tools like `@next/bundle-analyzer` to check for and address large JavaScript bundles.
    *   A fast, responsive UI is a hallmark of modern applications.
*   **Subtlety in Animations/Transitions:**
    *   Use animations and transitions sparingly and purposefully to enhance UX, not distract.
    *   Examples: Smooth hover effects (already added `transition-colors` to buttons), subtle modal open/close transitions, list item entrance animations.
    *   Tailwind CSS provides utilities for transitions and animations. Libraries like Framer Motion can be used for more complex animations if needed.
*   **User Feedback & Iteration:**
    *   If possible, gather feedback from actual users on the design and usability.
    *   Be prepared to iterate on the design as user expectations and design trends evolve.

By focusing on these areas, the Petgas Portal can maintain a secure, scalable, and modern presence.
