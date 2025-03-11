import {
  getUserFriendlyErrorMessage,
  mapApiErrorsToFormErrors,
} from '@/lib/errors';
import { ApiError, ErrorCode } from '@repo/types';
import { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';

export function handleAuthFormError<T extends FieldValues>(
  result: ApiError,
  setError: UseFormSetError<T>,
  formType: 'signin' | 'signup',
) {
  switch (result.error.code) {
    case ErrorCode.VALIDATION_ERROR:
      if (result.error.validationErrors) {
        mapApiErrorsToFormErrors(setError, result.error);
        toast.error('Please correct the errors in the form');
      }
      break;

    case ErrorCode.CONFLICT:
      if (formType === 'signup') {
        setError('email' as Path<T>, {
          type: 'server',
          message: 'An account with this email already exists',
        });
        toast.error('An account with this email already exists');
      } else {
        // Handle conflict differently for signin if needed
        setError('root' as Path<T>, {
          type: 'server',
          message: getUserFriendlyErrorMessage(result.error),
        });
        toast.error(getUserFriendlyErrorMessage(result.error));
      }
      break;

    case ErrorCode.AUTHENTICATION_ERROR:
      if (formType === 'signin') {
        // Set errors on both email and password fields
        setError('email' as Path<T>, {
          type: 'server',
        });
        setError('password' as Path<T>, {
          type: 'server',
        });
        toast.error('Invalid email or password');
      } else {
        // Authentication errors during signup would be rare but possible
        setError('root' as Path<T>, {
          type: 'server',
          message: getUserFriendlyErrorMessage(result.error),
        });
        toast.error(getUserFriendlyErrorMessage(result.error));
      }
      break;

    default:
      setError('root' as Path<T>, {
        type: 'server',
        message: getUserFriendlyErrorMessage(result.error),
      });
      toast.error(getUserFriendlyErrorMessage(result.error));
      break;
  }
}
