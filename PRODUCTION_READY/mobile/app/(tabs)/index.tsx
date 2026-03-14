import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, Image, Platform, StatusBar, Modal, ScrollView, KeyboardAvoidingView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import useStore from '../../store';
import { Search, User as UserIcon, Coins, Shield, Settings, LogOut, ChevronRight, UserPlus, ChevronLeft, MoreVertical, SendHorizontal, MessageSquarePlus, Sparkles, Users, Play } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Alert } from 'react-native';
import { useActionSheet } from '@expo/react-native-action-sheet';

import { BASE_URL } from '../../store';

export default function ChatsScreen() {
  const { user, contacts, fetchContacts, searchUsers, addContact, logout, socket, messages, groups, fetchGroups } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isContactsModalVisible, setContactsModalVisible] = useState(false);
  const earnCoins = useStore(state => state.earnCoins);
  const router = useRouter();
  const { showActionSheetWithOptions } = useActionSheet();

  useFocusEffect(
    useCallback(() => {
      fetchContacts();
      fetchGroups();

      // WhatsApp Discovery: Auto-Refresh Contact List if someone new texts or calls us
      if (socket) {
        const handleNewActivity = () => {
          fetchContacts();
        };

        socket.on('receive_message', handleNewActivity);
        socket.on('call_user', handleNewActivity);

        return () => {
          socket.off('receive_message', handleNewActivity);
          socket.off('call_user', handleNewActivity);
        };
      }
    }, [socket])
  );

  // Group messages by contact to form "Chats"
  const chatList = React.useMemo(() => {
    const combined = [
      ...contacts.filter(c => c.phone_number !== 'Groq').map(c => ({ ...c, isGroup: false })),
      ...groups.map(g => ({ ...g, isGroup: true }))
    ];

    // Inject a "Sponsored" ad item if we have more than 3 chats
    if (combined.length >= 3) {
      combined.splice(2, 0, { id: 'ad_1', isAd: true, name: 'Sponsor: NextGen AI', content: 'Discover the future of AI' } as any);
    }

    return combined;
  }, [contacts, groups]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    const results = await searchUsers(query);
    setSearchResults(results);
    setIsSearching(false);
  };

  const [gptUserFull, setGptUserFull] = useState<any>(null);

  useEffect(() => {
    const fetchGptProfile = async () => {
      try {
        const token = useStore.getState().token;
        if (!token) return;

        const res = await axios.get(`${BASE_URL}/users/search?phone=Groq`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const gpt = res.data.find((u: any) => u.phone_number === 'Groq');
        if (gpt) setGptUserFull(gpt);
      } catch (e) {
        console.log('Error fetching Groq profile', e);
      }
    };
    fetchGptProfile();
  }, []);

  const gptAssistantId = gptUserFull?.id;

  const navigateToGpt = () => {
    if (gptAssistantId) {
      router.push(`/chat/${gptAssistantId}`);
    } else {
      Alert.alert("Please wait", "Mitra AI is initializing...");
    }
  };

  const handleAddContact = async (contactId: number) => {
    try {
      await addContact(contactId);
      setSearchQuery('');
      setSearchResults([]);
      Alert.alert("Success", "Contact added!");
    } catch (e) {
      Alert.alert("Error", "Could not add contact.");
    }
  };

  const handleEarnCoins = async () => {
    if (isWatchingAd) return;
    setIsWatchingAd(true);
    // Simulate ad delay
    setTimeout(async () => {
      await earnCoins();
      setIsWatchingAd(false);
    }, 2000);
  };

  const uploadGlobalAvatar = async (avatarData: string) => {
    const token = useStore.getState().token;
    if (!token) return;
    try {
      const res = await axios.post(`${BASE_URL}/users/avatar`, {
        avatar_url: avatarData || null
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        Alert.alert("Success", avatarData ? "Global Profile Picture updated!" : "Profile Picture removed.");
        useStore.getState().fetchUserProfile();
      }
    } catch (err: any) {
      Alert.alert("Error", err.response?.data?.error || "Failed to update profile picture.");
    }
  };

  const pickGlobalGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.2,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Url = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await uploadGlobalAvatar(base64Url);
    }
  };

  const pickGlobalCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permissions are required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.2,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Url = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await uploadGlobalAvatar(base64Url);
    }
  };

  const handleSetGlobalAvatar = () => {
    const options = ['Take Photo', 'Choose from Gallery', 'Remove Picture', 'Cancel'];
    const cancelButtonIndex = 3;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: 'Global Profile Picture',
        message: 'Set a default picture that everyone sees. (Free)',
      },
      (selectedIndex?: number) => {
        switch (selectedIndex) {
          case 0:
            pickGlobalCamera();
            break;
          case 1:
            pickGlobalGallery();
            break;
          case 2:
            uploadGlobalAvatar('');
            break;
          case cancelButtonIndex:
          default:
            // Canceled
            break;
        }
      }
    );
  };

  const handleLongPressContact = (contactItem: any) => {
    const token = useStore.getState().token;
    const options = [
      contactItem.is_blocked ? 'Unblock' : 'Block',
      contactItem.is_muted ? 'Unmute' : 'Mute',
      'Delete Chat History',
      'Remove Contact',
      'Cancel'
    ];
    const destructiveButtonIndex = [2, 3];
    const cancelButtonIndex = 4;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
        title: contactItem.username,
        message: 'Manage this chat',
      },
      async (selectedIndex?: number) => {
        if (!token) return;

        try {
          switch (selectedIndex) {
            case 0: // Block/Unblock
              await axios.post(`${BASE_URL}/contacts/block`, {
                contact_id: contactItem.id
              }, { headers: { Authorization: `Bearer ${token}` } });
              Alert.alert('Success', `User ${contactItem.is_blocked ? 'unblocked' : 'blocked'}`);
              fetchContacts();
              break;
            case 1: // Mute/Unmute
              await axios.post(`${BASE_URL}/contacts/mute`, {
                contact_id: contactItem.id
              }, { headers: { Authorization: `Bearer ${token}` } });
              Alert.alert('Success', `User ${contactItem.is_muted ? 'unmuted' : 'muted'}`);
              fetchContacts();
              break;
            case 2: // Delete History
              await axios.delete(`${BASE_URL}/messages/history/${contactItem.id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              Alert.alert('Success', 'Chat history deleted.');
              // Force local store update
              useStore.getState().fetchMessages(contactItem.id);
              break;
            case 3: // Remove Contact
              await axios.delete(`${BASE_URL}/contacts/${contactItem.id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              Alert.alert('Success', 'Contact removed from list.');
              fetchContacts();
              break;
            case cancelButtonIndex:
            default:
              break;
          }
        } catch (error: any) {
          Alert.alert('Error', error.response?.data?.error || 'Failed to perform action');
        }
      }
    );
  };

  if (!user && !token) return <View style={styles.container}><ActivityIndicator color="#0062E3" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.avatar, { overflow: 'hidden' }]}>
            {user?.default_avatar ? (
              <Image source={{ uri: user.default_avatar }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase() || '?'}</Text>
            )}
          </TouchableOpacity>
          <View>
            <TouchableOpacity style={styles.usernameRow} onPress={() => router.push('/premium')}>
              <Text style={styles.username}>{user?.username || 'Guest'}</Text>
              {user?.is_admin === 1 && <Shield size={14} color="#0062E3" style={{ marginLeft: 4 }} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEarnCoins} disabled={isWatchingAd}>
              <Text style={[styles.coins, isWatchingAd && { color: '#94a3b8' }]}>
                <Coins size={12} /> {isWatchingAd ? 'Watching...' : `${user?.coin_balance || 0} Coins (Earn)`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* REELS CENTER BUTTON */}
        <View style={styles.headerCenter}>
          <TouchableOpacity
            style={styles.reelsHeaderButton}
            onPress={() => router.push('/reels')}
          >
            <Play size={20} color="#0062E3" fill="#0062E3" />
            <Text style={styles.reelsHeaderText}>Reels</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={logout} style={styles.iconButton}>
            <LogOut size={22} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Ask Groq Shortcut */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or number..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {searchQuery.length === 0 ? (
          <TouchableOpacity onPress={navigateToGpt}>
            <SendHorizontal size={20} color="#0062E3" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <View style={{ backgroundColor: '#1e293b', borderRadius: 10, padding: 2 }}>
              <ChevronLeft size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Results / Contacts */}
      {searchQuery.trim().length > 0 ? (
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Search Results</Text>
          {isSearching ? (
            <ActivityIndicator color="#0062E3" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.contactItem} onPress={() => handleAddContact(item.id)}>
                  <View style={styles.itemAvatar}>
                    {item.default_avatar ? (
                      <Image source={{ uri: item.default_avatar }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                    ) : (
                      <UserIcon size={20} color="#94a3b8" />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.username}</Text>
                    <Text style={styles.itemPhone}>{item.phone_number}</Text>
                  </View>
                  <View style={styles.addButton}>
                    <UserPlus size={18} color="#fff" />
                    <Text style={[styles.addText, { color: '#fff', marginLeft: 6 }]}>Add</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No users found</Text>}
            />
          )}
        </View>
      ) : (
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Chats</Text>
          <FlatList
            data={chatList}
            keyExtractor={(item, index) => item.isGroup ? `group_${item.id}` : `user_${item.id}_${index}`}
            renderItem={({ item }) => {
              const chatId = item.isGroup ? `group_${item.id}` : item.id;
              const name = item.isGroup ? item.name : item.username;
              const avatar = item.isGroup ? item.avatar_url : (item.specific_avatar || item.default_avatar);
              const lastMessage = messages[chatId]?.[messages[chatId]?.length - 1];
              const lastMessageText = lastMessage ? (lastMessage.type === 'audio' ? '🎤 Voice message' : lastMessage.content) : (item.isGroup ? `${item.member_count} members` : 'Tap to chat');

              if (item.isAd) {
                return (
                  <View style={styles.adItem}>
                    <View style={styles.adBadge}><Text style={styles.adBadgeText}>Ad</Text></View>
                    <View style={styles.adAvatar}>
                      <Sparkles size={28} color="#f59e0b" />
                    </View>
                    <View style={styles.chatContent}>
                      <Text style={styles.adTitle}>{item.name}</Text>
                      <Text style={styles.adDescription}>{item.content}</Text>
                    </View>
                    <TouchableOpacity style={styles.adButton} onPress={() => Alert.alert("Sponsor", "Visit our sponsor site!")}>
                      <Text style={styles.adButtonText}>Visit</Text>
                    </TouchableOpacity>
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  style={styles.chatItem}
                  onPress={() => router.push(`/chat/${chatId}` as any)}
                  onLongPress={() => !item.isGroup && handleLongPressContact(item)}
                >
                  <View style={styles.chatAvatar}>
                    {avatar ? (
                      <Image source={{ uri: avatar }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        {item.isGroup ? <Users size={24} color="#0062E3" /> : <Text style={styles.avatarText}>{name?.charAt(0).toUpperCase()}</Text>}
                      </View>
                    )}
                  </View>
                  <View style={styles.chatContent}>
                    <View style={styles.chatHeader}>
                      <Text style={styles.chatName}>{name}</Text>
                      {item.isGroup && <View style={styles.groupBadge}><Text style={styles.groupBadgeText}>Group</Text></View>}
                    </View>
                    <Text style={styles.chatLastMessage} numberOfLines={1}>
                      {lastMessageText}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#334155" />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <UserIcon size={48} color="#1e293b" />
                <Text style={{ color: '#94a3b8', fontSize: 16, marginTop: 10 }}>No chats yet</Text>
                <Text style={{ color: '#64748b', fontSize: 14, marginTop: 5 }}>Search for friends to start messaging!</Text>
              </View>
            }
          />
        </View>
      )}

      {/* Banner Ad Placeholder */}
      <View style={styles.bottomAdBanner}>
        <View style={styles.adBannerContent}>
          <View style={styles.adBadgeSmall}><Text style={styles.adBadgeTextSmall}>Sponsored</Text></View>
          <Text style={styles.adBannerText}>Try MitraLink Premium for exclusive features!</Text>
        </View>
      </View>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setContactsModalVisible(true)}
      >
        <MessageSquarePlus size={24} color="#fff" />
      </TouchableOpacity>

      {/* Contacts Modal Native View */}
      <Modal visible={isContactsModalVisible} animationType="slide" onRequestClose={() => setContactsModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' }}>
            <TouchableOpacity onPress={() => setContactsModalVisible(false)} style={{ marginRight: 15 }}>
              <ChevronLeft size={28} color="#f8fafc" />
            </TouchableOpacity>
            <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: 'bold' }}>Select Contact</Text>
          </View>

          <FlatList
            data={contacts}
            contentContainerStyle={{ padding: 20 }}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => {
                  setContactsModalVisible(false);
                  router.push(`/chat/${item.id}`);
                }}
                onLongPress={() => {
                  setContactsModalVisible(false);
                  setTimeout(() => handleLongPressContact(item), 300); // slight delay so modal closes fully
                }}
                delayLongPress={200}
              >
                <View style={[styles.itemAvatar, { backgroundColor: '#1e293b' }]}>
                  {item.specific_avatar || item.default_avatar ? (
                    <Image source={{ uri: item.specific_avatar || item.default_avatar }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
                  ) : (
                    <UserIcon size={20} color="#0062E3" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.username}</Text>
                  <Text style={styles.itemPhone}>{item.phone_number}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <UserPlus size={48} color="#1e293b" />
                <Text style={{ color: '#94a3b8', fontSize: 16, marginTop: 10 }}>No contacts found</Text>
                <Text style={{ color: '#64748b', fontSize: 14, marginTop: 5 }}>Search on the Home tab to add friends!</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      {/* Full Screen Image Modal */}
      {user && (
        <Modal visible={isModalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalBackground}>
            <TouchableOpacity style={styles.modalCloseArea} onPress={() => setModalVisible(false)} />

            {/* Action Header inside Modal */}
            <SafeAreaView style={styles.modalHeader}>
              <TouchableOpacity style={styles.iconButton} onPress={() => setModalVisible(false)}>
                <ChevronLeft size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  setModalVisible(false);
                  setTimeout(() => handleSetGlobalAvatar(), 250);
                }}
              >
                <MoreVertical size={24} color="#fff" />
              </TouchableOpacity>
            </SafeAreaView>

            {user.default_avatar ? (
              <Image source={{ uri: user.default_avatar }} style={styles.fullScreenImage} resizeMode="contain" />
            ) : (
              <View style={[styles.fullScreenImage, { backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#fff', fontSize: 100, fontWeight: 'bold' }}>{user.username?.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
        </Modal>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#0062E3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  coins: {
    color: '#fbbf24',
    fontSize: 14,
    marginRight: 10,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelsHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  reelsHeaderText: {
    color: '#0062E3',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  iconButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    margin: 20,
    borderRadius: 14,
    paddingHorizontal: 15,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  groupBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  groupBadgeText: {
    fontSize: 10,
    color: '#0062E3',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  chatAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 15,
    position: 'relative',
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f8fafc',
  },
  chatLastMessage: {
    fontSize: 14,
    color: '#94a3b8',
  },
  adItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.1)',
    position: 'relative',
  },
  adBadge: {
    position: 'absolute',
    top: 8,
    right: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adBadgeText: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: 'bold',
  },
  adAvatar: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  adDescription: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  adButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  adButtonText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomAdBanner: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  adBannerContent: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  adBadgeSmall: {
    backgroundColor: '#0062E3',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 10,
  },
  adBadgeTextSmall: {
    fontSize: 9,
    color: '#fff',
    fontWeight: 'bold',
  },
  adBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 15,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b70',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  itemAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemPhone: {
    color: '#64748b',
    fontSize: 13,
  },
  addText: {
    color: '#6366f1',
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  emptyText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptySubtext: {
    color: '#475569',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
  },
  modalCloseArea: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
  },
  fullScreenImage: {
    width: '100%',
    height: '70%',
  },
  modalHeader: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 10,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  }
});
