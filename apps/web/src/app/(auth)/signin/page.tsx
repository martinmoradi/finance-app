import { SigninForm } from '@/app/(auth)/_components/signin-form';
import Link from 'next/link';

const SigninPage = () => {
  return (
    <div className='flex h-screen w-screen items-center justify-center'>
      <h1 className='text-2xl font-bold'>Signin</h1>
      <SigninForm />
      <Link href='/signup'>Don&apos;t have an account? Signup</Link>
    </div>
  );
};

export default SigninPage;
