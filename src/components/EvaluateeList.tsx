'use client';

import { Employee, Evaluation } from '@/lib/types';
import Link from 'next/link';
import { ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import { EVALUATION_STATUS_LABEL } from '@/lib/constants';

interface EvaluateeListProps {
  employees: (Employee & { latestEvaluation?: Evaluation })[];
  periodId: string;
  onSelect?: (employee: Employee) => void;
}

export default function EvaluateeList({
  employees,
  periodId,
  onSelect,
}: EvaluateeListProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-success bg-opacity-10 text-success';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-danger bg-opacity-10 text-danger';
      default:
        return 'bg-warning bg-opacity-10 text-warning';
    }
  };

  const getStatusIcon = (status?: string) => {
    if (status === 'submitted' || status === 'approved') {
      return <CheckCircle size={16} />;
    }
    return <AlertCircle size={16} />;
  };

  return (
    <div className="space-y-2">
      {employees.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          평가할 구성원이 없습니다.
        </div>
      ) : (
        employees.map((employee) => (
          <Link
            key={employee.id}
            href={`/evaluate/${employee.id}?period=${periodId}`}
            onClick={() => onSelect?.(employee)}
            className="block p-4 border border-gray-200 rounded-lg hover:border-secondary hover:bg-light transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{employee.name}</h3>
                <p className="text-sm text-gray-600">
                  {employee.title} • {employee.department}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {employee.latestEvaluation && (
                  <div
                    className={`flex items-center space-x-1 px-3 py-1 rounded text-xs font-medium ${getStatusColor(
                      employee.latestEvaluation.status
                    )}`}
                  >
                    {getStatusIcon(employee.latestEvaluation.status)}
                    <span>
                      {EVALUATION_STATUS_LABEL[
                        employee.latestEvaluation.status as keyof typeof EVALUATION_STATUS_LABEL
                      ] || '미작성'}
                    </span>
                  </div>
                )}
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
