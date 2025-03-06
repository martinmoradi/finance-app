import { getMe } from '@/features/auth/actions/get-me';
import { refreshTokens } from '@/features/auth/actions/refresh-tokens';
import { useAuth } from '@/features/auth/store/useAuthStore';
import { useState } from 'react';

export default function Me() {
  const [result, setResult] = useState<string>('No result yet');
  const { user } = useAuth();

  const handleGetMe = async () => {
    const response = await getMe();

    if (response.success) {
      setResult(JSON.stringify(response.data, null, 2));
    } else {
      setResult(`Error: ${response.error.message}`);
      console.error('Failed to fetch me:', response.error);
    }
  };

  const handleRefreshTokens = async () => {
    const response = await refreshTokens();

    if (response.success) {
      setResult(JSON.stringify(response.data, null, 2));
    } else {
      setResult(`Error: ${response.error.message}`);
      console.error('Failed to refresh tokens:', response.error);
    }
  };

  return (
    <div className='p-4 flex flex-col gap-4'>
      <button
        onClick={handleGetMe}
        className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>
        Debug: Get Me
      </button>
      <button
        onClick={handleRefreshTokens}
        className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>
        Debug: Refresh Tokens
      </button>
      <pre className='mt-4 p-2 bg-gray-100 rounded'>{result}</pre>
      <h1>User :</h1>
      <pre className='mt-4 p-2 bg-gray-100 rounded'>
        {JSON.stringify(user, null, 2)}
      </pre>
    </div>
  );
}
