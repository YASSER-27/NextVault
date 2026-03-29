import React, { useEffect, useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity,
    ActivityIndicator, Image, KeyboardAvoidingView, Platform, StatusBar,
    Dimensions, Alert, ScrollView, Modal, BackHandler
} from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { BASE_URL } from '../config/api';
import { colors } from '../theme/colors';
import {
    Send, ImagePlus, X, User, Users, Home, Trash2, Heart,
    Share2, MessageSquare, Paperclip, ArrowLeft, File as FileIcon, Mic, Play, Square
} from 'lucide-react-native';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');
const ACCENT = '#00d4aa';
const ACCENT2 = '#4dabf7';
const SUB_TABS = [
    { key: 'home', label: 'Home', Icon: Home },
    { key: 'friends', label: 'Friends', Icon: Users },
    { key: 'profile', label: 'Profile', Icon: User },
];

export default function TawasalScreen({ onMenuPress }) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [activeTab, setActiveTab] = useState('home');
    const [profileName, setProfileName] = useState('User');
    const [profileAvatar, setProfileAvatar] = useState(null);
    const [profileSaved, setProfileSaved] = useState(false);
    const [friends, setFriends] = useState([]);

    // DM State
    const [dmTarget, setDmTarget] = useState(null);
    const [dmMessages, setDmMessages] = useState([]);
    const [dmText, setDmText] = useState('');
    const [dmImage, setDmImage] = useState(null);
    const [dmFile, setDmFile] = useState(null);
    const [viewImage, setViewImage] = useState(null);
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const dmListRef = useRef(null);

    const fetchPosts = () => {
        axios.get(`${BASE_URL}/api/posts`)
            .then(res => { setPosts(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    };
    const fetchFriends = () => {
        axios.get(`${BASE_URL}/api/users`)
            .then(res => setFriends(res.data))
            .catch(() => { });
    };

    useEffect(() => {
        FileSystem.getInfoAsync(FileSystem.documentDirectory + 'profile.json').then(info => {
            if (info.exists) {
                FileSystem.readAsStringAsync(FileSystem.documentDirectory + 'profile.json').then(res => {
                    try {
                        const d = JSON.parse(res);
                        if (d.name) {
                            setProfileName(d.name);
                            if (d.avatar) setProfileAvatar(d.avatar);
                            axios.post(`${BASE_URL}/api/users`, { name: d.name, avatar: d.avatar || null }).catch(() => { });
                        }
                    } catch (e) { }
                });
            }
        });
        fetchPosts(); fetchFriends();
        const i = setInterval(() => { fetchPosts(); fetchFriends(); }, 5000);
        return () => clearInterval(i);
    }, []);

    // DM polling
    useEffect(() => {
        if (!dmTarget) return;
        const fetchDM = () => {
            axios.get(`${BASE_URL}/api/messages`, { params: { user1: profileName, user2: dmTarget.name } })
                .then(res => setDmMessages(res.data))
                .catch(() => { });
        };
        fetchDM();
        const i = setInterval(fetchDM, 3000);
        return () => clearInterval(i);
    }, [dmTarget, profileName]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.3 });
        if (!result.canceled && result.assets[0]) {
            setSelectedImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    // Global Back Handler
    useEffect(() => {
        const backAction = () => {
            if (viewImage) {
                setViewImage(null);
                return true;
            }
            if (dmTarget) {
                setDmTarget(null);
                return true;
            }
            if (activeTab !== 'home') {
                setActiveTab('home');
                return true;
            }
            return false;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, [dmTarget, viewImage, activeTab]);
    const pickAvatar = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.3 });
        if (!result.canceled && result.assets[0]) {
            setProfileAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };
    const pickDmImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.3 });
        if (!result.canceled && result.assets[0]) {
            setDmImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };
    const pickDmFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
            if (!result.canceled && result.assets && result.assets[0]) {
                const asset = result.assets[0];
                const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
                setDmFile({ name: asset.name, type: asset.mimeType, data: `data:${asset.mimeType};base64,${base64}` });
            }
        } catch (e) { console.log('File pick error:', e); }
    };

    const startRecording = async () => {
        if (isRecording || recording) return;
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') return Alert.alert('Permission', 'Mic permission required');
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
                staysActiveInBackground: true,
            });
            const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(newRecording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
            setIsRecording(false);
            setRecording(null);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;
        setIsRecording(false);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            setRecording(null);

            // Upload to backend
            const res = await axios.post(`${BASE_URL}/api/upload-audio`, {
                from: profileName,
                to: dmTarget.name,
                audioData: `data:audio/m4a;base64,${base64}`
            });

            if (res.data.url) {
                const msgPayload = {
                    from: profileName,
                    to: dmTarget.name,
                    text: '',
                    audio: res.data.url
                };
                axios.post(`${BASE_URL}/api/messages`, msgPayload).then(r => {
                    setDmMessages(prev => [...prev, r.data]);
                    setTimeout(() => dmListRef.current?.scrollToEnd({ animated: true }), 100);
                });
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
            setRecording(null);
        }
    };

    const playVoice = async (url) => {
        try {
            const { sound } = await Audio.Sound.createAsync({ uri: `${BASE_URL}${url}` });
            await sound.playAsync();
        } catch (e) { console.error('Playback error', e); }
    };

    const sendPost = () => {
        if (!message.trim() && !selectedImage) return;
        axios.post(`${BASE_URL}/api/posts`, { message: message.trim(), image: selectedImage || null, user: { name: profileName } })
            .then(res => { setPosts([res.data, ...posts]); setMessage(''); setSelectedImage(null); })
            .catch(err => console.error('Error posting:', err));
    };

    const deletePost = (id) => {
        Alert.alert('Delete', 'Remove this post?', [
            { text: 'Cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: () => {
                    axios.delete(`${BASE_URL}/api/posts/${id}`)
                        .then(() => setPosts(posts.filter(p => p.id !== id)));
                }
            }
        ]);
    };

    const deleteFriend = (name) => {
        Alert.alert('Delete User', `Remove ${name}?`, [
            { text: 'Cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: () => {
                    axios.delete(`${BASE_URL}/api/users/${encodeURIComponent(name)}`)
                        .then(() => { fetchFriends(); if (dmTarget?.name === name) setDmTarget(null); });
                }
            }
        ]);
    };

    const saveProfile = () => {
        if (!profileName.trim()) return;
        FileSystem.writeAsStringAsync(FileSystem.documentDirectory + 'profile.json', JSON.stringify({ name: profileName, avatar: profileAvatar }))
            .catch(() => { });
        axios.post(`${BASE_URL}/api/users`, { name: profileName, avatar: profileAvatar })
            .then(() => { setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2000); fetchFriends(); });
    };

    const sendDM = () => {
        if (!dmText.trim() && !dmImage && !dmFile) return;
        const payload = {
            from: profileName,
            to: dmTarget.name,
            text: dmText.trim(),
            image: dmImage || null,
            file: dmFile?.data || null,
            fileName: dmFile?.name || null,
            fileType: dmFile?.type || null,
        };
        axios.post(`${BASE_URL}/api/messages`, payload)
            .then(res => {
                setDmMessages([...dmMessages, res.data]);
                setDmText(''); setDmImage(null); setDmFile(null);
                setTimeout(() => dmListRef.current?.scrollToEnd({ animated: true }), 100);
            })
            .catch(e => Alert.alert('Error', 'Failed to send message'));
    };

    const getColor = (name) => {
        const c = ['#00d4aa', '#4dabf7', '#7c3aed', '#f59e0b', '#ef4444', '#10b981'];
        let h = 0;
        for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
        return c[Math.abs(h) % c.length];
    };
    const timeAgo = (d) => {
        const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
        if (m < 1) return 'Now'; if (m < 60) return `${m}m`; const h = Math.floor(m / 60);
        if (h < 24) return `${h}h`; return `${Math.floor(h / 24)}d`;
    };

    // ─── DM CHAT VIEW ───
    const renderDMChat = () => (
        <View style={[s.dmContainer, StyleSheet.absoluteFill, { zIndex: 1000 }]}>
            {/* DM Header */}
            <View style={s.dmHeader}>
                <TouchableOpacity onPress={() => setDmTarget(null)} style={s.dmBackBtn}>
                    <ArrowLeft color="#fff" size={22} />
                </TouchableOpacity>
                <View style={[s.avatar, { backgroundColor: getColor(dmTarget?.name), marginRight: 10 }]}>
                    <Text style={s.avatarText}>{dmTarget?.name?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={s.dmHeaderName}>{dmTarget?.name}</Text>
                    <Text style={s.dmOnline}>Online</Text>
                </View>
            </View>

            {/* Messages */}
            <FlatList
                ref={dmListRef}
                data={dmMessages}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={{ padding: 14, paddingBottom: 10 }}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={() => dmListRef.current?.scrollToEnd({ animated: false })}
                renderItem={({ item }) => {
                    const mine = item.from === profileName;
                    return (
                        <View style={[s.msgBubble, mine ? s.msgMine : s.msgTheirs]}>
                            {item.image &&
                                <TouchableOpacity onPress={() => setViewImage(item.image)}>
                                    <Image source={{ uri: item.image }} style={s.msgImg} />
                                </TouchableOpacity>
                            }
                            {item.fileName && (
                                <View style={s.fileAttach}>
                                    <FileIcon color="rgba(255,255,255,0.5)" size={16} />
                                    <Text style={s.fileAttachName} numberOfLines={1}>{item.fileName}</Text>
                                </View>
                            )}
                            {item.audio && (
                                <TouchableOpacity
                                    onPress={() => playVoice(item.audio)}
                                    style={[s.audioBtn, { minWidth: 180 }]}
                                    activeOpacity={0.8}
                                >
                                    <View style={s.audioIconWrap}>
                                        <Play color="#fff" size={14} fill="#fff" />
                                    </View>
                                    <View style={s.audioTrack}>
                                        <View style={s.audioWaveform}>
                                            {[1, 0.6, 0.8, 0.4, 0.9, 0.5, 0.7, 0.3].map((h, i) => (
                                                <View key={i} style={[s.waveBar, { height: h * 12 }]} />
                                            ))}
                                        </View>
                                        <Text style={s.audioStatusText}>Voice Note</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            {item.text ? <Text style={s.msgText}>{item.text}</Text> : null}
                            <Text style={s.msgTime}>{timeAgo(item.createdAt)}</Text>
                        </View>
                    );
                }}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 80 }}>
                        <MessageSquare color="rgba(255,255,255,0.1)" size={48} />
                        <Text style={{ color: 'rgba(255,255,255,0.2)', marginTop: 12 }}>Start the conversation</Text>
                    </View>
                }
            />

            {/* DM Input */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {(dmImage || dmFile) && (
                    <View style={s.dmPreviewRow}>
                        {dmImage && <Image source={{ uri: dmImage }} style={s.dmPreviewImg} />}
                        {dmFile && (
                            <View style={s.dmPreviewFile}>
                                <FileIcon color={ACCENT} size={14} />
                                <Text style={s.dmPreviewFileName} numberOfLines={1}>{dmFile.name}</Text>
                            </View>
                        )}
                        <TouchableOpacity onPress={() => { setDmImage(null); setDmFile(null); }}>
                            <X color="rgba(255,255,255,0.4)" size={16} />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={[s.dmInputRow, { paddingBottom: Platform.OS === 'android' ? 24 : 12 }]}>
                    <TouchableOpacity onPress={pickDmImage} style={s.dmIconBtn}>
                        <ImagePlus color={ACCENT} size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={pickDmFile} style={s.dmIconBtn}>
                        <Paperclip color={ACCENT2} size={20} />
                    </TouchableOpacity>
                    <TextInput
                        style={[s.dmInput, isRecording && { borderColor: '#ef4444', borderWidth: 1 }]}
                        value={isRecording ? 'Recording...' : dmText}
                        onChangeText={setDmText}
                        placeholder="Type a message..."
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        editable={!isRecording}
                    />
                    {dmText.trim() || dmImage || dmFile ? (
                        <TouchableOpacity onPress={sendDM} style={s.dmSendBtn}>
                            <Send color="#fff" size={18} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPressIn={startRecording}
                            onPressOut={stopRecording}
                            style={[s.dmSendBtn, isRecording && { backgroundColor: '#ef4444' }]}
                        >
                            {isRecording ? <Square color="#fff" size={18} fill="#fff" /> : <Mic color="#fff" size={18} />}
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </View>
    );

    // ─── POST CARD ───
    const renderPost = ({ item }) => (
        <View style={s.postCard}>
            <View style={s.postHead}>
                <View style={[s.avatar, { backgroundColor: getColor(item.user?.name), overflow: 'hidden' }]}>
                    {item.user?.avatar ? <Image source={{ uri: item.user.avatar }} style={{ width: '100%', height: '100%' }} /> : <Text style={s.avatarText}>{(item.user?.name || 'A')[0].toUpperCase()}</Text>}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.uName}>{item.user?.name || 'Anonymous'}</Text>
                    <Text style={s.timeT}>{timeAgo(item.createdAt)}</Text>
                </View>
                {item.user?.name === profileName && (
                    <TouchableOpacity onPress={() => deletePost(item.id)}>
                        <Trash2 color="rgba(255,255,255,0.2)" size={15} />
                    </TouchableOpacity>
                )}
            </View>
            {item.message ? <Text style={s.postTxt}>{item.message}</Text> : null}
            {item.image && (
                <TouchableOpacity activeOpacity={0.8} onPress={() => setViewImage(item.image)}>
                    <Image source={{ uri: item.image }} style={s.postImg} resizeMode="cover" />
                </TouchableOpacity>
            )}
            <View style={s.actBar}>
                <TouchableOpacity style={s.actI}><Heart color="rgba(255,255,255,0.3)" size={17} /><Text style={s.actL}>Like</Text></TouchableOpacity>
                <TouchableOpacity style={s.actI}><Share2 color="rgba(255,255,255,0.3)" size={17} /><Text style={s.actL}>Share</Text></TouchableOpacity>
                <TouchableOpacity style={s.actI}><MessageSquare color="rgba(255,255,255,0.3)" size={17} /><Text style={s.actL}>Reply</Text></TouchableOpacity>
            </View>
        </View>
    );

    const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;

    return (
        <View style={s.container}>
            {dmTarget && renderDMChat()}

            {/* Header */}
            <View style={[s.header, { paddingTop: TOP + 8 }]}>
                <Text style={s.headerTitle}>Tawasal</Text>
            </View>

            {/* ─── HOME ─── */}
            {activeTab === 'home' && (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    {loading ? (
                        <View style={s.center}><ActivityIndicator size="large" color={ACCENT} /></View>
                    ) : (
                        <FlatList
                            data={posts}
                            keyExtractor={item => item.id.toString()}
                            renderItem={renderPost}
                            contentContainerStyle={{ paddingBottom: 80 }}
                            showsVerticalScrollIndicator={false}
                            ListHeaderComponent={
                                <View>
                                    {/* Composer */}
                                    <View style={s.composer}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                            <TouchableOpacity style={[s.avatar, { backgroundColor: getColor(profileName), overflow: 'hidden' }]} onPress={pickAvatar}>
                                                {profileAvatar ? <Image source={{ uri: profileAvatar }} style={{ width: '100%', height: '100%' }} /> : <Text style={s.avatarText}>{profileName[0]?.toUpperCase()}</Text>}
                                            </TouchableOpacity>
                                            <Text style={{ color: 'rgba(255,255,255,0.5)', marginLeft: 10, fontSize: 13 }}>{profileName}</Text>
                                        </View>
                                        <TextInput style={s.compInput} value={message} onChangeText={setMessage}
                                            placeholder="What's on your mind?" placeholderTextColor="rgba(255,255,255,0.2)" multiline />
                                        {selectedImage && (
                                            <View style={s.prevWrap}>
                                                <Image source={{ uri: selectedImage }} style={s.prevImg} />
                                                <TouchableOpacity onPress={() => setSelectedImage(null)} style={s.prevX}>
                                                    <X color="#fff" size={10} />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                        <View style={s.compActions}>
                                            <TouchableOpacity onPress={pickImage} style={{ padding: 4 }}>
                                                <ImagePlus color={ACCENT} size={20} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={sendPost} style={s.postBtn}>
                                                <Text style={s.postBtnT}>Post</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            }
                            ListEmptyComponent={
                                <View style={s.emptyB}><Text style={s.emptyT}>No posts yet</Text>
                                    <Text style={s.emptySub}>Be the first to share something!</Text></View>
                            }
                        />
                    )}
                </KeyboardAvoidingView>
            )}

            {/* ─── FRIENDS ─── */}
            {activeTab === 'friends' && (
                <View style={{ flex: 1 }}>
                    <View style={s.searchWrap}>
                        <TextInput style={s.searchIn} placeholder="Search..." placeholderTextColor="rgba(255,255,255,0.2)" />
                    </View>
                    {friends.length === 0 ? (
                        <View style={s.emptyB}><Users color="rgba(255,255,255,0.12)" size={48} />
                            <Text style={s.emptyT}>No users yet</Text></View>
                    ) : (
                        <FlatList data={friends} keyExtractor={item => item.id.toString()}
                            contentContainerStyle={{ padding: 16, paddingBottom: 80 }} renderItem={({ item }) => (
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <TouchableOpacity style={[s.friendCard, { flex: 1, marginBottom: 0 }]} onPress={() => setDmTarget(item)} activeOpacity={0.7}>
                                        <View style={[s.avatar, { backgroundColor: getColor(item.name), width: 44, height: 44, borderRadius: 22, overflow: 'hidden' }]}>
                                            {item.avatar ? <Image source={{ uri: item.avatar }} style={{ width: '100%', height: '100%' }} /> : <Text style={[s.avatarText, { fontSize: 18 }]}>{item.name[0].toUpperCase()}</Text>}
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={s.fName}>{item.name}</Text>
                                            <Text style={s.fStatus}>Tap to chat</Text>
                                        </View>
                                        <MessageSquare color={ACCENT} size={18} />
                                    </TouchableOpacity>
                                </View>
                            )} />
                    )}
                </View>
            )}

            {/* ─── PROFILE ─── */}
            {activeTab === 'profile' && (
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, alignItems: 'center', paddingBottom: 100 }}>
                    <View style={s.profHead}>
                        <TouchableOpacity onPress={pickAvatar} style={[s.profAvLg, { backgroundColor: getColor(profileName), overflow: 'hidden' }]}>
                            {profileAvatar ? <Image source={{ uri: profileAvatar }} style={{ width: '100%', height: '100%' }} /> : <Text style={{ color: '#fff', fontSize: 36, fontWeight: 'bold' }}>{profileName[0]?.toUpperCase()}</Text>}
                        </TouchableOpacity>
                        <Text style={s.profNameD}>{profileName}</Text>
                        <Text style={s.profTag}>Local Network User</Text>
                    </View>
                    <View style={s.profCard}>
                        <Text style={s.profLabel}>Display Name</Text>
                        <TextInput style={s.profInput} value={profileName} onChangeText={setProfileName}
                            placeholder="Your name" placeholderTextColor="rgba(255,255,255,0.2)" />
                        <TouchableOpacity onPress={saveProfile} style={[s.saveBtn, profileSaved && { backgroundColor: '#4ade80' }]}>
                            <Text style={s.saveBtnT}>{profileSaved ? 'Saved!' : 'Save Profile'}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={s.statsRow}>
                        <View style={s.statBox}><Text style={s.statN}>{posts.filter(p => p.user?.name === profileName).length}</Text>
                            <Text style={s.statL}>Posts</Text></View>
                        <View style={s.statBox}><Text style={s.statN}>{friends.length}</Text>
                            <Text style={s.statL}>Friends</Text></View>
                    </View>
                </ScrollView>
            )}

            {/* Bottom Sub-Tabs */}
            <View style={s.bottomBar}>
                {SUB_TABS.map(({ key, label, Icon }) => {
                    const act = activeTab === key;
                    return (
                        <TouchableOpacity key={key} onPress={() => setActiveTab(key)} style={s.subTab} activeOpacity={0.7}>
                            <Icon color={act ? ACCENT : 'rgba(255,255,255,0.3)'} size={20} />
                            <Text style={[s.subTabL, act && { color: ACCENT }]}>{label}</Text>
                            {act && <View style={s.subTabDot} />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Image Viewer */}
            <Modal visible={!!viewImage} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }} onPress={() => setViewImage(null)}>
                        <X color="#fff" size={30} />
                    </TouchableOpacity>
                    {viewImage && <Image source={{ uri: viewImage }} style={{ width: '100%', height: '80%', resizeMode: 'contain' }} />}
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0b0e' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        paddingHorizontal: 18, paddingBottom: 10, paddingLeft: 64,
        backgroundColor: '#0f1014', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },

    // Stories
    storiesRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    storyItem: { alignItems: 'center', width: 66 },
    storyRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    storyAv: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
    storyAvT: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
    storyName: { color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4 },

    // Composer
    composer: {
        margin: 14, marginBottom: 6, padding: 14,
        backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    },
    compInput: { color: '#fff', fontSize: 14, minHeight: 30, textAlignVertical: 'top', marginBottom: 6 },
    compActions: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)', paddingTop: 8,
    },
    postBtn: { backgroundColor: ACCENT, paddingHorizontal: 22, paddingVertical: 7, borderRadius: 18 },
    postBtnT: { color: '#fff', fontWeight: '700', fontSize: 13 },
    prevWrap: { marginBottom: 6 },
    prevImg: { width: 90, height: 70, borderRadius: 10 },
    prevX: { position: 'absolute', top: -5, left: 76, backgroundColor: '#000', borderRadius: 8, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },

    // Posts
    postCard: {
        backgroundColor: 'rgba(255,255,255,0.025)', marginHorizontal: 14, marginBottom: 10,
        borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', overflow: 'hidden',
    },
    postHead: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 6 },
    avatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    uName: { color: '#fff', fontWeight: '700', fontSize: 14 },
    timeT: { color: 'rgba(255,255,255,0.2)', fontSize: 11 },
    postTxt: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 20, paddingHorizontal: 12, paddingBottom: 8 },
    postImg: { width: '100%', height: 200, backgroundColor: 'rgba(255,255,255,0.02)' },
    actBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', paddingVertical: 8, paddingHorizontal: 12 },
    actI: { flexDirection: 'row', alignItems: 'center', marginRight: 22, gap: 4 },
    actL: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },

    emptyB: { alignItems: 'center', marginTop: 60, padding: 30 },
    emptyT: { color: 'rgba(255,255,255,0.35)', fontSize: 16, fontWeight: '700', marginTop: 10 },
    emptySub: { color: 'rgba(255,255,255,0.15)', marginTop: 4, fontSize: 13 },

    // Search
    searchWrap: { paddingHorizontal: 16, paddingVertical: 8 },
    searchIn: { backgroundColor: 'rgba(255,255,255,0.04)', color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', fontSize: 14 },

    // Friends
    friendCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.025)', borderRadius: 14, padding: 12, marginBottom: 8,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)',
    },
    fName: { color: '#fff', fontWeight: '700', fontSize: 15 },
    fStatus: { color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 1 },

    // Profile
    profHead: { alignItems: 'center', marginBottom: 20, paddingTop: 16 },
    profAvLg: { width: 85, height: 85, borderRadius: 43, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    profNameD: { color: '#fff', fontSize: 22, fontWeight: '800' },
    profTag: { color: 'rgba(255,255,255,0.25)', fontSize: 13, marginTop: 3 },
    profCard: {
        backgroundColor: 'rgba(255,255,255,0.025)', borderRadius: 18, padding: 18, width: '100%',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 14,
    },
    profLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600', marginBottom: 6 },
    profInput: { backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', fontSize: 15, marginBottom: 14 },
    saveBtn: { backgroundColor: ACCENT, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
    saveBtnT: { color: '#fff', fontWeight: '700', fontSize: 15 },
    statsRow: { flexDirection: 'row', gap: 10, width: '100%' },
    statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.025)', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statN: { color: '#fff', fontSize: 22, fontWeight: '800' },
    statL: { color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 3 },

    // Bottom Sub-Tabs
    bottomBar: {
        flexDirection: 'row', justifyContent: 'space-around',
        backgroundColor: '#0f1014', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
        paddingVertical: 8, paddingBottom: 12,
    },
    subTab: { alignItems: 'center', paddingVertical: 4, paddingHorizontal: 16 },
    subTabL: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', marginTop: 3 },
    subTabDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: ACCENT, marginTop: 3 },

    // DM Chat
    dmContainer: { flex: 1, backgroundColor: '#0a0b0e' },
    dmHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 50,
        paddingHorizontal: 14, paddingBottom: 12,
        backgroundColor: '#0f1014', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
    },
    dmBackBtn: { padding: 8, marginRight: 6 },
    dmHeaderName: { color: '#fff', fontWeight: '700', fontSize: 16 },
    dmOnline: { color: '#4ade80', fontSize: 11 },

    msgBubble: { maxWidth: '78%', marginBottom: 8, padding: 10, borderRadius: 16 },
    msgMine: { alignSelf: 'flex-end', backgroundColor: 'rgba(0,212,170,0.15)', borderBottomRightRadius: 4 },
    msgTheirs: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.06)', borderBottomLeftRadius: 4 },
    msgText: { color: '#fff', fontSize: 14, lineHeight: 20 },
    msgImg: { width: 180, height: 140, borderRadius: 12, marginBottom: 4 },
    msgTime: { color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    fileAttach: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', padding: 8, borderRadius: 10, marginBottom: 4 },
    fileAttachName: { color: 'rgba(255,255,255,0.6)', fontSize: 12, flex: 1 },

    dmPreviewRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
    dmPreviewImg: { width: 50, height: 40, borderRadius: 8 },
    dmPreviewFile: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    dmPreviewFileName: { color: 'rgba(255,255,255,0.5)', fontSize: 12, flex: 1 },

    dmInputRow: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8,
        backgroundColor: '#0f1014', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)',
    },
    dmIconBtn: { padding: 8 },
    dmInput: { flex: 1, color: '#fff', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, marginHorizontal: 6 },
    dmSendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
    audioBtn: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)',
        paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18, marginBottom: 4,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
    },
    audioIconWrap: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: ACCENT,
        justifyContent: 'center', alignItems: 'center', shadowColor: ACCENT,
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 2
    },
    audioTrack: { flex: 1, marginLeft: 12, justifyContent: 'center' },
    audioWaveform: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 14, marginBottom: 2 },
    waveBar: { width: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1 },
    audioStatusText: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
