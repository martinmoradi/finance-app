'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/features/auth/store/useAuth';
import { handleAuthFormError } from '@/features/auth/utils/auth-form-error-handler';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema } from '@repo/validation';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type SignupFormValues = z.infer<typeof createUserSchema>;

export function SignupForm() {
  const router = useRouter();
  const { signup, status, clearErrors } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
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

  const onSubmit = async (data: SignupFormValues) => {
    // Clear any previous errors
    clearErrors();

    const result = await signup(data);

    if (!result.success) {
      handleAuthFormError(result, setError, 'signup');
    } else {
      toast.success('Account created successfully');
      router.push('/');
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
          <Label htmlFor='name'>Name</Label>
          <Input
            id='name'
            {...register('name')}
            placeholder='Enter your name'
            className={errors.name ? 'border-red-300 focus:border-red-500' : ''}
            disabled={status === 'loading'}
          />
          {errors.name && (
            <p className='text-sm text-red-500'>{errors.name.message}</p>
          )}
        </div>

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
            placeholder='Create a password'
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
              Creating account...
            </>
          ) : (
            'Sign up'
          )}
        </Button>
      </form>

      <p className='mt-4 text-center text-sm text-gray-500'>
        Already have an account?{' '}
        <a href='/signin' className='text-blue-600 hover:underline'>
          Sign in
        </a>
      </p>
    </div>
  );
}
