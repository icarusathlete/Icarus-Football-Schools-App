const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// This automatically picks up credentials from your environment (ADC),
// or you can configure a service account credential here.
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const auth = admin.auth();

async function enableTotpMfa() {
  try {
    console.log("🔄 Fetching current project configuration...");
    const projectConfigManager = auth.projectConfigManager();
    const config = await projectConfigManager.getProjectConfig();
    
    console.log("⚙️ Current Multi-Factor state:", JSON.stringify(config.multiFactorConfig || {}, null, 2));

    console.log("🚀 Enabling TOTP Multi-Factor Authentication at the project level...");
    
    // Update config to enable TOTP MFA
    const updatedConfig = await projectConfigManager.updateProjectConfig({
      multiFactorConfig: {
        state: 'ENABLED',
        factorIds: ['totp'] // Restricts allowed second factors to TOTP only
      }
    });

    console.log("✅ SUCCESS! TOTP MFA is now enabled on your Firebase project.");
    console.log("Updated Config:", JSON.stringify(updatedConfig.multiFactorConfig, null, 2));
  } catch (error) {
    console.error("❌ Failed to update project configuration:", error);
    process.exit(1);
  }
}

enableTotpMfa();
