#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting dependency update for Meaz Mobile App...\n');

// Updated package.json with latest compatible versions
const updatedPackageJson = {
  "name": "meaz-mobile",
  "main": "node_modules/expo/AppEntry.js",
  "version": "1.0.0",
  "scripts": {
    "start": "expo start",
    "dev": "expo start",
    "reset-project": "node ./scripts/reset-project.js",
    "setup-database": "node ./scripts/setup-database.js",
    "fix-issues": "node ./scripts/run-fixes.js",
    "update-deps": "node ./scripts/update-dependencies.js",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "lint": "expo lint"
  },
  "dependencies": {
    "@expo/metro-runtime": "~5.0.4",
    "@expo/vector-icons": "^14.1.0",
    "@react-native-async-storage/async-storage": "^2.1.2",
    "@react-native-community/viewpager": "^5.0.11",
    "@react-native-masked-view/masked-view": "0.3.2",
    "@react-native-picker/picker": "^2.11.1",
    "@react-native-voice/voice": "^3.2.4",
    "@react-navigation/bottom-tabs": "^7.4.2",
    "@react-navigation/elements": "^2.3.8",
    "@react-navigation/native": "^7.1.14",
    "@react-navigation/native-stack": "^7.3.21",
    "@react-navigation/stack": "^7.4.2",
    "@supabase/supabase-js": "^2.39.7",
    "agora-token": "^2.0.5",
    "date-fns": "^4.1.0",
    "expo": "^53.0.17",
    "expo-audio": "^0.4.8",
    "expo-av": "~15.1.7",
    "expo-blur": "~14.1.5",
    "expo-camera": "~16.1.10",
    "expo-clipboard": "~7.1.5",
    "expo-constants": "~17.1.7",
    "expo-contacts": "~14.2.5",
    "expo-device": "~7.1.4",
    "expo-document-picker": "^13.1.6",
    "expo-file-system": "~18.1.11",
    "expo-font": "~13.3.2",
    "expo-haptics": "~14.1.4",
    "expo-image": "~2.3.2",
    "expo-image-picker": "~16.1.4",
    "expo-linear-gradient": "~14.1.5",
    "expo-linking": "~7.1.7",
    "expo-notifications": "~0.31.4",
    "expo-router": "^5.1.3",
    "expo-sharing": "~13.1.5",
    "expo-speech": "~13.1.7",
    "expo-splash-screen": "^0.30.10",
    "expo-status-bar": "~2.2.3",
    "expo-symbols": "~0.4.5",
    "expo-system-ui": "~5.0.9",
    "expo-video": "^2.2.2",
    "expo-web-browser": "~14.2.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "react-native": "0.79.5",
    "react-native-agora": "^4.5.3",
    "react-native-animatable": "^1.4.0",
    "react-native-confetti-cannon": "^1.5.2",
    "react-native-emoji-selector": "^0.2.0",
    "react-native-gesture-handler": "~2.24.0",
    "react-native-gifted-chat": "^2.8.1",
    "react-native-glassmorphism": "^1.0.1",
    "react-native-image-viewing": "^0.3.0",
    "react-native-modal": "^14.0.0-rc.1",
    "react-native-qrcode-svg": "^6.3.15",
    "react-native-reanimated": "~3.17.4",
    "react-native-safe-area-context": "^5.4.0",
    "react-native-screens": "~4.11.1",
    "react-native-svg": "^15.11.2",
    "react-native-url-polyfill": "^2.0.0",
    "react-native-vector-icons": "^10.2.0",
    "react-native-web": "~0.20.0",
    "react-native-webrtc": "^124.0.5",
    "react-native-webview": "13.13.5",
    "zustand": "^5.0.6"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@types/react": "~19.0.10",
    "eslint": "^9.25.0",
    "eslint-config-expo": "~9.2.0",
    "typescript": "~5.8.3"
  },
  "private": true
};

// Commands to run with --yes flags to avoid interactive prompts
const commands = [
  'npm cache clean --force',
  'rm -rf node_modules',
  'rm -rf package-lock.json',
  'npm install --yes',
  'npx expo install --fix --yes',
  'npm audit fix --yes'
];

try {
  // Update package.json
  console.log('📝 Updating package.json...');
  fs.writeFileSync(
    path.join(__dirname, '..', 'package.json'),
    JSON.stringify(updatedPackageJson, null, 2)
  );
  console.log('✅ package.json updated successfully!\n');

  // Execute commands
  console.log('🔧 Running update commands...\n');
  
  commands.forEach((command, index) => {
    console.log(`[${index + 1}/${commands.length}] Running: ${command}`);
    try {
      execSync(command, { 
        stdio: 'inherit', 
        cwd: path.join(__dirname, '..') 
      });
      console.log(`✅ Command completed: ${command}\n`);
    } catch (error) {
      console.log(`⚠️  Command failed: ${command}`);
      console.log(`Error: ${error.message}\n`);
      // Continue with other commands even if one fails
    }
  });

  console.log('🎉 Dependency update completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Test the app with: npm start');
  console.log('2. Run on device: npm run android or npm run ios');
  console.log('3. Check for any breaking changes in the updated packages');

} catch (error) {
  console.error('❌ Error updating dependencies:', error);
  process.exit(1);
}