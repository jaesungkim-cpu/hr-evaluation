'use client';

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { GRADE_COLORS, GRADES_LABEL } from '@/lib/constants';
import { Grade } from '@/lib/types';

interface GradeDistributionData {
  name: string;
  value: number;
}

interface GradeDistributionChartProps {
  title: string;
  data: Record<Grade, number>;
  targetRatios?: Record<Grade, number>;
}

export default function GradeDistributionChart({
  title,
  data,
  targetRatios,
}: GradeDistributionChartProps) {
  const grades: Grade[] = ['S', 'A', 'B', 'C', 'D'];
  const total = grades.reduce((sum, grade) => sum + (data[grade] || 0), 0);

  const chartData: GradeDistributionData[] = grades.map((grade) => ({
    name: `${grade} (${GRADES_LABEL[grade]})`,
    value: data[grade] || 0,
  }));

  const comparisonData = targetRatios
    ? grades.map((grade) => ({
        name: grade,
        actual: total > 0 ? Math.round(((data[grade] || 0) / total) * 100) : 0,
        target: targetRatios[grade] || 0,
      }))
    : null;

  const colors = grades.map((grade) => GRADE_COLORS[grade]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage =
        total > 0 ? Math.round((data.value / total) * 100) : 0;
      return (
        <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-secondary font-bold">
            {data.value}명 ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold text-primary mb-6">{title}</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pie Chart */}
        <div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, value }) => {
                  const percentage =
                    total > 0 ? Math.round((value / total) * 100) : 0;
                  return `${name.charAt(0)} ${percentage}%`;
                }}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {colors.map((color) => (
                  <Cell key={`cell-${color}`} fill={color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <div className="text-sm text-gray-600">합계: {total}명</div>
          {grades.map((grade) => {
            const count = data[grade] || 0;
            const percentage =
              total > 0 ? Math.round((count / total) * 100) : 0;
            const target = targetRatios?.[grade] || 0;
            const isExceeded = percentage > target;

            return (
              <div
                key={grade}
                className="flex items-center justify-between p-3 bg-light rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: GRADE_COLORS[grade] }}
                  />
                  <span className="font-medium text-gray-900">
                    {grade} - {GRADES_LABEL[grade]}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    {count}명 ({percentage}%)
                  </div>
                  {target > 0 && (
                    <div
                      className={`text-xs ${isExceeded ? 'text-danger' : 'text-success'}`}
                    >
                      목표: {target}%
                      {isExceeded && ' (초과)'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Chart */}
      {comparisonData && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h4 className="text-sm font-bold text-gray-900 mb-4">
            현황 vs 목표 비교
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: '비율 (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="actual" fill="#2b6cb0" name="실제" />
              <Bar dataKey="target" fill="#f3f4f6" name="목표" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
