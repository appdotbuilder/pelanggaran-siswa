import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { Student, User, Violation, CreateViolationInput } from '../../../server/src/schema';

interface ViolationFormProps {
  students: Student[];
  user: User;
  onViolationCreated: (violation: Violation) => void;
  isLoading?: boolean;
}

export function ViolationForm({ 
  students, 
  user, 
  onViolationCreated, 
  isLoading = false 
}: ViolationFormProps) {
  const [formData, setFormData] = useState<Omit<CreateViolationInput, 'reported_by'>>({
    student_id: 0,
    violation_type: '',
    location: '',
    description: null,
    photo_url: null,
    violation_time: new Date()
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Common violation types
  const violationTypes = [
    'Terlambat masuk sekolah',
    'Tidak memakai seragam lengkap',
    'Tidak mengerjakan tugas',
    'Mengganggu kelas',
    'Merokok di area sekolah',
    'Berkelahi',
    'Tidak sopan kepada guru',
    'Membawa HP saat pelajaran',
    'Bolos pelajaran',
    'Vandalisme',
    'Lainnya'
  ];

  // Open camera for photo capture
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use rear camera if available
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
    } catch (error) {
      console.error('Failed to access camera:', error);
      setError('Gagal mengakses kamera. Pastikan browser memiliki izin kamera.');
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.drawImage(video, 0, 0);
        const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(photoDataUrl);
        closeCamera();
        
        // In a real implementation, you would upload this to your photo service
        // For now, we'll use the data URL as photo_url (stub implementation)
        setFormData(prev => ({ ...prev, photo_url: 'photo_' + Date.now() + '.jpg' }));
      }
    }
  };

  // Close camera and stop stream
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  // Remove captured photo
  const removePhoto = () => {
    setCapturedPhoto(null);
    setFormData(prev => ({ ...prev, photo_url: null }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (formData.student_id === 0) {
        throw new Error('Pilih siswa terlebih dahulu');
      }

      const violationData: CreateViolationInput = {
        ...formData,
        reported_by: user.id,
        violation_time: new Date() // Always use current time
      };

      const newViolation = await trpc.violations.create.mutate(violationData);
      onViolationCreated(newViolation);
      
      // Reset form
      setFormData({
        student_id: 0,
        violation_type: '',
        location: '',
        description: null,
        photo_url: null,
        violation_time: new Date()
      });
      setCapturedPhoto(null);
      
      setSuccess('Pelanggaran berhasil dicatat dan disimpan!');
    } catch (error) {
      console.error('Failed to create violation:', error);
      setError('Gagal menyimpan pelanggaran. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStudent = students.find(s => s.id === formData.student_id);

  return (
    <div className="space-y-6">
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center space-x-2">
            <span>📝</span>
            <span>Catat Pelanggaran Siswa</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Selection */}
            <div className="space-y-2">
              <Label className="text-blue-900 font-medium">Pilih Siswa *</Label>
              <Select 
                value={formData.student_id.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, student_id: parseInt(value) }))}
              >
                <SelectTrigger className="border-blue-200 focus:border-blue-500">
                  <SelectValue placeholder="Pilih nama siswa..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{student.name}</span>
                        <span className="text-sm text-blue-600">{student.class} - NISN: {student.nisn}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedStudent && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Siswa Dipilih:</strong> {selectedStudent.name} ({selectedStudent.class})
                  </p>
                  <p className="text-sm text-blue-700">
                    <strong>Orang Tua:</strong> {selectedStudent.parent_name} - {selectedStudent.parent_whatsapp}
                  </p>
                </div>
              )}
            </div>

            {/* Violation Type */}
            <div className="space-y-2">
              <Label className="text-blue-900 font-medium">Jenis Pelanggaran *</Label>
              <Select 
                value={formData.violation_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, violation_type: value }))}
              >
                <SelectTrigger className="border-blue-200 focus:border-blue-500">
                  <SelectValue placeholder="Pilih jenis pelanggaran..." />
                </SelectTrigger>
                <SelectContent>
                  {violationTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-blue-900 font-medium">Lokasi Kejadian *</Label>
              <Input
                id="location"
                placeholder="Contoh: Ruang Kelas XII IPA 1, Kantin, Lapangan"
                value={formData.location}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, location: e.target.value }))
                }
                required
                className="border-blue-200 focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-blue-900 font-medium">Deskripsi Detail (Opsional)</Label>
              <Textarea
                id="description"
                placeholder="Jelaskan detail pelanggaran yang terjadi..."
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData(prev => ({ ...prev, description: e.target.value || null }))
                }
                className="border-blue-200 focus:border-blue-500 min-h-[100px]"
              />
            </div>

            {/* Photo Evidence */}
            <div className="space-y-4">
              <Label className="text-blue-900 font-medium">Bukti Foto</Label>
              
              {!capturedPhoto ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={openCamera}
                  className="w-full h-32 border-2 border-dashed border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <div className="text-center">
                    <span className="text-2xl mb-2 block">📷</span>
                    <span>Ambil Foto Bukti</span>
                  </div>
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <img
                      src={capturedPhoto}
                      alt="Bukti pelanggaran"
                      className="w-full h-48 object-cover rounded-lg border-2 border-blue-200 cursor-pointer"
                      onClick={() => setIsPreviewOpen(true)}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removePhoto}
                    >
                      ✕
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPreviewOpen(true)}
                      className="flex-1"
                    >
                      👁️ Preview Foto
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openCamera}
                      className="flex-1"
                    >
                      📷 Ambil Ulang
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Time Display */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Waktu Pelanggaran:</strong> {new Date().toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Waktu akan tercatat otomatis saat form disimpan
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex space-x-4">
              <Button 
                type="submit" 
                disabled={isSubmitting || formData.student_id === 0 || !formData.violation_type || !formData.location}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
              >
                {isSubmitting ? 'Menyimpan...' : '💾 Simpan Pelanggaran'}
              </Button>
              
              {selectedStudent && formData.violation_type && (
                <Button 
                  type="button"
                  variant="outline"
                  className="border-green-300 text-green-700 hover:bg-green-50"
                  disabled={isSubmitting}
                >
                  💬 Preview Pesan WA
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Camera Dialog */}
      <Dialog open={isCameraOpen} onOpenChange={(open) => !open && closeCamera()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ambil Foto Bukti</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={capturePhoto}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                📷 Ambil Foto
              </Button>
              <Button
                variant="outline"
                onClick={closeCamera}
                className="flex-1"
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Foto Bukti</DialogTitle>
          </DialogHeader>
          {capturedPhoto && (
            <img
              src={capturedPhoto}
              alt="Preview bukti pelanggaran"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}