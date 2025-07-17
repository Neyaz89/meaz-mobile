import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/ThemedText';
import AlbumsSection from '../components/activities/AlbumsSection';
import AvatarMoodSection from '../components/activities/AvatarMoodSection';
import EventsPollsSection from '../components/activities/EventsPollsSection';
import MiniGamesSection from '../components/activities/MiniGamesSection';
import NotificationHooks from '../components/activities/NotificationHooks';
import PromptsSection from '../components/activities/PromptsSection';
import StoriesSection from '../components/activities/StoriesSection';
import StreaksAchievementsSection from '../components/activities/StreaksAchievementsSection';
import TimelineSection from '../components/activities/TimelineSection';
import VoiceNotesSection from '../components/activities/VoiceNotesSection';

const ActivitiesHubScreen = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={{ marginBottom: 30, alignItems: 'center', paddingTop: 20 }}>
          <ThemedText style={{ 
            fontSize: 32, 
            fontWeight: 'bold', 
            color: 'white',
            textShadowColor: 'rgba(0,0,0,0.3)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4
          }}>
            Activities
          </ThemedText>
          <ThemedText style={{ 
            fontSize: 16, 
            color: 'rgba(255,255,255,0.8)',
            marginTop: 5
          }}>
            Discover amazing features
          </ThemedText>
        </View>

        {/* Scrollable Content Sections */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ 
            backgroundColor: 'rgba(255,255,255,0.95)', 
            borderRadius: 25,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10
          }}>
            <StoriesSection />
            <MiniGamesSection />
            <VoiceNotesSection />
            <AlbumsSection />
            <EventsPollsSection />
            <TimelineSection />
            <PromptsSection />
            <AvatarMoodSection />
            <StreaksAchievementsSection />
          </View>
        </ScrollView>
        <NotificationHooks />
      </LinearGradient>
    </SafeAreaView>
  );
};

export default ActivitiesHubScreen; 