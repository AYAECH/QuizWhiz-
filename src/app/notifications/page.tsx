
import { BellRing, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'update';
  date: string;
  icon: React.ElementType;
}

// Ces notifications sont statiques et seront affichées telles quelles.
// Pour une application entièrement en français, elles devraient être gérées dynamiquement ou adaptées.
const staticNotifications: Notification[] = [
  {
    id: '1',
    title: 'Bienvenue sur QuizWhiz !',
    message: 'Nous sommes ravis de vous accueillir. Explorez les quiz et améliorez vos connaissances.',
    type: 'info',
    date: '26 Octobre 2023', // Exemple de date, à adapter
    icon: Info,
  },
  {
    id: '2',
    title: 'Nouvelle Fonctionnalité : Explications par IA',
    message: 'Les réponses incorrectes sont maintenant accompagnées d\'explications générées par IA pour vous aider à mieux apprendre.',
    type: 'update',
    date: '28 Octobre 2023',
    icon: BellRing,
  },
  {
    id: '3',
    title: 'Maintenance Programmée',
    message: 'QuizWhiz sera en maintenance programmée le 5 Nov, de 2h à 4h UTC. Les services pourraient être temporairement indisponibles.',
    type: 'warning',
    date: '30 Octobre 2023',
    icon: AlertCircle,
  },
];

export default function NotificationsPage() {
  const getNotificationCardHeaderClasses = (type: Notification['type']) => {
    switch (type) {
      case 'info':
        return 'bg-primary/5 border-primary/20';
      case 'update':
        return 'bg-accent/5 border-accent/20';
      case 'warning':
        return 'bg-destructive/5 border-destructive/20';
      default:
        return 'bg-card';
    }
  };

  const getNotificationIconContainerClasses = (type: Notification['type']) => {
    switch (type) {
      case 'info':
        return 'bg-primary/10 text-primary';
      case 'update':
        return 'bg-accent/10 text-accent-foreground';
      case 'warning':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getNotificationTitleClasses = (type: Notification['type']) => {
    switch (type) {
      case 'info':
        return 'text-primary';
      case 'update':
        return 'text-accent-foreground';
      case 'warning':
        return 'text-destructive';
      default:
        return 'text-card-foreground';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-headline font-bold text-primary">Notifications</h1>
        <p className="text-lg text-muted-foreground mt-2">Restez informé des dernières mises à jour et annonces.</p>
      </div>

      {staticNotifications.length > 0 ? (
        <div className="space-y-6 max-w-2xl mx-auto">
          {staticNotifications.map((notification) => (
            <Card key={notification.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardHeader className={`p-4 flex flex-row items-start space-x-4 ${getNotificationCardHeaderClasses(notification.type)}`}>
                <div className={`p-2 rounded-full ${getNotificationIconContainerClasses(notification.type)}`}>
                  <notification.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className={`text-lg font-semibold ${getNotificationTitleClasses(notification.type)}`}>{notification.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">{notification.date}</p>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-foreground">{notification.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <BellRing className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
          <p className="text-xl text-muted-foreground">Aucune nouvelle notification.</p>
          <p className="text-sm text-muted-foreground">Revenez plus tard pour les mises à jour.</p>
        </div>
      )}
    </div>
  );
}
