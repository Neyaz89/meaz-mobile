# 🔄 Dependency Update Guide for Meaz Mobile App

This guide provides step-by-step instructions to update all dependencies to their latest compatible versions for Expo SDK 53 and React Native 0.79.5.

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Expo CLI installed globally: `npm install -g @expo/cli`

## 🚀 Quick Update (Recommended)

Run the automated update script:

```bash
node scripts/update-dependencies.js
```

## 🔧 Manual Update Commands

If you prefer to run commands manually, follow these steps:

### Step 1: Clean Environment
```bash
# Clear npm cache
npm cache clean --force

# Remove existing node_modules and lock files
rm -rf node_modules
rm -rf package-lock.json
```

### Step 2: Update Core Dependencies
```bash
# Update React and React Native
npm install react@19.0.0 react-dom@19.0.0 react-native@0.79.5

# Update Expo SDK
npx expo install expo@^53.0.17

# Update Expo modules
npx expo install expo-camera@~16.1.10
npx expo install expo-image-picker@~16.1.4
npx expo install expo-notifications@~0.31.3
npx expo install expo-splash-screen@^0.30.10
npx expo install expo-status-bar@~2.2.3
npx expo install expo-constants@~17.1.7
npx expo install expo-linking@~7.1.7
npx expo install expo-file-system@~18.1.11
npx expo install expo-font@~13.3.1
npx expo install expo-haptics@~14.1.4
npx expo install expo-blur@~14.1.5
npx expo install expo-contacts@~14.2.5
npx expo install expo-document-picker@^13.1.6
npx expo install expo-sharing@~13.1.5
npx expo install expo-speech@~13.1.7
npx expo install expo-symbols@~0.4.5
npx expo install expo-system-ui@~5.0.9
npx expo install expo-web-browser@~14.2.0
npx expo install expo-audio@^0.4.8
npx expo install expo-image@~2.3.2
```

### Step 3: Update Navigation Dependencies
```bash
# Update React Navigation
npm install @react-navigation/native@^7.1.14
npm install @react-navigation/bottom-tabs@^7.4.2
npm install @react-navigation/native-stack@^7.3.21
npm install @react-navigation/stack@^7.4.2
npm install @react-navigation/elements@^2.3.8

# Update navigation dependencies
npx expo install react-native-screens@~4.11.1
npx expo install react-native-safe-area-context@^5.4.0
npx expo install react-native-gesture-handler@~2.24.0
npx expo install react-native-reanimated@~3.17.4
```

### Step 4: Update UI and Animation Dependencies
```bash
# Update UI libraries
npm install react-native-animatable@^1.4.0
npm install react-native-modal@^14.0.0-rc.1
npm install react-native-glassmorphism@^1.0.1
npm install react-native-confetti-cannon@^1.5.2
npm install react-native-emoji-selector@^0.2.0
npm install react-native-svg@^15.11.2
npm install react-native-vector-icons@^10.2.0

# Update chat components
npm install react-native-gifted-chat@^2.8.1
```

### Step 5: Update Core Libraries
```bash
# Update Supabase
npm install @supabase/supabase-js@^2.39.7

# Update state management
npm install zustand@^5.0.6

# Update storage and utilities
npm install @react-native-async-storage/async-storage@^2.1.2
npm install react-native-url-polyfill@^2.0.0

# Update voice and media
npm install @react-native-voice/voice@^3.2.4
npm install react-native-webrtc@^124.0.5
```

### Step 6: Update Development Dependencies
```bash
# Update TypeScript and Babel
npm install --save-dev typescript@~5.8.3
npm install --save-dev @babel/core@^7.25.2
npm install --save-dev @types/react@~19.0.10

# Update ESLint
npm install --save-dev eslint@^9.25.0
npm install --save-dev eslint-config-expo@~9.2.0
```

### Step 7: Update Expo Vector Icons
```bash
npm install @expo/vector-icons@^14.1.0
```

### Step 8: Update Remaining Dependencies
```bash
# Update picker and view components
npm install @react-native-picker/picker@^2.11.1
npm install @react-native-community/viewpager@^5.0.11
npm install @react-native-masked-view/masked-view@0.3.2

# Update web support
npm install react-native-web@~0.20.0
npm install react-native-webview@13.13.5
```

### Step 9: Fix and Audit
```bash
# Fix any compatibility issues
npx expo install --fix

# Fix security vulnerabilities
npm audit fix

# Run linter to check for issues
npm run lint
```

## 🔍 Post-Update Verification

After updating, verify everything works:

```bash
# Start the development server
npm start

# Test on Android
npm run android

# Test on iOS
npm run ios

# Test web version
npm run web
```

## ⚠️ Important Notes

1. **Backup First**: Always backup your project before major dependency updates
2. **Breaking Changes**: Some packages may have breaking changes - check their changelogs
3. **Testing**: Test thoroughly on all platforms after updates
4. **Metro Cache**: Clear Metro cache if you encounter issues: `npx expo start --clear`

## 🐛 Troubleshooting

### Common Issues:

1. **Metro bundler errors**: Clear cache with `npx expo start --clear`
2. **iOS build errors**: Clean Xcode build folder and reinstall pods
3. **Android build errors**: Clean gradle cache and rebuild
4. **TypeScript errors**: Update type definitions if needed

### Reset Everything:
```bash
rm -rf node_modules
rm -rf package-lock.json
npm cache clean --force
npm install
npx expo install --fix
```

## 📊 Updated Dependencies Summary

### Core Framework:
- React: 19.0.0
- React Native: 0.79.5
- Expo SDK: 53.0.17

### Key Libraries:
- React Navigation: 7.x
- Supabase: 2.39.7
- Zustand: 5.0.6
- React Native Reanimated: 3.17.4

### Development Tools:
- TypeScript: 5.8.3
- ESLint: 9.25.0
- Babel: 7.25.2

## ✅ Success Checklist

- [ ] All dependencies updated successfully
- [ ] App builds without errors
- [ ] App runs on Android
- [ ] App runs on iOS
- [ ] App runs on web
- [ ] All features work as expected
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Performance is maintained or improved

## 🎉 Completion

Once all steps are completed successfully, your Meaz Mobile App will be running on the latest compatible versions of all dependencies, ensuring better performance, security, and access to the latest features! 