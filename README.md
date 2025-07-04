# Grocery Gale

Grocery Gale is a smart meal planning application designed to simplify your life. It uses AI to help you create meal plans and generate grocery lists based on your preferences and dietary needs. The application runs as both a desktop and a web app.

## Features

- **AI-Powered Chat:** Engage in a conversation with an AI assistant to plan your meals, discover recipes, and more.
- **User Authentication:** Secure user accounts and personalized experiences powered by Supabase.
- **Personalized Meal Planning:** Tailor meal plans based on dietary preferences, allergies, family size, and number of meals per day.
- **Conversation History:** Your chat history is saved, allowing you to pick up where you left off.
- **Cross-Platform:** Use it as a native desktop application (Windows, macOS, Linux) or directly in your web browser.

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend & Database:** Supabase (Auth, Postgres, Storage, Edge Functions)
- **AI & Automation:** n8n.io orchestrates workflows between Supabase, OpenAI, and other services.
- **Desktop Framework:** Electron

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You need to have [Bun](https://bun.sh/) installed on your machine.

### Installation

1.  Clone the repository to your local machine.
    ```sh
    git clone <YOUR_GIT_URL>
    cd grocery-gale
    ```

2.  Install the project dependencies.
    ```sh
    bun install
    ```

3.  Set up your environment variables. You will need two environment files.

    First, create a `.env` file in the project root for the frontend:
    ```env
    VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
    VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    ```

    Second, create a `.env` file inside the `supabase/functions` directory for the Edge Function:
    ```env
    N8N_WEBHOOK_URL="YOUR_PRODUCTION_N8N_WEBHOOK_URL"
    ```

### Running the Application

You can run Grocery Gale either as a desktop application or in a web browser.

- **To run the Electron desktop app:**
  ```sh
  bun run dev
  ```

- **To run the web version:**
  ```sh
  bun run dev:browser
  ```
  The application will be available at `http://localhost:8080`.

## Building for Production

To build the Electron application for production, run:
```sh
bun run build
```
This will create distributable packages for your operating system in the `dist-electron/out` directory.

## Project info

**URL**: https://lovable.dev/projects/5c1a7b5a-e6a0-48e3-89ce-408c619e951e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/5c1a7b5a-e6a0-48e3-89ce-408c619e951e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/5c1a7b5a-e6a0-48e3-89ce-408c619e951e) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
