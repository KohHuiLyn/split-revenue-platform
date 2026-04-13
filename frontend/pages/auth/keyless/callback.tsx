import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '@/lib/api';
import { Loader } from 'lucide-react';

export default function KeylessCallbackPage() {
  const router = useRouter();
  const { jwt } = router.query;

  useEffect(() => {
    if (jwt) {
      handleCallback();
    }
  }, [jwt]);

  const handleCallback = async () => {
    try {
      const response = await api.auth.keylessCallback(jwt as string);
      const { token } = response.data;
      
      localStorage.setItem('token', token);
      router.push('/dashboard');
    } catch (error) {
      console.error('Keyless callback failed:', error);
      router.push('/login?error=keyless_failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader className="animate-spin w-12 h-12 mx-auto mb-4" />
        <p className="text-gray-600">Authenticating with Aptos Keyless...</p>
      </div>
    </div>
  );
}
