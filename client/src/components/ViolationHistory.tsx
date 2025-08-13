import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Student, Violation } from '../../../server/src/schema';

interface ViolationHistoryProps {
  violations: Violation[];
  students: Student[];
  isLoading?: boolean;
}

export function ViolationHistory({ violations, students, isLoading = false }: ViolationHistoryProps) {
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);

  // Filter violations based on selected filters
  const filteredViolations = violations.filter((violation) => {
    const student = students.find(s => s.id === violation.student_id);
    const matchesStudent = filterStudent === 'all' || violation.student_id.toString() === filterStudent;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'sent' && violation.whatsapp_sent) ||
      (filterStatus === 'pending' && !violation.whatsapp_sent);
    const matchesSearch = searchTerm === '' || 
      student?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.violation_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.location.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStudent && matchesStatus && matchesSearch;
  }).sort((a, b) => new Date(b.violation_time).getTime() - new Date(a.violation_time).getTime());

  // Get student name by ID
  const getStudentName = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Siswa tidak ditemukan';
  };

  // Get student class by ID
  const getStudentClass = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.class : '-';
  };

  // Get violation statistics
  const stats = {
    total: violations.length,
    today: violations.filter(v => {
      const today = new Date();
      const violationDate = new Date(v.violation_time);
      return (
        violationDate.getDate() === today.getDate() &&
        violationDate.getMonth() === today.getMonth() &&
        violationDate.getFullYear() === today.getFullYear()
      );
    }).length,
    sent: violations.filter(v => v.whatsapp_sent).length,
    pending: violations.filter(v => !v.whatsapp_sent).length
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Memuat riwayat pelanggaran...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center space-x-2">
            <span>📋</span>
            <span>Riwayat Pelanggaran Siswa</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-blue-50">
              <TabsTrigger value="list" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                📋 Daftar Pelanggaran
              </TabsTrigger>
              <TabsTrigger value="stats" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                📊 Statistik
              </TabsTrigger>
            </TabsList>

            {/* Violations List */}
            <TabsContent value="list" className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
                  <div className="text-sm text-blue-700">Total Pelanggaran</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-900">{stats.today}</div>
                  <div className="text-sm text-orange-700">Hari Ini</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-900">{stats.sent}</div>
                  <div className="text-sm text-green-700">Terkirim WA</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-900">{stats.pending}</div>
                  <div className="text-sm text-red-700">Pending WA</div>
                </div>
              </div>

              {/* Filters */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-900">Cari</label>
                  <Input
                    placeholder="Nama siswa atau jenis pelanggaran..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="border-blue-200 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-900">Filter Siswa</label>
                  <Select value={filterStudent} onValueChange={setFilterStudent}>
                    <SelectTrigger className="border-blue-200 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Siswa</SelectItem>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id.toString()}>
                          {student.name} ({student.class})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-900">Status WhatsApp</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="border-blue-200 focus:border-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="sent">Sudah Terkirim</SelectItem>
                      <SelectItem value="pending">Belum Terkirim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-900">Aksi</label>
                  <Button 
                    variant="outline" 
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      setFilterStudent('all');
                      setFilterStatus('all');
                      setSearchTerm('');
                    }}
                  >
                    🔄 Reset Filter
                  </Button>
                </div>
              </div>

              {/* Violations Table */}
              {filteredViolations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-blue-600 mb-2">
                    {violations.length === 0 ? 'Belum ada pelanggaran tercatat' : 'Tidak ada hasil yang sesuai filter'}
                  </p>
                  <p className="text-sm text-blue-500">
                    {violations.length === 0 
                      ? 'Mulai catat pelanggaran siswa untuk melihat riwayat' 
                      : 'Coba ubah filter pencarian'
                    }
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg border-blue-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-blue-50">
                        <TableHead className="text-blue-900">Tanggal/Waktu</TableHead>
                        <TableHead className="text-blue-900">Siswa</TableHead>
                        <TableHead className="text-blue-900">Jenis Pelanggaran</TableHead>
                        <TableHead className="text-blue-900">Lokasi</TableHead>
                        <TableHead className="text-blue-900">Status WA</TableHead>
                        <TableHead className="text-blue-900">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredViolations.map((violation) => (
                        <TableRow key={violation.id} className="hover:bg-blue-50">
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {new Date(violation.violation_time).toLocaleDateString('id-ID')}
                              </div>
                              <div className="text-sm text-blue-600">
                                {new Date(violation.violation_time).toLocaleTimeString('id-ID')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{getStudentName(violation.student_id)}</div>
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 mt-1">
                                {getStudentClass(violation.student_id)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-48">
                              <div className="font-medium truncate">{violation.violation_type}</div>
                              {violation.description && (
                                <div className="text-sm text-gray-600 truncate">
                                  {violation.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{violation.location}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={violation.whatsapp_sent ? "default" : "secondary"}
                              className={
                                violation.whatsapp_sent 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {violation.whatsapp_sent ? '✅ Terkirim' : '⏳ Pending'}
                            </Badge>
                            {violation.whatsapp_sent && violation.whatsapp_sent_at && (
                              <div className="text-xs text-green-600 mt-1">
                                {new Date(violation.whatsapp_sent_at).toLocaleDateString('id-ID')}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setSelectedViolation(violation)}
                                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                  >
                                    👁️ Detail
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Detail Pelanggaran</DialogTitle>
                                  </DialogHeader>
                                  {selectedViolation && (
                                    <div className="space-y-4">
                                      <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                          <label className="text-sm font-medium text-blue-900">Siswa</label>
                                          <div className="text-lg font-semibold">
                                            {getStudentName(selectedViolation.student_id)}
                                          </div>
                                          <div className="text-sm text-blue-700">
                                            {getStudentClass(selectedViolation.student_id)}
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-blue-900">Waktu Kejadian</label>
                                          <div className="text-lg font-semibold">
                                            {new Date(selectedViolation.violation_time).toLocaleString('id-ID')}
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-blue-900">Jenis Pelanggaran</label>
                                          <div className="text-lg font-semibold">{selectedViolation.violation_type}</div>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-blue-900">Lokasi</label>
                                          <div className="text-lg font-semibold">{selectedViolation.location}</div>
                                        </div>
                                      </div>
                                      
                                      {selectedViolation.description && (
                                        <div>
                                          <label className="text-sm font-medium text-blue-900">Deskripsi</label>
                                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 mt-1">
                                            {selectedViolation.description}
                                          </div>
                                        </div>
                                      )}

                                      <div>
                                        <label className="text-sm font-medium text-blue-900">Status WhatsApp</label>
                                        <div className="mt-1">
                                          <Badge 
                                            className={
                                              selectedViolation.whatsapp_sent 
                                                ? "bg-green-100 text-green-800" 
                                                : "bg-yellow-100 text-yellow-800"
                                            }
                                          >
                                            {selectedViolation.whatsapp_sent ? '✅ Sudah Terkirim' : '⏳ Belum Terkirim'}
                                          </Badge>
                                          {selectedViolation.whatsapp_sent && selectedViolation.whatsapp_sent_at && (
                                            <div className="text-sm text-green-700 mt-1">
                                              Terkirim pada: {new Date(selectedViolation.whatsapp_sent_at).toLocaleString('id-ID')}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {selectedViolation.photo_url && (
                                        <div>
                                          <label className="text-sm font-medium text-blue-900">Bukti Foto</label>
                                          <div className="mt-1 p-4 bg-gray-100 rounded-lg text-center">
                                            <span className="text-gray-600">📷 Foto bukti tersimpan</span>
                                            <div className="text-xs text-gray-500 mt-1">
                                              {selectedViolation.photo_url}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>

                              {violation.photo_url && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-green-300 text-green-700 hover:bg-green-50"
                                >
                                  📷 Foto
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Show results count */}
              {filteredViolations.length > 0 && (
                <div className="text-sm text-blue-600 text-center">
                  Menampilkan {filteredViolations.length} dari {violations.length} pelanggaran
                </div>
              )}
            </TabsContent>

            {/* Statistics Tab */}
            <TabsContent value="stats" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Violation Types Chart */}
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-blue-900">Jenis Pelanggaran Terbanyak</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const violationTypeStats = violations.reduce((acc, violation) => {
                        acc[violation.violation_type] = (acc[violation.violation_type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);

                      const sortedTypes = Object.entries(violationTypeStats)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10);

                      return sortedTypes.length === 0 ? (
                        <p className="text-blue-600 text-center">Belum ada data pelanggaran</p>
                      ) : (
                        <div className="space-y-3">
                          {sortedTypes.map(([type, count], index) => (
                            <div key={type} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                  #{index + 1}
                                </div>
                                <span className="font-medium truncate">{type}</span>
                              </div>
                              <Badge variant="outline" className="text-blue-700 border-blue-300">
                                {count} kasus
                              </Badge>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Monthly Stats */}
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-blue-900">Statistik Bulanan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const monthlyStats = violations.reduce((acc, violation) => {
                        const month = new Date(violation.violation_time).toLocaleDateString('id-ID', { 
                          year: 'numeric', 
                          month: 'long' 
                        });
                        acc[month] = (acc[month] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);

                      const sortedMonths = Object.entries(monthlyStats)
                        .sort((a, b) => b[1] - a[1]);

                      return sortedMonths.length === 0 ? (
                        <p className="text-blue-600 text-center">Belum ada data pelanggaran</p>
                      ) : (
                        <div className="space-y-3">
                          {sortedMonths.map(([month, count]) => (
                            <div key={month} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                              <span className="font-medium">{month}</span>
                              <Badge variant="outline" className="text-blue-700 border-blue-300">
                                {count} pelanggaran
                              </Badge>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}