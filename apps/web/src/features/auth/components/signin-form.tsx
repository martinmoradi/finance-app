'use client';

import { Button } from '@/components/ui/button';
import { PasswordField } from '@/features/auth/components/password-input-field';
import { TextInputField } from '@/features/auth/components/text-input-field';
import { useAuth } from '@/features/auth/store/useAuth';
import { useRouter } from '@/i18n/navigation';
import { signinFormSchema } from '@repo/validation';
import { useForm } from '@tanstack/react-form';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function SigninForm() {
  const router = useRouter();
  const t = useTranslations('auth');
  const { signin, status, clearErrors } = useAuth();

  useEffect(() => {
    return () => {
      clearErrors();
    };
  }, [clearErrors]);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onChange: signinFormSchema,
    },
    onSubmit: async ({ value }) => {
      clearErrors();

      const response = await signin(value);

      if (response.success) {
        toast.success(t('signin.successMessage'));
        router.push('/');
      } else {
        toast.error(t('errors.formErrors'));
      }
    },
  });

  return (
    <form
      aria-label={t('signin.formAriaLabel')}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}>
      <form.Field name='email'>
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
            placeholder={t('signin.passwordPlaceholder')}
            required
            disabled={status === 'loading'}
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
                <span>{t('signin.loadingText')}</span>
                <span className='sr-only'>{t('signin.loadingAction')}</span>
              </>
            ) : (
              t('signin.submitButton')
            )}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
