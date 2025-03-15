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
import HidePasswordIcon from '@public/icon-hide-password.svg';
import ShowPasswordIcon from '@public/icon-show-password.svg';
import { signinSchema } from '@repo/validation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type SigninFormValues = z.infer<typeof signinSchema>;

export function SigninForm() {
  const router = useRouter();
  const { signin, status, clearErrors } = useAuth();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
    <div className='max-w-[56rem] w-full rounded-xl bg-white px-8 py-8'>
      <div className='mb-8'>
        <Display>Login</Display>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        aria-label='Login form'
        className='mb-8'>
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
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          <div className='h-2 pt-1 text-right'>
            {errors.email && (
              <Caption id='email-error'>
                <span className='text-red'>{errors.email.message}</span>
              </Caption>
            )}
          </div>
        </div>

        <div className='mb-6'>
          <Label htmlFor='password' className='block pb-1'>
            <CaptionStrong>Password</CaptionStrong>
          </Label>
          <InputGroup>
            <Input
              id='password'
              type={isPasswordVisible ? 'text' : 'password'}
              {...register('password')}
              placeholder='Enter your password'
              error={!!errors.password}
              disabled={status === 'loading'}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <InputRightIcon
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
              className='cursor-pointer'>
              {isPasswordVisible ? <HidePasswordIcon /> : <ShowPasswordIcon />}
            </InputRightIcon>
          </InputGroup>

          <div className='h-2 pt-1 text-right'>
            {errors.password && (
              <Caption id='password-error'>
                <span className='text-red'>{errors.password.message}</span>
              </Caption>
            )}
          </div>
        </div>

        <Button
          type='submit'
          className='w-full'
          disabled={status === 'loading'}
          aria-busy={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <Loader2
                className='mr-2 h-4 w-4 animate-spin'
                aria-hidden='true'
              />
              <span>Logging in...</span>
              <span className='sr-only'>Please wait while we log you in</span>
            </>
          ) : (
            'Login'
          )}
        </Button>
      </form>

      <div className='flex flex-row flex-wrap items-baseline justify-center gap-4'>
        <Body className='text-base text-muted-foreground'>
          Need to create an account?
        </Body>
        <Link href='/signup' prefetch={true}>
          <BodyStrong>
            <span className='text-base underline underline-offset-4 hover:text-muted-foreground'>
              Sign up
            </span>
          </BodyStrong>
        </Link>
      </div>
    </div>
  );
}
