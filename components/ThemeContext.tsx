import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark' | 'cyberpunk' | 'glass' | 'neon';
export type FontSize = 'small' | 'medium' | 'large';
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

interface ThemeContextProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  colorBlindMode: ColorBlindMode;
  setColorBlindMode: (mode: ColorBlindMode) => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'light',
  setTheme: () => {},
  fontSize: 'medium',
  setFontSize: () => {},
  colorBlindMode: 'none',
  setColorBlindMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeType>('light');
  const [fontSize, setFontSizeState] = useState<FontSize>('medium');
  const [colorBlindMode, setColorBlindModeState] = useState<ColorBlindMode>('none');

  useEffect(() => {
    (async () => {
      const storedTheme = await AsyncStorage.getItem('appTheme');
      if (storedTheme) setThemeState(storedTheme as ThemeType);
      const storedFontSize = await AsyncStorage.getItem('appFontSize');
      if (storedFontSize) setFontSizeState(storedFontSize as FontSize);
      const storedCBMode = await AsyncStorage.getItem('appColorBlindMode');
      if (storedCBMode) setColorBlindModeState(storedCBMode as ColorBlindMode);
    })();
  }, []);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    AsyncStorage.setItem('appTheme', newTheme);
  };
  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    AsyncStorage.setItem('appFontSize', size);
  };
  const setColorBlindMode = (mode: ColorBlindMode) => {
    setColorBlindModeState(mode);
    AsyncStorage.setItem('appColorBlindMode', mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, fontSize, setFontSize, colorBlindMode, setColorBlindMode }}>
      {children}
    </ThemeContext.Provider>
  );
}; 