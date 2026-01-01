import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

export interface FaceDetection {
    descriptor: Float32Array;
    detection: faceapi.FaceDetection;
    landmarks: faceapi.FaceLandmarks68;
}

export interface RegisteredUser {
    id: string;
    name: string;
    descriptor: number[];
}

/**
 * Load face-api.js models from public/models directory
 */
export const loadModels = async (): Promise<boolean> => {
    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        console.log('Face recognition models loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load face recognition models:', error);
        return false;
    }
};

/**
 * Detect a single face from video or image element
 * @param imageElement - HTMLVideoElement or HTMLImageElement
 * @returns Face detection with descriptor or null if no face found
 */
export const detectFace = async (
    imageElement: HTMLVideoElement | HTMLImageElement
): Promise<FaceDetection | null> => {
    if (!imageElement) return null;

    try {
        const detection = await faceapi
            .detectSingleFace(imageElement)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) return null;

        return {
            descriptor: detection.descriptor,
            detection: detection.detection,
            landmarks: detection.landmarks
        };
    } catch (error) {
        console.error('Face detection error:', error);
        return null;
    }
};

/**
 * Match a face descriptor against registered users
 * @param descriptor - Face descriptor to match
 * @param users - Array of registered users with face descriptors
 * @param threshold - Matching threshold (default 0.9, higher is more lenient)
 * @returns Matched user or null if no match found
 */
export const matchFace = (
    descriptor: Float32Array,
    users: RegisteredUser[],
    threshold: number = 0.9  // Very lenient for better matching
): RegisteredUser | null => {
    if (!users || users.length === 0) {
        console.log('No registered users to match against');
        return null;
    }

    try {
        const faceMatcher = new faceapi.FaceMatcher(
            users.map(
                (u) =>
                    new faceapi.LabeledFaceDescriptors(u.id, [
                        new Float32Array(u.descriptor)
                    ])
            ),
            threshold
        );

        const match = faceMatcher.findBestMatch(descriptor);

        // Log matching details for debugging
        console.log('Face matching result:', {
            label: match.label,
            distance: match.distance,
            threshold: threshold,
            isMatch: match.label !== 'unknown'
        });

        if (match.label !== 'unknown') {
            const matchedUser = users.find((u) => u.id === match.label);
            console.log('Matched user:', matchedUser?.name);
            return matchedUser || null;
        }

        console.log('No match found - face not recognized');
        return null;
    } catch (error) {
        console.error('Face matching error:', error);
        return null;
    }
};

/**
 * Check if face-api.js models are loaded
 */
export const areModelsLoaded = (): boolean => {
    return (
        faceapi.nets.ssdMobilenetv1.isLoaded &&
        faceapi.nets.faceLandmark68Net.isLoaded &&
        faceapi.nets.faceRecognitionNet.isLoaded
    );
};
