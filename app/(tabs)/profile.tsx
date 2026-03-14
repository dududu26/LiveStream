// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { useUser } from '@/hooks/useUser';
import { Avatar } from '@/components/ui/Avatar';
import { Config } from '@/constants/config';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUsername } = useUser();
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');

  if (!user) return null;

  const startEdit = () => {
    setNewName(user.username);
    setEditing(true);
  };

  const saveEdit = async () => {
    const name = newName.trim();
    if (!name || name.length < 2) {
      Alert.alert('Too short', 'Username must be at least 2 characters');
      return;
    }
    await updateUsername(name);
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setNewName('');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Avatar username={user.username} color={user.avatarColor} size={90} fontSize={36} />
          <View style={styles.liveRing} />
        </View>

        {/* Username */}
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.nameInput}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              maxLength={24}
              placeholderTextColor={Colors.textMuted}
              selectionColor={Colors.primary}
            />
            <View style={styles.editBtns}>
              <Pressable onPress={cancelEdit} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveEdit} style={styles.saveBtn}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={startEdit} style={styles.nameRow}>
            <Text style={styles.username}>{user.username}</Text>
            <MaterialIcons name="edit" size={16} color={Colors.textMuted} />
          </Pressable>
        )}

        <Text style={styles.userId}>ID: {user.userId.substring(0, 8)}...</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{user.following.length}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>Streams</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>0</Text>
            <Text style={styles.statLabel}>Likes Given</Text>
          </View>
        </View>

        {/* Server Config Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server Configuration</Text>
          <View style={styles.configBox}>
            <MaterialIcons name="cloud" size={16} color={Colors.primary} />
            <Text style={styles.configLabel}>WebSocket URL</Text>
            <Text style={styles.configValue} numberOfLines={1}>{Config.SOCKET_URL}</Text>
          </View>
          <Text style={styles.configNote}>
            Edit constants/config.ts to set your ngrok URL for real-time features
          </Text>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About LiveStream</Text>
          <View style={styles.aboutBox}>
            <Text style={styles.aboutText}>
              • No login required — instant anonymous access{'\n'}
              • WebRTC + WebSocket real-time streaming{'\n'}
              • Set up your own server with the included server.js{'\n'}
              • Expose via ngrok for global access
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { alignItems: 'center', paddingTop: Spacing.xl },
  avatarSection: { position: 'relative', marginBottom: Spacing.md },
  liveRing: {
    position: 'absolute',
    inset: -4,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: Colors.primary,
    opacity: 0.5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  username: { color: Colors.white, fontSize: Fonts.xl, fontWeight: '800' },
  userId: { color: Colors.textMuted, fontSize: Fonts.xs, marginBottom: Spacing.lg },
  editRow: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg, width: '80%' },
  nameInput: {
    color: Colors.white,
    fontSize: Fonts.xl,
    fontWeight: '700',
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 4,
  },
  editBtns: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: Radius.lg, backgroundColor: Colors.bgCard },
  cancelText: { color: Colors.textSecondary, fontWeight: '600' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: Radius.lg, backgroundColor: Colors.primary },
  saveText: { color: Colors.white, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
    width: '85%',
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md },
  statNum: { color: Colors.white, fontSize: Fonts.lg, fontWeight: '800' },
  statLabel: { color: Colors.textMuted, fontSize: Fonts.xs, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  section: { width: '90%', marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.textSecondary, fontSize: Fonts.sm, fontWeight: '600', marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  configBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: 6,
  },
  configLabel: { color: Colors.textSecondary, fontSize: Fonts.sm, width: 100 },
  configValue: { color: Colors.white, fontSize: Fonts.sm, flex: 1 },
  configNote: { color: Colors.textMuted, fontSize: Fonts.xs, lineHeight: 18 },
  aboutBox: { backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md },
  aboutText: { color: Colors.textSecondary, fontSize: Fonts.sm, lineHeight: 22 },
});
