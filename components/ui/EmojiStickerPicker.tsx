import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

const { width: screenWidth } = Dimensions.get('window');

interface EmojiCategory {
  id: string;
  name: string;
  icon: string;
  emojis: string[];
}

interface StickerCategory {
  id: string;
  name: string;
  icon: string;
  stickers: Sticker[];
}

interface Sticker {
  id: string;
  url: string;
  name: string;
  category: string;
}

interface EmojiStickerPickerProps {
  isVisible: boolean;
  onEmojiSelect: (emoji: string) => void;
  onStickerSelect: (sticker: Sticker) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'recent',
    name: 'Recent',
    icon: 'time-outline',
    emojis: ['😀', '😂', '❤️', '👍', '🎉', '🔥', '😍', '🤔'],
  },
  {
    id: 'smileys',
    name: 'Smileys',
    icon: 'happy-outline',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
  },
  {
    id: 'gestures',
    name: 'Gestures',
    icon: 'hand-left-outline',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸'],
  },
  {
    id: 'animals',
    name: 'Animals',
    icon: 'paw-outline',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦙', '🦒', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔'],
  },
  {
    id: 'food',
    name: 'Food',
    icon: 'restaurant-outline',
    emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '🫖', '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍷', '🥂', '🥃', '🍸', '🍹', '🧉', '🍾', '🥄', '🍴', '🍽️', '🥣', '🥡', '🥢', '🧂'],
  },
  {
    id: 'activities',
    name: 'Activities',
    icon: 'game-controller-outline',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🏋️‍♂️', '🤼‍♀️', '🤼', '🤼‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️', '🤺', '🤾‍♀️', '🤾', '🤾‍♂️', '🏊‍♀️', '🏊', '🏊‍♂️', '🤽‍♀️', '🤽', '🤽‍♂️', '🚣‍♀️', '🚣', '🚣‍♂️', '🧗‍♀️', '🧗', '🧗‍♂️', '🚵‍♀️', '🚵', '🚵‍♂️', '🚴‍♀️', '🚴', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹‍♀️', '🤹', '🤹‍♂️', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩', '🎨', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '🧮', '🎥', '📺', '📻', '📷', '📸', '📹', '📼', '🔍', '🔎', '🕯️', '💡', '🔦', '🏮', '🪔', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '🏷️', '💰', '🪙', '💴', '💵', '💶', '💷', '🪙', '💳', '🧾', '💸', '🪙', '💱', '💲', '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬', '📭', '📮', '🗳️', '✏️', '✒️', '🖋️', '🖊️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓'],
  },
];

const STICKER_CATEGORIES: StickerCategory[] = [
  {
    id: 'reactions',
    name: 'Reactions',
    icon: 'happy-outline',
    stickers: [
      { id: '1', url: 'https://via.placeholder.com/60/FF6B35/FFFFFF?text=😀', name: 'Happy', category: 'reactions' },
      { id: '2', url: 'https://via.placeholder.com/60/138808/FFFFFF?text=😂', name: 'Laugh', category: 'reactions' },
      { id: '3', url: 'https://via.placeholder.com/60/000080/FFFFFF?text=❤️', name: 'Love', category: 'reactions' },
      { id: '4', url: 'https://via.placeholder.com/60/FFD700/FFFFFF?text=👍', name: 'Thumbs Up', category: 'reactions' },
      { id: '5', url: 'https://via.placeholder.com/60/FF69B4/FFFFFF?text=🎉', name: 'Party', category: 'reactions' },
      { id: '6', url: 'https://via.placeholder.com/60/00CED1/FFFFFF?text=🔥', name: 'Fire', category: 'reactions' },
    ],
  },
  {
    id: 'animals',
    name: 'Animals',
    icon: 'paw-outline',
    stickers: [
      { id: '7', url: 'https://via.placeholder.com/60/FF6B35/FFFFFF?text=🐶', name: 'Dog', category: 'animals' },
      { id: '8', url: 'https://via.placeholder.com/60/138808/FFFFFF?text=🐱', name: 'Cat', category: 'animals' },
      { id: '9', url: 'https://via.placeholder.com/60/000080/FFFFFF?text=🐰', name: 'Rabbit', category: 'animals' },
      { id: '10', url: 'https://via.placeholder.com/60/FFD700/FFFFFF?text=🦊', name: 'Fox', category: 'animals' },
    ],
  },
];

