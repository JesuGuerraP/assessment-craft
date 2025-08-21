import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  PlusCircle, 
  BookOpen, 
  Users, 
  BarChart3, 
  Settings,
  LogOut,
  GraduationCap,
  Search,
  KeyRound
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function Dashboard() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-primary to-accent p-2 rounded-lg">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">EvaluaMejor</h1>
                <p className="text-sm text-muted-foreground">
                  Hola, {profile?.full_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1">
                {profile?.role === 'teacher' ? 'Docente' : 
                 profile?.role === 'admin' ? 'Administrador' : 'Estudiante'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {isTeacher ? (
          // Teacher Dashboard
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Panel de Docente</h2>
              <p className="text-muted-foreground">
                Gestiona tus exámenes y revisa los resultados de tus estudiantes
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Crear Examen</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Crea un nuevo examen con preguntas personalizadas
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-accent" />
                    <CardTitle className="text-lg">Mis Exámenes</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Ver y editar tus exámenes existentes
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-success" />
                    <CardTitle className="text-lg">Resultados</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Analizar rendimiento y estadísticas
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-warning" />
                    <CardTitle className="text-lg">Configuración</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Ajustes de cuenta y preferencias
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Exams */}
            <Card>
              <CardHeader>
                <CardTitle>Exámenes Recientes</CardTitle>
                <CardDescription>
                  Tus exámenes creados recientemente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aún no has creado ningún examen</p>
                  <Button className="mt-4">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Crear mi primer examen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          // Student Dashboard
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Panel de Estudiante</h2>
              <p className="text-muted-foreground">
                Únete a exámenes usando códigos de acceso
              </p>
            </div>

            {/* Join Exam Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Unirse a un Examen
                </CardTitle>
                <CardDescription>
                  Ingresa el código de acceso proporcionado por tu docente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Código de acceso (ej: ABC12345)"
                    className="flex-1"
                  />
                  <Button>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Active Exams */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Exámenes Disponibles
                  </CardTitle>
                  <CardDescription>
                    Exámenes que puedes presentar ahora
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay exámenes disponibles</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-success" />
                    Mis Resultados
                  </CardTitle>
                  <CardDescription>
                    Historial de exámenes presentados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aún no has presentado ningún examen</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}