import { formOptions } from '@tanstack/react-form';
import { signinFormSchema, signupFormSchema } from '@repo/validation';
import { z } from 'zod';

export type SignupFormValues = z.infer<typeof signupFormSchema>;
export type SigninFormValues = z.infer<typeof signinFormSchema>;

export const signupFormOpts = formOptions({
  defaultValues: {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  } as SignupFormValues,
});

export const signinFormOpts = formOptions({
  defaultValues: {
    email: '',
    password: '',
  } as SigninFormValues,
});
