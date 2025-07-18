export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  avatar_url?: string; // Add this for compatibility
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  isTyping?: boolean;
  bio?: string;
  phone?: string;
  location?: string;
  joinedAt: Date;
  settings: UserSettings;
  theme: UserTheme;
  friends: string[];
  blockedUsers: string[];
  mutedChats: string[];
  pinnedChats: string[];
  customStickers: string[];
  achievements: Achievement[];
  streakCount: number;
  totalMessages: number;
  favoriteEmojis: string[];
  premiumTier: 'free' | 'premium' | 'pro';
  lastActivity: Date;
  timezone?: string;
  language: string;
  notificationSettings: NotificationSettings;
  privacySettings: PrivacySettings;
}

export interface UserTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  bubbleStyle: 'glassmorphism' | 'neumorphism' | 'flat' | 'gradient';
  chatBackground: string;
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
  animations: boolean;
  soundEffects: boolean;
}

export interface Achievement {
  id: string;
  type: string;
  title: string;
  description: string;
  iconUrl: string;
  unlockedAt: Date;
  metadata: any;
}

export interface UserSettings {
  notifications: {
    messages: boolean;
    calls: boolean;
    stories: boolean;
    friendRequests: boolean;
    mentions: boolean;
    reactions: boolean;
  };
  privacy: {
    lastSeen: 'everyone' | 'friends' | 'nobody';
    profilePhoto: 'everyone' | 'friends' | 'nobody';
    status: 'everyone' | 'friends' | 'nobody';
    readReceipts: boolean;
    typingIndicator: boolean;
  };
  chat: {
    enterToSend: boolean;
    mediaAutoDownload: boolean;
    messageBackup: boolean;
    autoDeleteTimer?: number;
  };
  calls: {
    autoRecord: boolean;
    noiseSuppression: boolean;
    echoCancellation: boolean;
  };
}

export interface Message {
  id: string;
  chatId: string;
  senderId?: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'voice' | 'file' | 'location' | 'contact' | 'sticker' | 'gif' | 'poll';
  attachments: MessageAttachment[];
  replyTo?: string;
  reactions: MessageReaction[];
  isEdited: boolean;
  isDeleted: boolean;
  isStarred: boolean;
  isTemporary: boolean;
  expiresAt?: Date;
  viewed: boolean;
  createdAt: Date;
  updatedAt: Date;
  forwardCount: number;
  originalSenderId?: string;
  translation: MessageTranslation;
  encryptionKey?: string;
  isEncrypted: boolean;
  sender?: User;
  replyToMessage?: Message;
  poll?: Poll;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact';
  url: string;
  name?: string;
  size?: number;
  duration?: number;
  thumbnail?: string;
  metadata?: any;
}

export interface MessageTranslation {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  caption?: string;
  isAnimated?: boolean;
}

export interface Chat {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'channel' | 'broadcast';
  description?: string;
  avatar?: string;
  createdBy?: string;
  settings: ChatSettings;
  customization: ChatCustomization;
  isArchived: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastMessageId?: string;
  joinLink?: string;
  joinLinkExpiresAt?: Date;
  isEncrypted: boolean;
  encryptionKey?: string;
  autoDeleteTimer?: number;
  members: ChatMember[];
  pinnedMessages: PinnedMessage[];
  voiceChannels: VoiceChannel[];
}

export interface ChatCustomization {
  theme: string;
  background: string;
  bubbleStyle: string;
  fontFamily: string;
  fontSize: string;
}

export interface ChatMember {
  id: string;
  chatId: string;
  userId: string;
  role: 'member' | 'admin' | 'moderator' | 'owner';
  joinedAt: Date;
  lastReadAt: Date;
  isMuted: boolean;
  isPinned: boolean;
  user?: User;
}

export interface ChatPermissions {
  canSendMessages: boolean;
  canSendMedia: boolean;
  canAddMembers: boolean;
  canPinMessages: boolean;
  canDeleteMessages: boolean;
  canChangeInfo: boolean;
}

export interface ChatSettings {
  allowInvites: boolean;
  allowPinning: boolean;
  allowEditing: boolean;
  allowDeleting: boolean;
  slowMode: boolean;
  slowModeInterval: number;
  autoDeleteTimer?: number;
}

export interface Story {
  id: string;
  userId?: string;
  content: StoryContent[];
  viewers: StoryView[];
  privacy: 'public' | 'friends' | 'close_friends' | 'custom';
  isHighlight: boolean;
  highlightTitle?: string;
  music?: StoryMusic;
  location?: StoryLocation;
  mentions: string[];
  hashtags: string[];
  createdAt: Date;
  expiresAt: Date;
  user?: User;
}

export interface StoryContent {
  id: string;
  type: 'image' | 'video' | 'text';
  url?: string;
  text?: string;
  duration: number;
  position: { x: number; y: number };
  style?: any;
}

export interface StoryView {
  id: string;
  storyId: string;
  viewerId: string;
  viewedAt: Date;
  viewer?: User;
}

export interface StoryMusic {
  title: string;
  artist: string;
  url: string;
  duration: number;
}

export interface StoryLocation {
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
}

export interface Poll {
  id: string;
  messageId: string;
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  expiresAt?: Date;
  createdAt: Date;
  votes: PollVote[];
  totalVotes: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
  hasVoted: boolean;
}

export interface PollVote {
  id: string;
  pollId: string;
  userId: string;
  selectedOptions: string[];
  createdAt: Date;
}

export interface VoiceChannel {
  id: string;
  name: string;
  description?: string;
  chatId: string;
  createdBy?: string;
  maxParticipants: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  participants: VoiceChannelParticipant[];
  participantCount: number;
}

