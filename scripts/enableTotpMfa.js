const admin = require('firebase-admin');

const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  const serviceAccountPath = path.join(__dirname, '../service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    console.log("🔑 Using service-account.json credentials file found in project root...");
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath))
    });
  } else {
    console.log("ℹ️ Checking Application Default Credentials (ADC)...");
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
}

const auth = admin.auth();

async function enableTotpMfa() {
  try {
    console.log("🔄 Fetching current project configuration...");
    const projectConfigManager = auth.projectConfigManager();
    const config = await projectConfigManager.getProjectConfig();
    
    console.log("⚙️ Current Multi-Factor state:", JSON.stringify(config.multiFactorConfig || {}, null, 2));

    console.log("🚀 Enabling TOTP Multi-Factor Authentication at the project level...");
    
    // Update config to enable TOTP MFA according to official Firebase Admin guidelines
    const updatedConfig = await projectConfigManager.updateProjectConfig({
      multiFactorConfig: {
        providerConfigs: [{
          state: 'ENABLED',
          totpProviderConfig: {
            adjacentIntervals: 5 // Acceptable time window drift tolerance (default is 5)
          }
        }]
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
