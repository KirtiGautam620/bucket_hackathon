import { createAudioPlayer } from 'expo-audio';
import { File } from 'expo-file-system';

export const deleteAudioFile = async (audioPath: string): Promise<void> => {
    try {
        const audioFile = new File(audioPath);
        if (audioFile.exists) {
            await audioFile.delete();
            console.log('Audio file deleted:', audioPath);
        }
    } catch (error) {
        console.error('Error deleting audio file:', error);
    }
};

export const getAudioDuration = async (audioPath: string): Promise<number> => {
    try {
        const player = createAudioPlayer(audioPath);
        // Wait for it to load? explicit wait might be needed or event listener
        // But createAudioPlayer might be async in terms of loading resource effectively?
        // documentation says: "The player will start loading the audio source immediately upon creation."

        // We can listen for status update?
        // For simplicity, let's assume if we can get it, we return it.
        // However, duration might be 0 initially.

        // Let's wrap in a promise that resolves when isLoaded is true

        return new Promise((resolve) => {
            if (player.duration > 0) {
                const d = player.duration;
                player.remove();
                resolve(d);
                return;
            }

            const listener = player.addListener('playbackStatusUpdate', (status) => {
                if (status.isLoaded && status.duration > 0) {
                    const d = status.duration;
                    player.remove();
                    resolve(d);
                }
            });

            // Timeout fallback
            setTimeout(() => {
                player.remove();
                resolve(0);
            }, 2000);
        });

    } catch (error) {
        console.error('Error getting audio duration:', error);
        return 0;
    }
};
