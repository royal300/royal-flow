import { useState, useRef } from 'react';
import Webcam from 'react-webcam';
import { detectFace } from '@/services/faceService';
import { biometricService, Staff } from '@/lib/storage';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Camera, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FaceRegistrationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    staffList: Staff[];
    onSuccess: () => void;
}

export function FaceRegistrationModal({
    open,
    onOpenChange,
    staffList,
    onSuccess,
}: FaceRegistrationModalProps) {
    const webcamRef = useRef<Webcam>(null);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [isCapturing, setIsCapturing] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const captureAndDetect = async () => {
        setIsCapturing(true);
        setStatus(null);

        if (webcamRef.current && webcamRef.current.video) {
            try {
                const imageSrc = webcamRef.current.getScreenshot();
                const detection = await detectFace(webcamRef.current.video);

                if (detection) {
                    setFaceDescriptor(Array.from(detection.descriptor));
                    setCapturedImage(imageSrc || '');
                    setStatus({
                        type: 'success',
                        message: 'Face detected! Select staff member and save.',
                    });
                } else {
                    setStatus({ type: 'error', message: 'No face detected. Please position clearly.' });
                }
            } catch (err) {
                console.error(err);
                setStatus({ type: 'error', message: 'Detection failed.' });
            }
        }
        setIsCapturing(false);
    };

    const handleSave = async () => {
        if (!selectedStaffId) {
            setStatus({ type: 'error', message: 'Please select a staff member.' });
            return;
        }
        if (!faceDescriptor || !capturedImage) {
            setStatus({ type: 'error', message: 'No face captured.' });
            return;
        }

        try {
            setIsCapturing(true);
            await biometricService.registerFace(selectedStaffId, faceDescriptor, capturedImage);
            setStatus({ type: 'success', message: 'Face registered successfully!' });

            // Reset and close after success
            setTimeout(() => {
                resetForm();
                onSuccess();
                onOpenChange(false);
            }, 1500);
        } catch (e) {
            console.error(e);
            setStatus({ type: 'error', message: 'Failed to save face data.' });
        } finally {
            setIsCapturing(false);
        }
    };

    const resetForm = () => {
        setSelectedStaffId('');
        setFaceDescriptor(null);
        setCapturedImage(null);
        setStatus(null);
    };

    const handleClose = () => {
        resetForm();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Register Staff Face</DialogTitle>
                    <DialogDescription>
                        Capture face biometric data for attendance tracking
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Camera Section */}
                    <div className="space-y-4">
                        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                            {capturedImage ? (
                                <div className="relative">
                                    <img src={capturedImage} alt="Captured" className="w-full" />
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="absolute bottom-2 left-1/2 -translate-x-1/2"
                                        onClick={() => {
                                            setCapturedImage(null);
                                            setFaceDescriptor(null);
                                            setStatus(null);
                                        }}
                                    >
                                        Retake
                                    </Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
                                        className="w-full"
                                    />
                                    <Button
                                        className="absolute bottom-2 left-1/2 -translate-x-1/2"
                                        onClick={captureAndDetect}
                                        disabled={isCapturing}
                                    >
                                        {isCapturing ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Scanning...
                                            </>
                                        ) : (
                                            <>
                                                <Camera className="mr-2 h-4 w-4" />
                                                Capture Face
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Select Staff Member</label>
                            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose staff member" />
                                </SelectTrigger>
                                <SelectContent>
                                    {staffList.map((staff) => (
                                        <SelectItem key={staff.id} value={staff.id}>
                                            {staff.name} - {staff.department}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {status && (
                            <Alert variant={status.type === 'error' ? 'destructive' : 'default'}>
                                {status.type === 'success' ? (
                                    <CheckCircle className="h-4 w-4" />
                                ) : (
                                    <AlertCircle className="h-4 w-4" />
                                )}
                                <AlertDescription>{status.message}</AlertDescription>
                            </Alert>
                        )}

                        <div className="flex gap-2">
                            <Button
                                onClick={handleSave}
                                disabled={!faceDescriptor || !selectedStaffId || isCapturing}
                                className="flex-1"
                            >
                                {isCapturing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Registration'
                                )}
                            </Button>
                            <Button variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
