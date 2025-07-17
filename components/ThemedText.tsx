import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from './ThemeContext';
import { Colors } from '@/constants/Colors';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const { theme } = useTheme();
  let color = Colors[theme]?.text || Colors.light.text;
  if (theme === 'light' && lightColor) color = lightColor;
  if (theme === 'dark' && darkColor) color = darkColor;

  // Neon/Cyberpunk text glow
  let extraStyle = {};
  if (theme === 'neon' || theme === 'cyberpunk') {
    extraStyle = {
      textShadowColor: Colors[theme]?.accent || '#fff',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 8,
    };
  }

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        extraStyle,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