export const EmojiStickerPicker: React.FC<EmojiStickerPickerProps> = ({
  isVisible,
  onEmojiSelect,
  onStickerSelect,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'emoji' | 'sticker'>('emoji');
  const [activeCategory, setActiveCategory] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { theme } = useTheme();

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const filteredEmojis = EMOJI_CATEGORIES.find(cat => cat.id === activeCategory)?.emojis || [];
  const filteredStickers = STICKER_CATEGORIES.find(cat => cat.id === activeCategory)?.stickers || [];

  const handleEmojiPress = (emoji: string) => {
    onEmojiSelect(emoji);
    // Add to recent emojis
    const recentCategory = EMOJI_CATEGORIES.find(cat => cat.id === 'recent');
    if (recentCategory && !recentCategory.emojis.includes(emoji)) {
      recentCategory.emojis.unshift(emoji);
      if (recentCategory.emojis.length > 8) {
        recentCategory.emojis.pop();
      }
    }
  };

  const handleStickerPress = (sticker: Sticker) => {
    onStickerSelect(sticker);
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [300, 0],
              }),
            },
          ],
        },
      ]}
    >
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Emoji & Stickers</ThemedText>
        <View style={styles.placeholder} />
      </ThemedView>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'emoji' && styles.activeTab]}
          onPress={() => setActiveTab('emoji')}
        >
          <Ionicons
            name="happy-outline"
            size={20}
            color={activeTab === 'emoji' ? '#FF6B35' : '#666'}
          />
          <ThemedText style={[styles.tabText, activeTab === 'emoji' && styles.activeTabText]}>
            Emoji
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sticker' && styles.activeTab]}
          onPress={() => setActiveTab('sticker')}
        >
          <Ionicons
            name="images-outline"
            size={20}
            color={activeTab === 'sticker' ? '#FF6B35' : '#666'}
          />
          <ThemedText style={[styles.tabText, activeTab === 'sticker' && styles.activeTabText]}>
            Stickers
          </ThemedText>
        </TouchableOpacity>
    </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search emojis and stickers..."
        placeholderTextColor="#999"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
        {(activeTab === 'emoji' ? EMOJI_CATEGORIES : STICKER_CATEGORIES).map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryTab,
              activeCategory === category.id && styles.activeCategoryTab,
            ]}
            onPress={() => setActiveCategory(category.id)}
          >
            <Ionicons
              name={category.icon as any}
              size={20}
              color={activeCategory === category.id ? '#FF6B35' : '#666'}
            />
            <ThemedText
              style={[
                styles.categoryText,
                activeCategory === category.id && styles.activeCategoryText,
              ]}
            >
              {category.name}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={activeTab === 'emoji' ? filteredEmojis : filteredStickers}
        renderItem={({ item }) =>
          activeTab === 'emoji' ? (
            <TouchableOpacity
              style={styles.emojiItem}
              onPress={() => handleEmojiPress(item)}
            >
              <Text style={styles.emojiText}>{item}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.stickerItem}
              onPress={() => handleStickerPress(item)}
            >
              <Text style={styles.stickerText}>{item.name}</Text>
            </TouchableOpacity>
          )
        }
        keyExtractor={(item, index) => index.toString()}
        numColumns={8}
        style={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFF5F2',
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#FF6B35',
  },
  searchInput: {
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
  },
  activeCategoryTab: {
    backgroundColor: '#FF6B35',
  },
  categoryText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  activeCategoryText: {
    color: '#fff',
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emojiItem: {
    width: (screenWidth - 60) / 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  emojiText: {
    fontSize: 24,
  },
  stickerItem: {
    width: (screenWidth - 60) / 4,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  stickerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
}); 