'use client';

import { useState } from 'react';
import { LIKERT_SCALE, PERFORMANCE_ITEMS, COMPETENCY_ITEMS, COMMENT_MIN_LENGTH } from '@/lib/constants';
import {
  calculatePerformanceScore,
  calculateCompetencyScore,
  calculateCompositeScore,
  formatNumber,
} from '@/lib/utils';
import { PerformanceScores, CompetencyScores } from '@/lib/types';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface EvaluationFormProps {
  evaluateeId: string;
  periodId: string;
  onSubmit: (data: {
    performanceScores: PerformanceScores;
    competencyScores: CompetencyScores;
    comment: string;
    improvementPlan: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export default function EvaluationForm({
  evaluateeId,
  periodId,
  onSubmit,
  isLoading,
}: EvaluationFormProps) {
  const [performanceScores, setPerformanceScores] = useState<PerformanceScores>({
    delivery: 0,
    quality: 0,
    efficiency: 0,
  });

  const [competencyScores, setCompetencyScores] = useState<CompetencyScores>({
    leadership: 0,
    growth: 0,
    ethics: 0,
  });

  const [comment, setComment] = useState('');
  const [improvementPlan, setImprovementPlan] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const performanceTotal = calculatePerformanceScore(performanceScores);
  const competencyTotal = calculateCompetencyScore(competencyScores);
  const compositeScore = calculateCompositeScore(performanceTotal, competencyTotal);

  const handlePerformanceChange = (key: keyof PerformanceScores, value: number) => {
    setPerformanceScores((prev) => ({ ...prev, [key]: value }));
  };

  const handleCompetencyChange = (key: keyof CompetencyScores, value: number) => {
    setCompetencyScores((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!performanceScores.delivery) newErrors.delivery = '필수 항목입니다';
    if (!performanceScores.quality) newErrors.quality = '필수 항목입니다';
    if (!performanceScores.efficiency) newErrors.efficiency = '필수 항목입니다';
    if (!competencyScores.leadership) newErrors.leadership = '필수 항목입니다';
    if (!competencyScores.growth) newErrors.growth = '필수 항목입니다';
    if (!competencyScores.ethics) newErrors.ethics = '필수 항목입니다';

    if (comment.length < COMMENT_MIN_LENGTH) {
      newErrors.comment = `최소 ${COMMENT_MIN_LENGTH}자 이상 입력해야 합니다`;
    }

    if (improvementPlan.length < COMMENT_MIN_LENGTH) {
      newErrors.improvementPlan = `최소 ${COMMENT_MIN_LENGTH}자 이상 입력해야 합니다`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit({
      performanceScores,
      competencyScores,
      comment,
      improvementPlan,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Performance Evaluation Section */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-primary mb-6">
          성과평가 (가중치: 70%)
        </h2>

        <div className="space-y-6">
          {PERFORMANCE_ITEMS.map((item) => (
            <div key={item.key}>
              <div className="flex justify-between items-start mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  {item.label}
                  <span className="text-gray-500 text-xs ml-2">(가중치: {item.weight}%)</span>
                </label>
                <span className="text-sm font-semibold text-secondary">
                  {performanceScores[item.key as keyof PerformanceScores] || '-'}점
                </span>
              </div>

              <div className="flex space-x-2 flex-wrap">
                {LIKERT_SCALE.map((scale) => (
                  <button
                    key={scale.value}
                    type="button"
                    onClick={() =>
                      handlePerformanceChange(item.key as keyof PerformanceScores, scale.value)
                    }
                    className={`px-3 py-2 rounded border text-sm font-medium transition ${
                      performanceScores[item.key as keyof PerformanceScores] === scale.value
                        ? 'bg-secondary text-white border-secondary'
                        : 'border-gray-300 text-gray-700 hover:border-secondary'
                    }`}
                  >
                    {scale.value}
                  </button>
                ))}
              </div>

              {errors[item.key] && (
                <p className="text-danger text-xs mt-1">{errors[item.key]}</p>
              )}

              <p className="text-xs text-gray-500 mt-2">{LIKERT_SCALE[4]?.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            {PERFORMANCE_ITEMS.map((item) => (
              <div key={item.key} className="text-center">
                <p className="text-xs text-gray-600 mb-1">{item.label}</p>
                <p className="text-lg font-bold text-secondary">
                  {formatNumber(performanceScores[item.key as keyof PerformanceScores])}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-light rounded">
            <p className="text-xs text-gray-600 mb-1">성과평가 환산점수</p>
            <p className="text-2xl font-bold text-primary">{formatNumber(performanceTotal)}</p>
          </div>
        </div>
      </section>

      {/* Competency Evaluation Section */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-primary mb-6">
          역량평가 (가중치: 30%)
        </h2>

        <div className="space-y-6">
          {COMPETENCY_ITEMS.map((item) => (
            <div key={item.key}>
              <div className="flex justify-between items-start mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  {item.label}
                  <span className="text-gray-500 text-xs ml-2">(가중치: {item.weight}%)</span>
                </label>
                <span className="text-sm font-semibold text-secondary">
                  {competencyScores[item.key as keyof CompetencyScores] || '-'}점
                </span>
              </div>

              <div className="flex space-x-2 flex-wrap">
                {LIKERT_SCALE.map((scale) => (
                  <button
                    key={scale.value}
                    type="button"
                    onClick={() =>
                      handleCompetencyChange(item.key as keyof CompetencyScores, scale.value)
                    }
                    className={`px-3 py-2 rounded border text-sm font-medium transition ${
                      competencyScores[item.key as keyof CompetencyScores] === scale.value
                        ? 'bg-secondary text-white border-secondary'
                        : 'border-gray-300 text-gray-700 hover:border-secondary'
                    }`}
                  >
                    {scale.value}
                  </button>
                ))}
              </div>

              {errors[item.key] && (
                <p className="text-danger text-xs mt-1">{errors[item.key]}</p>
              )}

              <p className="text-xs text-gray-500 mt-2">{LIKERT_SCALE[4]?.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            {COMPETENCY_ITEMS.map((item) => (
              <div key={item.key} className="text-center">
                <p className="text-xs text-gray-600 mb-1">{item.label}</p>
                <p className="text-lg font-bold text-secondary">
                  {formatNumber(competencyScores[item.key as keyof CompetencyScores])}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-light rounded">
            <p className="text-xs text-gray-600 mb-1">역량평가 환산점수</p>
            <p className="text-2xl font-bold text-primary">{formatNumber(competencyTotal)}</p>
          </div>
        </div>
      </section>

      {/* Composite Score */}
      <section className="bg-secondary bg-opacity-10 border-l-4 border-secondary rounded-lg p-6">
        <h3 className="text-lg font-bold text-primary mb-4">종합점수</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-700 mb-2">성과평가</p>
            <p className="text-2xl font-bold text-secondary">{formatNumber(performanceTotal)}</p>
            <p className="text-xs text-gray-600">× 70%</p>
          </div>
          <div className="flex items-center justify-center">
            <span className="text-2xl text-gray-400">+</span>
          </div>
          <div>
            <p className="text-sm text-gray-700 mb-2">역량평가</p>
            <p className="text-2xl font-bold text-secondary">{formatNumber(competencyTotal)}</p>
            <p className="text-xs text-gray-600">× 30%</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-secondary border-opacity-30">
          <p className="text-sm text-gray-700 mb-2">종합점수</p>
          <p className="text-3xl font-bold text-primary">{formatNumber(compositeScore)}</p>
        </div>
      </section>

      {/* Comment Section */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-primary mb-6">평가 의견</h2>

        <div className="space-y-6">
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              육성계획/개선필요사항
              <span className="text-danger ml-1">*</span>
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (e.target.value.length >= COMMENT_MIN_LENGTH) {
                  setErrors((prev) => ({ ...prev, comment: '' }));
                }
              }}
              placeholder="50자 이상 입력하세요"
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            <div className="flex justify-between items-start mt-2">
              <div>
                {errors.comment && (
                  <p className="text-danger text-xs flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.comment}
                  </p>
                )}
              </div>
              <p className={`text-xs ${comment.length >= COMMENT_MIN_LENGTH ? 'text-success' : 'text-gray-500'}`}>
                {comment.length}/{COMMENT_MIN_LENGTH}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="improvementPlan" className="block text-sm font-medium text-gray-700 mb-2">
              개선 방안
              <span className="text-danger ml-1">*</span>
            </label>
            <textarea
              id="improvementPlan"
              value={improvementPlan}
              onChange={(e) => {
                setImprovementPlan(e.target.value);
                if (e.target.value.length >= COMMENT_MIN_LENGTH) {
                  setErrors((prev) => ({ ...prev, improvementPlan: '' }));
                }
              }}
              placeholder="50자 이상 입력하세요"
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            <div className="flex justify-between items-start mt-2">
              <div>
                {errors.improvementPlan && (
                  <p className="text-danger text-xs flex items-center">
                    <AlertCircle size={14} className="mr-1" />
                    {errors.improvementPlan}
                  </p>
                )}
              </div>
              <p className={`text-xs ${improvementPlan.length >= COMMENT_MIN_LENGTH ? 'text-success' : 'text-gray-500'}`}>
                {improvementPlan.length}/{COMMENT_MIN_LENGTH}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-light transition"
        >
          임시저장
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-secondary text-white rounded-lg font-medium hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <CheckCircle size={18} />
          <span>{isLoading ? '제출 중...' : '제출'}</span>
        </button>
      </div>
    </form>
  );
}
