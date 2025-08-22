import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'open_answer' | 'matching';
  options: string[] | null;
  points: number;
  order_index: number;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  time_limit: number | null;
  max_attempts: number;
  show_results_immediately: boolean;
  questions: Question[];
}

interface Answer {
  question_id: string;
  answer_value: any;
}

export default function TakeExam() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  useEffect(() => {
    if (examId) {
      loadExam();
    }
  }, [examId, user]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timeLeft !== null && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleSubmitExam();
    }
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const loadExam = async () => {
    if (!examId || !user) return;

    try {
      // Check if user already has attempts for this exam
      const { data: attempts, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .order('attempt_number', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Load exam details
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select(`
          *,
          questions(*)
        `)
        .eq('id', examId)
        .eq('status', 'active')
        .single();

      if (examError) throw examError;

      if (!examData) {
        toast({
          title: "Examen no encontrado",
          description: "El examen no existe o no está disponible",
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      // Check if user can take the exam
      if (attempts && attempts.length >= examData.max_attempts && examData.max_attempts !== 999) {
        toast({
          title: "Límite de intentos alcanzado",
          description: `Ya has utilizado todos tus intentos (${examData.max_attempts}) para este examen`,
          variant: "destructive",
        });
        navigate('/dashboard');
        return;
      }

      // Check if user has an incomplete attempt
      const incompleteAttempt = attempts?.find(attempt => !attempt.completed_at);
      if (incompleteAttempt) {
        setAttemptId(incompleteAttempt.id);
        // Load existing answers
        const { data: existingAnswers } = await supabase
          .from('answers')
          .select('*')
          .eq('attempt_id', incompleteAttempt.id);

        if (existingAnswers) {
          const answersMap = existingAnswers.reduce((acc, answer) => {
            acc[answer.question_id] = answer.answer_value;
            return acc;
          }, {} as Record<string, any>);
          setAnswers(answersMap);
        }

        // Calculate remaining time
        if (examData.time_limit) {
          const startTime = new Date(incompleteAttempt.started_at).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          const remaining = examData.time_limit * 60 - elapsed;
          setTimeLeft(Math.max(0, remaining));
        }
      } else {
        // Create new attempt
        const attemptNumber = (attempts?.length || 0) + 1;
        const { data: newAttempt, error: attemptError } = await supabase
          .from('exam_attempts')
          .insert({
            exam_id: examId,
            student_id: user.id,
            attempt_number: attemptNumber,
          })
          .select()
          .single();

        if (attemptError) throw attemptError;
        setAttemptId(newAttempt.id);

        // Set time limit
        if (examData.time_limit) {
          setTimeLeft(examData.time_limit * 60);
        }
      }

      // Sort questions by order
      examData.questions.sort((a: Question, b: Question) => a.order_index - b.order_index);
      setExam(examData);

    } catch (error) {
      console.error('Error loading exam:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar el examen",
        variant: "destructive",
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = async (questionId: string, answerValue: any) => {
    if (!attemptId) return;

    try {
      const { error } = await supabase
        .from('answers')
        .upsert({
          attempt_id: attemptId,
          question_id: questionId,
          answer_value: answerValue,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    saveAnswer(questionId, value);
  };

  const handleSubmitExam = async () => {
    if (!attemptId || !exam) return;

    setSubmitting(true);

    try {
      // Calculate score
      let totalScore = 0;
      let totalPoints = 0;
      
      for (const question of exam.questions) {
        totalPoints += question.points;
        const userAnswer = answers[question.id];
        
        if (question.question_type === 'multiple_choice') {
          // Get correct answer from database
          const { data: questionData } = await supabase
            .from('questions')
            .select('correct_answer')
            .eq('id', question.id)
            .single();
            
          if (questionData && userAnswer === questionData.correct_answer) {
            totalScore += question.points;
            
            // Update answer as correct
            await supabase
              .from('answers')
              .update({ 
                is_correct: true,
                points_earned: question.points 
              })
              .eq('attempt_id', attemptId)
              .eq('question_id', question.id);
          } else {
            await supabase
              .from('answers')
              .update({ 
                is_correct: false,
                points_earned: 0 
              })
              .eq('attempt_id', attemptId)
              .eq('question_id', question.id);
          }
        } else if (question.question_type === 'true_false') {
          const { data: questionData } = await supabase
            .from('questions')
            .select('correct_answer')
            .eq('id', question.id)
            .single();
            
          if (questionData && userAnswer === questionData.correct_answer) {
            totalScore += question.points;
            
            await supabase
              .from('answers')
              .update({ 
                is_correct: true,
                points_earned: question.points 
              })
              .eq('attempt_id', attemptId)
              .eq('question_id', question.id);
          } else {
            await supabase
              .from('answers')
              .update({ 
                is_correct: false,
                points_earned: 0 
              })
              .eq('attempt_id', attemptId)
              .eq('question_id', question.id);
          }
        } else {
          // Open ended questions need manual grading
          await supabase
            .from('answers')
            .update({ 
              is_correct: null,
              points_earned: null 
            })
            .eq('attempt_id', attemptId)
            .eq('question_id', question.id);
        }
      }

      // Complete the attempt
      const { error } = await supabase
        .from('exam_attempts')
        .update({
          completed_at: new Date().toISOString(),
          score: totalScore,
          total_points: totalPoints,
        })
        .eq('id', attemptId);

      if (error) throw error;

      toast({
        title: "¡Examen enviado!",
        description: "Tu examen ha sido enviado correctamente",
      });

      // Navigate to results if immediate results are enabled
      if (exam.show_results_immediately) {
        navigate(`/exam-result/${attemptId}`);
      } else {
        navigate('/dashboard');
      }

    } catch (error) {
      console.error('Error submitting exam:', error);
      toast({
        title: "Error",
        description: "Hubo un error al enviar el examen. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
      setSubmitDialogOpen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (!exam) return 0;
    const answered = Object.keys(answers).length;
    return (answered / exam.questions.length) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Examen no encontrado</h2>
          <p className="text-muted-foreground mb-4">El examen no existe o no está disponible</p>
          <Button onClick={() => navigate('/dashboard')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === exam.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Salir
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{exam.title}</h1>
              {exam.description && (
                <p className="text-muted-foreground">{exam.description}</p>
              )}
            </div>
          </div>
          {timeLeft !== null && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <Badge variant={timeLeft < 300 ? "destructive" : "secondary"}>
                {formatTime(timeLeft)}
              </Badge>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Pregunta {currentQuestionIndex + 1} de {exam.questions.length}</span>
            <span>{Math.round(getProgress())}% completado</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        {/* Question */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">
                {currentQuestion.question_text}
              </CardTitle>
              <Badge variant="outline">
                {currentQuestion.points} {currentQuestion.points === 1 ? 'punto' : 'puntos'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
              <RadioGroup
                value={answers[currentQuestion.id]?.toString() || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, parseInt(value))}
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion.question_type === 'true_false' && (
              <RadioGroup
                value={answers[currentQuestion.id]?.toString() || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value === 'true')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="true" />
                  <Label htmlFor="true" className="cursor-pointer">Verdadero</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="false" />
                  <Label htmlFor="false" className="cursor-pointer">Falso</Label>
                </div>
              </RadioGroup>
            )}

            {currentQuestion.question_type === 'open_answer' && (
              <Textarea
                placeholder="Escribe tu respuesta aquí..."
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                rows={4}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
            disabled={isFirstQuestion}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <span className="text-sm text-muted-foreground">
            {Object.keys(answers).length} de {exam.questions.length} respondidas
          </span>

          {isLastQuestion ? (
            <Button
              onClick={() => setSubmitDialogOpen(true)}
              className="bg-gradient-to-r from-primary to-accent"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Enviar Examen
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
            >
              Siguiente
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Submit Confirmation Dialog */}
        <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Enviar examen?</AlertDialogTitle>
              <AlertDialogDescription>
                Has respondido {Object.keys(answers).length} de {exam.questions.length} preguntas.
                Una vez enviado, no podrás realizar cambios. ¿Estás seguro de que quieres enviar el examen?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Revisar respuestas</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSubmitExam}
                disabled={submitting}
                className="bg-gradient-to-r from-primary to-accent"
              >
                {submitting ? 'Enviando...' : 'Enviar examen'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}