import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LoginFormProps {
  onLogin: (username: string, password: string) => Promise<void>;
  isLoading?: boolean;
}

export function LoginForm({ onLogin, isLoading = false }: LoginFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(formData.username, formData.password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-blue-900 font-medium">
          Username
        </Label>
        <Input
          id="username"
          type="text"
          placeholder="Masukkan username"
          value={formData.username}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData(prev => ({ ...prev, username: e.target.value }))
          }
          required
          className="border-blue-200 focus:border-blue-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-blue-900 font-medium">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Masukkan password"
          value={formData.password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData(prev => ({ ...prev, password: e.target.value }))
          }
          required
          className="border-blue-200 focus:border-blue-500"
        />
      </div>

      <Button 
        type="submit" 
        disabled={isLoading} 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2"
      >
        {isLoading ? 'Memproses...' : 'Masuk'}
      </Button>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800 font-medium mb-1">Demo Credentials:</p>
        <p className="text-xs text-blue-700">Username: admin | Password: admin123</p>
        <p className="text-xs text-blue-700">Username: guru | Password: guru123</p>
      </div>
    </form>
  );
}