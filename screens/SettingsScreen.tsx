import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { useTheme, FontSize, ColorBlindMode } from '../components/ThemeContext';
import { Colors } from '../constants/Colors';
import { PrivacyControls } from '../components/privacy/PrivacyControls';

const SettingsScreen = () => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [showPrivacyControls, setShowPrivacyControls] = useState(false);
  const { theme, setTheme, fontSize, setFontSize, colorBlindMode, setColorBlindMode } = useTheme();
  const themeColors = Colors[theme] || Colors.light;

  const themeOptions = [
    { id: 'light', label: 'Light', icon: 'sunny' },
    { id: 'dark', label: 'Dark', icon: 'moon' },
    { id: 'cyberpunk', label: 'Cyberpunk', icon: 'flash' },
    { id: 'glass', label: 'Glass', icon: 'diamond' },
    { id: 'neon', label: 'Neon', icon: 'bulb' },
  ];

  const fontSizeOptions = [
    { id: 'small', label: 'Small' },
    { id: 'medium', label: 'Medium' },
    { id: 'large', label: 'Large' },
  ];

  const colorBlindOptions = [
    { id: 'none', label: 'None' },
    { id: 'protanopia', label: 'Protanopia' },
    { id: 'deuteranopia', label: 'Deuteranopia' },
    { id: 'tritanopia', label: 'Tritanopia' },
  ];

  const settingsSections = [
    {
      title: 'Appearance',
      items: [
        { id: 'theme', label: 'Theme', icon: 'color-palette', type: 'navigate' },
        { id: 'darkMode', label: 'Dark Mode', icon: 'moon', type: 'switch', value: darkMode, onValueChange: setDarkMode },
      ]
    },
    {
      title: 'Notifications',
      items: [
        { id: 'notifications', label: 'Push Notifications', icon: 'notifications', type: 'switch', value: notifications, onValueChange: setNotifications },
        { id: 'sound', label: 'Sound', icon: 'volume-high', type: 'switch', value: soundEnabled, onValueChange: setSoundEnabled },
        { id: 'vibration', label: 'Vibration', icon: 'phone-portrait', type: 'switch', value: vibrationEnabled, onValueChange: setVibrationEnabled },
      ]
    },
    {
      title: 'Privacy & Security',
      items: [
        { id: 'privacy', label: 'Privacy Settings', icon: 'shield-checkmark', type: 'navigate', onPress: () => setShowPrivacyControls(true) },
        { id: 'security', label: 'Security', icon: 'lock-closed', type: 'navigate' },
        { id: 'blocked', label: 'Blocked Users', icon: 'ban', type: 'navigate' },
      ]
    },
    {
      title: 'Account',
      items: [
        { id: 'profile', label: 'Edit Profile', icon: 'person', type: 'navigate' },
        { id: 'password', label: 'Change Password', icon: 'key', type: 'navigate' },
        { id: 'logout', label: 'Logout', icon: 'log-out', type: 'action' },
      ]
    },
  ];

  const renderSettingItem = (item: any) => (
    <TouchableOpacity key={item.id} style={[styles.settingItem, { backgroundColor: themeColors.background }]} onPress={item.onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={item.icon as any} size={20} color={themeColors.icon} />
        <ThemedText style={[styles.settingLabel, { color: themeColors.text }]}>{item.label}</ThemedText>
      </View>
      <View style={styles.settingRight}>
        {item.type === 'switch' && (
          <Switch
            value={item.value}
            onValueChange={item.onValueChange}
            trackColor={{ false: '#767577', true: themeColors.tint }}
            thumbColor={item.value ? '#f4f3f4' : '#f4f3f4'}
          />
        )}
        {item.type === 'navigate' && (
          <Ionicons name="chevron-forward" size={20} color={themeColors.icon} />
        )}
        {item.type === 'action' && (
          <Ionicons name="chevron-forward" size={20} color={themeColors.icon} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ThemedView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: themeColors.text }]}>Settings</ThemedText>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>{section.title}</ThemedText>
            <View style={styles.sectionContent}>
              {section.items.map(renderSettingItem)}
            </View>
  </View>
        ))}

        {/* Theme Selection */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>Choose Theme</ThemedText>
          <View style={styles.themeGrid}>
            {themeOptions.map((themeOption) => (
      <TouchableOpacity
                key={themeOption.id}
                style={[
                  styles.themeOption,
                  { backgroundColor: themeColors.background },
                  theme === themeOption.id && { borderColor: themeColors.tint, borderWidth: 2 }
                ]}
                onPress={() => setTheme(themeOption.id)}
              >
                <Ionicons name={themeOption.icon as any} size={24} color={themeColors.icon} />
                <ThemedText style={[styles.themeLabel, { color: themeColors.text }]}>{themeOption.label}</ThemedText>
      </TouchableOpacity>
    ))}
  </View>
        </View>

        {/* Font Size Selection */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>Font Size</ThemedText>
          <View style={styles.themeGrid}>
            {fontSizeOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.themeOption,
                  { backgroundColor: themeColors.background },
                  fontSize === option.id && { borderColor: themeColors.tint, borderWidth: 2 }
                ]}
                onPress={() => setFontSize(option.id as FontSize)}
              >
                <ThemedText style={[styles.themeLabel, { color: themeColors.text }]}>{option.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color Blind Mode Selection */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>Color Blind Mode</ThemedText>
          <View style={styles.themeGrid}>
            {colorBlindOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.themeOption,
                  { backgroundColor: themeColors.background },
                  colorBlindMode === option.id && { borderColor: themeColors.tint, borderWidth: 2 }
                ]}
                onPress={() => setColorBlindMode(option.id as ColorBlindMode)}
              >
                <ThemedText style={[styles.themeLabel, { color: themeColors.text }]}>{option.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.versionContainer}>
          <ThemedText style={[styles.versionText, { color: themeColors.icon }]}>Meaz v1.0.0</ThemedText>
        </View>

        {/* PrivacyControls Modal */}
        {showPrivacyControls && (
          <View style={styles.privacyControlsModal}>
            <PrivacyControls userId={'current-user-id'} />
            <TouchableOpacity onPress={() => setShowPrivacyControls(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color={themeColors.text} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ThemedView>
);
};

const styles = StyleSheet.create({
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    marginHorizontal: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  settingRight: {
    alignItems: 'center',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 16,
  },
  themeOption: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    width: '48%',
    marginBottom: 12,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 14,
  },
  privacyControlsModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 12,
  },
});

export default SettingsScreen; 