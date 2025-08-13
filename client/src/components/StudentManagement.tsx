import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { Student, CreateStudentInput, BulkCreateStudentsInput } from '../../../server/src/schema';

interface StudentManagementProps {
  students: Student[];
  onStudentCreated: (student: Student) => void;
  onStudentsBulkCreated: (students: Student[]) => void;
  isLoading?: boolean;
}

export function StudentManagement({ 
  students, 
  onStudentCreated, 
  onStudentsBulkCreated, 
  isLoading = false 
}: StudentManagementProps) {
  const [formData, setFormData] = useState<CreateStudentInput>({
    nisn: '',
    name: '',
    class: '',
    parent_name: '',
    parent_whatsapp: ''
  });

  const [bulkData, setBulkData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Handle single student creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const newStudent = await trpc.students.create.mutate(formData);
      onStudentCreated(newStudent);
      setFormData({
        nisn: '',
        name: '',
        class: '',
        parent_name: '',
        parent_whatsapp: ''
      });
      setSuccess('Data siswa berhasil ditambahkan!');
    } catch (error) {
      console.error('Failed to create student:', error);
      setError('Gagal menambahkan siswa. Pastikan NISN belum terdaftar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle bulk student creation from Excel-like text
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Parse CSV-like data
      const lines = bulkData.trim().split('\n');
      const students: CreateStudentInput[] = lines.map(line => {
        const [nisn, name, class_name, parent_name, parent_whatsapp] = line.split(',').map(s => s.trim());
        return {
          nisn,
          name,
          class: class_name,
          parent_name,
          parent_whatsapp
        };
      });

      const input: BulkCreateStudentsInput = { students };
      const newStudents = await trpc.students.bulkCreate.mutate(input);
      onStudentsBulkCreated(newStudents);
      setBulkData('');
      setSuccess(`${newStudents.length} siswa berhasil ditambahkan!`);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to create students in bulk:', error);
      setError('Gagal menambahkan siswa secara massal. Periksa format data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download Excel template (stub implementation)
  const handleDownloadTemplate = () => {
    const csvContent = 'NISN,Nama Siswa,Kelas,Nama Orang Tua,Nomor WA Orang Tua\n1234567890,Contoh Siswa,XII IPA 1,Bapak/Ibu Contoh,081234567890';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_siswa.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center space-x-2">
            <span>👥</span>
            <span>Manajemen Data Siswa</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-blue-50">
              <TabsTrigger value="single" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Tambah Siswa
              </TabsTrigger>
              <TabsTrigger value="bulk" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Upload Massal
              </TabsTrigger>
              <TabsTrigger value="list" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Daftar Siswa
              </TabsTrigger>
            </TabsList>

            {/* Single Student Form */}
            <TabsContent value="single" className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nisn" className="text-blue-900">NISN *</Label>
                  <Input
                    id="nisn"
                    placeholder="Masukkan NISN"
                    value={formData.nisn}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData(prev => ({ ...prev, nisn: e.target.value }))
                    }
                    required
                    className="border-blue-200 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-blue-900">Nama Siswa *</Label>
                  <Input
                    id="name"
                    placeholder="Masukkan nama siswa"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData(prev => ({ ...prev, name: e.target.value }))
                    }
                    required
                    className="border-blue-200 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class" className="text-blue-900">Kelas *</Label>
                  <Input
                    id="class"
                    placeholder="Contoh: XII IPA 1"
                    value={formData.class}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData(prev => ({ ...prev, class: e.target.value }))
                    }
                    required
                    className="border-blue-200 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent_name" className="text-blue-900">Nama Orang Tua *</Label>
                  <Input
                    id="parent_name"
                    placeholder="Masukkan nama orang tua"
                    value={formData.parent_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData(prev => ({ ...prev, parent_name: e.target.value }))
                    }
                    required
                    className="border-blue-200 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="parent_whatsapp" className="text-blue-900">Nomor WhatsApp Orang Tua *</Label>
                  <Input
                    id="parent_whatsapp"
                    placeholder="Contoh: 081234567890"
                    value={formData.parent_whatsapp}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData(prev => ({ ...prev, parent_whatsapp: e.target.value }))
                    }
                    required
                    className="border-blue-200 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6"
                  >
                    {isSubmitting ? 'Menyimpan...' : 'Tambah Siswa'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Bulk Upload */}
            <TabsContent value="bulk" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-blue-900">Upload Data Siswa Massal</h3>
                <Button 
                  variant="outline" 
                  onClick={handleDownloadTemplate}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  📥 Download Template
                </Button>
              </div>

              <Alert>
                <AlertDescription>
                  <strong>Format data:</strong> Setiap baris berisi data siswa dengan format:<br />
                  <code>NISN,Nama Siswa,Kelas,Nama Orang Tua,Nomor WA Orang Tua</code><br />
                  Contoh: <code>1234567890,Ahmad Rizki,XII IPA 1,Bapak Ahmad,081234567890</code>
                </AlertDescription>
              </Alert>

              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    📊 Upload Data Massal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Upload Data Siswa Massal</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleBulkSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bulkData">Data Siswa (Format CSV)</Label>
                      <textarea
                        id="bulkData"
                        className="w-full h-48 p-3 border border-blue-200 rounded-md resize-none focus:border-blue-500 focus:outline-none"
                        placeholder="Masukkan data siswa dalam format:&#10;NISN1,Nama1,Kelas1,Orang Tua1,WA1&#10;NISN2,Nama2,Kelas2,Orang Tua2,WA2"
                        value={bulkData}
                        onChange={(e) => setBulkData(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Batal
                      </Button>
                      <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                        {isSubmitting ? 'Mengupload...' : 'Upload Siswa'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Students List */}
            <TabsContent value="list" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-blue-900">Daftar Siswa Terdaftar</h3>
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  Total: {students.length} siswa
                </Badge>
              </div>

              {students.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-blue-600 mb-4">Belum ada siswa terdaftar</p>
                  <p className="text-sm text-blue-500">Tambahkan siswa menggunakan form atau upload massal</p>
                </div>
              ) : (
                <div className="border rounded-lg border-blue-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-50">
                        <TableHead className="text-blue-900">NISN</TableHead>
                        <TableHead className="text-blue-900">Nama Siswa</TableHead>
                        <TableHead className="text-blue-900">Kelas</TableHead>
                        <TableHead className="text-blue-900">Orang Tua</TableHead>
                        <TableHead className="text-blue-900">WhatsApp</TableHead>
                        <TableHead className="text-blue-900">Terdaftar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id} className="hover:bg-blue-50">
                          <TableCell className="font-mono text-sm">{student.nisn}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {student.class}
                            </Badge>
                          </TableCell>
                          <TableCell>{student.parent_name}</TableCell>
                          <TableCell className="font-mono text-sm">{student.parent_whatsapp}</TableCell>
                          <TableCell className="text-sm text-blue-600">
                            {student.created_at.toLocaleDateString('id-ID')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}