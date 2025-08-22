import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User,
  Calendar,
  Award,
  AlertTriangle
} from 'lucide-react';

interface Answer {
  id: string;
  answer_value: any;
  is_correct: boolean | null;
  points_earned: number | null;
  question: {
    id: string;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'open_answer' | 'matching';
    options: string[] | null;
    correct_answer: any;
    points: number;
  };
}

interface ExamResult {
  id: string;
  score: number | null;
  total_points: number | null;
  started_at: string;
  completed_at: string | null;
  attempt_number: number;
  exam: {
    id: string;
    title: string;
    description: string | null;
    show_results_immediately: boolean;
  };
  student: {
    id: string;
    full_name: string;
  };
  answers: Answer[];
}

export default function Results() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (attemptId) {
      loadResults();
    }
  }, [attemptId, user]);

  const loadResults = async () => {
    if (!attemptId || !user) return;

    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          exam:exams(
            id,
            title,
            description,
            show_results_immediately
          ),
          student:profiles!exam_attempts_student_id_fkey(
            id,
            full_name
          ),
          answers(
            id,
            answer_value,
            is_correct,
            points_earned,
            question:questions(
              id,
              question_text,
              question_type,
              options,
              correct_answer,
              points
            )
          )
        `)
        .eq('id', attemptId)
        .single();

      if (error) throw error;

      if (!data) {
        navigate('/dashboard');
        return;
      }

      // Check if user can view this result
      const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin';
      const isStudent = data.student_id === user.id;
      
      if (!isTeacher && !isStudent) {
        navigate('/dashboard');
        return;
      }

      // If student and results are not shown immediately, don't show
      if (isStudent && !data.exam.show_results_immediately && !data.completed_at) {
        navigate('/dashboard');
        return;
      }

      setResult(data);
    } catch (error) {
      console.error('Error loading results:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getScorePercentage = () => {
    if (!result || !result.score || !result.total_points) return 0;
    return Math.round((result.score / result.total_points) * 100);
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAnswerIcon = (answer: Answer) => {
    if (answer.is_correct === null) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return answer.is_correct ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />;
  };

  const formatAnswer = (answer: Answer) => {
    const { question, answer_value } = answer;
    
    if (question.question_type === 'multiple_choice' && question.options) {
      return question.options[answer_value] || 'Sin respuesta';
    }
    
    if (question.question_type === 'true_false') {
      return answer_value === true ? 'Verdadero' : answer_value === false ? 'Falso' : 'Sin respuesta';
    }
    
    return answer_value || 'Sin respuesta';
  };

  const formatCorrectAnswer = (question: any) => {
    if (question.question_type === 'multiple_choice' && question.options) {
      return question.options[question.correct_answer] || 'N/A';
    }
    
    if (question.question_type === 'true_false') {
      return question.correct_answer ? 'Verdadero' : 'Falso';
    }
    
    return question.correct_answer || 'Evaluación manual requerida';
  };

  const getExamDuration = () => {
    if (!result?.started_at || !result?.completed_at) return 'No completado';
    
    const start = new Date(result.started_at);
    const end = new Date(result.completed_at);
    const duration = Math.floor((end.getTime() - start.getTime()) / 60000);
    
    return `${duration} minutos`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Resultado no encontrado</h2>
          <p className="text-muted-foreground mb-4">El resultado del examen no existe o no tienes permisos para verlo</p>
          <Button onClick={() => navigate('/dashboard')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  const scorePercentage = getScorePercentage();
  const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate(isTeacher ? '/my-exams' : '/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Resultados del Examen</h1>
            <p className="text-muted-foreground">{result.exam.title}</p>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Resumen de Resultados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(scorePercentage)}`}>
                  {result.score || 0}/{result.total_points || 0}
                </div>
                <p className="text-sm text-muted-foreground">Puntuación</p>
                <div className={`text-lg font-semibold ${getScoreColor(scorePercentage)}`}>
                  {scorePercentage}%
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {result.answers.length}
                </div>
                <p className="text-sm text-muted-foreground">Preguntas</p>
                <div className="text-sm text-muted-foreground">
                  Intento #{result.attempt_number}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
                  <Clock className="h-5 w-5" />
                  {getExamDuration()}
                </div>
                <p className="text-sm text-muted-foreground">Duración</p>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
                  <User className="h-5 w-5" />
                </div>
                <p className="text-sm text-muted-foreground">{result.student.full_name}</p>
                <div className="text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  {new Date(result.completed_at || result.started_at).toLocaleDateString()}
                </div>
              </div>
            </div>

            {result.score !== null && result.total_points && (
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progreso general</span>
                  <span>{scorePercentage}%</span>
                </div>
                <Progress value={scorePercentage} className="h-3" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Results */}
        <Card>
          <CardHeader>
            <CardTitle>Respuestas Detalladas</CardTitle>
            <CardDescription>
              Revisa cada pregunta y su respuesta correspondiente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {result.answers.map((answer, index) => (
                <div key={answer.id}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {getAnswerIcon(answer)}
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-lg">
                          Pregunta {index + 1}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {answer.question.points} {answer.question.points === 1 ? 'punto' : 'puntos'}
                          </Badge>
                          {answer.points_earned !== null && (
                            <Badge variant={answer.is_correct ? "default" : "destructive"}>
                              {answer.points_earned} obtenidos
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-foreground">
                        {answer.question.question_text}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Tu respuesta:
                          </p>
                          <p className={`font-medium ${
                            answer.is_correct === null ? 'text-yellow-600' :
                            answer.is_correct ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatAnswer(answer)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Respuesta correcta:
                          </p>
                          <p className="font-medium text-green-600">
                            {formatCorrectAnswer(answer.question)}
                          </p>
                        </div>
                      </div>
                      
                      {answer.is_correct === null && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 text-yellow-800">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              Pendiente de evaluación manual
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {index < result.answers.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}