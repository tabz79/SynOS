# SynOS Frontend (Web)

This project contains the React + Vite frontend application for SynOS.

## Technologies Used:
-   **React**: A JavaScript library for building user interfaces.
-   **Vite**: A fast build tool that provides a lightning-fast development experience.
-   **TypeScript**: A typed superset of JavaScript that compiles to plain JavaScript.
-   **Tailwind CSS**: A utility-first CSS framework for rapidly building custom designs.
-   **shadcn/ui**: A collection of re-usable components built with Radix UI and Tailwind CSS.
-   **React Router DOM**: For declarative routing in React applications.
-   **Axios**: A promise-based HTTP client for the browser and Node.js.

## Setup and Run Instructions (for PO):

1.  **Open your terminal or command prompt.**
2.  **Navigate to the `web/` directory** (where `package.json` is located).
3.  **Install dependencies:**
    ```bash
    npm install
    ```
    *Expected: All required Node.js packages are installed.*

4.  **Start the development server:**
    ```bash
    npm run dev
    ```
    *Expected: The Vite development server starts, typically on `http://localhost:5173`. It should automatically open in your browser.*

5.  **Building for Production:**
    ```bash
    npm run build
    ```
    *Expected: A `dist/` folder is created with the production-ready static assets.*

## Configuration:
-   **`web/vite.config.ts`**: Vite specific configurations.
-   **`web/tailwind.config.js`**: Tailwind CSS configuration, including custom colors and dark mode settings.
-   **`web/src/services/apiClient.ts`**: Configures the Axios instance, including the base URL for the backend API. You can override the `VITE_API_BASE_URL` environment variable if your backend is not running on `http://localhost:5000`.
    *   To set `VITE_API_BASE_URL`, create a `.env` file in the `web/` directory:
        ```
        VITE_API_BASE_URL=http://localhost:5000/api/v1
        ```
        **!!! UPDATE THIS IF YOUR BACKEND API IS ON A DIFFERENT PORT/URL !!!**

## shadcn/ui Integration:
This project is set up to use `shadcn/ui`. To add components:
1.  Ensure you are in the `web/` directory.
2.  Run `npx shadcn-ui@latest init` (if not already done, though this scaffold assumes it's ready).
3.  To add a component (e.g., a button):
    ```bash
    npx shadcn-ui@latest add button
    ```
    This will add the component's code to `web/src/components/ui/`.
