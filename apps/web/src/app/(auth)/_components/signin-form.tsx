'use client';

import { signin } from '@/actions/auth/signin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';
import { signinSchema } from '@repo/validation';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

type SigninFormValues = z.infer<typeof signinSchema>;

export function SigninForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SigninFormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SigninFormValues) => {
    try {
      const result = await signin(data);

      if (!result.success) {
        // Set the error at the root level
        setError('root', {
          message: result.error?.message || 'An error occurred during signup',
        });
        return;
      }

      // Handle successful signup (e.g., redirect or show success message)
      window.location.href = '/'; // Or use Next.js router
    } catch (error) {
      console.error(error);
      setError('root', {
        message: 'An unexpected error occurred. Please try again.',
      });
    }
  };

  return (
    <div className='w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md'>
      <h2 className='text-2xl font-bold mb-6 text-center'>Create an account</h2>

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
            placeholder='Create a password'
            className={
              errors.password ? 'border-red-300 focus:border-red-500' : ''
            }
          />
          {errors.password && (
            <p className='text-sm text-red-500'>{errors.password.message}</p>
          )}
        </div>

        <Button type='submit' className='w-full mt-6' disabled={isSubmitting}>
          {isSubmitting ? (
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
