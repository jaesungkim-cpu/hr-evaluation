'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Employee, Evaluation, SelfAssessment, EvaluationType } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import EvaluationForm from '@/components/EvaluationForm';
import GradeAssignment from '@/components/GradeAssignment';
import { PerformanceScores, CompetencyScores, Grade } from '@/lib/types';
import {
  calculatePerformanceScore,
  calculateCompetencyScore,
  calculateCompositeScore,
  assignGrade,
} from '@/lib/utils';
import { ChevronLeft, AlertCircle } from 'lucide-react';

export default function EvaluatePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const evaluateeId = params.id as string;
  const periodId = searchParams.get('period') || '';

  const [user, setUser] = useState<Employee | null>(null);
  const [evaluatee, setEvaluatee] = useState<Employee | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [selfAssessment, setSelfAssessment] = useState<SelfAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [evalType, setEvalType] = useState<EvaluationType>('first');

  useEffect(() => {
    loadEvaluationData();
  }, [evaluateeId, periodId]);

  const loadEvaluationData = async () => {
    try {
      const sessionId = document.cookie
        .split('; ')
        .find((row) => row.startsWith('session_id='))
        ?.split('=')[1];

      if (!sessionId || !evaluateeId || !periodId) {
        router.push('/dashboard');
        return;
      }

      // Get current user
      const { data: userData } = await supabase
        .from('employees')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (userData) {
        setUser(userData);
        setEvalType(userData.role === 'second_evaluator' ? 'second' : 'first');
      }

      // Get evaluatee
      const { data: evaluateeData } = await supabase
        .from('employees')
        .select('*')
        .eq('id', evaluateeId)
        .single();

      if (evaluateeData) {
        setEvaluatee(evaluateeData);
      }

      // Get self assessment
      const { data: selfAssessmentData } = await supabase
        .from('self_assessments')
        .select('*')
        .eq('employee_id', evaluateeId)
        .eq('period_id', periodId)
        .single();

      if (selfAssessmentData) {
        setSelfAssessment(selfAssessmentData);
      }

      // Get existing evaluation
      const evalTypeForQuery =
        userData?.role === 'second_evaluator' ? 'second' : 'first';
      const { data: evalData } = await supabase
        .from('evaluations')
        .select('*')
        .eq('evaluatee_id', evaluateeId)
        .eq('period_id', periodId)
        .eq('eval_type', evalTypeForQuery)
        .single();

      if (evalData) {
        setEvaluation(evalData);
      }
    } catch (error) {
      console.error('Failed to load evaluation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFirstEvalSubmit = async (data: {
    performanceScores: PerformanceScores;
    competencyScores: CompetencyScores;
    comment: string;
    improvementPlan: string;
  }) => {
    if (!user || !evaluatee || !periodId) return;

    setSubmitting(true);
    try {
      const performanceTotal = calculatePerformanceScore(
        data.performanceScores
      );
      const competencyTotal = calculateCompetencyScore(data.competencyScores);
      const compositeScore = calculateCompositeScore(
        performanceTotal,
        competencyTotal
      );

      const evaluationData = {
        evaluatee_id: evaluateeId,
        evaluator_id: user.id,
        period_id: periodId,
        eval_type: 'first' as const,
        status: 'submitted' as const,
        performance_scores: data.performanceScores,
        competency_scores: data.competencyScores,
        performance_total: performanceTotal,
        competency_total: competencyTotal,
        composite_score: compositeScore,
        comment: data.comment,
        improvement_plan: data.improvementPlan,
      };

      if (evaluation) {
        const { error } = await supabase
          .from('evaluations')
          .update(evaluationData)
          .eq('id', evaluation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('evaluations')
          .insert([evaluationData]);

        if (error) throw error;
      }

      alert('1차 평가가 제출되었습니다');
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to submit evaluation:', error);
      alert('평가 제출 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSecondEvalSubmit = async (grade: Grade, comment: string) => {
    if (!user || !evaluatee || !periodId || !evaluation) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('evaluations')
        .update({
          grade: grade,
          comment: comment,
          status: 'submitted' as const,
        })
        .eq('id', evaluation.id);

      if (error) throw error;

      alert('2차 평가 등급이 확정되었습니다');
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to submit grade:', error);
      alert('등급 확정 중 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user || !evaluatee) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Back Button */}
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center space-x-2 text-secondary hover:text-primary transition mb-6"
      >
        <ChevronLeft size={20} />
        <span>돌아가기</span>
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h1 className="text-2xl font-bold text-primary mb-2">
          {user.role === 'first_evaluator' ? '1차 평가' : '2차 평가 (등급 부여)'}
        </h1>
        <p className="text-gray-600">
          대상: <span className="font-semibold">{evaluatee.name}</span> (
          {evaluatee.title})
        </p>
      </div>

      {/* Self Assessment */}
      {selfAssessment && (
        <div className="bg-light rounded-lg p-6 mb-6 border-l-4 border-secondary">
          <h3 className="font-bold text-primary mb-2">자체 평가 내용</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {JSON.stringify(selfAssessment.content_json, null, 2)}
          </p>
        </div>
      )}

      {/* Evaluation Form or Grade Assignment */}
      {user.role === 'first_evaluator' ? (
        <EvaluationForm
          evaluateeId={evaluateeId}
          periodId={periodId}
          onSubmit={handleFirstEvalSubmit}
          isLoading={submitting}
        />
      ) : user.role === 'second_evaluator' ? (
        <GradeAssignment
          evaluateeId={evaluateeId}
          evaluateeName={evaluatee.name}
          compositeScore={evaluation?.composite_score || null}
          firstEvaluationScores={
            evaluation
              ? {
                  performanceTotal: evaluation.performance_total || 0,
                  competencyTotal: evaluation.competency_total || 0,
                  compositeScore: evaluation.composite_score || 0,
                }
              : undefined
          }
          onSubmit={handleSecondEvalSubmit}
          isLoading={submitting}
        />
      ) : (
        <div className="bg-light rounded-lg p-6 flex items-center space-x-3">
          <AlertCircle className="text-warning" size={24} />
          <p className="text-gray-700">
            평가 권한이 없습니다
          </p>
        </div>
      )}
    </div>
  );
}
