import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Alert, Platform, Image, StatusBar, Dimensions, BackHandler
} from 'react-native';
import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/api';
import { colors } from '../theme/colors';
import { Download, Trash2, Check, AppWindow, Gamepad2, Share2, Folder } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const SAVED_DIR = FileSystem.documentDirectory + 'after_download/';
const ACCENT = '#00d4aa';

const SUB_TABS = [
    { key: 'games', label: 'Games', Icon: Gamepad2 },
    { key: 'app', label: 'Apps', Icon: AppWindow },
];

export default function AppStoreScreen({ onMenuPress }) {
    const [apps, setApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savedFiles, setSavedFiles] = useState([]);
    const [downloading, setDownloading] = useState(null);
    const [subTab, setSubTab] = useState('games');

    useEffect(() => {
        axios.get(`${BASE_URL}/api/apps`, { timeout: 15000 })
            .then(res => {
                setApps(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error('AppStore: Error fetching apps:', err.message);
                setLoading(false);
            });
        loadSaved();
    }, []);

    useEffect(() => {
        const backAction = () => {
            if (subTab !== 'games') {
                setSubTab('games');
                return true;
            }
            return false;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [subTab]);

    const loadSaved = async () => {
        try {
            const info = await FileSystem.getInfoAsync(SAVED_DIR);
            if (!info.exists) await FileSystem.makeDirectoryAsync(SAVED_DIR, { intermediates: true });
            const files = await FileSystem.readDirectoryAsync(SAVED_DIR);
            setSavedFiles(files);
        } catch (e) { }
    };

    const isSaved = (f) => savedFiles.includes(f.replace(/[^a-zA-Z0-9._-]/g, '_'));

    const downloadApp = async (app) => {
        try {
            setDownloading(app.name);
            const fileName = app.name.split('/').pop();
            const safeName = app.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const safePath = app.name.split('/').map(encodeURIComponent).join('/');
            const url = `${BASE_URL}/apps/${safePath}`;
            const fileUri = SAVED_DIR + safeName;

            const dirInfo = await FileSystem.getInfoAsync(SAVED_DIR);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(SAVED_DIR, { intermediates: true });
            }

            const downloadRes = await FileSystem.downloadAsync(url, fileUri);

            if (downloadRes.status === 200) {
                await loadSaved();
                Alert.alert('Success', `${fileName} is ready for installation.`);
            } else {
                throw new Error('Download failed from server');
            }
        } catch (e) {
            console.error("Download Error:", e);
            Alert.alert('Error', 'Download failed: ' + e.message);
        } finally {
            setDownloading(null);
        }
    };

    const installApp = async (app) => {
        try {
            const safeName = app.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const localUri = SAVED_DIR + safeName;
            const info = await FileSystem.getInfoAsync(localUri);

            if (!info.exists) {
                Alert.alert('Error', 'App file not found locally.');
                return;
            }

            const contentUri = await FileSystem.getContentUriAsync(localUri);

            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                data: contentUri,
                flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                type: 'application/vnd.android.package-archive',
                category: 'android.intent.category.DEFAULT'
            });
        } catch (e) {
            console.error("Install Error:", e);
            const safeName = app.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const localUri = SAVED_DIR + safeName;
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(localUri, {
                    mimeType: 'application/vnd.android.package-archive',
                    dialogTitle: 'Install or Save App'
                });
            } else {
                Alert.alert('Error', 'Could not open app installer.');
            }
        }
    };

    const deleteSaved = (app) => {
        const safeName = app.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        Alert.alert('Delete', 'Remove downloaded file?', [
            { text: 'Cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await FileSystem.deleteAsync(SAVED_DIR + safeName, { idempotent: true });
                    await loadSaved();
                }
            }
        ]);
    };

    const filtered = apps.filter(a => {
        const folder = a.name.includes('/') ? a.name.split('/')[0].toLowerCase() : '';
        if (subTab === 'games') return folder === 'games';
        if (subTab === 'app') return folder === 'app' || folder === '';
        return true;
    });

    const renderApp = ({ item }) => {
        const displayName = item.name.split('/').pop();
        const coverName = item.name.substring(0, item.name.lastIndexOf('.')) + '.jpg';
        const coverPath = coverName.split('/').map(encodeURIComponent).join('/');
        const coverUrl = `${BASE_URL}/apps/${coverPath}`;
        const saved = isSaved(item.name);
        const isDown = downloading === item.name;

        return (
            <View style={s.appCard}>
                <View style={s.appCover}>
                    <Image source={{ uri: coverUrl }} style={s.coverImg} />
                    <View style={s.appIconOverlay}>
                        <AppWindow color="rgba(255,255,255,0.7)" size={24} />
                    </View>
                </View>
                <View style={s.appInfo}>
                    <Text style={s.appName} numberOfLines={1}>{displayName}</Text>
                    <Text style={s.appSize}>{(item.size / (1024 * 1024)).toFixed(1)} MB</Text>
                </View>
                <View style={s.appActions}>
                    {saved ? (
                        <>
                            <TouchableOpacity onPress={() => installApp(item)} style={s.installBtn}>
                                <Text style={s.installBtnT}>Install</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteSaved(item)} style={{ padding: 6 }}>
                                <Trash2 color="#ef4444" size={16} />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity onPress={() => downloadApp(item)} style={s.dlBtn} disabled={isDown}>
                            {isDown ? <ActivityIndicator size="small" color={ACCENT} /> :
                                <><Download color={ACCENT} size={16} /><Text style={s.dlBtnT}>Download</Text></>}
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44;

    return (
        <View style={s.container}>
            <View style={[s.header, { paddingTop: TOP + 8 }]}>
                <View>
                    <Text style={s.headerTitle}>App Store</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>Connecting to: {BASE_URL}</Text>
                </View>
            </View>

            {loading ? (
                <View style={s.loader}><ActivityIndicator size="large" color={ACCENT} /></View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item, idx) => item.name + idx}
                    renderItem={renderApp}
                    contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                    numColumns={2}
                    columnWrapperStyle={{ justifyContent: 'space-between' }}
                    ListEmptyComponent={
                        <View style={s.emptyB}>
                            <AppWindow color="rgba(255,255,255,0.1)" size={48} />
                            <Text style={s.emptyT}>No {subTab} found</Text>
                        </View>
                    }
                />
            )}

            <View style={s.bottomBar}>
                {SUB_TABS.map(({ key, label, Icon }) => {
                    const act = subTab === key;
                    return (
                        <TouchableOpacity key={key} onPress={() => setSubTab(key)} style={s.subTab}>
                            <Icon color={act ? ACCENT : 'rgba(255,255,255,0.3)'} size={20} />
                            <Text style={[s.subTabL, act && { color: ACCENT }]}>{label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const CARD_W = (width - 48 - 10) / 2;
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0b0e' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 10, paddingLeft: 64, backgroundColor: '#0f1014', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
    appCard: { width: CARD_W, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    appCover: { width: '100%', height: 100, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center' },
    coverImg: { position: 'absolute', width: '100%', height: '100%', opacity: 0.5 },
    appIconOverlay: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, width: 42, height: 42, justifyContent: 'center', alignItems: 'center' },
    appInfo: { padding: 10 },
    appName: { color: '#fff', fontWeight: '700', fontSize: 13 },
    appSize: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 },
    appActions: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 6 },
    installBtn: { backgroundColor: ACCENT, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, flex: 1, alignItems: 'center' },
    installBtnT: { color: '#fff', fontWeight: '700', fontSize: 12 },
    dlBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    dlBtnT: { color: ACCENT, fontSize: 12, fontWeight: '600' },
    emptyB: { alignItems: 'center', marginTop: 80 },
    emptyT: { color: 'rgba(255,255,255,0.2)', fontSize: 14, marginTop: 10 },
    bottomBar: { flexDirection: 'row', height: 60, backgroundColor: '#0f1014', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', justifyContent: 'space-around', alignItems: 'center' },
    subTab: { alignItems: 'center' },
    subTabL: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 4 }
});
