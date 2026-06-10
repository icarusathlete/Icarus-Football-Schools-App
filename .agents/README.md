# GitHub MCP Configuration Guide

This directory contains the workspace-level Model Context Protocol (MCP) configuration for Google Antigravity.

## Setup Instructions

1. **Generate a GitHub Personal Access Token (Classic or Fine-Grained):**
   * Go to **GitHub Settings** -> **Developer Settings** -> **Personal Access Tokens**.
   * Generate a token with the following scopes (depending on your needs):
     * `repo` (Full control of private repositories)
     * `workflow` (Required if managing Actions/workflows)
     * `write:discussion`, `read:discussion` (If using discussions)
     * `notifications`
   * Copy the generated token.

2. **Configure the Token in Antigravity:**
   * Open the file [.agents/mcp_config.json](file:///Users/athlete/.gemini/antigravity/scratch/Icarus-Football-Schools-App/.agents/mcp_config.json).
   * Replace `YOUR_GITHUB_PERSONAL_ACCESS_TOKEN_HERE` with your copied Personal Access Token.
   * Save the file.

3. **Activate the Workspace:**
   * Make sure to set the workspace directory `/Users/athlete/.gemini/antigravity/scratch/Icarus-Football-Schools-App` as the active workspace in Antigravity so it picks up this configuration.
