'use client';

import { useState } from 'react';
import { GRADES, GRADES_LABEL, GRADE_COLORS } from '@/lib/constants';
import { Grade } from '@/lib/types';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface GradeAssignmentProps {
  evaluateeId: string;
  evaluateeName: string;
  compositeScore: number | null;
  firstEvaluationScores?: {
    performanceTotal: number;
    competencyTotal: number;
    compositeScore: number;
  };
  onSubmit: (grade: Grade, comment: string) => Promise<void>;
  isLoading?: boolean;
}

export default function GradeAssignment({
  evaluateeId,
  evaluateeName,
  compositeScore,
  firstEvaluationScores,
  onSubmit,
  isLoading,
}: GradeAssignmentProps) {
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const suggestedGrade = compositeScore ? getSuggestedGrade(compositeScore) : null;

  function getSuggestedGrade(score: number): Grade {
    if (score >= 6.5) return 'S';
    if (score >= 5.8) return 'A';
    if (score >= 4.5) return 'B';
    if (score >= 3.0) return 'C';
    return 'D';
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedGrade) newErrors.grade = '등급을 선택해야 합니다';
    if (!comment.trim()) newErrors.comment = '코멘트를 입력해야 합니다';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !selectedGrade) {
      return;
    }

    await onSubmit(selectedGrade, comment);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1차 평가 결과 */}
      {firstEvaluationScores && (
        <section className="bg-light rounded-lg p-6 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-4">1차 평가 결과 (참고)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-600">성과평가</p>
              <p className="text-xl font-bold text-primary">
                {firstEvaluationScores.performanceTotal.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">역량평가</p>
              <p className="text-xl font-bold text-primary">
                {firstEvaluationScores.competencyTotal.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">종합점수</p>
              <p className="text-xl font-bold text-secondary">
                {firstEvaluationScores.compositeScore.toFixed(2)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 등급 선택 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-primary mb-6">최종 등급 부여</h2>

        {compositeScore !== null && (
          <div className="mb-6 p-4 bg-light rounded-lg border-l-4 border-secondary">
            <p className="text-sm text-gray-700 mb-2">추천 등급</p>
            <div className="flex items-center space-x-3">
              <span className="text-3xl font-bold text-secondary">{suggestedGrade}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {GRADES_LABEL[suggestedGrade!]}
                </p>
                <p className="text-xs text-gray-600">종합점수: {compositeScore.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            등급 선택
            <span className="text-danger ml-1">*</span>
          </label>

          <div className="grid grid-cols-5 gap-2">
            {GRADES.map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => {
                  setSelectedGrade(grade);
                  setErrors((prev) => ({ ...prev, grade: '' }));
                }}
                className={`p-4 rounded-lg font-bold text-lg transition ${
                  selectedGrade === grade
                    ? 'ring-2 ring-offset-2 ring-secondary text-white'
                    : 'border-2 border-gray-200 hover:border-secondary'
                }`}
                style={{
                  backgroundColor:
                    selectedGrade === grade ? GRADE_COLORS[grade] : 'transparent',
                  color: selectedGrade === grade ? 'white' : GRADE_COLORS[grade],
                  borderColor: selectedGrade === grade ? GRADE_COLORS[grade] : undefined,
                }}
              >
                <div>{grade}</div>
                <div className="text-xs mt-1">{GRADES_LABEL[grade]}</div>
              </button>
            ))}
          </div>

          {errors.grade && (
            <p className="text-danger text-xs mt-2 flex items-center">
              <AlertCircle size={14} className="mr-1" />
              {errors.grade}
            </p>
          )}
        </div>
      </section>

      {/* 코멘트 */}
      <section className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-primary mb-4">평가 의견</h3>

        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            코멘트
            <span className="text-danger ml-1">*</span>
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (e.target.value.trim()) {
                setErrors((prev) => ({ ...prev, comment: '' }));
              }
            }}
            placeholder="등급 부여 이유를 입력하세요"
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
          />

          {errors.comment && (
            <p className="text-danger text-xs mt-2 flex items-center">
              <AlertCircle size={14} className="mr-1" />
              {errors.comment}
            </p>
          )}
        </div>
      </section>

      {/* Submit */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-light transition"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-secondary text-white rounded-lg font-medium hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <CheckCircle size={18} />
          <span>{isLoading ? '제출 중...' : '등급 확정'}</span>
        </button>
      </div>
    </form>
  );
}
