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

const staticNotifications: Notification[] = [
  {
    id: '1',
    title: 'Welcome to QuizWhiz!',
    message: 'We are excited to have you here. Explore quizzes and enhance your knowledge.',
    type: 'info',
    date: 'October 26, 2023',
    icon: Info,
  },
  {
    id: '2',
    title: 'New Quiz Feature: AI Explanations',
    message: 'Incorrect answers now come with AI-generated explanations to help you learn better.',
    type: 'update',
    date: 'October 28, 2023',
    icon: BellRing,
  },
  {
    id: '3',
    title: 'Scheduled Maintenance',
    message: 'QuizWhiz will undergo scheduled maintenance on Nov 5th, 2 AM - 4 AM UTC. Services might be temporarily unavailable.',
    type: 'warning',
    date: 'October 30, 2023',
    icon: AlertCircle,
  },
];

export default function NotificationsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-headline font-bold text-primary">Notifications</h1>
        <p className="text-lg text-muted-foreground mt-2">Stay informed with the latest updates and announcements.</p>
      </div>

      {staticNotifications.length > 0 ? (
        <div className="space-y-6 max-w-2xl mx-auto">
          {staticNotifications.map((notification) => (
            <Card key={notification.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardHeader className={`p-4 flex flex-row items-start space-x-4 ${
                notification.type === 'info' ? 'bg-blue-50 border-blue-200' :
                notification.type === 'update' ? 'bg-green-50 border-green-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <div className={`p-2 rounded-full ${
                  notification.type === 'info' ? 'bg-blue-100 text-blue-600' :
                  notification.type === 'update' ? 'bg-green-100 text-green-600' :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  <notification.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className={`text-lg font-semibold ${
                    notification.type === 'info' ? 'text-blue-800' :
                    notification.type === 'update' ? 'text-green-800' :
                    'text-yellow-800'
                  }`}>{notification.title}</CardTitle>
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
          <p className="text-xl text-muted-foreground">No new notifications.</p>
          <p className="text-sm text-muted-foreground">Check back later for updates.</p>
        </div>
      )}
    </div>
  );
}
