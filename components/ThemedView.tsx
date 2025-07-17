import { View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';

import { useTheme } from './ThemeContext';
import { Colors } from '@/constants/Colors';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const { theme } = useTheme();
  let backgroundColor = Colors[theme]?.background || Colors.light.background;
  let borderColor = (Colors[theme] && 'border' in Colors[theme]) ? Colors[theme].border : 'transparent';
  let borderWidth = 0;
  let extraStyle = {};

  if (theme === 'light' && lightColor) backgroundColor = lightColor;
  if (theme === 'dark' && darkColor) backgroundColor = darkColor;

  // Glassmorphism
  if (theme === 'glass') {
    borderWidth = 1;
    extraStyle = {
      borderColor,
      borderWidth,
      borderRadius: 16,
      overflow: 'hidden',
    };
    return (
      <BlurView intensity={40} tint="light" style={[{ backgroundColor }, extraStyle, style]} {...otherProps} />
    );
  }

  // Neon/Cyberpunk
  if (theme === 'neon' || theme === 'cyberpunk') {
    borderWidth = 2;
    extraStyle = {
      borderColor,
      borderWidth,
      borderRadius: 16,
      shadowColor: Colors[theme]?.accent || '#fff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 12,
      elevation: 8,
    };
  }

  return <View style={[{ backgroundColor }, extraStyle, style]} {...otherProps} />;
}
