<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/fa97019b-f2b4-411e-99e9-39eefab5c063

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Antigravity Connection

This workspace is configured for Google Antigravity. To enable the GitHub MCP server:
1. Update [.agents/mcp_config.json](.agents/mcp_config.json) with your GitHub Personal Access Token (PAT).
2. Set this directory as your active workspace in Antigravity.

