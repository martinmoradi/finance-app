import { getMe } from '@/actions/auth/get-me';
import { useAuthStore } from '@/stores/useAuthStore';
import { useState } from 'react';

export default function Me() {
  const [result, setResult] = useState<string>('No result yet');
  const { user } = useAuthStore();

  const handleGetMe = async () => {
    console.log('Fetching user data...');
    const response = await getMe();
    console.log('GetMe response:', response);

    if (response.success) {
      setResult(JSON.stringify(response.data, null, 2));
    } else {
      setResult(`Error: ${response.error.message}`);
      console.error('Failed to fetch me:', response.error);
    }
  };

  return (
    <div className='p-4'>
      <button
        onClick={handleGetMe}
        className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>
        Debug: Get Me
      </button>
      <pre className='mt-4 p-2 bg-gray-100 rounded'>{result}</pre>
      <h1>User :</h1>
      <pre className='mt-4 p-2 bg-gray-100 rounded'>
        {JSON.stringify(user, null, 2)}
      </pre>
    </div>
  );
}
