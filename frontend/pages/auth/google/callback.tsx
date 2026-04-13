import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '@/lib/api';
import { Loader } from 'lucide-react';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const { code } = router.query;

  useEffect(() => {
    if (code) {
      handleCallback();
    }
  }, [code]);

  const handleCallback = async () => {
    try {
      const response = await api.auth.googleCallback(code as string);
      const { token } = response.data;
      
      localStorage.setItem('token', token);
      router.push('/dashboard');
    } catch (error) {
      console.error('OAuth callback failed:', error);
      router.push('/login?error=oauth_failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader className="animate-spin w-12 h-12 mx-auto mb-4" />
        <p className="text-gray-600">Authenticating with Google...</p>
      </div>
    </div>
  );
}
