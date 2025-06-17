
import { RegistrationForm } from '@/components/auth/RegistrationForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  return (
    <div className="flex justify-center items-center py-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Register for QuizWhiz</CardTitle> {/* font-headline applied via CardTitle component */}
          <CardDescription>Enter your details to start taking quizzes and track your progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationForm />
        </CardContent>
      </Card>
    </div>
  );
}
