import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { biometricService } from '@/lib/storage';
import { CheckCircle, XCircle, Clock, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function AttendancePage() {
    const webcamRef = useRef<Webcam>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [lastLog, setLastLog] = useState<any>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [registeredUsers, setRegisteredUsers] = useState<Array<{ id: string; name: string; descriptor: number[] }>>([]);
    const scanningInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadUsers();
        return () => stopScanning();
    }, []);

    const loadUsers = async () => {
        try {
            const users = await biometricService.getBiometricStaff();
            console.log('📥 Loaded users from API:', users.map(u => ({ name: u.name, descriptorLength: u.descriptor?.length })));
            setRegisteredUsers(users);
        } catch (error) {
            console.error('Failed to load biometric staff:', error);
        }
    };

    const startScanning = () => {
        setIsScanning(true);
        setMessage(null);
        setLastLog(null);

        scanningInterval.current = setInterval(async () => {
            if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4) {
                const video = webcamRef.current.video;

                try {
                    const detection = await faceapi
                        .detectSingleFace(video)
                        .withFaceLandmarks()
                        .withFaceDescriptor();

                    if (detection) {
                        console.log('👤 Face detected, descriptor length:', detection.descriptor.length);
                        const bestMatch = matchFace(detection.descriptor, registeredUsers);

                        if (bestMatch) {
                            await handleMatch(bestMatch);
                        } else {
                            setMessage({ type: 'error', text: 'Face not recognized!' });
                        }
                    }
                } catch (err) {
                    console.error('Detection error:', err);
                }
            }
        }, 1000);
    };

    const stopScanning = () => {
        if (scanningInterval.current) {
            clearInterval(scanningInterval.current);
            scanningInterval.current = null;
        }
        setIsScanning(false);
    };

    const matchFace = (
        descriptor: Float32Array,
        users: Array<{ id: string; name: string; descriptor: number[] }>
    ): { id: string; name: string } | null => {
        if (!users || users.length === 0) {
            console.log('❌ No registered users available');
            return null;
        }

        console.log(`\n🔍 Matching against ${users.length} registered users`);
        console.log(`📐 Input descriptor: length=${descriptor.length}, type=${descriptor.constructor.name}`);

        try {
            const distances: Array<{ user: typeof users[0]; distance: number }> = [];

            users.forEach(u => {
                try {
                    if (!u.descriptor || !Array.isArray(u.descriptor)) {
                        console.error(`❌ ${u.name}: descriptor is not an array`);
                        return;
                    }

                    if (u.descriptor.length === 0) {
                        console.error(`❌ ${u.name}: descriptor is empty`);
                        return;
                    }

                    if (u.descriptor.length !== 128) {
                        console.error(`❌ ${u.name}: wrong length (${u.descriptor.length}, expected 128)`);
                        return;
                    }

                    const userDescriptor = new Float32Array(u.descriptor);

                    if (descriptor.length !== userDescriptor.length) {
                        console.error(`❌ ${u.name}: length mismatch (input=${descriptor.length}, stored=${userDescriptor.length})`);
                        return;
                    }

                    let sum = 0;
                    for (let i = 0; i < descriptor.length; i++) {
                        const val1 = descriptor[i];
                        const val2 = userDescriptor[i];

                        if (isNaN(val1) || isNaN(val2)) {
                            console.error(`❌ ${u.name}: NaN value at index ${i}`);
                            return;
                        }

                        const diff = val1 - val2;
                        sum += diff * diff;
                    }
                    const distance = Math.sqrt(sum);

                    if (isNaN(distance)) {
                        console.error(`❌ ${u.name}: calculated distance is NaN`);
                        return;
                    }

                    distances.push({ user: u, distance });
                    console.log(`  📏 ${u.name}: distance = ${distance.toFixed(3)}`);
                } catch (err) {
                    console.error(`❌ Error for ${u.name}:`, err);
                }
            });

            if (distances.length === 0) {
                console.log('❌ No valid distances - all descriptors invalid');
                return null;
            }

            distances.sort((a, b) => a.distance - b.distance);
            const closest = distances[0];

            console.log(`\n🎯 Closest: ${closest.user.name} (${closest.distance.toFixed(3)})`);

            if (closest.distance < 1.5) {
                console.log(`✅ MATCH ACCEPTED!\n`);
                return closest.user;
            } else {
                console.log(`⚠️  Too far (${closest.distance.toFixed(3)} >= 1.5)`);
                console.log(`💡 Re-register with better lighting\n`);
                return null;
            }
        } catch (error) {
            console.error('❌ Matching error:', error);
            return null;
        }
    };

    const handleMatch = async (user: { id: string; name: string }) => {
        try {
            const result = await biometricService.scanAttendance(user.id, user.name);
            setLastLog(result);
            setMessage({
                type: 'success',
                text: result.message,
            });
            stopScanning();
        } catch (error) {
            console.error('Attendance marking error:', error);
            setMessage({ type: 'error', text: 'Failed to mark attendance' });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl p-8">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance System</h1>
                    <p className="text-gray-600">Scan your face to check-in or check-out</p>
                </div>

                <div className="space-y-6">
                    {/* Camera Frame */}
                    <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '480px' }}>
                        {!isScanning && !lastLog ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
                                <div className="bg-blue-100 p-6 rounded-full mb-4">
                                    <Clock size={48} className="text-blue-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-800 mb-4">Ready to Mark Attendance</h3>
                                <Button onClick={startScanning} size="lg">
                                    <Camera className="mr-2 h-5 w-5" />
                                    Start Camera
                                </Button>
                            </div>
                        ) : (
                            <>
                                {isScanning && (
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
                                        className="w-full"
                                    />
                                )}

                                {lastLog && (
                                    <div className="absolute inset-0 bg-white bg-opacity-95 flex flex-col items-center justify-center">
                                        <CheckCircle size={64} className="text-green-500 mb-4" />
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Marked Successfully!</h2>
                                        <div className="text-center mb-6">
                                            <p className="text-3xl font-bold text-gray-900">{lastLog.record.staffName}</p>
                                            <p className="text-lg text-gray-600 mt-2">
                                                {new Date(lastLog.record[lastLog.type === 'checkin' ? 'checkIn' : 'checkOut']).toLocaleTimeString()}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {lastLog.type === 'checkin' ? 'Checked In' : 'Checked Out'}
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => {
                                                setLastLog(null);
                                                setMessage(null);
                                                startScanning();
                                            }}
                                        >
                                            Scan Next
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Message Display */}
                    {message && !lastLog && (
                        <div
                            className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'error'
                                    ? 'bg-red-50 text-red-800'
                                    : 'bg-green-50 text-green-800'
                                }`}
                        >
                            {message.type === 'error' ? (
                                <XCircle size={24} />
                            ) : (
                                <CheckCircle size={24} />
                            )}
                            <span className="font-medium">{message.text}</span>
                        </div>
                    )}

                    {/* Stop Button */}
                    {isScanning && !lastLog && (
                        <Button onClick={stopScanning} variant="destructive" className="w-full">
                            Stop Camera
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
