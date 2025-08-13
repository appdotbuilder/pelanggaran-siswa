import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { User, Student, Violation } from '../../../server/src/schema';

interface DashboardProps {
  students: Student[];
  violations: Violation[];
  user: User;
  isLoading?: boolean;
}

export function Dashboard({ students, violations, user, isLoading = false }: DashboardProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate statistics
  const totalStudents = students.length;
  const totalViolations = violations.length;
  const todayViolations = violations.filter(v => {
    const today = new Date();
    const violationDate = new Date(v.violation_time);
    return (
      violationDate.getDate() === today.getDate() &&
      violationDate.getMonth() === today.getMonth() &&
      violationDate.getFullYear() === today.getFullYear()
    );
  }).length;

  const whatsappSent = violations.filter(v => v.whatsapp_sent).length;
  const whatsappPending = totalViolations - whatsappSent;

  // Recent violations (last 5)
  const recentViolations = violations
    .sort((a, b) => new Date(b.violation_time).getTime() - new Date(a.violation_time).getTime())
    .slice(0, 5);

  // Most violated students
  const violationsByStudent = violations.reduce((acc, violation) => {
    acc[violation.student_id] = (acc[violation.student_id] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const topViolators = Object.entries(violationsByStudent)
    .map(([studentId, count]) => ({
      student: students.find(s => s.id === parseInt(studentId)),
      count
    }))
    .filter(item => item.student)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Selamat datang, {user.username}! 👋
              </h2>
              <p className="text-blue-100">
                {user.role === 'admin' ? 'Administrator Sistem' : 'Guru/Petugas Sekolah'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm">
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center space-x-2">
              <span>👥</span>
              <span>Total Siswa</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">{totalStudents}</div>
            <p className="text-xs text-blue-600">Siswa terdaftar</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-700 flex items-center space-x-2">
              <span>📋</span>
              <span>Total Pelanggaran</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-900">{totalViolations}</div>
            <p className="text-xs text-orange-600">Semua pelanggaran</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center space-x-2">
              <span>🚨</span>
              <span>Hari Ini</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-900">{todayViolations}</div>
            <p className="text-xs text-red-600">Pelanggaran hari ini</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center space-x-2">
              <span>💬</span>
              <span>WhatsApp</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">{whatsappSent}</div>
            <p className="text-xs text-green-600">Terkirim / {whatsappPending} pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Violations */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center space-x-2">
              <span>🕐</span>
              <span>Pelanggaran Terbaru</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentViolations.length === 0 ? (
              <p className="text-blue-600 text-center py-4">Belum ada pelanggaran tercatat</p>
            ) : (
              <div className="space-y-3">
                {recentViolations.map((violation) => {
                  const student = students.find(s => s.id === violation.student_id);
                  return (
                    <div key={violation.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-blue-900">
                          {student?.name || 'Siswa tidak ditemukan'}
                        </p>
                        <p className="text-sm text-blue-700">
                          {violation.violation_type}
                        </p>
                        <p className="text-xs text-blue-600">
                          {new Date(violation.violation_time).toLocaleString('id-ID')}
                        </p>
                      </div>
                      <Badge 
                        variant={violation.whatsapp_sent ? "default" : "secondary"}
                        className={violation.whatsapp_sent ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                      >
                        {violation.whatsapp_sent ? '✅ Terkirim' : '⏳ Pending'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Violators */}
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center space-x-2">
              <span>📊</span>
              <span>Siswa dengan Pelanggaran Terbanyak</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topViolators.length === 0 ? (
              <p className="text-blue-600 text-center py-4">Belum ada data pelanggaran</p>
            ) : (
              <div className="space-y-3">
                {topViolators.map((item, index) => (
                  <div key={item.student?.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-blue-900">{item.student?.name}</p>
                        <p className="text-sm text-blue-700">{item.student?.class}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-red-700 border-red-300">
                      {item.count} pelanggaran
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 flex items-center space-x-2">
            <span>⚡</span>
            <span>Aksi Cepat</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-colors">
              <h3 className="font-semibold mb-2">📝 Catat Pelanggaran Baru</h3>
              <p className="text-sm text-blue-100">Tambah pelanggaran siswa dengan cepat</p>
            </div>
            <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg cursor-pointer hover:from-green-600 hover:to-green-700 transition-colors">
              <h3 className="font-semibold mb-2">👥 Kelola Data Siswa</h3>
              <p className="text-sm text-green-100">Tambah atau edit data siswa</p>
            </div>
            <div className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg cursor-pointer hover:from-purple-600 hover:to-purple-700 transition-colors">
              <h3 className="font-semibold mb-2">📋 Lihat Riwayat</h3>
              <p className="text-sm text-purple-100">Review semua pelanggaran</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}