import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFriendsStore } from '../../store/friendsStore';
import { ThemedText } from '../ThemedText';

export interface InputBarProps {
  message: string;
  onMessageChange: (msg: string) => void;
  onSend: () => void;
  onAttachment: () => void;
  onVoice: () => void;
  onStopVoice: () => void;
  isVoiceRecording: boolean;
  onEmoji: () => void;
  onPoll: () => void;
  replyTo?: { content: string } | null;
  onCancelReply?: () => void;
  themeColors?: { input: string };
  inputHeight?: number;
  setInputHeight?: (h: number) => void;
  accessibilityLabelSend?: string;
  accessibilityLabelInput?: string;
}

const HASHTAG_SUGGESTIONS = [
  'welcome', 'news', 'fun', 'help', 'random', 'support', 'feature', 'bug', 'announcement', 'general'
];

export const InputBar: React.FC<InputBarProps> = ({
  message,
  onMessageChange,
  onSend,
  onAttachment,
  onVoice,
  onStopVoice,
  isVoiceRecording,
  onEmoji,
  onPoll,
  replyTo,
  onCancelReply,
  themeColors = { input: '#fff' },
  inputHeight = 40,
  setInputHeight,
  accessibilityLabelSend = 'Send Message',
  accessibilityLabelInput = 'Type a message',
}) => {
  const inputRef = useRef<TextInput>(null);
  const searchUsers = useFriendsStore(s => s.searchUsers);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionType, setMentionType] = useState<'@' | '#'>('@');
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [selection, setSelection] = useState({ start: message.length, end: message.length });

  // Detect @ or # and update mention state
  useEffect(() => {
    const cursor = typeof selection.start === 'number' ? selection.start : message.length;
    const text = message.slice(0, cursor);
    const match = text.match(/([@#])(\w*)$/);
    if (match) {
      setShowMentionList(true);
      setMentionType(match[1] as '@' | '#');
      setMentionQuery(match[2] || '');
      setMentionStart(cursor - match[2].length - 1);
    } else {
      setShowMentionList(false);
      setMentionQuery('');
      setMentionResults([]);
      setMentionStart(null);
    }
  }, [message, selection]);

  // Fetch mention results
  useEffect(() => {
    if (!showMentionList) return;
    if (mentionType === '@' && mentionQuery.length >= 1) {
      searchUsers(mentionQuery).then(setMentionResults);
    } else if (mentionType === '#') {
      setMentionResults(HASHTAG_SUGGESTIONS.filter(h => h.startsWith(mentionQuery.toLowerCase())));
    } else {
      setMentionResults([]);
    }
  }, [showMentionList, mentionQuery, mentionType]);

  // Insert mention/hashtag at cursor
  const handleMentionSelect = (item: any) => {
    if (mentionStart === null) return;
    let insertText = '';
    if (mentionType === '@') {
      insertText = `@${item.username}`;
    } else {
      insertText = `#${item}`;
    }
    const before = message.slice(0, mentionStart);
    const after = message.slice(typeof selection.start === 'number' ? selection.start : message.length);
    const newMsg = before + insertText + ' ' + after;
    onMessageChange(newMsg);
    setShowMentionList(false);
    setMentionQuery('');
    setMentionResults([]);
    setMentionStart(null);
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  return (
    <View style={[styles.inputBar, { backgroundColor: themeColors.input }]}>  
      {replyTo && (
        <View style={styles.replyBar}>
          <ThemedText>Replying to: {replyTo.content}</ThemedText>
          <TouchableOpacity onPress={onCancelReply}><Ionicons name="close" size={18} /></TouchableOpacity>
        </View>
      )}
      <View style={styles.inputRow}>
        <TouchableOpacity onPress={onAttachment} style={styles.iconButton} accessibilityLabel="Attach File or Media">
          <Ionicons name="add-circle-outline" size={28} color="#888" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { minHeight: 40, maxHeight: 120, height: inputHeight }]}
            value={message}
            onChangeText={onMessageChange}
            placeholder={accessibilityLabelInput}
            multiline
            onContentSizeChange={e => setInputHeight && setInputHeight(Math.min(120, Math.max(40, e.nativeEvent.contentSize.height)))}
            accessibilityLabel={accessibilityLabelInput}
            onSelectionChange={e => setSelection(e.nativeEvent.selection)}
          />
          {showMentionList && mentionResults.length > 0 && (
            <View style={styles.mentionDropdown}>
              <FlatList
                data={mentionResults}
                keyExtractor={item => mentionType === '@' ? item.id : item}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.mentionItem} onPress={() => handleMentionSelect(item)}>
                    {mentionType === '@' ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="person-circle" size={22} color="#888" style={{ marginRight: 8 }} />
                        <Text style={{ fontWeight: 'bold' }}>{item.username}</Text>
                        <Text style={{ color: '#888', marginLeft: 6 }}>{item.display_name}</Text>
                      </View>
                    ) : (
                      <Text style={{ fontWeight: 'bold', color: '#007AFF"' }}>#{item}</Text>
                    )}
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 120, backgroundColor: '#fff', borderRadius: 8, elevation: 6, marginTop: 2 }}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onEmoji} style={styles.iconButton} accessibilityLabel="Emoji Picker">
          <Ionicons name="happy-outline" size={24} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onPoll} style={styles.iconButton} accessibilityLabel="Create Poll">
          <Ionicons name="bar-chart-outline" size={24} color="#00BFAE" />
        </TouchableOpacity>
        {isVoiceRecording ? (
          <TouchableOpacity style={[styles.iconButton, { backgroundColor: '#ff5252' }]} onPress={onStopVoice} accessibilityLabel="Stop Recording">
            <Ionicons name="stop" size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.iconButton} onPress={onVoice} accessibilityLabel="Record Voice">
            <Ionicons name="mic-outline" size={22} color="#888" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onSend} style={styles.sendButton} accessibilityLabel={accessibilityLabelSend}>
          <Ionicons name="send" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  inputBar: { 
    padding: 10, 
    borderTopWidth: 0, 
    backgroundColor: '#f8f8f8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  inputRow: { 
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  input: { 
    flex: 1, 
    minHeight: 40, 
    maxHeight: 120, 
    borderRadius: 20,
    backgroundColor: '#f2f2f7', 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    fontSize: 16,
    marginRight: 6, 
    textAlignVertical: 'center',
  },
  sendButton: { 
    backgroundColor: '#25d366',
    borderRadius: 20, 
    padding: 10,
    marginLeft: 4,
    shadowColor: '#25d366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  iconButton: { 
    marginHorizontal: 2, 
    padding: 6, 
    borderRadius: 16,
    backgroundColor: '#f2f2f7',
  },
  replyBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6f7ff', padding: 6, borderLeftWidth: 4, borderLeftColor: '#1890ff', marginBottom: 4 },
  mentionDropdown: { position: 'absolute', left: 0, right: 0, top: 44, zIndex: 20, backgroundColor: '#fff', borderRadius: 8, elevation: 6 },
  mentionItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
}); 