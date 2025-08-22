import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, ArrowLeft, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QuestionForm } from '@/components/QuestionForm';

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'open_answer';
  options?: string[];
  correct_answer: any;
  points: number;
  image_url?: string;
}

export default function CreateExam() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    time_limit: '',
    max_attempts: 1,
    show_results_immediately: false,
  });
  
  const [questions, setQuestions] = useState<Question[]>([]);

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: 0,
      points: 1,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updatedQuestion: Partial<Question>) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, ...updatedQuestion } : q
    ));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'active' = 'draft') => {
    e.preventDefault();
    
    if (!user || !profile) return;
    
    if (!examData.title.trim()) {
      toast({
        title: "Error",
        description: "El título del examen es requerido",
        variant: "destructive",
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: "Error", 
        description: "Debe agregar al menos una pregunta",
        variant: "destructive",
      });
      return;
    }

    // Validate questions
    const invalidQuestions = questions.filter(q => 
      !q.question_text.trim() || 
      (q.question_type === 'multiple_choice' && (!q.options || q.options.some(opt => !opt.trim())))
    );

    if (invalidQuestions.length > 0) {
      toast({
        title: "Error",
        description: "Todas las preguntas deben tener texto y opciones válidas",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Generate access code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_access_code');
      
      if (codeError) throw codeError;

      // Create exam
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert({
          title: examData.title,
          description: examData.description || null,
          time_limit: examData.time_limit ? parseInt(examData.time_limit) : null,
          max_attempts: examData.max_attempts,
          show_results_immediately: examData.show_results_immediately,
          creator_id: user.id,
          access_code: codeData,
          status,
        })
        .select()
        .single();

      if (examError) throw examError;

      // Create questions
      const questionsToInsert = questions.map((q, index) => ({
        exam_id: exam.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.question_type === 'multiple_choice' ? q.options : null,
        correct_answer: q.correct_answer,
        points: q.points,
        order_index: index,
        image_url: q.image_url || null,
      }));

      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (questionsError) throw questionsError;

      toast({
        title: "¡Examen creado!",
        description: `El examen "${examData.title}" ha sido ${status === 'active' ? 'publicado' : 'guardado como borrador'} correctamente`,
      });

      navigate('/my-exams');
    } catch (error: any) {
      console.error('Error creating exam:', error);
      toast({
        title: "Error",
        description: "Hubo un error al crear el examen. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Crear Examen</h1>
            <p className="text-muted-foreground">Configura tu examen y agrega preguntas</p>
          </div>
        </div>

        <form onSubmit={(e) => handleSubmit(e, 'draft')} className="space-y-8">
          {/* Exam Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Examen</CardTitle>
              <CardDescription>Información básica del examen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    placeholder="Ej: Examen de Matemáticas - Capítulo 1"
                    value={examData.title}
                    onChange={(e) => setExamData({...examData, title: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time_limit">Tiempo límite (minutos)</Label>
                  <Input
                    id="time_limit"
                    type="number"
                    placeholder="Ej: 60"
                    value={examData.time_limit}
                    onChange={(e) => setExamData({...examData, time_limit: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Describe el contenido y objetivo del examen..."
                  value={examData.description}
                  onChange={(e) => setExamData({...examData, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="max_attempts">Intentos máximos</Label>
                  <Select 
                    value={examData.max_attempts.toString()} 
                    onValueChange={(value) => setExamData({...examData, max_attempts: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 intento</SelectItem>
                      <SelectItem value="2">2 intentos</SelectItem>
                      <SelectItem value="3">3 intentos</SelectItem>
                      <SelectItem value="999">Ilimitados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="show_results"
                    checked={examData.show_results_immediately}
                    onCheckedChange={(checked) => setExamData({...examData, show_results_immediately: checked})}
                  />
                  <Label htmlFor="show_results">Mostrar resultados inmediatamente</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Preguntas ({questions.length})</CardTitle>
                  <CardDescription>Agrega y configura las preguntas de tu examen</CardDescription>
                </div>
                <Button type="button" onClick={addQuestion} variant="outline">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Agregar Pregunta
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <PlusCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay preguntas agregadas</p>
                  <p className="text-sm">Haz clic en "Agregar Pregunta" para comenzar</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {questions.map((question, index) => (
                    <div key={question.id}>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Pregunta {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteQuestion(question.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <QuestionForm
                        question={question}
                        onUpdate={(updatedQuestion) => updateQuestion(question.id, updatedQuestion)}
                      />
                      {index < questions.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="secondary" 
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar Borrador'}
            </Button>
            <Button 
              type="button" 
              onClick={(e) => handleSubmit(e, 'active')}
              disabled={loading}
              className="bg-gradient-to-r from-primary to-accent"
            >
              {loading ? 'Publicando...' : 'Publicar Examen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}