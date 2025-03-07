'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/store/useAuth';
import { handleAuthFormError } from '@/features/auth/utils/auth-form-error-handler';
import { zodResolver } from '@hookform/resolvers/zod';
import { signinSchema } from '@repo/validation';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type SigninFormValues = z.infer<typeof signinSchema>;

export function SigninForm() {
  const router = useRouter();
  const { signin, status, clearErrors } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<SigninFormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Clear auth errors when component unmounts
  useEffect(() => {
    return () => {
      clearErrors();
    };
  }, [clearErrors]);

  const onSubmit = async (data: SigninFormValues) => {
    // Clear any previous errors
    clearErrors();

    const result = await signin(data);

    if (!result.success) {
      handleAuthFormError(result, setError, 'signin');
    } else {
      toast.success('Signed in successfully');
      router.push('/');
    }
  };

  return (
    <div className='w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md'>
      <h2 className='text-2xl font-bold mb-6 text-center'>Sign in</h2>

      {errors.root && (
        <div className='mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm'>
          {errors.root.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            type='email'
            {...register('email')}
            placeholder='Enter your email'
            className={
              errors.email ? 'border-red-300 focus:border-red-500' : ''
            }
            disabled={status === 'loading'}
          />
          {errors.email && (
            <p className='text-sm text-red-500'>{errors.email.message}</p>
          )}
        </div>

        <div className='space-y-2'>
          <Label htmlFor='password'>Password</Label>
          <Input
            id='password'
            type='password'
            {...register('password')}
            placeholder='Enter your password'
            className={
              errors.password ? 'border-red-300 focus:border-red-500' : ''
            }
            disabled={status === 'loading'}
          />
          {errors.password && (
            <p className='text-sm text-red-500'>{errors.password.message}</p>
          )}
        </div>

        <Button
          type='submit'
          className='w-full mt-6'
          disabled={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <Loader2 className='h-4 w-4 mr-2 animate-spin' />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <p className='mt-4 text-center text-sm text-gray-500'>
        Don&apos;t have an account?{' '}
        <a href='/signup' className='text-blue-600 hover:underline'>
          Sign up
        </a>
      </p>
    </div>
  );
}
