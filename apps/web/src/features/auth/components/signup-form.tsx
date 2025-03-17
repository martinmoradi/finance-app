'use client';

import { Button } from '@/components/ui/button';
import { Input, InputGroup, InputRightIcon } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Caption, CaptionStrong } from '@/components/ui/typography';
import { checkUserExists } from '@/features/auth/actions/checkUserExists';
import { signupFormOpts } from '@/features/auth/config/form-options';
import { useAuth } from '@/features/auth/store/useAuth';
import { useRouter } from '@/i18n/navigation';
import HidePasswordIcon from '@public/icon-hide-password.svg';
import ShowPasswordIcon from '@public/icon-show-password.svg';
import { signupFormSchema } from '@repo/validation';
import { useForm } from '@tanstack/react-form';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function SignupForm() {
  const router = useRouter();
  const t = useTranslations('auth');
  const { signup, status, clearErrors } = useAuth();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  useEffect(() => {
    return () => {
      clearErrors();
    };
  }, [clearErrors]);

  const form = useForm({
    ...signupFormOpts,

    validators: {
      onChange: signupFormSchema,
    },
    onSubmit: async ({ value }) => {
      clearErrors();

      const { name, email, password } = value;
      const response = await signup({
        name,
        email,
        password,
      });

      if (response.success) {
        toast.success(t('signup.successMessage'));
        router.push('/');
      } else {
        toast.error(t('errors.formErrors'));
      }
    },
  });

  return (
    <form
      aria-label={t('signup.formAriaLabel')}
      className='mb-8'
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}>
      <form.Field name='name'>
        {(field) => {
          const isError =
            field.state.meta.errors?.length > 0 && field.state.meta.isTouched;
          return (
            <div className='mb-4'>
              <Label htmlFor={field.name}>
                <CaptionStrong>{t('signup.name')}</CaptionStrong>
              </Label>
              <Input
                id={field.name}
                name={field.name}
                value={field.state.value}
                placeholder={t('signup.namePlaceholder')}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={isError}
                disabled={status === 'loading'}
                aria-invalid={isError}
                aria-describedby={isError ? 'name-error' : undefined}
              />
              <div className='h-2 pt-1 text-right'>
                {isError && (
                  <Caption id='name-error'>
                    <span className='text-red'>
                      {t(field.state.meta.errors[0]!.message)}
                    </span>
                  </Caption>
                )}
              </div>
            </div>
          );
        }}
      </form.Field>

      <form.Field
        name='email'
        validators={{
          onBlurAsync: async ({ value }) => {
            const fieldErrors = form.getFieldMeta('email')?.errors;
            if (!fieldErrors?.length) {
              const response = await checkUserExists(value);
              if (response.success && response.data === true) {
                return {
                  message: 'validation.email.alreadyExists',
                };
              } else {
                return undefined;
              }
            }
          },
        }}>
        {(field) => {
          const isError =
            field.state.meta.errors?.length > 0 && field.state.meta.isTouched;
          return (
            <div className='mb-4'>
              <Label htmlFor={field.name}>
                <CaptionStrong>{t('shared.email')}</CaptionStrong>
              </Label>
              <Input
                id={field.name}
                name={field.name}
                type='email'
                value={field.state.value}
                placeholder={t('shared.emailPlaceholder')}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                error={isError}
                disabled={status === 'loading'}
                aria-invalid={isError}
                aria-describedby={isError ? 'email-error' : undefined}
              />
              <div className='h-2 pt-1 text-right'>
                {isError && (
                  <Caption id='email-error'>
                    <span className='text-red'>
                      {t(field.state.meta.errors[0]!.message)}
                    </span>
                  </Caption>
                )}
              </div>
            </div>
          );
        }}
      </form.Field>

      <form.Field name='password'>
        {(field) => {
          const isError =
            field.state.meta.errors?.length > 0 && field.state.meta.isTouched;
          return (
            <div className='mb-4'>
              <Label htmlFor={field.name}>
                <CaptionStrong>{t('shared.password')}</CaptionStrong>
              </Label>
              <InputGroup>
                <Input
                  id={field.name}
                  name={field.name}
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={field.state.value}
                  placeholder={t('signup.passwordPlaceholder')}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={isError}
                  disabled={status === 'loading'}
                  aria-invalid={isError}
                  aria-describedby={isError ? 'password-error' : undefined}
                />
                <InputRightIcon
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  aria-label={
                    isPasswordVisible
                      ? t('shared.hidePassword')
                      : t('shared.showPassword')
                  }
                  className='cursor-pointer'>
                  {isPasswordVisible ? (
                    <HidePasswordIcon />
                  ) : (
                    <ShowPasswordIcon />
                  )}
                </InputRightIcon>
              </InputGroup>
              <div className='h-2 pt-1 text-right'>
                {isError ? (
                  <Caption id='password-error'>
                    <span className='text-red'>
                      {t(field.state.meta.errors[0]!.message)}
                    </span>
                  </Caption>
                ) : (
                  <Caption id='password-requirements'>
                    <span className='text-muted-foreground'>
                      {t('signup.passwordRequirements')}
                    </span>
                  </Caption>
                )}
              </div>
            </div>
          );
        }}
      </form.Field>

      <form.Field name='confirmPassword'>
        {(field) => {
          const isError =
            field.state.meta.errors?.length > 0 && field.state.meta.isTouched;
          return (
            <div className='mb-8'>
              <Label htmlFor={field.name}>
                <CaptionStrong>{t('signup.confirmPassword')}</CaptionStrong>
              </Label>
              <InputGroup>
                <Input
                  id={field.name}
                  name={field.name}
                  type={isConfirmPasswordVisible ? 'text' : 'password'}
                  value={field.state.value}
                  placeholder={t('signup.confirmPasswordPlaceholder')}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  error={isError}
                  disabled={status === 'loading'}
                  aria-invalid={isError}
                  aria-describedby={
                    isError ? 'confirmPassword-error' : undefined
                  }
                />
                <InputRightIcon
                  onClick={() =>
                    setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
                  }
                  aria-label={
                    isConfirmPasswordVisible
                      ? t('shared.hidePassword')
                      : t('shared.showPassword')
                  }
                  className='cursor-pointer'>
                  {isConfirmPasswordVisible ? (
                    <HidePasswordIcon />
                  ) : (
                    <ShowPasswordIcon />
                  )}
                </InputRightIcon>
              </InputGroup>
              <div className='h-2 pt-1 text-right'>
                {isError && (
                  <Caption id='confirmPassword-error'>
                    <span className='text-red'>
                      {t(field.state.meta.errors[0]!.message)}
                    </span>
                  </Caption>
                )}
              </div>
            </div>
          );
        }}
      </form.Field>

      <form.Subscribe
        selector={(state) => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit, isSubmitting]) => (
          <Button
            type='submit'
            className='w-full'
            disabled={!canSubmit}
            aria-busy={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2
                  className='mr-2 h-4 w-4 animate-spin'
                  aria-hidden='true'
                />
                <span>{t('signup.loadingText')}</span>
                <span className='sr-only'>{t('signup.loadingAction')}</span>
              </>
            ) : (
              t('signup.submitButton')
            )}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
