'use client';

import { Button } from '@/components/ui/button';
import { checkUserExists } from '@/features/auth/actions/check-user-exists';
import { PasswordField } from '@/features/auth/components/password-input-field';
import { TextInputField } from '@/features/auth/components/text-input-field';
import { useAuth } from '@/features/auth/store/useAuth';
import { useRouter } from '@/i18n/navigation';
import { signupFormSchema } from '@repo/validation';
import { useForm } from '@tanstack/react-form';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function SignupForm() {
  const router = useRouter();
  const t = useTranslations('auth');
  const { signup, status, clearErrors } = useAuth();

  useEffect(() => {
    return () => {
      clearErrors();
    };
  }, [clearErrors]);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onChange: signupFormSchema,
    },
    onSubmit: async ({ value }) => {
      clearErrors();

      const { email, password } = value;
      const response = await signup({
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
        {(field) => (
          <TextInputField
            field={field}
            label={t('shared.email')}
            placeholder={t('shared.emailPlaceholder')}
            type='email'
            required
            disabled={status === 'loading'}
            autoComplete='email'
          />
        )}
      </form.Field>

      <form.Field name='password'>
        {(field) => (
          <PasswordField
            field={field}
            label={t('shared.password')}
            placeholder={t('signup.passwordPlaceholder')}
            required
            disabled={status === 'loading'}
            showRequirements={true}
            helpText={t('signup.passwordRequirements')}
            autoComplete='new-password'
          />
        )}
      </form.Field>

      <form.Field name='confirmPassword'>
        {(field) => (
          <PasswordField
            field={field}
            label={t('signup.confirmPassword')}
            placeholder={t('signup.confirmPasswordPlaceholder')}
            required
            disabled={status === 'loading'}
            autoComplete='new-password'
          />
        )}
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
