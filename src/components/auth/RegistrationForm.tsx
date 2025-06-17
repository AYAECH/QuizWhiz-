'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { User } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type RegistrationFormValues = z.infer<typeof formSchema>;

export function RegistrationForm() {
  const { loginUser } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  function onSubmit(values: RegistrationFormValues) {
    loginUser(values);
    toast({
      title: 'Registration Successful!',
      description: `Welcome, ${values.name}! You can now start taking quizzes.`,
    });
    router.push('/');
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Jane Doe" {...field} aria-describedby="name-error" />
              </FormControl>
              <FormMessage id="name-error" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="e.g. jane.doe@example.com" {...field} aria-describedby="email-error" />
              </FormControl>
              <FormMessage id="email-error" />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          <User className="mr-2 h-4 w-4" /> Register
        </Button>
      </form>
    </Form>
  );
}
