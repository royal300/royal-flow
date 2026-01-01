import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, User, AlertCircle } from 'lucide-react';
import { biometricService, staffService } from '@/lib/storage';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FaceManagementModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFaceDeleted?: () => void;
}

interface StaffWithFace {
    id: string;
    name: string;
    email: string;
    department: string;
    faceImage?: string;
}

export default function FaceManagementModal({ open, onOpenChange, onFaceDeleted }: FaceManagementModalProps) {
    const [staffWithFaces, setStaffWithFaces] = useState<StaffWithFace[]>([]);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            loadStaffWithFaces();
        }
    }, [open]);

    const loadStaffWithFaces = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get all staff
            const allStaff = await staffService.getAll();

            // Filter staff with face data
            const staffWithFaceData = allStaff.filter(s => s.faceDescriptor && s.faceDescriptor.length > 0);

            setStaffWithFaces(staffWithFaceData as StaffWithFace[]);
        } catch (err) {
            console.error('Failed to load staff with faces:', err);
            setError('Failed to load registered faces');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFace = async (staffId: string, staffName: string) => {
        if (!confirm(`Are you sure you want to delete the face registration for ${staffName}? They will need to re-register to use face attendance.`)) {
            return;
        }

        try {
            setDeleting(staffId);
            setError(null);

            await biometricService.deleteFace(staffId);

            // Reload the list
            await loadStaffWithFaces();

            // Notify parent
            onFaceDeleted?.();

        } catch (err) {
            console.error('Failed to delete face:', err);
            setError('Failed to delete face registration');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Manage Registered Faces</DialogTitle>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Loading registered faces...
                    </div>
                ) : staffWithFaces.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <User className="mx-auto h-12 w-12 mb-2 opacity-50" />
                        <p>No staff members have registered faces yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {staffWithFaces.map((staff) => (
                            <Card key={staff.id} className="p-4">
                                <div className="flex items-center gap-4">
                                    {/* Face Image */}
                                    <div className="flex-shrink-0">
                                        {staff.faceImage ? (
                                            <img
                                                src={staff.faceImage}
                                                alt={staff.name}
                                                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                                                <User className="h-8 w-8 text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Staff Info */}
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">{staff.name}</h3>
                                        <p className="text-sm text-muted-foreground">{staff.email}</p>
                                        <p className="text-sm text-muted-foreground">{staff.department}</p>
                                    </div>

                                    {/* Delete Button */}
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteFace(staff.id, staff.name)}
                                        disabled={deleting === staff.id}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        {deleting === staff.id ? 'Deleting...' : 'Delete Face'}
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
