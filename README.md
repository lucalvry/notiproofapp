# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/de58a950-16c7-4103-b0a4-bf74be535956

## Campaign Template System

This project includes an intelligent campaign template matching system that automatically recommends the best notification templates based on your campaign type.

### Key Features
- **Smart Filtering**: Templates are automatically filtered by campaign type
- **Auto-Generation**: Fallback templates are generated for unmapped campaign types
- **Best Match Indicators**: Top-ranked templates are highlighted for easy selection
- **Show All Toggle**: Option to browse all templates regardless of campaign type
- **Comprehensive Documentation**: See `CAMPAIGN_TEMPLATES.md` for user guide

### For Administrators
- Template management guide: `ADMIN_TEMPLATES_GUIDE.md`
- Implementation details: `TEMPLATE_SYSTEM_IMPLEMENTATION.md`
- Rollback procedures: `ROLLBACK_PLAN.md`

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/de58a950-16c7-4103-b0a4-bf74be535956) and start prompting.

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

# Step 4: Set up environment variables
cp .env.example .env
# Then edit .env and fill in your Supabase credentials

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials from the [Supabase Dashboard](https://supabase.com/dashboard)
3. **Never commit the `.env` file** - it contains sensitive credentials

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

Simply open [Lovable](https://lovable.dev/projects/de58a950-16c7-4103-b0a4-bf74be535956) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
