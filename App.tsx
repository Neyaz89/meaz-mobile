import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import stores
import { useRealTimeProfile } from './hooks/useRealTimeProfile';
import { initializeAuth, useAuthStore } from './store/authStore';

// Import screens
import { ThemeProvider } from './components/ThemeContext';
import { ThemedText } from './components/ThemedText';
import { ThemedView } from './components/ThemedView';
import { ToastProvider } from './components/ui/ToastProvider';
import AuthScreen from './screens/AuthScreen';
import ChatDetailScreen from './screens/ChatDetailScreen';
import ChatsScreen from './screens/ChatsScreen';
import FriendsScreen from './screens/FriendsScreen';
import GroupManagementScreen from './screens/GroupManagementScreen';
import PostsScreen from './screens/PostsScreen';
import ProfileScreen from './screens/ProfileScreen';
import SearchScreen from './screens/SearchScreen';
import SettingsScreen from './screens/SettingsScreen';
import SoloGamePlayScreen from './screens/SoloGamePlayScreen';
import ActivitiesHubScreen from './screens/StatusScreen';

// Import components
// eslint-disable-next-line @typescript-eslint/no-var-requires
const CallService: any = require('./components/call/CallService').default;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CallServiceAny: any = CallService;

// Import icons
import { Ionicons } from '@expo/vector-icons';
import { useNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import useNotifications from './hooks/useNotifications';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main tab navigator
function MainTabs() {
  const { user } = useAuthStore();
  
  // Safety check - don't render if user is not available
  if (!user) {
    console.log('MainTabs: User not available, rendering loading state');
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText style={{ fontSize: 16, color: '#666' }}>
          Loading user data...
        </ThemedText>
      </ThemedView>
    );
  }

  console.log('MainTabs component rendering with user:', user.id);
  
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            switch (route.name) {
              case 'Chats':
                iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                break;
              case 'Friends':
                iconName = focused ? 'people' : 'people-outline';
                break;
              case 'Home':
                iconName = focused ? 'home' : 'home-outline';
                break;
              case 'Activities':
                iconName = focused ? 'game-controller' : 'game-controller-outline';
                break;
              case 'Profile':
                iconName = focused ? 'person' : 'person-outline';
                break;
              default:
                iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#FF6B35', // Indian Saffron
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e5e5e5',
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          headerShown: false,
        })}
        initialRouteName="Chats"
      >
        <Tab.Screen 
          name="Chats" 
          component={ChatsScreen}
          options={{
            tabBarLabel: 'Chats',
          }}
        />
        <Tab.Screen 
          name="Friends" 
          component={FriendsScreen}
          options={{
            tabBarLabel: 'Friends',
          }}
        />
        <Tab.Screen 
          name="Home" 
          component={PostsScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Activities" 
          component={ActivitiesHubScreen}
          options={{
            tabBarLabel: 'Activities',
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profile',
          }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

// Main app component
export default function App() {
  const navigationRef = useNavigationContainerRef();
  const { user, isLoading, isInitialized, hasCompletedOnboarding } = useAuthStore();
  console.log('App component rendering - user:', user?.id, 'isLoading:', isLoading, 'isInitialized:', isInitialized);

  // Initialize real-time profile updates
  useRealTimeProfile();

  useNotifications((token: string) => {
    // TODO: Send this token to your backend and associate with the logged-in user
    // Example: await api.savePushToken(token)
    console.log('Expo Push Token:', token);
  });

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const nav = navigationRef.current as any;
      if (data.callId) {
        nav?.navigate('CallScreen', { callId: data.callId });
      } else if (data.chatId) {
        nav?.navigate('ChatDetailScreen', { chatId: data.chatId });
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    // Initialize authentication
    initializeAuth();
  }, []);

  // Sync authenticated user to CallService for call features
  useEffect(() => {
    if (user) {
      CallService.user = user;
      console.log('CallService.user set:', user.id);
    }
  }, [user]);

  // Hide splash screen when loading is complete and auth is initialized
  useEffect(() => {
    if (!isLoading && isInitialized) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, isInitialized]);

  // Show loading screen while auth is being initialized
  if (isLoading || !isInitialized) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ThemedText style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
              Meaz
            </ThemedText>
            <ThemedText style={{ fontSize: 16, color: '#666' }}>
              Loading...
            </ThemedText>
          </ThemedView>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <NavigationContainer
              ref={navigationRef}
              onStateChange={(state) => {
                console.log('Navigation state changed:', state);
              }}
              onReady={() => {
                console.log('Navigation container is ready');
              }}
            >
              <StatusBar style="auto" />
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
                  // Auth stack
                  <Stack.Screen name="Auth" component={AuthScreen} />
                ) : (
                  // Main app stack - always show tabs after authentication
                  <>
                    <Stack.Screen name="MainTabs" component={MainTabs} />
                    <Stack.Screen 
                      name="ProfileScreen" 
                      component={ProfileScreen}
                      options={{
                        headerShown: false
                      }}
                    />
                    <Stack.Screen 
                      name="Search" 
                      component={SearchScreen}
                      options={{
                        headerShown: true,
                        title: 'Search Users',
                      }}
                    />
                    <Stack.Screen 
                      name="ChatDetail" 
                      component={ChatDetailScreen}
                      options={{
                        headerShown: false
                      }}
                    />
                    <Stack.Screen 
                      name="Settings" 
                      component={SettingsScreen}
                      options={{
                        headerShown: true,
                        title: 'Settings',
                        presentation: 'modal',
                      }}
                    />
                    <Stack.Screen 
                      name="GroupManagement" 
                      component={GroupManagementScreen}
                      options={{
                        headerShown: true,
                        title: 'Group Management',
                        presentation: 'modal',
                      }}
                    />
                    <Stack.Screen 
                      name="SoloGamePlay" 
                      component={SoloGamePlayScreen}
                      options={{
                        headerShown: false,
                        presentation: 'modal',
                      }}
                    />
                  </>
                )}
              </Stack.Navigator>
            </NavigationContainer>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
} 

// TODO: Integrate animated stickers in chat/stories and add more interactive UI elements 