import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Image,
    ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { router, useFocusEffect } from 'expo-router';
import { Camera, ChevronLeft, CheckCircle, Database, Wifi, WifiOff } from 'lucide-react-native';
import { insertLead, processAudioForLead } from '@/services/leadService';
import { scanVisitingCard } from '@/services/ocrService';
import { AudioRecorder } from '@/components/AudioRecorder';
import { getNetworkState, addNetworkListener, removeNetworkListener, NetworkState } from '@/services/networkService';
import { uploadLead } from '@/services/syncService';
import { useEffect, useCallback } from 'react';

export default function CaptureScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [showCamera, setShowCamera] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        company: '',
    });
    const [summary, setSummary] = useState('');
    const [audioPath, setAudioPath] = useState<string | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    // Network State
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        // Initial check
        getNetworkState().then(state => {
            setIsOffline(!state.isConnected || !state.isInternetReachable);
        });

        // Listen for changes
        const handleNetworkChange = (state: NetworkState) => {
            setIsOffline(!state.isConnected || !state.isInternetReachable);
        };

        addNetworkListener(handleNetworkChange);

        return () => {
            removeNetworkListener(handleNetworkChange);
        };
    }, []);

    // Clear form on mount/focus
    useFocusEffect(
        useCallback(() => {
            setFormData({ name: '', phone: '', email: '', company: '' });
            setSummary('');
            setAudioPath(null);
            setCapturedImage(null);
        }, [])
    );

    const handleCameraCapture = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert('Permission Required', 'Camera access is needed to scan visiting cards');
                return;
            }
        }
        setShowCamera(true);
    };

    const handleImageCaptured = async (imageUri: string) => {
        try {
            setProcessing(true);
            setCapturedImage(imageUri); // Store the image
            setShowCamera(false);

            // Perform OCR
            const ocrResult = await scanVisitingCard(imageUri);

            // Populate form with OCR results
            setFormData({
                name: ocrResult.name || '',
                phone: ocrResult.phone || '',
                email: ocrResult.email || '',
                company: ocrResult.company || '',
            });

        } catch (error) {
            console.error('OCR error:', error);
            Alert.alert('Scan Failed', `Could not extract information: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setProcessing(false);
        }
    };

    const handleTakePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.8,
                    skipProcessing: true,
                });

                if (photo?.uri) {
                    processCapturedImage(photo);
                }
            } catch (error) {
                console.error('Error taking picture:', error);
                Alert.alert('Error', 'Failed to capture image');
            }
        }
    };

    const processCapturedImage = async (photo: any) => {
        try {
            // Calculate crop region based on screen dimensions
            const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

            // Frame dimensions from styles
            const frameWidth = screenWidth * 0.85;
            const frameHeight = frameWidth / 1.6;

            // Frame position
            const frameX = (screenWidth - frameWidth) / 2;
            const frameY = (screenHeight / 2) - 100;

            // Calculate scaling factors (assuming portrait)
            const screenRatio = screenWidth / screenHeight;
            const photoRatio = photo.width / photo.height;

            let scale = 1;
            let photoOffsetX = 0;
            let photoOffsetY = 0;

            if (screenRatio < photoRatio) {
                scale = photo.height / screenHeight;
                const visiblePhotoWidth = screenWidth * scale;
                photoOffsetX = (photo.width - visiblePhotoWidth) / 2;
            } else {
                scale = photo.width / screenWidth;
                const visiblePhotoHeight = screenHeight * scale;
                photoOffsetY = (photo.height - visiblePhotoHeight) / 2;
            }

            // Calculate crop rect in photo coordinates
            const cropOriginX = Math.max(0, photoOffsetX + (frameX * scale));
            const cropOriginY = Math.max(0, photoOffsetY + (frameY * scale));

            const cropWidth = Math.min(photo.width - cropOriginX, frameWidth * scale);
            const cropHeight = Math.min(photo.height - cropOriginY, frameHeight * scale);

            const manipResult = await manipulateAsync(
                photo.uri,
                [
                    {
                        crop: {
                            originX: cropOriginX,
                            originY: cropOriginY,
                            width: cropWidth,
                            height: cropHeight,
                        },
                    },
                    { resize: { width: 800 } },
                ],
                { compress: 0.5, format: SaveFormat.JPEG }
            );

            handleImageCaptured(manipResult.uri);

        } catch (error) {
            console.error('Error processing image:', error);
            handleImageCaptured(photo.uri);
        }
    };

    const handleSaveLead = async () => {
        if (!formData.name && !formData.phone && !formData.email) {
            Alert.alert('Missing Information', 'Please enter at least a name, phone, or email');
            return;
        }

        try {
            setProcessing(true);

            const lead = await insertLead({
                ...formData,
                imagePath: capturedImage || undefined,
                audioPath: audioPath || undefined,
                summary: summary || undefined,
            });

            if (!lead) {
                Alert.alert('Duplicate Lead', 'A lead with this phone or email already exists.');
                return;
            }

            Alert.alert('Success', 'Lead saved successfully!', [
                {
                    text: 'OK',
                    onPress: () => {
                        // Clear form immediately
                        setFormData({ name: '', phone: '', email: '', company: '' });
                        setAudioPath(null);
                        setCapturedImage(null);
                    },
                }
            ]);
        } catch (error) {
            console.error('Error saving lead:', error);
            Alert.alert('Error', 'Failed to save lead. Please try again.');
        } finally {
            setProcessing(false);
        }
    };

    if (showCamera) {
        return (
            <View style={styles.cameraContainer}>
                <CameraView ref={cameraRef} style={styles.camera} facing="back" />

                <View style={styles.cameraOverlay} pointerEvents="box-none">
                    <View style={styles.cameraHeader} pointerEvents="box-none">
                        <TouchableOpacity style={styles.backButton} onPress={() => setShowCamera(false)}>
                            <ChevronLeft size={24} color="#1A1A1A" />
                        </TouchableOpacity>
                        <Text style={styles.cameraTitle}>Capture Lead</Text>
                        <View style={styles.offlineBadge}>
                            <Database size={12} color="#1976D2" />
                            <Text style={styles.offlineText}>OFFLINE MODE</Text>
                        </View>
                    </View>

                    <View style={styles.frameContainer}>
                        <View style={styles.frameGuide}>
                            {/* Detailed OCR Corners */}
                            <View style={[styles.corner, styles.cornerTL]} />
                            <View style={[styles.corner, styles.cornerTR]} />
                            <View style={[styles.corner, styles.cornerBL]} />
                            <View style={[styles.corner, styles.cornerBR]} />
                        </View>
                        <View style={styles.engineBadge}>
                            <Text style={styles.engineText}>Local OCR Scanning...</Text>
                            <Text style={styles.engineSubtext}>PADDLE ENGINE</Text>
                        </View>
                    </View>

                    <View style={styles.cameraControls}>
                        <TouchableOpacity style={styles.captureButton} onPress={handleTakePicture}>
                            <View style={styles.captureInner} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.mainHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
                    <ChevronLeft size={24} color="#000000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Capture Lead</Text>
                {isOffline ? (
                    <View style={styles.headerOfflineBadge}>
                        <WifiOff size={12} color="#D32F2F" />
                        <Text style={styles.headerOfflineText}>OFFLINE</Text>
                    </View>
                ) : (
                    <View style={styles.headerOnlineBadge}>
                        <Wifi size={12} color="#388E3C" />
                        <Text style={styles.headerOnlineText}>ONLINE</Text>
                    </View>
                )}
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <TouchableOpacity style={styles.scanCardContainer} onPress={handleCameraCapture}>
                    {capturedImage ? (
                        <View style={styles.capturedImageContainer}>
                            <Image source={{ uri: capturedImage }} style={styles.capturedImage} resizeMode="cover" />

                            {/* Overlay Frame */}
                            <View style={styles.overlayFrame}>
                                <View style={[styles.corner, styles.cornerTL]} />
                                <View style={[styles.corner, styles.cornerTR]} />
                                <View style={[styles.corner, styles.cornerBL]} />
                                <View style={[styles.corner, styles.cornerBR]} />
                            </View>

                            {/* Scanning Effect / Badge */}
                            {processing && (
                                <View style={styles.scanningOverlay}>
                                    <View style={styles.scanLine} />
                                    <View style={styles.engineBadge}>
                                        <ActivityIndicator size="small" color="#1976D2" />
                                        <View>
                                            <Text style={styles.engineText}>Local OCR Scanning...</Text>
                                            <Text style={styles.engineSubtext}>PADDLE ENGINE</Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.emptyScanCard}>
                            <View style={styles.scanIconBg}>
                                <Camera size={28} color="#000000" />
                            </View>
                            <Text style={styles.scanCardTitle}>Scan Visiting Card</Text>
                            <Text style={styles.scanCardSubtitle}>Auto-extract details with OCR</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>LEAD DETAILS</Text>
                    <View style={styles.processedBadge}>
                        <CheckCircle size={12} color="#00C853" />
                        <Text style={styles.processedText}>LOCALLY PROCESSED</Text>
                    </View>
                </View>

                <View style={styles.formCard}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.name}
                            onChangeText={(text) => setFormData({ ...formData, name: text })}
                            placeholder="John Doe"
                            placeholderTextColor="#999999"
                        />
                    </View>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email Address</Text>
                        <TextInput
                            style={styles.input}
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            placeholder="john@example.com"
                            placeholderTextColor="#999999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>
                    <View style={styles.row}>
                        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>Phone</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.phone}
                                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                                placeholder="+1 555-0123"
                                placeholderTextColor="#999999"
                                keyboardType="phone-pad"
                            />
                        </View>
                        <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
                            <Text style={styles.label}>Company</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.company}
                                onChangeText={(text) => setFormData({ ...formData, company: text })}
                                placeholder="Tech Corp"
                                placeholderTextColor="#999999"
                            />
                        </View>
                    </View>
                </View>

                <AudioRecorder onRecordingComplete={setAudioPath} />

                {audioPath && (
                    <TouchableOpacity
                        style={styles.transcribeButton}
                        onPress={async () => {
                            if (!audioPath) return;
                            if (isOffline) {
                                Alert.alert('Offline', 'Cannot transcribe audio while offline. Please try again when online.');
                                return;
                            }

                            setProcessing(true);
                            try {
                                // Save locally first
                                const savedLead = await insertLead({
                                    ...formData,
                                    audioPath,
                                    imagePath: capturedImage || undefined,
                                    // Don't save summary yet as we are generating it
                                });

                                if (savedLead) {
                                    // Sync to backend to create the lead there
                                    const leadSynced = await uploadLead(savedLead);

                                    if (!leadSynced) {
                                        Alert.alert('Sync Error', 'Could not sync lead to backend. Audio processing requires an online lead.');
                                        setProcessing(false);
                                        return;
                                    }

                                    // Now process audio
                                    const result = await processAudioForLead(savedLead.id, audioPath);

                                    if (result?.transcription) {
                                        // Update summary state
                                        const newSummary = result.summary || '';
                                        setSummary(newSummary);

                                        // Update formData to include summary so next save works? 
                                        // Actually `handleSaveLead` reads from `summary` state, so we are good.

                                        Alert.alert('Success', 'Audio transcribed and summarized!');
                                    } else {
                                        Alert.alert('Error', 'Failed to get transcription result.');
                                    }
                                }
                            } catch (e) {
                                console.error(e);
                                Alert.alert('Error', 'Failed to transcribe.');
                            } finally {
                                setProcessing(false);
                            }
                        }}
                    >
                        {processing ? (
                            <ActivityIndicator color="#7B1FA2" size="small" />
                        ) : (
                            <>
                                <View style={styles.transcribeIcon}>
                                    <Text style={{ fontSize: 16 }}>✨</Text>
                                </View>
                                <Text style={styles.transcribeText}>Transcribe & Summarize</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Summary / Notes</Text>
                    <TextInput
                        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                        value={summary}
                        onChangeText={setSummary}
                        placeholder="Generated summary will appear here..."
                        placeholderTextColor="#999999"
                        multiline
                    />
                </View>



                <Text style={styles.whisperHint}>● LOCAL WHISPER TRANSCRIPTION ENABLED</Text>

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSaveLead}
                    disabled={processing}
                >
                    {processing ? (
                        <Text style={styles.saveButtonText}>Saving...</Text>
                    ) : (
                        <>
                            <CheckCircle size={20} color="#fff" />
                            <Text style={styles.saveButtonText}>Save Lead to Device</Text>
                        </>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    // Styles
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF', // White background
    },
    mainHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    headerBack: {
        padding: 8,
        marginRight: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000000', // Black Title
        flex: 1,
    },
    headerOfflineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEBEE',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    headerOfflineText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#D32F2F',
    },
    headerOnlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    headerOnlineText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#388E3C',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    scanCardContainer: {
        marginBottom: 24,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#FAFAFA', // Light grey card
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    bigScanCard: {
        backgroundColor: '#FAFAFA',
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
    },
    scanCardContent: {
        alignItems: 'center',
    },
    scanIconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    scanCardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000000', // Black text
        marginBottom: 4,
    },
    scanCardSubtitle: {
        fontSize: 14,
        color: '#666666',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#999999',
        letterSpacing: 1,
    },
    processedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    processedText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#000000', // Black label
        marginBottom: 8,
        backgroundColor: '#F5F5F5',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    input: {
        fontSize: 16,
        color: '#000000', // Black text
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
    },
    row: {
        flexDirection: 'row',
    },
    whisperHint: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#999',
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 24,
        letterSpacing: 0.5,
    },
    saveButton: {
        backgroundColor: '#000000', // Black button
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF', // White text
    },
    // Camera Styles
    cameraContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    cameraHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff', // White on camera
    },
    offlineBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    offlineText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1976D2',
    },
    frameContainer: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        transform: [{ translateY: -100 }],
        alignItems: 'center',
    },
    frameGuide: {
        width: '85%',
        aspectRatio: 1.6,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: '#0052CC', // Blue corners
        borderWidth: 4,
    },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
    engineBadge: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginTop: 24,
        alignItems: 'center',
    },
    engineText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 2,
    },
    engineSubtext: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1976D2',
        letterSpacing: 1,
    },
    cameraControls: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fff',
    },
    // Captured Image Styles

    capturedImageContainer: {
        width: '100%',
        aspectRatio: 1.6, // Match credit card ratio
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
    },
    capturedImage: {
        width: '100%',
        height: '100%',
    },
    overlayFrame: {
        ...StyleSheet.absoluteFillObject,
        margin: 16,
    },
    scanningOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scanLine: {
        position: 'absolute',
        top: '50%',
        width: '100%',
        height: 2,
        backgroundColor: '#000000', // Black scan line
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
    },
    emptyScanCard: {
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderStyle: 'dashed',
        borderRadius: 20,
    },
    transcribeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3E5F5',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: '#E1BEE7',
    },
    transcribeIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    transcribeText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#7B1FA2',
    },
});
