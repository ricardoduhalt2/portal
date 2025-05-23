# Petgas Portal: Testing Strategy

## 1. Introduction

Testing is a crucial aspect of software development, ensuring the Petgas Portal remains reliable, maintainable, and functions as expected for both clients and administrators. A well-defined testing strategy helps catch bugs early, facilitates safer code refactoring, and provides confidence in new feature deployments.

This document outlines a layered testing approach, focusing on unit and integration tests for critical functionalities, with a conceptual overview of End-to-End (E2E) testing for broader coverage.

## 2. Testing Scope & Priorities

Given development resources, it's essential to prioritize testing efforts on the most critical functionalities to maximize impact and ensure core features are robust.

### High Priority Areas:

*   **Authentication (Client & Admin):**
    *   Client magic link login, session creation, and persistence.
    *   Admin email/password login (Firebase), session management.
    *   Logout functionality for both client and admin.
    *   Route protection: Ensuring protected routes redirect unauthenticated users and allow authenticated users.
    *   Profile creation for new client users.
*   **Client Data Submission:**
    *   Client profile updates (full name, wallet addresses).
    *   Plastic mitigation submission:
        *   Correctly recording kilograms of plastic.
        *   Successful image uploads to Supabase Storage.
        *   Association of images with the mitigation entry.
    *   Petgas consumption logging.
*   **Reward Logic:**
    *   Admin defining new reward types and criteria.
    *   Admin assigning rewards to clients.
    *   Admin revoking rewards from clients.
    *   Correct PGC balance updates in the `clients` table upon reward assignment/revocation.
*   **Admin Data Management:**
    *   Updating the status of `plastic_mitigation_entries` (pending, approved, rejected).
    *   Editing core data fields for mitigation and consumption entries (e.g., `mitigated_plastic_kg`, `liters_consumed`).
    *   Deleting images associated with mitigation entries.
    *   Editing client profile information (e.g., PGC balance, wallet addresses).
*   **Data Integrity & Display:**
    *   Correct calculation and display of aggregate data on the client dashboard (total PGC, total plastic, total Petgas).
    *   Accurate listing of mitigation history, consumption history, and earned/available rewards.
    *   Correct filtering and pagination of data in admin tables.

## 3. Recommended Testing Types & Tools

A combination of testing types provides comprehensive coverage.

### Unit Tests

*   **Purpose:** Test individual functions, React components, or small modules in isolation to verify they behave as expected given specific inputs.
*   **Tools:**
    *   **Jest:** A popular JavaScript testing framework.
    *   **React Testing Library (RTL):** For testing React components by interacting with them as a user would.
*   **Examples:**
    *   Validating form input logic within components (e.g., email format, required fields, number constraints).
    *   Testing utility functions (e.g., date formatting, calculation functions if any).
    *   Testing individual React components for correct rendering based on different props (e.g., a `StatCard` component displaying correct information).
    *   Verifying that conditional rendering within a component works as expected.
*   **Location:** `*.test.ts` or `*.test.tsx` files co-located with their corresponding source files (e.g., `Button.tsx` and `Button.test.tsx`) or grouped within `__tests__` directories inside feature folders.

### Integration Tests

*   **Purpose:** Test the interaction between several components, services, or modules to ensure they work together correctly. This is crucial for verifying data flow and interactions with external services (mocked).
*   **Tools:**
    *   **Jest:** As the test runner and assertion library.
    *   **React Testing Library (RTL):** For rendering component trees and simulating user interactions.
    *   **Supabase Client Mocks:** Create mock implementations of `supabase.auth`, `supabase.from()`, `supabase.storage` functions to simulate API calls without hitting the actual Supabase backend.
    *   **Firebase Client Mocks:** Mock Firebase authentication methods (e.g., `signInWithEmailAndPassword`, `onAuthStateChanged`).
*   **Examples:**
    *   **Client Portal:**
        *   Simulating client profile form submission: Fill form, submit, and verify that the Supabase client `update` method was called with the correct data.
        *   Testing the client login flow: Mock `supabase.auth.signInWithOtp` and verify UI feedback.
        *   Testing data fetching and display on the client dashboard using mocked Supabase responses.
        *   Verifying that protected routes (e.g., `/client/dashboard`) redirect unauthenticated users by mocking the auth state.
        *   Testing plastic mitigation submission flow, including mocked image upload and data insertion calls.
    *   **Admin Panel:**
        *   Testing admin login with mocked Firebase `signInWithEmailAndPassword`.
        *   Verifying the reward assignment flow: Select client, select reward, submit, and check that the (mocked) Supabase calls to create `client_rewards` entry and update client PGC balance are made correctly.
        *   Testing the approval/rejection of a mitigation entry and verifying the `update` call to Supabase with the new status.

### End-to-End (E2E) Tests (Conceptual Overview)

*   **Purpose:** Test complete user flows through the application in a real or simulated browser environment, from the user's perspective. This layer provides the highest confidence that the application works as a whole.
*   **Tools:**
    *   **Playwright:** A modern E2E testing framework from Microsoft, known for speed and reliability across browsers.
    *   **Cypress:** Another very popular E2E testing framework with a strong community and developer experience.
*   **Examples:**
    *   **Client Flow:** User navigates to the login page, enters email, (conceptually) receives magic link, clicks link, lands on dashboard, navigates to submit activity, submits plastic mitigation data with an image, returns to dashboard, sees updated totals.
    *   **Admin Flow:** Admin logs in, navigates to mitigation entries, filters by "pending", selects an entry, reviews details, approves it, navigates to assign rewards, assigns a reward to the client whose entry was just approved.
