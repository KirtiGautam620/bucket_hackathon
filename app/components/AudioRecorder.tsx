import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAudioRecorder, useAudioPlayer, RecordingPresets, useAudioRecorderState, useAudioPlayerStatus, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import { Paths, File } from 'expo-file-system';
import { Mic, Play, Pause, Trash2 } from 'lucide-react-native';

interface AudioRecorderProps {
    onRecordingComplete: (audioPath: string | null) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete }) => {
    // Recording Hook
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
        console.log('Recorder status update:', status);
    });
    const recorderState = useAudioRecorderState(recorder, 100); // Update every 100ms

    useEffect(() => {
        console.log('AudioRecorder mounted');
    }, []);

    useEffect(() => {
        console.log('recorderState updated:', recorderState);
    }, [recorderState]);

    // Local state for the finalized audio file path
    const [audioPath, setAudioPath] = useState<string | null>(null);

    // Playback Hook - only active when we have a path
    const player = useAudioPlayer(audioPath ? { uri: audioPath } : null);
    const playerStatus = useAudioPlayerStatus(player);

    const handleStartRecording = async () => {
        console.log('handleStartRecording called');
        try {
            // Configure audio mode for recording (Required for iOS)
            console.log('Setting audio mode...');
            await setAudioModeAsync({
                allowsRecording: true,
                playsInSilentMode: true,
            });
            console.log('Audio mode set');

            // Check if we need to prepare
            if (!recorderState.canRecord) {
                console.log('Requesting permissions...');
                const { granted } = await requestRecordingPermissionsAsync();
                console.log('Permission granted:', granted);

                if (!granted) {
                    Alert.alert('Permission Denied', 'Microphone permission is required to record audio.');
                    return;
                }

                // Explicitly prepare the recorder since it might not have been prepared due to missing permissions
                console.log('Explicitly preparing recorder...');
                try {
                    // @ts-ignore - prepareToRecordAsync exists on the native object
                    await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
                    console.log('Recorder prepared successfully');
                } catch (prepError) {
                    console.error('Failed to prepare recorder:', prepError);
                    // Continue anyway, maybe it works?
                }
            }

            // Start recording
            console.log('Calling recorder.record()...');
            recorder.record();
            console.log('recorder.record() called');
        } catch (error) {
            console.error('Failed to start recording:', error);
            Alert.alert('Error', `Failed to start recording: ${error}`);
        }
    };

    const handleStopRecording = async () => {
        try {
            console.log('Stopping recording...');
            await recorder.stop();
            console.log('Recording stopped');

            // The file is currently at recorder.uri (temp)
            const tempUri = recorder.uri;
            console.log('Temp URI:', tempUri);

            if (tempUri) {
                // Determine destination
                const timestamp = Date.now();
                const fileName = `audio_${timestamp}.m4a`;

                try {
                    // New Expo FileSystem API (v19+)
                    const destFile = new File(Paths.document, fileName);
                    const tempFile = new File(tempUri);

                    console.log('Copying from:', tempFile.uri);
                    console.log('Copying to:', destFile.uri);

                    // Copy is synchronous in new API? Or void return
                    tempFile.copy(destFile);

                    console.log('File copied successfully');
                    setAudioPath(destFile.uri);
                    onRecordingComplete(destFile.uri);
                } catch (copyError) {
                    console.error('Copy Error:', copyError);
                    Alert.alert('Save Error', `Could not save audio file: ${copyError}`);
                }
            } else {
                Alert.alert('Error', 'No audio file generated (tempUri is null)');
            }
        } catch (error) {
            console.error('Failed to stop recording:', error);
            Alert.alert('Recording Error', `Failed to stop recording: ${error}`);
        }
    };

    const handlePlayPause = async () => {
        if (!audioPath) return;

        if (player.playing) {
            player.pause();
        } else {
            // Ensure we are in playback mode (routes to speaker)
            try {
                await setAudioModeAsync({
                    allowsRecording: false, // Important: false routes to speaker
                    playsInSilentMode: true,
                });
            } catch (e) {
                console.error('Failed to set playback mode:', e);
            }

            // Check if finished, seek to 0?
            if (playerStatus.didJustFinish) {
                // seeking might be async or void, types vary. 
                // If seekTo returns promise, await it. 
                // Safest is fire and forget or await if possible.
                // Expo Audio types say seekTo returns Promise<void>
                await player.seekTo(0);
            }
            player.play();
        }
    };

    const handleDelete = async () => {
        if (audioPath) {
            try {
                // New API
                const file = new File(audioPath);
                if (file.exists) {
                    file.delete();
                }
            } catch (e) {
                console.error("Error deleting file", e);
            }
        }
        setAudioPath(null);
        onRecordingComplete(null);
    };

    const formatTime = (seconds: number): string => {
        if (!seconds && seconds !== 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate display values
    const isRecording = recorderState.isRecording;
    const recDuration = recorderState.durationMillis / 1000;

    // Playback progress
    const playDuration = playerStatus.duration;
    const playPosition = playerStatus.currentTime;
    const isPlaying = playerStatus.playing;

    return (
        <View style={styles.container}>
            {!audioPath ? (
                <TouchableOpacity
                    style={[
                        styles.mainButton,
                        isRecording && styles.recordingButton
                    ]}
                    onPress={() => {
                        console.log('Button Pressed. isRecording:', isRecording);
                        if (isRecording) {
                            handleStopRecording();
                        } else {
                            handleStartRecording();
                        }
                    }}
                >
                    <View style={styles.buttonContent}>
                        {isRecording ? (
                            <>
                                <View style={styles.recordingIndicator} />
                                <Text style={styles.recordingText}>
                                    Stop Recording ({formatTime(recDuration)})
                                </Text>
                            </>
                        ) : (
                            <>
                                <Mic size={24} color="#000000" />
                                <Text style={styles.mainButtonText}>Record Audio Memo</Text>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            ) : (
                <View style={styles.playbackContainer}>
                    <TouchableOpacity
                        style={styles.playButton}
                        onPress={handlePlayPause}
                    >
                        {isPlaying ? (
                            <Pause size={20} color="#fff" fill="#fff" />
                        ) : (
                            <Play size={20} color="#fff" fill="#fff" />
                        )}
                    </TouchableOpacity>

                    <View style={styles.waveformContainer}>
                        <Text style={styles.durationText}>
                            {formatTime(playPosition)} / {formatTime(playDuration)}
                        </Text>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${(playPosition / (playDuration || 1)) * 100}%` }
                                ]}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={handleDelete}
                    >
                        <Trash2 size={20} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 10,
    },
    mainButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#000000', // Black border
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    recordingButton: {
        backgroundColor: '#FEF2F2',
        borderColor: '#EF4444',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    mainButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000000', // Black text
    },
    recordingText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#EF4444',
    },
    recordingIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#EF4444',
    },
    playbackContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#000000', // Black play button
        justifyContent: 'center',
        alignItems: 'center',
    },
    waveformContainer: {
        flex: 1,
        gap: 4,
    },
    durationText: {
        fontSize: 12,
        color: '#6B7280',
        fontVariant: ['tabular-nums'],
    },
    progressBar: {
        height: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 2,
        width: '100%',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#000000', // Black progress fill
        borderRadius: 2,
    },
    deleteButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
    },
});
