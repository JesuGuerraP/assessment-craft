import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  Search, 
  PlusCircle, 
  BookOpen, 
  Users, 
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Exam {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'inactive' | 'completed';
  access_code: string;
  created_at: string;
  updated_at: string;
  time_limit: number | null;
  max_attempts: number;
  show_results_immediately: boolean;
  _count?: {
    questions: number;
    attempts: number;
  };
}

export default function MyExams() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchExams();
  }, [user]);

  const fetchExams = async () => {
    if (!user) return;

    try {
      // Get exams with question count
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select(`
          *,
          questions(count)
        `)
        .eq('creator_id', user.id)
        .order('updated_at', { ascending: false });

      if (examsError) throw examsError;

      // Get attempt counts for each exam
      const examIds = examsData?.map(exam => exam.id) || [];
      if (examIds.length > 0) {
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('exam_attempts')
          .select('exam_id')
          .in('exam_id', examIds);

        if (attemptsError) throw attemptsError;

        // Count attempts per exam
        const attemptCounts = attemptsData?.reduce((acc, attempt) => {
          acc[attempt.exam_id] = (acc[attempt.exam_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        // Combine data
        const examsWithCounts = examsData?.map(exam => ({
          ...exam,
          _count: {
            questions: exam.questions?.length || 0,
            attempts: attemptCounts[exam.id] || 0,
          }
        })) || [];

        setExams(examsWithCounts);
      } else {
        setExams([]);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los exámenes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'active': return 'default';
      case 'closed': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'completed': return 'Completado';
      default: return status;
    }
  };

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Código copiado",
      description: "El código de acceso ha sido copiado al portapapeles",
    });
  };

  const changeExamStatus = async (examId: string, newStatus: 'draft' | 'active' | 'inactive' | 'completed') => {
    try {
      const { error } = await supabase
        .from('exams')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', examId);

      if (error) throw error;

      setExams(exams.map(exam => 
        exam.id === examId ? { ...exam, status: newStatus } : exam
      ));

      toast({
        title: "Estado actualizado",
        description: `El examen ahora está ${getStatusText(newStatus).toLowerCase()}`,
      });
    } catch (error) {
      console.error('Error updating exam status:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del examen",
        variant: "destructive",
      });
    }
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;

    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examToDelete);

      if (error) throw error;

      setExams(exams.filter(exam => exam.id !== examToDelete));
      toast({
        title: "Examen eliminado",
        description: "El examen ha sido eliminado correctamente",
      });
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast({
        title: "Error", 
        description: "No se pudo eliminar el examen",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setExamToDelete(null);
    }
  };

  const filteredExams = exams.filter(exam =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Mis Exámenes</h1>
            <p className="text-muted-foreground">Gestiona tus exámenes creados</p>
          </div>
          <Button onClick={() => navigate('/create-exam')}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Crear Examen
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar exámenes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Exams Grid */}
        {filteredExams.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'No se encontraron exámenes' : 'No tienes exámenes creados'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Intenta con otro término de búsqueda' : 'Crea tu primer examen para comenzar'}
              </p>
              {!searchTerm && (
                <Button onClick={() => navigate('/create-exam')}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Crear mi primer examen
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-2 mb-2">{exam.title}</CardTitle>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getStatusColor(exam.status)}>
                          {getStatusText(exam.status)}
                        </Badge>
                        {exam.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyAccessCode(exam.access_code)}
                            className="text-xs px-2 py-1 h-auto"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            {exam.access_code}
                          </Button>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/edit-exam/${exam.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/exam-results/${exam.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver resultados
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {exam.status === 'draft' && (
                          <DropdownMenuItem onClick={() => changeExamStatus(exam.id, 'active')}>
                            Activar examen
                          </DropdownMenuItem>
                        )}
                        {exam.status === 'active' && (
                          <DropdownMenuItem onClick={() => changeExamStatus(exam.id, 'inactive')}>
                            Desactivar examen
                          </DropdownMenuItem>
                        )}
                        {exam.status === 'inactive' && (
                          <DropdownMenuItem onClick={() => changeExamStatus(exam.id, 'active')}>
                            Reactivar examen
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            setExamToDelete(exam.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {exam.description && (
                    <CardDescription className="line-clamp-3">
                      {exam.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{exam._count?.questions || 0} preguntas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{exam._count?.attempts || 0} intentos</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(exam.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar examen?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. El examen y todos sus datos asociados serán eliminados permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteExam}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}