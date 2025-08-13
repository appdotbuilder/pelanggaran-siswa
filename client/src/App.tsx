import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, Student, Violation } from '../../server/src/schema';

// Import components
import { LoginForm } from '@/components/LoginForm';
import { StudentManagement } from '@/components/StudentManagement';
import { ViolationForm } from '@/components/ViolationForm';
import { ViolationHistory } from '@/components/ViolationHistory';
import { Dashboard } from '@/components/Dashboard';

function App() {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation state
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data state
  const [students, setStudents] = useState<Student[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);

  // Load initial data when user is authenticated
  const loadData = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const [studentsData, violationsData] = await Promise.all([
        trpc.students.getAll.query(),
        trpc.violations.getAll.query()
      ]);
      
      setStudents(studentsData);
      setViolations(violationsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Gagal memuat data aplikasi');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle login
  const handleLogin = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userData = await trpc.auth.login.mutate({ username, password });
      setUser(userData);
      localStorage.setItem('userId', userData.id.toString());
    } catch (error) {
      console.error('Login failed:', error);
      setError('Username atau password salah');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('userId');
    setActiveTab('dashboard');
    setStudents([]);
    setViolations([]);
  };

  // Auto login if user ID exists in localStorage
  useEffect(() => {
    const savedUserId = localStorage.getItem('userId');
    if (savedUserId && !user) {
      const userId = parseInt(savedUserId);
      trpc.auth.getCurrentUser.query(userId)
        .then((userData) => {
          if (userData) {
            setUser(userData);
          }
        })
        .catch(() => {
          localStorage.removeItem('userId');
        });
    }
  }, [user]);

  // Handle new violation created
  const handleViolationCreated = (newViolation: Violation) => {
    setViolations((prev: Violation[]) => [newViolation, ...prev]);
  };

  // Handle student created
  const handleStudentCreated = (newStudent: Student) => {
    setStudents((prev: Student[]) => [...prev, newStudent]);
  };

  // Handle students bulk created
  const handleStudentsBulkCreated = (newStudents: Student[]) => {
    setStudents((prev: Student[]) => [...prev, ...newStudents]);
  };

  // If not authenticated, show login form
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">🏫</span>
            </div>
            <h1 className="text-3xl font-bold text-blue-900 mb-2">
              Sistem Pelanggaran Siswa
            </h1>
            <p className="text-blue-700">Aplikasi Manajemen Pelanggaran Sekolah</p>
          </div>
          
          <Card className="shadow-xl border-blue-200">
            <CardHeader className="bg-blue-600 text-white rounded-t-lg">
              <CardTitle className="text-center">Masuk ke Sistem</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {error && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
              <LoginForm onLogin={handleLogin} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-md border-b-2 border-blue-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-bold">🏫</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-blue-900">Sistem Pelanggaran Siswa</h1>
                <p className="text-sm text-blue-700">Manajemen Pelanggaran Sekolah</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                {user.role === 'admin' ? '👤 Admin' : '👨‍🏫 Guru'}: {user.username}
              </Badge>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-blue-100 rounded-lg p-1">
            <TabsTrigger 
              value="dashboard" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              📊 Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="students" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              👥 Data Siswa
            </TabsTrigger>
            <TabsTrigger 
              value="violations" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              📝 Catat Pelanggaran
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              📋 Riwayat Pelanggaran
            </TabsTrigger>
            <TabsTrigger 
              value="whatsapp" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              💬 WhatsApp
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="dashboard" className="space-y-6">
              <Dashboard 
                students={students}
                violations={violations}
                user={user}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="students" className="space-y-6">
              <StudentManagement 
                students={students}
                onStudentCreated={handleStudentCreated}
                onStudentsBulkCreated={handleStudentsBulkCreated}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="violations" className="space-y-6">
              <ViolationForm 
                students={students}
                user={user}
                onViolationCreated={handleViolationCreated}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <ViolationHistory 
                violations={violations}
                students={students}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-blue-900">
                    <span>💬</span>
                    <span>Integrasi WhatsApp</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertDescription>
                      Fitur integrasi WhatsApp akan tersedia setelah konfigurasi API WhatsApp.
                      Saat ini, status pengiriman dapat dikelola melalui riwayat pelanggaran.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

export default App;