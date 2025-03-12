'use client';

import { Button } from '@/components/ui/button';
import { Input, InputGroup, InputRightIcon } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Body,
  BodyStrong,
  Caption,
  CaptionStrong,
  Display,
} from '@/components/ui/typography';
import { useAuth } from '@/features/auth/store/useAuth';
import { handleAuthFormError } from '@/features/auth/utils/auth-form-error-handler';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserSchema } from '@repo/validation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import HidePasswordIcon from '@public/icon-hide-password.svg';
import ShowPasswordIcon from '@public/icon-show-password.svg';

type SignupFormValues = z.infer<typeof createUserSchema>;

export function SignupForm() {
  const router = useRouter();
  const { signup, status, clearErrors } = useAuth();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
    <div className='max-w-[56rem] w-full rounded-xl bg-white px-8 py-8 space-y-8'>
      <Display>Sign Up</Display>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className='mb-4'>
          <Label htmlFor='name' className='block pb-1'>
            <CaptionStrong>Name</CaptionStrong>
          </Label>
          <Input
            id='name'
            {...register('name')}
            placeholder='Enter your name'
            error={!!errors.name}
            disabled={status === 'loading'}
          />
          <div className='h-2 pt-1 text-right'>
            {errors.name && (
              <Caption>
                <span className='text-red'>{errors.name.message}</span>
              </Caption>
            )}
          </div>
        </div>

        <div className='mb-4'>
          <Label htmlFor='email' className='block pb-1'>
            <CaptionStrong>Email</CaptionStrong>
          </Label>
          <Input
            id='email'
            type='email'
            {...register('email')}
            placeholder='Enter your email address'
            error={!!errors.email}
            disabled={status === 'loading'}
          />
          <div className='h-2 pt-1 text-right'>
            {errors.email && (
              <Caption>
                <span className='text-red'>{errors.email.message}</span>
              </Caption>
            )}
          </div>
        </div>

        <Label htmlFor='password' className='block pb-1'>
          <CaptionStrong>Password</CaptionStrong>
        </Label>
        <InputGroup>
          <Input
            id='password'
            type={isPasswordVisible ? 'text' : 'password'}
            {...register('password')}
            placeholder='Create a password'
            error={!!errors.password}
            disabled={status === 'loading'}
          />
          <InputRightIcon
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            className='cursor-pointer'>
            {isPasswordVisible ? <HidePasswordIcon /> : <ShowPasswordIcon />}
          </InputRightIcon>
        </InputGroup>
        <div className='h-2 pt-1 text-right mb-8'>
          {errors.password ? (
            <Caption>
              <span className='text-red'>{errors.password.message}</span>
            </Caption>
          ) : (
            <Caption>
              <span className='text-muted-foreground'>
                Password must be at least 8 characters
              </span>
            </Caption>
          )}
        </div>

        <Button
          type='submit'
          className='w-full'
          disabled={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>

      <div className='flex flex-row items-baseline justify-center gap-4'>
        <Body className='text-base text-muted-foreground'>
          Already have an account?
        </Body>
        <Link href='/login'>
          <BodyStrong>
            <span className='text-base underline underline-offset-4 hover:text-muted-foreground'>
              Login
            </span>
          </BodyStrong>
        </Link>
      </div>
    </div>
  );
}
