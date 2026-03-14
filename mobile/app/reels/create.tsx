import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, TextInput, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import useStore from '../../store';
import { X, Check, Camera, Image as ImageIcon, Film, Wand2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: WINDOW_WIDTH } = Dimensions.get('window');

const FILTERS = [
    { id: 'none', name: 'Original', color: '#fff' },
    { id: 'sepia', name: 'Sepia', color: '#704214' },
    { id: 'grayscale', name: 'B&W', color: '#333' },
    { id: 'warm', name: 'Warm', color: '#fbbf24' },
    { id: 'cool', name: 'Cool', color: '#60a5fa' },
    { id: 'vintage', name: 'Vintage', color: '#8b5cf6' },
];

export default function ReelsCreateScreen() {
    const [media, setMedia] = useState<{ uri: string, type: 'video' | 'image' } | null>(null);
    const [caption, setCaption] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('none');
    const [isUploading, setIsUploading] = useState(false);

    const { uploadReel } = useStore();
    const router = useRouter();

    const pickMedia = async (useCamera: boolean) => {
        let result;
        const options: ImagePicker.ImagePickerOptions = {
            mediaTypes: ['images', 'videos'],
            allowsEditing: true,
            aspect: [9, 16],
            quality: 0.8,
            base64: true,
        };

        if (useCamera) {
            result = await ImagePicker.launchCameraAsync(options);
        } else {
            result = await ImagePicker.launchImageLibraryAsync(options);
        }

        if (!result.canceled) {
            const asset = result.assets[0];
            const type = asset.type === 'video' ? 'video' : 'image';

            // In a real app, we would process the base64 or upload to S3/Cloudinary
            // For this demo, we'll use the local URI or base64 if available
            const uri = asset.base64 ? `data:${type === 'video' ? 'video/mp4' : 'image/jpeg'};base64,${asset.base64}` : asset.uri;

            setMedia({ uri, type });
        }
    };

    const handleUpload = async () => {
        if (!media) return;
        setIsUploading(true);
        const success = await uploadReel(media.uri, media.type, caption);
        setIsUploading(false);

        if (success) {
            Alert.alert("Success", "Your Reel has been uploaded!");
            router.back();
        } else {
            Alert.alert("Error", "Failed to upload Reel.");
        }
    };

    const getFilterStyle = () => {
        // This is a simulation since RN doesn't have CSS filters
        // A real app would use gl-react-native or similar
        switch (selectedFilter) {
            case 'sepia': return { opacity: 0.8, backgroundColor: 'rgba(112, 66, 20, 0.2)' };
            case 'grayscale': return { opacity: 0.7, backgroundColor: 'rgba(0,0,0,0.3)' };
            case 'warm': return { opacity: 0.8, backgroundColor: 'rgba(251, 191, 36, 0.15)' };
            case 'cool': return { opacity: 0.8, backgroundColor: 'rgba(96, 165, 250, 0.15)' };
            case 'vintage': return { opacity: 0.8, backgroundColor: 'rgba(139, 92, 246, 0.1)' };
            default: return {};
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <X color="#fff" size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Reel</Text>
                <TouchableOpacity onPress={handleUpload} disabled={!media || isUploading}>
                    {isUploading ? <ActivityIndicator color="#6366f1" /> : <Check color={media ? "#6366f1" : "#334155"} size={28} />}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {!media ? (
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerOptions}>
                            <TouchableOpacity style={styles.pickerItem} onPress={() => pickMedia(true)}>
                                <Camera color="#6366f1" size={48} />
                                <Text style={styles.pickerText}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.pickerItem} onPress={() => pickMedia(false)}>
                                <ImageIcon color="#6366f1" size={48} />
                                <Text style={styles.pickerText}>Gallery</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.previewContainer}>
                        <View style={styles.mediaWrapper}>
                            {media.type === 'video' ? (
                                <Video
                                    source={{ uri: media.uri }}
                                    style={styles.previewMedia}
                                    resizeMode={ResizeMode.COVER}
                                    shouldPlay
                                    isLooping
                                />
                            ) : (
                                <Image source={{ uri: media.uri }} style={styles.previewMedia} />
                            )}
                            <View style={[StyleSheet.absoluteFill, getFilterStyle()]} pointerEvents="none" />
                        </View>

                        <View style={styles.filterSection}>
                            <View style={styles.sectionHeader}>
                                <Wand2 color="#94a3b8" size={18} />
                                <Text style={styles.sectionTitle}>High Quality Filters</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterList}>
                                {FILTERS.map((filter) => (
                                    <TouchableOpacity
                                        key={filter.id}
                                        style={[styles.filterItem, selectedFilter === filter.id && styles.filterItemActive]}
                                        onPress={() => setSelectedFilter(filter.id)}
                                    >
                                        <View style={[styles.filterPreview, { backgroundColor: filter.color }]} />
                                        <Text style={styles.filterName}>{filter.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.inputSection}>
                            <Text style={styles.sectionTitle}>Caption</Text>
                            <TextInput
                                style={styles.captionInput}
                                placeholder="Write a caption..."
                                placeholderTextColor="#64748b"
                                multiline
                                value={caption}
                                onChangeText={setCaption}
                            />
                        </View>

                        <TouchableOpacity style={styles.changeMediaButton} onPress={() => setMedia(null)}>
                            <Text style={styles.changeMediaText}>Change Media</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    pickerContainer: {
        height: 400,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerOptions: {
        flexDirection: 'row',
        gap: 40,
    },
    pickerItem: {
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        padding: 30,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.2)',
    },
    pickerText: {
        color: '#fff',
        marginTop: 15,
        fontWeight: '600',
    },
    previewContainer: {
        padding: 20,
    },
    mediaWrapper: {
        width: '100%',
        height: 450,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#000',
        marginBottom: 20,
    },
    previewMedia: {
        width: '100%',
        height: '100%',
    },
    filterSection: {
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 8,
    },
    sectionTitle: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    filterList: {
        flexDirection: 'row',
    },
    filterItem: {
        alignItems: 'center',
        marginRight: 20,
        opacity: 0.6,
    },
    filterItemActive: {
        opacity: 1,
    },
    filterPreview: {
        width: 60,
        height: 60,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    filterName: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    inputSection: {
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 20,
        padding: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        marginBottom: 20,
    },
    captionInput: {
        color: '#fff',
        fontSize: 16,
        marginTop: 10,
        minHeight: 80,
    },
    changeMediaButton: {
        alignItems: 'center',
        padding: 10,
    },
    changeMediaText: {
        color: '#6366f1',
        fontWeight: '600',
    }
});
