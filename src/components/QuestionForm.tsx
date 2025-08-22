import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Trash2, Plus } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'open_answer';
  options?: string[];
  correct_answer: any;
  points: number;
  image_url?: string;
}

interface QuestionFormProps {
  question: Question;
  onUpdate: (updates: Partial<Question>) => void;
}

export function QuestionForm({ question, onUpdate }: QuestionFormProps) {
  const handleTypeChange = (newType: 'multiple_choice' | 'true_false' | 'open_answer') => {
    let updates: Partial<Question> = {
      question_type: newType,
    };

    if (newType === 'multiple_choice') {
      updates.options = ['', '', '', ''];
      updates.correct_answer = 0;
    } else if (newType === 'true_false') {
      updates.options = undefined;
      updates.correct_answer = true;
    } else {
      updates.options = undefined;
      updates.correct_answer = '';
    }

    onUpdate(updates);
  };

  const updateOption = (index: number, value: string) => {
    if (!question.options) return;
    const newOptions = [...question.options];
    newOptions[index] = value;
    onUpdate({ options: newOptions });
  };

  const addOption = () => {
    if (!question.options) return;
    onUpdate({ options: [...question.options, ''] });
  };

  const removeOption = (index: number) => {
    if (!question.options || question.options.length <= 2) return;
    const newOptions = question.options.filter((_, i) => i !== index);
    onUpdate({ 
      options: newOptions,
      correct_answer: question.correct_answer >= newOptions.length ? 0 : question.correct_answer
    });
  };

  return (
    <div className="space-y-6 p-6 border rounded-lg bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de pregunta</Label>
          <Select value={question.question_type} onValueChange={handleTypeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">Opción múltiple</SelectItem>
              <SelectItem value="true_false">Verdadero/Falso</SelectItem>
              <SelectItem value="open_answer">Respuesta abierta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Puntos</Label>
          <Input
            type="number"
            min="0.5"
            step="0.5"
            value={question.points}
            onChange={(e) => onUpdate({ points: parseFloat(e.target.value) || 1 })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Pregunta *</Label>
        <Textarea
          placeholder="Escribe tu pregunta aquí..."
          value={question.question_text}
          onChange={(e) => onUpdate({ question_text: e.target.value })}
          rows={3}
        />
      </div>

      {question.question_type === 'multiple_choice' && question.options && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Opciones de respuesta</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addOption}
              disabled={question.options.length >= 6}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar opción
            </Button>
          </div>
          
          <RadioGroup
            value={question.correct_answer.toString()}
            onValueChange={(value) => onUpdate({ correct_answer: parseInt(value) })}
          >
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3">
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <div className="flex-1 flex items-center space-x-2">
                  <Input
                    placeholder={`Opción ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                  />
                  {question.options && question.options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeOption(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </RadioGroup>
          <p className="text-sm text-muted-foreground">
            Selecciona la opción correcta marcando el círculo correspondiente
          </p>
        </div>
      )}

      {question.question_type === 'true_false' && (
        <div className="space-y-4">
          <Label>Respuesta correcta</Label>
          <RadioGroup
            value={question.correct_answer.toString()}
            onValueChange={(value) => onUpdate({ correct_answer: value === 'true' })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="true" />
              <Label htmlFor="true">Verdadero</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="false" />
              <Label htmlFor="false">Falso</Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {question.question_type === 'open_answer' && (
        <div className="space-y-2">
          <Label>Respuesta modelo (opcional)</Label>
          <Textarea
            placeholder="Escribe una respuesta modelo o palabras clave para evaluación..."
            value={question.correct_answer || ''}
            onChange={(e) => onUpdate({ correct_answer: e.target.value })}
            rows={2}
          />
          <p className="text-sm text-muted-foreground">
            Las preguntas abiertas requieren evaluación manual
          </p>
        </div>
      )}
    </div>
  );
}