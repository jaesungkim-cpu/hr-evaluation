'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Employee, Evaluation, EvaluationPeriod, Grade } from '@/lib/types';
import GradeDistributionChart from '@/components/GradeDistributionChart';
import { GRADE_RATIOS } from '@/lib/constants';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface GradeStats {
  group: string;
  department: string;
  grades: Record<Grade, number>;
  total: number;
}

export default function GradesPage() {
  const router = useRouter();
  const [user, setUser] = useState<Employee | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<EvaluationPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [gradeStats, setGradeStats] = useState<GradeStats[]>([]);

  useEffect(() => {
    loadGradeData();
  }, []);

  const loadGradeData = async () => {
    try {
      const sessionId = document.cookie
        .split('; ')
        .find((row) => row.startsWith('session_id='))
        ?.split('=')[1];

      if (!sessionId) {
        router.push('/');
        return;
      }

      // Get current user
      const { data: userData } = await supabase
        .from('employees')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!userData || !['second_evaluator', 'ceo', 'admin'].includes(userData.role)) {
        router.push('/dashboard');
        return;
      }

      setUser(userData);

      // Get current period
      const { data: periodData } = await supabase
        .from('evaluation_periods')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setCurrentPeriod(periodData);

      if (periodData) {
        // Get all employees with grades
        const { data: employees } = await supabase
          .from('employees')
          .select('id, name, group_type, department')
          .eq('is_evaluated', true);

        if (employees) {
          // Get all second evaluations (with grades)
          const { data: evaluations } = await supabase
            .from('evaluations')
            .select('evaluatee_id, grade')
            .eq('period_id', periodData.id)
            .eq('eval_type', 'second')
            .eq('status', 'submitted');

          // Group by department and group type
          const statsMap = new Map<string, GradeStats>();

          if (evaluations) {
            evaluations.forEach((ev) => {
              const emp = employees.find((e) => e.id === ev.evaluatee_id);
              if (emp && ev.grade) {
                const key = `${emp.group_type}_${emp.department}`;

                if (!statsMap.has(key)) {
                  statsMap.set(key, {
                    group: emp.group_type,
                    department: emp.department || '미지정',
                    grades: {
                      S: 0,
                      A: 0,
                      B: 0,
                      C: 0,
                      D: 0,
                    },
                    total: 0,
                  });
                }

                const stats = statsMap.get(key)!;
                stats.grades[ev.grade as Grade]++;
                stats.total++;
              }
            });
          }

          setGradeStats(Array.from(statsMap.values()));
        }
      }
    } catch (error) {
      console.error('Failed to load grade data:', error);
    } finally {
      setLoading(false);
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">사용자 정보를 불러올 수 없습니다</p>
      </div>
    );
  }

  const overallGrades: Record<Grade, number> = {
    S: 0,
    A: 0,
    B: 0,
    C: 0,
    D: 0,
  };

  gradeStats.forEach((stat) => {
    Object.entries(stat.grades).forEach(([grade, count]) => {
      overallGrades[grade as Grade] += count;
    });
  });

  const totalEvaluated = Object.values(overallGrades).reduce((a, b) => a + b, 0);

  const checkRatioCompliance = (grades: Record<Grade, number>, total: number) => {
    const violations: { grade: Grade; actual: number; target: number }[] = [];

    Object.entries(grades).forEach(([grade, count]) => {
      const actual = total > 0 ? Math.round((count / total) * 100) : 0;
      const target = GRADE_RATIOS['팀원'][grade as Grade];

      if (actual > target) {
        violations.push({
          grade: grade as Grade,
          actual,
          target,
        });
      }
    });

    return violations;
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">등급 분포 분석</h1>
        <p className="text-gray-600">{currentPeriod?.name}</p>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold text-primary mb-4">전체 등급 분포</h3>
          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">총 평가 완료: {totalEvaluated}명</p>
            {['S', 'A', 'B', 'C', 'D'].map((grade) => {
              const count = overallGrades[grade as Grade];
              const percentage =
                totalEvaluated > 0
                  ? Math.round((count / totalEvaluated) * 100)
                  : 0;
              const target = GRADE_RATIOS['팀원'][grade as Grade];

              return (
                <div key={grade} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {grade} 등급
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-40 h-2 bg-light rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary transition-all"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-16 text-right">
                      {count}명 ({percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Warnings */}
        {checkRatioCompliance(overallGrades, totalEvaluated).length > 0 && (
          <div className="bg-danger bg-opacity-10 border border-danger border-opacity-30 rounded-lg p-6">
            <div className="flex items-start space-x-3 mb-4">
              <AlertCircle className="text-danger flex-shrink-0 mt-0.5" size={24} />
              <h3 className="text-lg font-bold text-danger">경고: 등급 분포 초과</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              {checkRatioCompliance(overallGrades, totalEvaluated).map((v) => (
                <li key={v.grade} className="flex items-center space-x-2">
                  <span>
                    {v.grade} 등급: {v.actual}% (목표: {v.target}% 초과)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Charts by Group and Department */}
      <div className="space-y-6">
        {gradeStats.map((stat) => (
          <GradeDistributionChart
            key={`${stat.group}_${stat.department}`}
            title={`${stat.group} - ${stat.department} (${stat.total}명)`}
            data={stat.grades}
            targetRatios={GRADE_RATIOS[stat.group]}
          />
        ))}
      </div>

      {/* Empty State */}
      {gradeStats.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">아직 등급이 부여된 평가가 없습니다</p>
        </div>
      )}
    </div>
  );
}
