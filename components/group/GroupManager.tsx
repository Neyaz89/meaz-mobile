import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useGroupStore } from '../../store/groupStore';
// TODO: Add group roles, invites, mentions, settings UI
export interface GroupManagerProps {
  groupId: string;
}
export const GroupManager: React.FC<GroupManagerProps> = ({ groupId }) => {
  const { members, loading, error, fetchMembers, addMember, removeMember, updateMemberRole, transferOwnership, updateGroupInfo, leaveGroup, deleteGroup, inviteByLink, searchUsers } = useGroupStore();
  const [newUserId, setNewUserId] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'member'>('member');
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [transferringTo, setTransferringTo] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member'>('member');

  useEffect(() => {
    fetchMembers(groupId);
    // Fetch group info (pseudo-code, replace with real fetch)
    (async () => {
      const info = await updateGroupInfo(groupId, null, null, null, true); // true = fetch only
      setGroupInfo(info);
      setAvatar(info?.avatar_url || '');
      setName(info?.name || '');
      setDescription(info?.description || '');
      setUserRole(info?.myRole || 'member');
    })();
    // Fetch invite link (pseudo-code)
    (async () => {
      const link = await inviteByLink(groupId);
      setInviteLink(link);
    })();
  }, [groupId]);

  // Avatar picker (pseudo-code)
  const handlePickAvatar = async () => {
    // Use ImagePicker, upload, setAvatar(newUrl)
  };
  const handleSaveInfo = async () => {
    await updateGroupInfo(groupId, name, description, avatar);
    setEditing(false);
  };
  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (text.length > 1) {
      const results = await searchUsers(text);
      setSearchResults(results);
      setShowPicker(true);
    } else {
      setShowPicker(false);
    }
  };
  const handleAddMember = (userId: string) => {
    addMember(groupId, userId, 'member');
    setShowPicker(false);
    setSearchText('');
  };

  return (
    <View style={styles.container}>
      {/* Editable group info (admins/owners only) */}
      <View style={styles.groupInfoSection}>
        <TouchableOpacity onPress={userRole !== 'member' ? handlePickAvatar : undefined} disabled={userRole === 'member'}>
          <Image source={avatar ? { uri: avatar } : require('../../assets/images/default-avatar.png')} style={styles.groupAvatar} />
        </TouchableOpacity>
        {editing ? (
          <TextInput style={styles.groupNameInput} value={name} onChangeText={setName} editable={userRole !== 'member'} />
        ) : (
          <Text style={styles.groupName}>{name}</Text>
        )}
        {editing ? (
          <TextInput style={styles.groupDescInput} value={description} onChangeText={setDescription} editable={userRole !== 'member'} />
        ) : (
          <Text style={styles.groupDesc}>{description}</Text>
        )}
        {userRole !== 'member' && (
          editing ? (
            <TouchableOpacity onPress={handleSaveInfo} style={styles.saveBtn}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editBtn}><Text style={styles.editText}>Edit</Text></TouchableOpacity>
          )
        )}
      </View>
      {/* Invite by link */}
      <View style={styles.inviteSection}>
        <Text style={styles.inviteLabel}>Invite Link:</Text>
        <Text selectable style={styles.inviteLink}>{inviteLink}</Text>
        <TouchableOpacity onPress={() => { /* copy to clipboard */ }} style={styles.copyBtn}><Text style={styles.copyText}>Copy</Text></TouchableOpacity>
      </View>
      {/* Add member by search/friend picker */}
      {userRole !== 'member' && (
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Search users..."
            value={searchText}
            onChangeText={handleSearch}
          />
          {showPicker && (
            <View style={styles.pickerResults}>
              {searchResults.map(u => (
                <TouchableOpacity key={u.id} onPress={() => handleAddMember(u.id)} style={styles.pickerItem}>
                  <Image source={u.avatar_url ? { uri: u.avatar_url } : require('../../assets/images/default-avatar.png')} style={styles.pickerAvatar} />
                  <Text style={styles.pickerName}>{u.display_name || u.username}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
      {/* Member list with avatars, names, roles, online status, and role management */}
      <Text style={styles.title}>Group Members</Text>
      {loading && <ActivityIndicator size="small" color="#888" />}
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={members}
        keyExtractor={(item) => item.user_id}
        renderItem={({ item }) => (
          <View style={styles.memberRow}>
            <Image source={item.avatar_url ? { uri: item.avatar_url } : require('../../assets/images/default-avatar.png')} style={styles.memberAvatar} />
            <Text style={styles.name}>{item.display_name || item.username}</Text>
            <Text style={styles.role}>{item.role}</Text>
            <View style={styles.statusDot(item.is_online)} />
            {userRole !== 'member' && item.role !== 'owner' && (
              <>
                <TouchableOpacity onPress={() => removeMember(groupId, item.user_id)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => updateMemberRole(groupId, item.user_id, item.role === 'admin' ? 'member' : 'admin')} style={styles.roleBtn}>
                  <Text style={styles.roleText}>{item.role === 'admin' ? 'Demote' : 'Promote'}</Text>
                </TouchableOpacity>
                {userRole === 'owner' && (
                  <TouchableOpacity onPress={() => setTransferringTo(item.user_id)} style={styles.transferBtn}>
                    <Text style={styles.transferText}>Transfer Ownership</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
      />
      {/* Transfer ownership confirmation */}
      {transferringTo && (
        <View style={styles.transferConfirm}>
          <Text>Transfer ownership to this member?</Text>
          <TouchableOpacity onPress={() => { transferOwnership(groupId, transferringTo); setTransferringTo(null); }} style={styles.confirmBtn}><Text>Yes</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setTransferringTo(null)} style={styles.cancelBtn}><Text>No</Text></TouchableOpacity>
        </View>
      )}
      {/* Leave/Delete group actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity onPress={() => setShowConfirmLeave(true)} style={styles.leaveBtn}><Text style={styles.leaveText}>Leave Group</Text></TouchableOpacity>
        {userRole === 'owner' && (
          <TouchableOpacity onPress={() => setShowConfirmDelete(true)} style={styles.deleteBtn}><Text style={styles.deleteText}>Delete Group</Text></TouchableOpacity>
        )}
      </View>
      {/* Confirm leave group */}
      {showConfirmLeave && (
        <View style={styles.confirmModal}>
          <Text>Are you sure you want to leave this group?</Text>
          <TouchableOpacity onPress={() => { leaveGroup(groupId); setShowConfirmLeave(false); }} style={styles.confirmBtn}><Text>Yes</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowConfirmLeave(false)} style={styles.cancelBtn}><Text>No</Text></TouchableOpacity>
        </View>
      )}
      {/* Confirm delete group */}
      {showConfirmDelete && (
        <View style={styles.confirmModal}>
          <Text>Are you sure you want to delete this group? This cannot be undone.</Text>
          <TouchableOpacity onPress={() => { deleteGroup(groupId); setShowConfirmDelete(false); }} style={styles.confirmBtn}><Text>Yes</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowConfirmDelete(false)} style={styles.cancelBtn}><Text>No</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontWeight: 'bold', marginBottom: 8 },
  error: { color: 'red', marginBottom: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  name: { flex: 1, color: '#333' },
  role: { marginHorizontal: 8, color: '#666' },
  removeBtn: { padding: 4, backgroundColor: '#fee', borderRadius: 4, marginRight: 4 },
  removeText: { color: '#c00' },
  roleBtn: { padding: 4, backgroundColor: '#eef', borderRadius: 4, marginRight: 4 },
  roleText: { color: '#06b' },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginRight: 8 },
  addBtn: { padding: 8, backgroundColor: '#def', borderRadius: 4 },
  addText: { color: '#06b' },
  groupInfoSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 8 },
  groupAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  groupNameInput: { flex: 1, fontSize: 18, fontWeight: 'bold' },
  groupName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  groupDescInput: { flex: 1, fontSize: 14, color: '#666', marginTop: 4 },
  groupDesc: { fontSize: 14, color: '#666' },
  editBtn: { padding: 4, backgroundColor: '#eef', borderRadius: 4, marginLeft: 8 },
  editText: { color: '#06b' },
  saveBtn: { padding: 4, backgroundColor: '#def', borderRadius: 4, marginLeft: 8 },
  saveText: { color: '#06b' },
  inviteSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 8 },
  inviteLabel: { fontSize: 14, color: '#666', marginRight: 8 },
  inviteLink: { flex: 1, fontSize: 14, color: '#06b', textDecorationLine: 'underline' },
  copyBtn: { padding: 4, backgroundColor: '#eef', borderRadius: 4, marginLeft: 8 },
  copyText: { color: '#06b' },
  pickerResults: { position: 'absolute', top: 50, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 8, padding: 8, zIndex: 1 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 4, marginBottom: 4 },
  pickerAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  pickerName: { fontSize: 14, color: '#333' },
  statusDot: (isOnline: boolean) => ({
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: isOnline ? '#4CAF50' : '#FF9800',
    marginLeft: 10,
  }),
  transferConfirm: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  transferText: { color: '#06b' },
  transferBtn: { padding: 4, backgroundColor: '#eef', borderRadius: 4, marginLeft: 8 },
  bottomActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 8 },
  leaveBtn: { padding: 8, backgroundColor: '#fee', borderRadius: 4 },
  leaveText: { color: '#c00' },
  deleteBtn: { padding: 8, backgroundColor: '#fee', borderRadius: 4 },
  deleteText: { color: '#c00' },
  confirmModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  confirmBtn: { padding: 12, backgroundColor: '#4CAF50', borderRadius: 8, marginTop: 10 },
  cancelBtn: { padding: 12, backgroundColor: '#FF9800', borderRadius: 8, marginTop: 10 },
}); 