export interface VoiceChannelParticipant {
  id: string;
  channelId: string;
  userId: string;
  joinedAt: Date;
  isMuted: boolean;
  isSpeaking: boolean;
  user?: User;
}

export interface PinnedMessage {
  id: string;
  chatId: string;
  messageId: string;
  pinnedBy?: string;
  pinnedAt: Date;
  message?: Message;
  pinnedByUser?: User;
}

export interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'answered' | 'declined' | 'missed' | 'ended';
  startedAt?: Date;
  endedAt?: Date;
  duration?: string;
  createdAt: Date;
  callUrl?: string;
  recordingUrl?: string;
  participants: any;
  callQuality?: string;
  networkType?: string;
  caller?: User;
  receiver?: User;
}

export interface Snap {
  id: string;
  senderId: string;
  receiverId: string;
  mediaUrl: string;
  caption?: string;
  duration: number;
  viewed: boolean;
  viewedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  sender?: User;
  receiver?: User;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  createdAt: Date;
  updatedAt: Date;
  fromUser?: User;
  toUser?: User;
}

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  friend?: User;
}

export interface UserBlock {
  id: string;
  blockerId: string;
  blockedId: string;
  reason?: string;
  createdAt: Date;
  blocker?: User;
  blocked?: User;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  evidence?: any;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  reporter?: User;
  reported?: User;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementType: string;
  title: string;
  description?: string;
  iconUrl?: string;
  unlockedAt: Date;
  metadata?: any;
  user?: User;
}

export interface UserStreak {
  id: string;
  userId: string;
  streakType: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'friend_request' | 'message' | 'story' | 'mention' | 'like' | 'reaction' | 'system';
  title: string;
  body?: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export interface Activity {
  id: string;
  userId: string;
  type: 'login' | 'logout' | 'profile_update' | 'story_post' | 'message_sent' | 'mood_check' | 'game' | 'streak';
  description?: string;
  metadata?: any;
  createdAt: Date;
  user?: User;
}

export interface NotificationSettings {
  push: boolean;
  email: boolean;
  sms: boolean;
  sound: boolean;
  vibration: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  allowFriendRequests: boolean;
  allowMessages: 'everyone' | 'friends' | 'nobody';
  allowCalls: 'everyone' | 'friends' | 'nobody';
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  showReadReceipts: boolean;
  showTypingIndicator: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  onboardingStep: number;
  hasCompletedOnboarding: boolean;
}

export interface ChatState {
  chats: Chat[];
  currentChat: Chat | null;
  messages: { [chatId: string]: Message[] };
  isLoading: boolean;
  error: string | null;
  typingUsers: string[];
  onlineUsers: string[];
}

export interface FriendsState {
  friends: User[];
  friendRequests: FriendRequest[];
  isLoading: boolean;
  error: string | null;
  subscription?: any;
  profileSubscriptions: Map<string, any>; // Add this for real-time subscriptions

  loadFriends: () => Promise<void>;
  loadFriendRequests: () => Promise<void>;
  sendFriendRequest: (toUserId: string, message?: string) => Promise<{ error?: { message: string } }>;
  acceptFriendRequest: (requestId: string) => Promise<{ error?: { message: string } }>;
  rejectFriendRequest: (requestId: string) => Promise<{ error?: { message: string } }>;
  removeFriend: (friendId: string) => Promise<{ error?: { message: string } }>;
  searchUsers: (query: string) => Promise<User[]>;
  initialize: () => Promise<void>;
  setupRealTimeSubscriptions: () => void;
  cleanupSubscriptions: () => void;
}

export interface StoriesState {
  stories: Story[];
  myStories: Story[];
  isLoading: boolean;
  error: string | null;
  loadMyStories: () => Promise<void>;
  loadFriendsStories: () => Promise<void>;
  createStory: (
    content: StoryContent[],
    privacy?: 'public' | 'friends' | 'close_friends' | 'custom',
    options?: {
      isHighlight?: boolean;
      highlightTitle?: string;
      music?: any;
      location?: any;
      mentions?: string[];
      hashtags?: string[];
    }
  ) => Promise<void>;
}

export interface CallsState {
  activeCall: Call | null;
  incomingCall: Call | null;
  callHistory: Call[];
  isLoading: boolean;
  error: string | null;
}

export interface SnapsState {
  snaps: Snap[];
  isLoading: boolean;
  error: string | null;
}

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

export interface ActivitiesState {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
}

export interface VoiceChannelsState {
  channels: VoiceChannel[];
  activeChannel: VoiceChannel | null;
  isLoading: boolean;
  error: string | null;
}

export interface PollsState {
  polls: Poll[];
  isLoading: boolean;
  error: string | null;
}

export interface AchievementsState {
  achievements: UserAchievement[];
  streaks: UserStreak[];
  isLoading: boolean;
  error: string | null;
}

export interface AppState {
  auth: AuthState;
  chat: ChatState;
  friends: FriendsState;
  stories: StoriesState;
  calls: CallsState;
  snaps: SnapsState;
  notifications: NotificationsState;
  activities: ActivitiesState;
  voiceChannels: VoiceChannelsState;
  polls: PollsState;
  achievements: AchievementsState;
}

// === POSTS FEED TYPES ===
export interface PostMedia {
  type: 'image' | 'video';
  url: string;
}

export interface Post {
  id: string;
  userId: string;
  media: PostMedia[];
  caption?: string;
  location?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
  isDeleted: boolean;
  user?: User;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  likedByMe?: boolean;
}

export interface PostLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
  user?: User;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
  isDeleted: boolean;
  user?: User;
}

export interface PostShare {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
  user?: User;
} 