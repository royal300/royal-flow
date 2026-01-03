import { ReactNode, useEffect, useState } from 'react';
import { checkOfficeLocation } from '@/services/locationService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface LocationProtectedRouteProps {
    children: ReactNode;
}

type LocationState = 'checking' | 'allowed' | 'denied' | 'error';

const LocationProtectedRoute = ({ children }: LocationProtectedRouteProps) => {
    const [state, setState] = useState<LocationState>('checking');
    const [message, setMessage] = useState('Verifying your location...');
    const [distance, setDistance] = useState<number | null>(null);

    const checkLocation = async () => {
        setState('checking');
        setMessage('Verifying your location...');

        try {
            const result = await checkOfficeLocation();

            if (result.allowed) {
                setState('allowed');
                setMessage(result.message);
            } else {
                setState('denied');
                setMessage(result.message);
                setDistance(result.distance);
            }
        } catch (error) {
            setState('error');
            const errorMessage = error instanceof Error ? error.message : 'Failed to verify location';
            setMessage(errorMessage);
        }
    };

    useEffect(() => {
        checkLocation();
    }, []);

    // If location is allowed, render the protected content
    if (state === 'allowed') {
        return <>{children}</>;
    }

    // Otherwise, show appropriate UI based on state
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8 text-center space-y-6">
                {state === 'checking' && (
                    <>
                        <div className="flex justify-center">
                            <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Verifying Location</h2>
                        <p className="text-gray-600">{message}</p>
                        <div className="text-sm text-gray-500">
                            Please allow location access when prompted
                        </div>
                    </>
                )}

                {state === 'denied' && (
                    <>
                        <div className="flex justify-center">
                            <MapPin className="h-16 w-16 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
                        <p className="text-gray-700 font-medium">{message}</p>
                        {distance && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-800 font-semibold">
                                    Distance from office: {distance} meters
                                </p>
                                <p className="text-sm text-red-600 mt-2">
                                    You must be at the office premises to access this page
                                </p>
                            </div>
                        )}
                        <Button
                            onClick={checkLocation}
                            className="w-full"
                            variant="outline"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Try Again
                        </Button>
                    </>
                )}

                {state === 'error' && (
                    <>
                        <div className="flex justify-center">
                            <AlertCircle className="h-16 w-16 text-orange-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Location Error</h2>
                        <p className="text-gray-700">{message}</p>
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-left">
                            <p className="text-sm text-orange-800 font-semibold mb-2">
                                Possible solutions:
                            </p>
                            <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                                <li>Enable location services in your browser</li>
                                <li>Allow location permission for this website</li>
                                <li>Check if GPS is enabled on your device</li>
                                <li>Try using a different browser</li>
                            </ul>
                        </div>
                        <Button
                            onClick={checkLocation}
                            className="w-full"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                    </>
                )}
            </Card>
        </div>
    );
};

export default LocationProtectedRoute;
