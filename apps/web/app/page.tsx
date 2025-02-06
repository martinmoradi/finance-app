'use client';
import { useEffect, useState } from 'react';

export default function Home() {
  function HelloWorld() {
    const [message, setMessage] = useState<string>('');
    const [error, setError] = useState<string>('');

    useEffect(() => {
      fetch(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
        .then((res) => res.text())
        .then(setMessage)
        .catch((err) => setError(err.message));
    }, []);

    if (error) return <div>Error: {error}</div>;
    if (!message) return <div>Loading...</div>;

    return <div>{message}</div>;
  }

  return (
    <>
      <div>This is the basic page </div>
      <HelloWorld />
    </>
  );
}
