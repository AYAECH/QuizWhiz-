
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
import { User as UserIcon } from 'lucide-react'; // Renamed to avoid conflict with User type

const formSchema = z.object({
  name: z.string().min(2, { message: 'Le nom doit comporter au moins 2 caractères.' }),
  email: z.string().email({ message: 'Veuillez entrer une adresse e-mail valide.' }),
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
      title: 'Inscription Réussie !',
      description: `Bienvenue, ${values.name} ! Vous pouvez maintenant commencer à répondre aux quiz.`,
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
              <FormLabel>Nom Complet</FormLabel>
              <FormControl>
                <Input placeholder="Ex : Jeanne Dupont" {...field} aria-describedby="name-error" />
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
              <FormLabel>Adresse E-mail</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Ex : jeanne.dupont@example.com" {...field} aria-describedby="email-error" />
              </FormControl>
              <FormMessage id="email-error" />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          <UserIcon className="mr-2 h-4 w-4" /> S'inscrire
        </Button>
      </form>
    </Form>
  );
}
