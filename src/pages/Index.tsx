import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Users, BookOpen, BarChart3, Shield } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-8">
              <div className="bg-gradient-to-r from-primary to-accent p-4 rounded-full">
                <GraduationCap className="h-12 w-12 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              EvaluaMejor
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              La plataforma profesional para crear y gestionar exámenes online de manera eficiente y segura
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="px-8 py-3" asChild>
                <a href="/auth">Comenzar Ahora</a>
              </Button>
              <Button size="lg" variant="outline" className="px-8 py-3">
                Ver Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Todo lo que necesitas para evaluar
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Herramientas completas para docentes y estudiantes, diseñadas para una experiencia de evaluación excepcional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Múltiples Tipos de Preguntas</CardTitle>
                </div>
                <CardDescription>
                  Selección múltiple, verdadero/falso, respuestas abiertas y preguntas de relacionar conceptos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-accent/10 p-2 rounded-lg">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle>Gestión de Usuarios</CardTitle>
                </div>
                <CardDescription>
                  Roles diferenciados para docentes y estudiantes con acceso controlado y seguro
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-success/10 p-2 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-success" />
                  </div>
                  <CardTitle>Análisis Detallado</CardTitle>
                </div>
                <CardDescription>
                  Estadísticas completas de rendimiento, calificaciones automáticas y reportes exportables
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-warning/10 p-2 rounded-lg">
                    <Shield className="h-6 w-6 text-warning" />
                  </div>
                  <CardTitle>Acceso Seguro</CardTitle>
                </div>
                <CardDescription>
                  Códigos únicos de acceso, límites de tiempo configurables y control de intentos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Interfaz Intuitiva</CardTitle>
                </div>
                <CardDescription>
                  Diseño responsive y amigable, optimizado para dispositivos móviles y escritorio
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-accent/10 p-2 rounded-lg">
                    <BookOpen className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle>Retroalimentación</CardTitle>
                </div>
                <CardDescription>
                  Opciones flexibles para mostrar resultados inmediatos o al finalizar el examen
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-accent">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            ¿Listo para transformar tus evaluaciones?
          </h2>
          <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Únete a miles de educadores que ya están utilizando EvaluaMejor para crear experiencias de evaluación excepcionales
          </p>
          <Button size="lg" variant="secondary" className="px-8 py-3" asChild>
            <a href="/auth">Crear Cuenta Gratuita</a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-card/50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            © 2024 EvaluaMejor. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
