import React from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface ActionMenuProps {
  visible: boolean;
  options: string[];
  onSelect: (index: number, option: string) => void;
  onClose: () => void;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ visible, options, onSelect, onClose }) => {
  React.useEffect(() => {
    if (!visible) return;
    const cancelButtonIndex = options.indexOf('Cancel');
    const destructiveButtonIndex = options.indexOf('Delete');
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
      }, (buttonIndex) => {
        onSelect(buttonIndex, options[buttonIndex]);
        onClose();
      });
    } else {
      Alert.alert('Message Actions', '',
        options.map((opt, idx) => ({
          text: opt,
          onPress: () => { onSelect(idx, opt); onClose(); },
          style: opt === 'Delete' ? 'destructive' : opt === 'Cancel' ? 'cancel' : 'default',
        }))
      );
    }
  }, [visible]);
  return null;
}; 