*   **Note:** E2E tests are powerful but are generally more complex and slower to write, run, and maintain. They also require careful management of test data. It's recommended to build a strong foundation of unit and integration tests first. E2E tests can then be added incrementally for the most critical "happy path" scenarios and key user journeys.

## 4. Setting up the Testing Environment

*   **Installation:**
    *   Next.js typically includes a Jest setup. If not, install Jest, React Testing Library, and necessary types:
        ```bash
        npm install --save-dev jest @testing-library/react @testing-library/jest-dom @types/jest jest-environment-jsdom
        # or
        yarn add --dev jest @testing-library/react @testing-library/jest-dom @types/jest jest-environment-jsdom
        ```
*   **Jest Configuration:**
    *   Create or update `jest.config.js` (or `jest.config.ts`) in the project root. A basic configuration for Next.js might look like:
        ```javascript
        // jest.config.js
        const nextJest = require('next/jest')({
          dir: './', // Path to Next.js app
        });
        
        const customJestConfig = {
          setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // Optional: for global setup
          testEnvironment: 'jest-environment-jsdom',
          moduleNameMapper: { // Handle module aliases (e.g., @/*)
            '^@/(.*)$': '<rootDir>/src/$1',
          },
        };
        
        module.exports = nextJest(customJestConfig);
        ```
    *   Create `jest.setup.js` if needed (e.g., to import `@testing-library/jest-dom/extend-expect`).
*   **Mocking External Services:**
    *   **Supabase:** Create manual mocks in a `__mocks__` directory (e.g., `petgas-portal/src/__mocks__/@supabase/supabase-js.ts` or co-located with tests).
        ```typescript
        // Example: __mocks__/@supabase/supabase-js.ts
        export const createClient = jest.fn(() => ({
          auth: {
            signInWithOtp: jest.fn().mockResolvedValue({ error: null }),
            exchangeCodeForSession: jest.fn().mockResolvedValue({ error: null, data: { session: { user: { id: 'mock-user-id', email: 'test@example.com' } } } }),
            getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
            onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
            signOut: jest.fn().mockResolvedValue({ error: null }),
          },
          from: jest.fn((tableName) => ({ // Chainable mocks
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: {}, error: null }), // Adjust mockResolvedValue as needed per test
            // ... other Supabase methods
          })),
          storage: {
            from: jest.fn(() => ({
              upload: jest.fn().mockResolvedValue({ data: { path: 'mock/path.jpg' }, error: null }),
              getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://mock.url/mock/path.jpg' } }),
              remove: jest.fn().mockResolvedValue({ error: null }),
            })),
          },
        }));
        ```
    *   **Firebase:** Similarly, mock Firebase client functions.
        ```typescript
        // Example: __mocks__/firebase/auth.ts (if firebase/auth is imported directly)
        export const getAuth = jest.fn(() => ({
          // mock auth instance methods
        }));
        export const signInWithEmailAndPassword = jest.fn().mockResolvedValue({ user: { uid: 'mock-admin-id', email: 'admin@example.com' } });
        export const onAuthStateChanged = jest.fn((auth, callback) => {
          // Simulate auth state change for tests
          // callback({ uid: 'mock-admin-id', email: 'admin@example.com' }); 
          return jest.fn(); // unsubscribe function
        });
        export const signOut = jest.fn().mockResolvedValue(undefined);
        ```
    *   Use `jest.mock('@supabase/supabase-js');` or `jest.mock('firebase/auth');` at the top of your test files.

## 5. Running Tests

*   Add a test script to your `package.json`:
    ```json
    "scripts": {
      // ... other scripts
      "test": "jest",
      "test:watch": "jest --watch"
    }
    ```
*   Run tests using `npm test` or `yarn test`.
*   Run tests in watch mode using `npm run test:watch` or `yarn test:watch`.

## 6. Continuous Integration (CI)

*   **Recommendation:** Integrate test execution into your CI/CD pipeline (e.g., GitHub Actions, GitLab CI, Jenkins).
*   **Benefits:**
    *   Automatically runs tests on every push or pull request.
    *   Prevents merging code that breaks existing functionality.
    *   Ensures a consistent quality baseline.
*   **Example (GitHub Actions):**
    ```yaml
    # .github/workflows/ci.yml
    name: Petgas Portal CI
    
    on: [push, pull_request]
    
    jobs:
      test:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v3
          - name: Set up Node.js
            uses: actions/setup-node@v3
            with:
              node-version: '18' # Or your project's Node version
          - name: Install dependencies
            run: npm install # or yarn install
          - name: Run tests
            run: npm test # or yarn test
    ```

By implementing this testing strategy, the Petgas Portal will benefit from increased stability, easier maintenance, and greater confidence during development and deployment cycles.I have created the `TESTING_STRATEGY.md` file in the `petgas-portal` directory with the detailed testing strategy.

The document includes:
1.  **Introduction:** Importance of testing and an overview of testing layers.
2.  **Testing Scope & Priorities:** Highlighting critical areas like Authentication, Client Data Submission, Reward Logic, Admin Data Management, and Data Integrity.
3.  **Recommended Testing Types & Tools:**
    *   **Unit Tests:** Using Jest and React Testing Library (RTL), with examples and location guidance.
    *   **Integration Tests:** Using Jest, RTL, and mock Supabase/Firebase clients, with examples for key interaction flows.
    *   **End-to-End (E2E) Tests:** Conceptual overview with Playwright/Cypress as tool examples.
4.  **Setting up the Testing Environment:** Mention of installing tools, Jest configuration for Next.js, and detailed examples for mocking Supabase and Firebase clients.
5.  **Running Tests:** Standard `npm test` / `yarn test` commands.
6.  **Continuous Integration (CI):** Recommendation and a basic GitHub Actions example.

This strategy document provides a solid foundation for implementing testing in the Petgas Portal project.
